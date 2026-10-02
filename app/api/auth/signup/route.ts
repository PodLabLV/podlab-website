import { NextResponse } from 'next/server';

// Disabled (security fix 2026-10-01). This route created confirmed accounts for any
// email with no invite or verification, and nothing in the app used it. Portal
// access is provisioned deliberately (invite + set-password).
export async function POST() {
  return NextResponse.json({ error: 'Sign-up is not available.' }, { status: 410 });
}
