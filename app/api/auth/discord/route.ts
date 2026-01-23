import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Route Handler to initiate Discord OAuth flow server-side.
 * This bypasses the browser client bug (GitHub Issue #55) where createBrowserClient
 * doesn't consistently set the PKCE code verifier cookie.
 * 
 * By initiating OAuth server-side using createServerClient with explicit cookie handling,
 * we ensure the code verifier cookie is reliably stored before redirecting to Discord.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next') || '/protected'
  
  const cookieStore = await cookies()
  
  // Track cookies set during OAuth initiation so we can add them to the redirect response
  const cookiesSetDuringInitiation: Array<{ name: string; value: string; options: any }> = []
  
  // Create server client with explicit cookie handling
  // This ensures the code verifier cookie is set in cookieStore
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
            // Set cookie in cookieStore (for Supabase to read)
            cookieStore.set(name, value, options)
            // Track cookies set during initiation
            cookiesSetDuringInitiation.push({ name, value, options: options || {} })
            if (process.env.NODE_ENV === 'development') {
              console.log('[OAuth Route Handler] Set cookie during initiation:', name)
            }
          })
        },
      },
    }
  )

  // Get the origin from the request
  const origin = request.headers.get('origin') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https')
  const baseUrl = origin?.startsWith('http') ? origin : `${protocol}://${origin}`
  const redirectUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`

  if (process.env.NODE_ENV === 'development') {
    console.log('[OAuth Route Handler] Initiating Discord OAuth')
    console.log('[OAuth Route Handler] Redirect URL:', redirectUrl)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: redirectUrl,
    },
  })

  if (error) {
    console.error('[OAuth Route Handler] OAuth initiation error:', error)
    const errorUrl = new URL('/auth/login', url.origin)
    errorUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(errorUrl)
  }

  if (!data.url) {
    console.error('[OAuth Route Handler] OAuth URL not returned')
    const errorUrl = new URL('/auth/login', url.origin)
    errorUrl.searchParams.set('error', 'OAuth URL not returned')
    return NextResponse.redirect(errorUrl)
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[OAuth Route Handler] OAuth URL received')
    console.log('[OAuth Route Handler] Cookies set during initiation:', cookiesSetDuringInitiation.length)
    const codeVerifier = cookiesSetDuringInitiation.find(c => c.name.includes('code-verifier'))
    console.log('[OAuth Route Handler] Code verifier cookie:', codeVerifier ? `SET ✅ (${codeVerifier.name})` : 'MISSING ❌')
  }

  // Create redirect response to OAuth provider
  // This response will include all cookies set during OAuth initiation
  // CRITICAL: The PKCE code verifier cookie MUST be sent to the browser before redirecting
  // Otherwise, exchangeCodeForSession() will fail with "PKCE code verifier not found"
  const redirectResponse = NextResponse.redirect(data.url)
  
  // Copy all cookies set during OAuth initiation to the redirect response
  // Preserve all cookie options (SameSite, Secure, HttpOnly, Max-Age, Path, Domain) from Supabase
  // These options are critical for proper cookie handling in SSR
  cookiesSetDuringInitiation.forEach(({ name, value, options }) => {
    // Supabase sets proper cookie options (SameSite=Lax, Secure=false for localhost, etc.)
    // Preserve all options to ensure cookies work correctly
    redirectResponse.cookies.set(name, value, options || {})
  })
  
  // Also copy any existing cookies (like HMR hash) that weren't set during initiation
  // Note: cookieStore.getAll() only returns name and value - not full options
  // This is fine for existing cookies as they're not critical for OAuth flow
  const allCookies = cookieStore.getAll()
  allCookies.forEach((cookie) => {
    // Only set if not already set during initiation (to avoid overwriting Supabase cookies)
    if (!cookiesSetDuringInitiation.find(c => c.name === cookie.name)) {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: '/',
      })
    }
  })

  return redirectResponse
}
