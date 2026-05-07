import { NextRequest, NextResponse } from 'next/server';
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js';
import { notifyTeam, buildEmailHtml } from '@/lib/notifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
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

    const supabase = getSupabase();

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
        contract_signed_date: contractSignedDate,
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

    // Send notifications (non-blocking)
    const fullName = `${firstName} ${lastName}`;
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
    };

    notifyTeam({
      title: ' New Beaker Application',
      fields: notifFields,
      emailSubject: ` Beaker Application: ${fullName}`,
      emailHtml: buildEmailHtml(' New Beaker Application', notifFields),
      slackColor: '#9b59b6',
      supabaseUrl: 'https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor',
    }).catch((err) => console.error('Notification error:', err));

    return NextResponse.json({ success: true, beakerId });
  } catch (err) {
    console.error('Affiliate apply error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
