import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 *
 * Uses default localStorage behavior - no custom cookie handling needed.
 * PKCE code verifier will be stored in localStorage by default.
 */
export function createClient() {
  // Use the same key as server client for consistency
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: {
        // Enable automatic session detection from URL for PKCE flow
        detectSessionInUrl: true,
      },
    }
  );
}
