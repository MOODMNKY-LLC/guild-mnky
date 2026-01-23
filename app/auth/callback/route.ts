import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const errorCode = url.searchParams.get('error_code')
  
  // Default redirect to dashboard after successful login
  const next = url.searchParams.get('next') ?? '/protected'
  const nextPath = next.startsWith('/') ? next : '/protected'

  // Handle OAuth errors from Supabase - check for stale callbacks first
  if (error) {
    // Check if this is a stale OAuth callback (no active OAuth session)
    // Stale callbacks happen when browser history contains old OAuth error URLs
    // If there's no code verifier cookie, this is likely a stale callback
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const codeVerifier = allCookies.find(c => c.name.includes('code-verifier'))
    
    // If no code verifier exists, this is likely a stale OAuth callback from browser history
    // Silently redirect to login instead of showing an error page
    if (!codeVerifier) {
      // Silently handle stale OAuth errors - no logging to reduce noise
      return NextResponse.redirect(new URL('/auth/login', url.origin))
    }
    
    // This is a real OAuth error from an active session - log and show error page
    console.error('[Auth Callback] ===== OAUTH ERROR FROM SUPABASE =====')
    console.error('[Auth Callback] Request URL:', request.url)
    console.error('[Auth Callback] Error:', error)
    console.error('[Auth Callback] Error Code:', errorCode)
    console.error('[Auth Callback] Error Description:', errorDescription)
    const errorUrl = new URL('/auth/auth-code-error', url.origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }
  
  // Log for actual OAuth callbacks (with code)
  // This reduces noise from stale browser history/prefetching
  if (code) {
    console.log('[Auth Callback] ===== ROUTE HANDLER CALLED =====')
    console.log('[Auth Callback] Request URL:', request.url)
    console.log('[Auth Callback] Code param: present')
    console.log('[Auth Callback] State param:', state ? 'present' : 'missing')
    console.log('[Auth Callback] Next path:', nextPath)
    console.log('[Auth Callback] Request origin:', url.origin)
    
    // Process the OAuth code exchange
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    // CRITICAL: Create redirect response BEFORE exchangeCodeForSession()
    // This allows setAll() to add cookies directly to the response during the exchange
    const redirectResponse = NextResponse.redirect(new URL(nextPath, url.origin))
    
    // Track cookies set during exchange for logging
    const cookiesSetDuringExchange: Array<{ name: string; value: string; options: any }> = []
    
    // Log ALL cookies before creating client
    console.log('[Auth Callback] ===== COOKIES BEFORE CLIENT CREATION =====')
    console.log('[Auth Callback] Total cookies:', allCookies.length)
    console.log('[Auth Callback] Cookie names:', allCookies.map(c => c.name))
    const codeVerifier = allCookies.find(c => c.name.includes('code-verifier'))
    console.log('[Auth Callback] Code verifier cookie:', codeVerifier ? `FOUND (${codeVerifier.name})` : 'MISSING')
    
    // Copy existing cookies (like HMR hash) to redirect response before exchange
    allCookies.forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: '/',
      })
    })
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookies = cookieStore.getAll()
            console.log('[Auth Callback] getAll() called, returning', cookies.length, 'cookies')
            return cookies
          },
          setAll(cookiesToSet) {
            console.log('[Auth Callback] setAll() called with', cookiesToSet.length, 'cookies')
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookie in cookieStore (for Supabase to read)
              cookieStore.set(name, value, options)
              
              // CRITICAL: Also set cookie directly on redirect response
              // This ensures cookies are included in the redirect response
              redirectResponse.cookies.set(name, value, options || {})
              
              // Track for logging
              cookiesSetDuringExchange.push({ name, value, options: options || {} })
              console.log('[Auth Callback] Set cookie on response:', name, 'with options:', JSON.stringify(options))
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] ===== EXCHANGE ERROR =====')
      console.error('[Auth Callback] Error:', error.message)
      const errorUrl = new URL('/auth/auth-code-error', url.origin)
      errorUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errorUrl)
    }

    // CRITICAL: Wait for deferred callbacks to execute
    // In supabase-js v2.91.0+, exchangeCodeForSession() defers SIGNED_IN event notifications
    // using setTimeout, which means setAll() may be called after the function resolves.
    // We need to wait for the next event loop tick to ensure cookies are set on the response.
    // This is a workaround for the known regression: https://github.com/supabase/supabase-js/issues/2037
    // 
    // Wait for deferred callbacks to execute - use a small delay to ensure setAll() completes
    // before we return the response. Without this, cookies are set after the response is sent.
    // The delay allows the setTimeout in supabase-js to execute and call our setAll() callback.
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Log after exchange for debugging
    if (process.env.NODE_ENV === 'development') {
      const authToken = cookiesSetDuringExchange.find(c => c.name.includes('auth-token') && !c.name.includes('code-verifier'))
      console.log('[Auth Callback] ===== EXCHANGE SUCCESS =====')
      console.log('[Auth Callback] Auth token cookie:', authToken ? `SET ✅ (${authToken.name})` : 'MISSING ❌')
      console.log('[Auth Callback] Total cookies set during exchange:', cookiesSetDuringExchange.length)
      console.log('[Auth Callback] Cookies on redirect response:', cookiesSetDuringExchange.map(c => c.name).join(', '))
      
      // Also verify cookies are actually on the redirect response
      const responseCookies = redirectResponse.cookies.getAll()
      const responseAuthToken = responseCookies.find(c => c.name.includes('auth-token') && !c.name.includes('code-verifier'))
      console.log('[Auth Callback] Cookies on redirect response object:', responseCookies.length)
      console.log('[Auth Callback] Auth token on redirect response:', responseAuthToken ? `SET ✅ (${responseAuthToken.name})` : 'MISSING ❌')
      
      console.log('[Auth Callback] Redirecting to:', nextPath)
      console.log('[Auth Callback] ============================')
    }

    return redirectResponse
  }

  // No code and no error - this shouldn't happen for a real OAuth callback
  // If someone accesses /auth/callback directly without OAuth params, redirect to login
  // This prevents error pages from showing up due to prefetching or stale browser history
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Auth Callback] ===== ACCESSED WITHOUT OAUTH PARAMS =====')
    console.warn('[Auth Callback] This is likely due to prefetching or stale browser history')
    console.warn('[Auth Callback] All URL params:', Object.fromEntries(url.searchParams))
    console.warn('[Auth Callback] Full URL:', url.toString())
  }
  
  // Redirect to login instead of showing an error page
  // This prevents confusing error messages when the route is accessed unintentionally
  return NextResponse.redirect(new URL('/auth/login', url.origin))
}