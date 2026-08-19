import { NextRequest, NextResponse } from 'next/server';
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js';
import { notifyTeam, notifyEmail, buildEmailHtml } from '@/lib/notifications';
import { consentRecord } from '@/lib/smsConsent';
import { AGREEMENT_VERSION, COMPANY } from '@/lib/affiliate-terms';
import type { AgreementParty, SigningEvidence } from '@/lib/affiliate-agreement';
import { agreementFileName, renderAgreementPdf } from '@/lib/affiliate-agreement-pdf';
import { buildAffiliateWelcomeEmail } from '@/lib/affiliate-welcome-email';

// PDF rendering needs the filesystem (logo) and Node streams — pin the runtime
// so an edge default can never silently break contract generation.
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Private bucket. Executed contracts are never world-readable. */
const AGREEMENT_BUCKET = 'affiliate-agreements';

/** Signed-link lifetime handed to the browser after signing: 30 days. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/** Same extraction the rate limiter uses — first hop of x-forwarded-for. */
function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || NextResponse.json({}, { headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const { limited } = rateLimit(request, { maxRequests: 5, windowMs: 60_000 })
  if (limited) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      businessAddress,
      website,
      businessType,
      audienceSize,
      howConnect,
      whyJoin,
      howHeard,
      payoutMethod,
      payoutDetails,
      beakerId,
      contractSigned,
      contractSignedDate,
      typedSignature,
      electronicConsent,
      utmLinks,
    } = body;

    // Validate required fields
    const requiredFields: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      businessAddress,
      businessType,
      audienceSize,
      howConnect,
      whyJoin,
      payoutMethod,
      payoutDetails,
      beakerId,
      typedSignature,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return NextResponse.json(
          { error: `Missing required field: ${key}` },
          { status: 400 },
        );
      }
    }

    if (!contractSigned) {
      return NextResponse.json(
        { error: 'Contract must be signed before submitting.' },
        { status: 400 },
      );
    }

    // ESIGN §101(c): a typed signature binds only if the signer affirmatively
    // agreed to transact electronically. Without this the signature is a
    // checkbox, not a contract.
    if (!electronicConsent) {
      return NextResponse.json(
        { error: 'Consent to electronic records is required to sign.' },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const signedAt = contractSignedDate || new Date().toISOString();
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent');
    const consent = consentRecord(phone, body.sms_consent, 'website/affiliate-apply');

    const { error: dbError } = await supabase
      .from('beaker_applications')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        business_address: businessAddress.trim(),
        website: website?.trim() || null,
        business_type: businessType,
        audience_size: audienceSize,
        how_connect: howConnect.trim(),
        why_join: whyJoin.trim(),
        how_heard: howHeard?.trim() || null,
        payout_method: payoutMethod,
        payout_details: payoutDetails.trim(),
        beaker_id: beakerId,
        contract_signed: true,
        contract_signed_date: signedAt,
        typed_signature: typedSignature.trim(),
        utm_links: utmLinks,
        status: 'pending',
      });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save application. Please try again.' },
        { status: 500 },
      );
    }

    // Signing evidence + SMS consent go in a second write on purpose. These
    // columns arrive with a migration; if it hasn't been applied yet, a failure
    // here costs us an audit trail, not somebody's signed application.
    const { error: evidenceError } = await supabase
      .from('beaker_applications')
      .update({
        agreement_version: AGREEMENT_VERSION,
        electronic_consent: true,
        signed_ip: ip,
        signed_user_agent: userAgent,
        ...consent,
      })
      .eq('beaker_id', beakerId)
      .eq('email', email.trim().toLowerCase());

    if (evidenceError) {
      console.error('Signing-evidence update failed (run the beaker agreement migration):', evidenceError);
    }

    const fullName = `${firstName} ${lastName}`;
    const effectiveDate = new Date(signedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    const party: AgreementParty = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company?.trim() || undefined,
      email: email.trim().toLowerCase(),
      businessAddress: businessAddress.trim(),
      payoutMethod,
      payoutDetails: payoutDetails.trim(),
      beakerId,
      effectiveDate,
    };

    const evidence: SigningEvidence = {
      typedSignature: typedSignature.trim(),
      signedAt: new Date(signedAt).toISOString().replace('T', ' ').slice(0, 19),
      ip: ip || undefined,
      userAgent: userAgent || undefined,
      version: AGREEMENT_VERSION,
    };

    // Everything past this point is delivery. The signature is already durable,
    // so no failure below is allowed to surface as a failed submission.
    let agreementUrl: string | null = null;
    let storagePath: string | null = null;

    try {
      const pdf = await renderAgreementPdf(party, evidence);
      const fileName = agreementFileName(party, evidence);
      storagePath = `${beakerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(AGREEMENT_BUCKET)
        .upload(storagePath, pdf, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error('Agreement upload failed:', uploadError);
        storagePath = null;
      } else {
        const { data: signed } = await supabase.storage
          .from(AGREEMENT_BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
        agreementUrl = signed?.signedUrl || null;

        await supabase
          .from('beaker_applications')
          .update({ agreement_pdf_path: storagePath })
          .eq('beaker_id', beakerId)
          .eq('email', party.email);
      }

      const homepageLink = `https://podlablv.com/?utm_source=beaker&utm_medium=referral&utm_campaign=${beakerId}`;

      await notifyEmail(
        party.email,
        `Your PodLab Affiliate Agreement — signed copy attached`,
        buildAffiliateWelcomeEmail({
          firstName: firstName.trim(),
          beakerId,
          homepageLink,
          payoutMethod,
          effectiveDate,
        }),
        {
          fromName: 'PodLab Beaker',
          replyTo: COMPANY.email,
          bcc: [COMPANY.email],
          attachments: [{ filename: fileName, content: pdf }],
          tags: [{ name: 'type', value: 'affiliate_agreement' }],
        },
      );
    } catch (pdfErr) {
      // A signed agreement with no PDF is recoverable by hand; a 500 that makes
      // someone re-sign is not. Log loudly and let the success response stand.
      console.error('Agreement PDF/delivery failed for', beakerId, pdfErr);
    }

    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: email,
      ...(company ? { Company: company } : {}),
      'Business Type': businessType,
      'Audience Size': audienceSize,
      'How They Connect': howConnect,
      'Why Joining': whyJoin,
      'Payout Method': payoutMethod,
      'Beaker ID': beakerId,
      'Agreement Version': AGREEMENT_VERSION,
      'Signed PDF': storagePath ? 'attached + archived' : 'GENERATION FAILED — check logs',
    };

    notifyTeam({
      title: '🤝 New Beaker Application',
      fields: notifFields,
      emailSubject: `🤝 Beaker Application: ${fullName}`,
      emailHtml: buildEmailHtml('🤝 New Beaker Application', notifFields),
      slackColor: '#9b59b6',
      supabaseUrl: 'https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor',
    }).catch((err) => console.error('Notification error:', err));

    return NextResponse.json({ success: true, beakerId, agreementUrl });
  } catch (err) {
    console.error('Affiliate apply error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
