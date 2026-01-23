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

    // Determine if we're in development (localhost) or production
    const isDevelopment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || 
                         process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
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
          domain: isDevelopment ? '127.0.0.1' : undefined, // Explicitly set domain to match Supabase CLI binding
          secure: !isDevelopment, // false for HTTP localhost, true for HTTPS production
          sameSite: 'lax', // Lax for localhost, will be overridden to None for cross-site OAuth in production
          path: '/',
        },
      }
    )

    // Log cookies for debugging
    if (process.env.NODE_ENV === 'development') {
      const allCookies = cookieStore.getAll()
      console.log('[Auth Callback] Cookies available:', allCookies.map(c => c.name))
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Exchange error:', error.message)
      const errorUrl = new URL('/auth/auth-code-error', url.origin)
      errorUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errorUrl)
    }

    // Redirect to the next path
    return NextResponse.redirect(new URL(nextPath, url.origin))
  }

  // No code parameter - redirect to error page
  return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin))
}