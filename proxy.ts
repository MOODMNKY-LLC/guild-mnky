import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  // If Discord redirects to root with OAuth parameters, redirect to callback route
  // This handles both success (code) and error cases from Supabase OAuth
  if (request.nextUrl.pathname === '/') {
    const hasCode = request.nextUrl.searchParams.has('code')
    const hasError = request.nextUrl.searchParams.has('error')
    
    // Only redirect to callback if this is actually an OAuth callback
    if (hasCode || hasError) {
      const callbackUrl = new URL('/auth/callback', request.url)
      
      // Preserve all OAuth-related query parameters
      if (hasCode) {
        callbackUrl.searchParams.set('code', request.nextUrl.searchParams.get('code')!)
      }
      if (hasError) {
        callbackUrl.searchParams.set('error', request.nextUrl.searchParams.get('error')!)
        const errorDescription = request.nextUrl.searchParams.get('error_description')
        const errorCode = request.nextUrl.searchParams.get('error_code')
        if (errorDescription) {
          callbackUrl.searchParams.set('error_description', errorDescription)
        }
        if (errorCode) {
          callbackUrl.searchParams.set('error_code', errorCode)
        }
      }
      
      const next = request.nextUrl.searchParams.get('next') ?? '/protected'
      callbackUrl.searchParams.set('next', next)
      
      const redirectResponse = NextResponse.redirect(callbackUrl)
      return updateSession(request, redirectResponse)
    }
  }

  // Update user's auth session
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (OAuth callback route - MUST be excluded to avoid interfering with token exchange)
     * - auth/bungie/* (Bungie auth routes manage their own redirects and state)
     * - api/auth/discord (OAuth initiation route - MUST be excluded to avoid interfering with code verifier cookie setting)
     * - Static assets (images, etc.)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/bungie|api/auth/discord|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// CRITICAL: The proxy MUST NOT run on:
// 1. /auth/callback - The callback route handles its own session cookie management after exchangeCodeForSession()
//    Running updateSession() on the callback can interfere with the token exchange process
// 2. /api/auth/discord - The OAuth initiation route sets the code verifier cookie server-side
//    Running updateSession() before the code verifier is set can interfere with OAuth flow
