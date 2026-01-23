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
          // CRITICAL: Don't set domain for IP addresses (127.0.0.1) - browsers reject it
          // Browsers automatically scope cookies to the exact origin for IP addresses
          domain: isDevelopment ? undefined : undefined, // No domain for IP addresses or localhost
          secure: !isDevelopment, // false for HTTP localhost, true for HTTPS production
          sameSite: 'lax', // Lax for localhost, will be overridden to None for cross-site OAuth in production
          path: '/',
        },
      }
    )

    // Enhanced logging for debugging
    if (process.env.NODE_ENV === 'development') {
      const allCookies = cookieStore.getAll()
      console.log('[Auth Callback] ===== AUTH CALLBACK DEBUG =====')
      console.log('[Auth Callback] Request URL:', url.toString())
      console.log('[Auth Callback] Code parameter:', code ? 'present' : 'missing')
      console.log('[Auth Callback] Cookies available:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))
      console.log('[Auth Callback] Cookie count:', allCookies.length)
      
      // Check for PKCE code verifier
      const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier'))
      console.log('[Auth Callback] Code verifier cookie:', codeVerifierCookie ? 'FOUND' : 'MISSING')
      
      // Check for auth token
      const authTokenCookie = allCookies.find(c => c.name.includes('auth-token') && !c.name.includes('code-verifier'))
      console.log('[Auth Callback] Auth token cookie before exchange:', authTokenCookie ? 'EXISTS' : 'MISSING')
      console.log('[Auth Callback] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('[Auth Callback] =================================')
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] ===== EXCHANGE ERROR =====')
      console.error('[Auth Callback] Error message:', error.message)
      console.error('[Auth Callback] Error name:', error.name)
      console.error('[Auth Callback] Full error:', JSON.stringify(error, null, 2))
      console.error('[Auth Callback] =========================')
      
      const errorUrl = new URL('/auth/auth-code-error', url.origin)
      errorUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errorUrl)
    }

    // Log success
    if (process.env.NODE_ENV === 'development') {
      const cookiesAfter = cookieStore.getAll()
      const authTokenAfter = cookiesAfter.find(c => c.name.includes('auth-token') && !c.name.includes('code-verifier'))
      console.log('[Auth Callback] ===== EXCHANGE SUCCESS =====')
      console.log('[Auth Callback] Auth token cookie after exchange:', authTokenAfter ? 'SET' : 'MISSING')
      console.log('[Auth Callback] Total cookies after:', cookiesAfter.length)
      console.log('[Auth Callback] Redirecting to:', nextPath)
      console.log('[Auth Callback] ============================')
    }

    // Redirect to the next path
    return NextResponse.redirect(new URL(nextPath, url.origin))
  }

  // No code parameter - redirect to error page
  return NextResponse.redirect(new URL('/auth/auth-code-error', url.origin))
}