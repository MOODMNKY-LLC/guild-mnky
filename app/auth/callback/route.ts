import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/account'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully exchanged code for session, redirect to the intended page
      const redirectTo = new URL(next, origin)
      return NextResponse.redirect(redirectTo)
    }
  }

  // If no code or exchange failed, redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}