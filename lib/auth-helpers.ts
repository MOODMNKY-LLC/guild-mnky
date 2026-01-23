import { createClient } from "@/lib/supabase/server"

/**
 * Check if the current user has admin role
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return false
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.role === 'admin'
}

/**
 * Check if the current user has officer or admin role
 * @returns Promise<boolean> - true if user is officer or admin, false otherwise
 */
export async function isOfficerOrAdmin(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return false
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.role === 'officer' || profile.role === 'admin'
}

/**
 * Get the current user's role
 * @returns Promise<'member' | 'officer' | 'admin' | null> - user's role or null if not found
 */
export async function getUserRole(): Promise<'member' | 'officer' | 'admin' | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile.role as 'member' | 'officer' | 'admin'
}
