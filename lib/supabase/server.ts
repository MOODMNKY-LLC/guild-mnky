import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Determine if we're in development (localhost) or production
  const isDevelopment = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1');

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
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
}
