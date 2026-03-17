import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Podcast apply error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
