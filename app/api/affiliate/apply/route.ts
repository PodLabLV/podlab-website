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
      howConnect,
      howHeard,
      payoutMethod,
      payoutDetails,
      beakerId,
      contractSigned,
      contractSignedDate,
      typedSignature,
      electronicConsent,
      utmLinks,
      track: rawTrack,
      inviteToken,
      answers: rawAnswers,
    } = body;

    // Two tracks (2026-10-01): "client" only with a live invite token from the
    // CRM, everything else is "partner". Answers arrive as {q, a} pairs.
    const answers = Array.isArray(rawAnswers)
      ? rawAnswers
          .filter((x: unknown): x is { q: string; a: string } =>
            Boolean(x) && typeof (x as { q?: unknown }).q === 'string' && typeof (x as { a?: unknown }).a === 'string')
          .slice(0, 20)
          .map((x: { q: string; a: string }) => ({ q: x.q.slice(0, 120), a: x.a.trim().slice(0, 2000) }))
      : [];

    // Validate required fields
    const requiredFields: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      businessAddress,
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

    let track: 'partner' | 'client' = 'partner';
    let invite: { token: string; lead_id: string; email: string } | null = null;
    if (rawTrack === 'client' && typeof inviteToken === 'string') {
      const crm = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: 'crm' } });
      const { data } = await crm
        .from('beaker_invites')
        .select('token,lead_id,email,applied_at')
        .eq('token', inviteToken)
        .maybeSingle();
      if (!data || data.applied_at) {
        return NextResponse.json({ error: 'That invite has already been used or is no longer valid.' }, { status: 400 });
      }
      if (data.email.toLowerCase() !== String(email).trim().toLowerCase()) {
        return NextResponse.json({ error: 'Please apply with the email your invite was sent to.' }, { status: 400 });
      }
      track = 'client';
      invite = data;
    }
    if (!answers.some((x: { a: string }) => x.a)) {
      return NextResponse.json({ error: 'Please answer the questions before submitting.' }, { status: 400 });
    }

    // Beaker IDs are unique in the database (beaker_applications_beaker_id_key)
    // but the form slugs first-last and never checked, so a second Jordan
    // Smith used to get "Failed to save application". Suffix -2, -3… instead,
    // and use the final ID for everything below — the row, the PDF, the links.
    const requestedId = String(beakerId).trim().toLowerCase();
    let finalBeakerId = requestedId;
    for (let n = 2; n < 50; n++) {
      const { data: taken } = await supabase
        .from('beaker_applications').select('id').ilike('beaker_id', finalBeakerId).limit(1);
      if (!taken || taken.length === 0) break;
      finalBeakerId = `${requestedId}-${n}`;
    }
    // The client built its tracking links before submitting; point them at
    // the ID that was actually issued.
    const finalUtmLinks = finalBeakerId === requestedId ? utmLinks
      : JSON.parse(JSON.stringify(utmLinks ?? null).split(`utm_campaign=${requestedId}`).join(`utm_campaign=${finalBeakerId}`));
    const signedAt = contractSignedDate || new Date().toISOString();
    const ip = clientIp(request);
    const userAgent = request.headers.get('user-agent');
    const consent = consentRecord(phone, body.sms_consent, 'website/affiliate-apply');

    const { data: inserted, error: dbError } = await supabase
      .from('beaker_applications')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        business_address: businessAddress.trim(),
        website: website?.trim() || null,
        business_type: typeof businessType === 'string' ? businessType.slice(0, 80) : null,
        audience_size: null,
        how_connect: typeof howConnect === 'string' && howConnect.trim() ? howConnect.trim().slice(0, 2000) : null,
        why_join: null,
        track,
        answers,
        client_lead_id: invite?.lead_id ?? null,
        how_heard: howHeard?.trim() || null,
        // Whop only from v2026.09.28 (§4.7): no bank details are collected.
        payout_method: 'Whop',
        payout_details: null,
        beaker_id: finalBeakerId,
        contract_signed: true,
        contract_signed_date: signedAt,
        typed_signature: typedSignature.trim(),
        utm_links: finalUtmLinks,
        status: 'pending',
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save application. Please try again.' },
        { status: 500 },
      );
    }

    // Close the invite so the link can't be reused, and tie it to the application.
    if (invite && inserted) {
      const crm = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: 'crm' } });
      const { error: inviteError } = await crm
        .from('beaker_invites')
        .update({ applied_at: new Date().toISOString(), application_id: inserted.id })
        .eq('token', invite.token);
      if (inviteError) console.error('Invite close failed:', inviteError);
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
      .eq('beaker_id', finalBeakerId)
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
      payoutMethod: 'Whop',
      beakerId: finalBeakerId,
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
      storagePath = `${finalBeakerId}/${fileName}`;

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
          .eq('beaker_id', finalBeakerId)
          .eq('email', party.email);
      }

      const homepageLink = `https://podlablv.com/?utm_source=beaker&utm_medium=referral&utm_campaign=${finalBeakerId}`;

      await notifyEmail(
        party.email,
        `Your PodLab Affiliate Agreement — signed copy attached`,
        buildAffiliateWelcomeEmail({
          firstName: firstName.trim(),
          beakerId: finalBeakerId,
          homepageLink,
          payoutMethod: 'Whop',
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
      console.error('Agreement PDF/delivery failed for', finalBeakerId, pdfErr);
    }

    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: email,
      ...(company ? { Company: company } : {}),
      Track: track === 'client' ? 'PodLab client (invited)' : 'Partner',
      ...Object.fromEntries(answers.filter((x: { a: string }) => x.a).map((x: { q: string; a: string }) => [x.q, x.a])),
      'Payout Method': 'Whop',
      'Beaker ID': finalBeakerId,
      'Agreement Version': AGREEMENT_VERSION,
      'Signed PDF': storagePath ? 'attached + archived' : 'GENERATION FAILED — check logs',
    };

    notifyTeam({
      title: track === 'client' ? '🤝 Client joined Beaker' : '🤝 New Beaker Application',
      fields: notifFields,
      emailSubject: `🤝 Beaker Application: ${fullName}`,
      emailHtml: buildEmailHtml('🤝 New Beaker Application', notifFields),
      slackColor: '#9b59b6',
      supabaseUrl: 'https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor',
    }).catch((err) => console.error('Notification error:', err));

    return NextResponse.json({ success: true, beakerId: finalBeakerId, agreementUrl });
  } catch (err) {
    console.error('Affiliate apply error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
