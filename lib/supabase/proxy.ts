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
  
  // Determine if we're in development (localhost) or production
  const isDevelopment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Only create a new response if we don't already have one (e.g., redirect response)
          if (!redirectResponse) {
            supabaseResponse = NextResponse.next({
              request,
            });
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
      cookieOptions: {
        domain: isDevelopment ? '127.0.0.1' : undefined, // Explicitly set domain to match Supabase CLI binding
        secure: !isDevelopment, // false for HTTP localhost, true for HTTPS production
        sameSite: 'lax', // Lax for localhost, will be overridden to None for cross-site OAuth in production
        path: '/',
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
