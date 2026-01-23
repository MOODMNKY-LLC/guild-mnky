import { createClient } from '@/lib/supabase/server'

export interface Profile {
  id: string
  full_name: string | null
  username: string | null
  website: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Get the current user's profile
 * Returns null if user is not authenticated or profile doesn't exist
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return null
  }

  return data as Profile
}

/**
 * Get a profile by user ID
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Profile
}
