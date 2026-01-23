"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/profiles"

export interface UserProfileWithEmail extends Profile {
  email?: string
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<UserProfileWithEmail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Add email from auth user
      setProfile({
        ...(data as Profile),
        email: user.email,
      })
      setLoading(false)
    }

    fetchProfile()
  }, [])

  return { profile, loading }
}
