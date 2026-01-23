import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/account'
  
  // Ensure next is a relative URL
  const nextPath = next.startsWith('/') ? next : '/account'

  if (code) {
    // CRITICAL: Use cookies() from next/headers, not request.cookies
    // This is the correct way for Next.js App Router Route Handlers
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
        cookieOptions: {
          name: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1]?.split('.')[0] || 'unknown'}-auth-token`,
          path: '/',
          sameSite: 'lax',
          secure: false,
          maxAge: 400 * 24 * 60 * 60,
        },
        auth: {
          // Enable automatic session detection from URL for PKCE flow
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }
    )

    // Log cookies for debugging
    if (process.env.NODE_ENV === 'development') {
      const allCookies = cookieStore.getAll()
      console.log('[Auth Callback] Cookies available:', allCookies.map(c => c.name))
    }

    // Log before exchange
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Callback] Exchanging code for session:', {
        codeLength: code.length,
        hasCookies: cookieStore.getAll().length > 0,
        detectSessionInUrl: true,
      })
    }

    // Try exchangeCodeForSession first
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Callback] Exchange result:', {
        success: !error,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error?.message,
      })
    }

    // If exchangeCodeForSession fails, try getSession (with detectSessionInUrl enabled)
    if (error) {
      console.log('[Auth Callback] exchangeCodeForSession failed, trying getSession...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth Callback] getSession result:', {
          success: !sessionError,
          hasSession: !!sessionData?.session,
          error: sessionError?.message,
        })
      }

      if (!sessionError && sessionData?.session) {
        // getSession worked, use that data instead
      console.log('[Auth Callback] Using session from getSession')
      // Override the error/data with getSession results
      const data = sessionData
      const error = null
      } else {
        // Both failed, throw original error
        throw error
      }
    }

    if (error) {
      console.error('[Auth Callback] Final error:', error.message)
      const errorUrl = new URL('/auth/auth-code-error', url.origin)
      errorUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errorUrl)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth Callback] Success! Redirecting to:', nextPath)
    }

    // Redirect to the next path
    return NextResponse.redirect(new URL(nextPath, url.origin))
  }

  // No code parameter - redirect to error page
  return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin))
}