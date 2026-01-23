import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest, redirectResponse?: NextResponse) {
  // If a redirect response is provided (e.g., for OAuth callback redirects),
  // use it as the base response, otherwise create a new one
  let supabaseResponse = redirectResponse || NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // CRITICAL: Always create a new response if we don't have one
          // This ensures cookies are properly set on the response
          if (!redirectResponse) {
            supabaseResponse = NextResponse.next({
              request,
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );

          // Debug logging
          if (process.env.NODE_ENV === 'development' && cookiesToSet.length > 0) {
            console.log('[Proxy] Setting cookies:', cookiesToSet.map(c => ({
              name: c.name,
              valueLength: c.value.length,
              options: c.options
            })))
          }
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
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // getClaims() validates the JWT signature against the project's published public keys
  // every time, ensuring secure token validation without relying on Auth server liveness
  await supabase.auth.getClaims();

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
