import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components.
 * Uses @supabase/ssr with default cookie handling.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
  );
}
