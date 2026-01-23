import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
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
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Custom storage for PKCE verifier in cookies
        storage: {
          getItem: (key: string) => {
            // For PKCE-related keys, read from cookieStore
            if (key.includes('verifier') || key.includes('code') || key.includes('pkce')) {
              try {
                const cookie = cookieStore.get(key)
                return cookie?.value || null
              } catch {
                return null
              }
            }
            return null
          },
          setItem: () => {}, // Server components don't set PKCE items
          removeItem: () => {}, // Server components don't remove PKCE items
        },
      },
    },
  );
}
