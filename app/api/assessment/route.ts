import { NextRequest, NextResponse } from 'next/server'
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'
import { notifyTeam, notifyEmail, buildEmailHtml } from '@/lib/notifications'
import { buildResultsEmailHtml } from '@/lib/results-email'
import { sanitize } from '@/lib/sanitize'
import { generateRoadmap } from '@/lib/roadmap-generator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Quick wins data (duplicated from client — needed server-side for email)
const QUICK_WINS_FIRST: Record<string, string> = {
  'Founder Dependency': 'Record your next 3 sales calls and extract your sales DNA.',
  'Brand & Perception': 'Screenshot your site next to your top competitor\'s — which one wins?',
  'Marketing Systems': 'Track where your last 10 clients came from.',
  'Sales Infrastructure': 'Record a 90-second "Why Us" video on your phone.',
  'Strategic Clarity': 'Write your ICP in exactly 2 sentences.',
}

// Lab recommendations based on categories
const LAB_MAP: Record<string, { name: string; price: string }> = {
  'Founder Dependency': { name: 'AssetsLab', price: '$1,500' },
  'Brand & Perception': { name: 'BrandLab', price: '$3,500' },
  'Marketing Systems': { name: 'AssetsLab', price: '$1,500' },
  'Sales Infrastructure': { name: 'VideoSalesLab', price: '$10,000' },
  'Strategic Clarity': { name: 'AssetsLab', price: '$1,500' },
}

interface AssessmentPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  password?: string
  answers: Record<string, number>
  categoryScores: Record<string, number>
  totalScore: number
  zone: 'Red' | 'Yellow' | 'Green'
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
    const body: AssessmentPayload = await request.json()

    const firstName = sanitize(body.firstName)
    const lastName = sanitize(body.lastName)
    const email = sanitize(body.email)
    const { answers, categoryScores, totalScore, zone } = body
    if (!firstName || !lastName || !email || !answers || !categoryScores || totalScore == null || !zone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: firstName, lastName, email, answers, categoryScores, totalScore, zone' },
        { status: 400 }
      )
    }

    if (totalScore < 20 || totalScore > 100) {
      return NextResponse.json(
        { success: false, error: 'totalScore must be between 20 and 100' },
        { status: 400 }
      )
    }

    const expectedZone =
      totalScore >= 75 ? 'Green' : totalScore >= 50 ? 'Yellow' : 'Red'
    if (zone !== expectedZone) {
      console.warn(`Zone mismatch: client sent "${zone}" but score ${totalScore} maps to "${expectedZone}"`)
    }

    const supabase = getSupabase()

    // 1. Upsert into clients table
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: body.phone || null,
          company_name: body.company || '',
          status: 'lead',
          lead_source: 'website_assessment',
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single()

    if (clientError) {
      console.error('Client upsert error:', clientError)
      return NextResponse.json(
        { success: false, error: 'Failed to save client data' },
        { status: 500 }
      )
    }

    const clientId = clientData.id

    // 2. Insert into assessments table (matching actual Supabase schema)
    // Map category names to DB column names
    const catMap: Record<string, string> = {
      'Founder Dependency': 'founder_dependency_score',
      'Brand & Perception': 'brand_perception_score',
      'Marketing Systems': 'marketing_systems_score',
      'Sales Infrastructure': 'sales_infrastructure_score',
      'Strategic Clarity': 'strategic_clarity_score',
    }
    const categoryColumns: Record<string, number> = {}
    for (const [cat, score] of Object.entries(categoryScores)) {
      const col = catMap[cat]
      if (col) categoryColumns[col] = score
    }

    // Determine bottlenecks (sorted weakest first)
    const sortedCats = Object.entries(categoryScores).sort((a, b) => a[1] - b[1])
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        client_id: clientId,
        assessment_version: 'v2.0',
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        zone: zone.toLowerCase(),
        ...categoryColumns,
        primary_bottleneck: sortedCats[0]?.[0] || null,
        secondary_bottleneck: sortedCats[1]?.[0] || null,
        tertiary_bottleneck: sortedCats[2]?.[0] || null,
        raw_responses: { answers, categoryScores },
      })
      .select('id')
      .single()

    if (assessmentError) {
      console.error('Assessment insert error:', assessmentError)
      return NextResponse.json(
        { success: false, error: 'Failed to save assessment data' },
        { status: 500 }
      )
    }

    // 3. Auto-generate 90-Day Growth Sprint roadmap
    try {
      const roadmapData = generateRoadmap({
        firstName,
        lastName,
        company: body.company || '',
        totalScore,
        zone,
        categoryScores,
        primaryBottleneck: sortedCats[0]?.[0] || 'Strategic Clarity',
        secondaryBottleneck: sortedCats[1]?.[0] || 'Founder Dependency',
        tertiaryBottleneck: sortedCats[2]?.[0] || 'Marketing Systems',
      })

      const { error: roadmapError } = await supabase
        .from('roadmaps')
        .insert({
          client_id: clientId,
          assessment_id: assessmentData.id,
          ...roadmapData,
        })

      if (roadmapError) {
        console.error('Roadmap generation error:', roadmapError)
        console.warn('Roadmap insert failed but assessment was saved successfully')
      }
    } catch (roadmapErr) {
      console.error('Roadmap generation error (non-blocking):', roadmapErr)
    }

    // 4. Insert into leads table
    const { error: leadError } = await supabase
      .from('leads')
      .insert({
        client_id: clientId,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase().trim(),
        phone: body.phone || null,
        company: body.company || null,
        source: 'website',
        source_detail: 'Bottleneck Assessment',
        status: 'new',
        score: totalScore,
        tags: ['assessment', 'bottleneck-assessment', 'website'],
      })

    if (leadError) {
      console.error('Lead insert error:', leadError)
      console.warn('Lead insert failed but assessment was saved successfully')
    }

    // 5. Create Supabase Auth user (non-blocking)
    let authUserId: string | null = null
    if (body.password && body.password.length >= 8) {
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: body.password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            phone: body.phone || null,
            company: body.company || null,
          },
        })

        if (authError) {
          if (
            authError.message?.includes('already been registered') ||
            authError.message?.includes('already exists')
          ) {
            console.log('Auth user already exists for:', email)
            // Try to find their ID
            const { data: listData } = await supabase.auth.admin.listUsers()
            const existingUser = listData?.users?.find(
              (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
            )
            authUserId = existingUser?.id || null
          } else {
            console.error('Auth user creation failed:', authError.message)
          }
        } else {
          authUserId = authData.user.id
        }

        // Link auth user ID to client record
        if (authUserId) {
          await supabase
            .from('clients')
            .update({ auth_user_id: authUserId })
            .eq('id', clientId)
            .then(({ error }) => {
              if (error) console.warn('Failed to link auth_user_id to client:', error.message)
            })
        }
      } catch (authErr) {
        console.error('Auth user creation error (non-blocking):', authErr)
      }
    }

    // 6. Send team notification (non-blocking)
    const zoneColor = zone === 'Red' ? '#e74c3c' : zone === 'Yellow' ? '#f39c12' : '#2ADD1B'
    const fullName = `${firstName} ${lastName}`
    const categoryScoresStr = Object.entries(categoryScores)
      .map(([cat, score]) => `${cat}: ${score}`)
      .join(', ')

    const notifFields: Record<string, string> = {
      Name: fullName,
      Email: email,
      ...(body.company ? { Company: body.company } : {}),
      Score: `${totalScore}/100`,
      Zone: `${zone} Zone`,
      'Category Scores': categoryScoresStr,
    }

    notifyTeam({
      title: '🎯 New Bottleneck Assessment',
      fields: notifFields,
      emailSubject: `🎯 New Assessment: ${fullName} (${zone} Zone - Score: ${totalScore})`,
      emailHtml: buildEmailHtml('🎯 New Bottleneck Assessment', notifFields),
      slackColor: zoneColor,
      supabaseUrl: `https://supabase.com/dashboard/project/tncipuxobcbkwkmpcevt/editor`,
    }).catch((err) => console.error('Team notification error:', err))

    // 7. Send results email to customer (non-blocking)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://podlablv.com'

    // Build quick wins from weakest 2 categories
    const sortedCatsNotif = Object.entries(categoryScores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2)

    const quickWins = sortedCatsNotif.map(([cat]) => ({
      category: cat,
      action: QUICK_WINS_FIRST[cat] || 'Review your results and identify action items.',
    }))

    // Build recommended labs (deduplicated)
    const seenLabs = new Set<string>()
    const recommendedLabs: { name: string; price: string }[] = []
    for (const [cat] of sortedCatsNotif) {
      const lab = LAB_MAP[cat]
      if (lab && !seenLabs.has(lab.name)) {
        seenLabs.add(lab.name)
        recommendedLabs.push(lab)
      }
    }

    const resultsEmailHtml = buildResultsEmailHtml({
      firstName,
      totalScore,
      zone,
      categoryScores,
      quickWins,
      recommendedLabs,
      assessmentId: assessmentData.id,
      siteUrl,
    })

    notifyEmail(
      email.toLowerCase().trim(),
      `Your Bottleneck Score: ${totalScore}/100 — ${zone} Zone`,
      resultsEmailHtml
    ).catch((err) => console.error('Customer results email error:', err))

    return NextResponse.json({
      success: true,
      clientId,
      assessmentId: assessmentData.id,
      authUserId,
    })
  } catch (error) {
    console.error('Assessment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
