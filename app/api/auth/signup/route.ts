import { NextRequest, NextResponse } from 'next/server'
import { handleCors, corsHeaders, rateLimit } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

interface SignupPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  company?: string
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
    const body: SignupPayload = await request.json()
    const { email, password, firstName, lastName, phone, company } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Try to create user
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        company: company || null,
      },
    })

    if (createError) {
      // If user already exists, return success with a note
      if (
        createError.message?.includes('already been registered') ||
        createError.message?.includes('already exists') ||
        createError.message?.includes('unique constraint')
      ) {
        // Try to get existing user by email
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
        )

        return NextResponse.json({
          success: true,
          userId: existingUser?.id || null,
          existing: true,
          message: 'Account already exists. You can log in with your existing password.',
        })
      }

      console.error('Auth signup error:', createError)
      return NextResponse.json(
        { success: false, error: createError.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: createData.user.id,
      existing: false,
    })
  } catch (error) {
    console.error('Auth signup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
