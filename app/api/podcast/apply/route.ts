import { NextRequest, NextResponse } from 'next/server';
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js';
import { notifyTeam, buildEmailHtml } from '@/lib/notifications';
import { recordSubmission } from '@/lib/portal/forms';

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

    // Validate required fields
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'companyName',
      'title',
      'revenueRange',
      'industry',
      'founderStory',
      'hardLesson',
      'episodeTopic',
      'podcastExperience',
    ];

    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
        return NextResponse.json(
          { error: `${field} is required.` },
          { status: 400 }
        );
      }
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map camelCase to snake_case for Supabase
    const record = {
      first_name: body.firstName?.trim(),
      last_name: body.lastName?.trim(),
      email: body.email?.trim().toLowerCase(),
      phone: body.phone?.trim() || null,
      company_name: body.companyName?.trim(),
      title: body.title?.trim(),
      company_website: body.companyWebsite?.trim() || null,
      linkedin_url: body.linkedinUrl?.trim() || null,
      revenue_range: body.revenueRange,
      industry: body.industry?.trim(),
      founder_story: body.founderStory?.trim(),
      hard_lesson: body.hardLesson?.trim(),
      episode_topic: body.episodeTopic?.trim(),
      podcast_experience: body.podcastExperience,
      how_did_you_hear: body.howDidYouHear?.trim() || null,
      anything_else: body.anythingElse?.trim() || null,
      status: 'pending',
    };

    const { error } = await supabase
      .from('podcast_applications')
      .insert([record]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again.' },
        { status: 500 }
      );
    }

    // Send notifications (non-blocking)
    const fullName = `${body.firstName} ${body.lastName}`;
    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: body.email,
      Company: body.companyName,
      Title: body.title,
      'Revenue Range': body.revenueRange,
      Industry: body.industry,
      'Episode Topic': body.episodeTopic,
      'Podcast Experience': body.podcastExperience,
    };

    notifyTeam({
      title: '🎙️ New Podcast Application',
      fields: notifFields,
      emailSubject: `🎙️ Podcast Application: ${fullName} from ${body.companyName}`,
      emailHtml: buildEmailHtml('🎙️ New Podcast Application', notifFields),
      slackColor: '#3498db',
      supabaseUrl: 'https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor',
    }).catch((err) => console.error('Notification error:', err));

    // Form tracking (Phase 4). Additive and non-blocking.
    recordSubmission(supabase, {
      formKey: 'podcast-apply',
      email: body.email,
      name: body.name,
      raw: body,
      source: 'podcast-apply',
    }).catch((err) => console.error('Form tracking error:', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Podcast apply error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
