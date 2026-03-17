import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface AssessmentPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  answers: Record<string, number>
  categoryScores: Record<string, number>
  totalScore: number
  zone: 'Red' | 'Yellow' | 'Green'
}

export async function POST(request: NextRequest) {
  try {
    const body: AssessmentPayload = await request.json()

    // Validate required fields
    const { firstName, lastName, email, answers, categoryScores, totalScore, zone } = body
    if (!firstName || !lastName || !email || !answers || !categoryScores || totalScore == null || !zone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: firstName, lastName, email, answers, categoryScores, totalScore, zone' },
        { status: 400 }
      )
    }

    // Validate score range
    if (totalScore < 20 || totalScore > 100) {
      return NextResponse.json(
        { success: false, error: 'totalScore must be between 20 and 100' },
        { status: 400 }
      )
    }

    // Validate zone matches score
    const expectedZone =
      totalScore >= 75 ? 'Green' : totalScore >= 50 ? 'Yellow' : 'Red'
    if (zone !== expectedZone) {
      // Accept the client's zone but log the mismatch — don't reject
      console.warn(`Zone mismatch: client sent "${zone}" but score ${totalScore} maps to "${expectedZone}"`)
    }

    const supabase = getSupabase()

    // 1. Upsert into clients table (match on email)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase().trim(),
          phone: body.phone || null,
          company_name: body.company || null,
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

    // 2. Insert into assessments table
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        client_id: clientId,
        total_score: totalScore,
        category_scores: categoryScores,
        answers_raw: answers,
        zone,
        source: 'website',
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

    // 3. Insert into leads table
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
      // Don't fail the whole request — client and assessment are already saved
      console.warn('Lead insert failed but assessment was saved successfully')
    }

    return NextResponse.json({
      success: true,
      clientId,
      assessmentId: assessmentData.id,
    })
  } catch (error) {
    console.error('Assessment API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
