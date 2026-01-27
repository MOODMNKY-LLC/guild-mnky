/**
 * Admin Supabase Client
 * 
 * Uses service role key to bypass RLS for admin operations
 * Only use this for server-side admin operations, never expose to client
 */

import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

// Export alias for backward compatibility
export const createAdminClient = getAdminClient
