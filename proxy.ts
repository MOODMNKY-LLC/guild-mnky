import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  // Debug logging for all requests
  if (process.env.NODE_ENV === 'development') {
    console.log('[Proxy] Request:', {
      pathname: request.nextUrl.pathname,
      hasCode: request.nextUrl.searchParams.has('code'),
      cookieCount: request.cookies.getAll().length,
      cookieNames: request.cookies.getAll().map(c => c.name),
    })
  }

  // If Discord redirects to root with a code parameter, redirect to callback route
  // This ensures the code is always handled server-side
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const code = request.nextUrl.searchParams.get('code')
    const next = request.nextUrl.searchParams.get('next') ?? '/account'
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code!)
    callbackUrl.searchParams.set('next', next)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Proxy] Redirecting OAuth callback:', {
        from: request.nextUrl.pathname,
        to: callbackUrl.pathname,
        codeLength: code?.length,
        next,
      })
    }

    const redirectResponse = NextResponse.redirect(callbackUrl)
    return updateSession(request, redirectResponse)
  }

  // update user's auth session
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
