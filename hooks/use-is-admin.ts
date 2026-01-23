"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Hook to check if the current user is an admin
 * @returns {boolean | null} - true if admin, false if not, null while loading
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setIsAdmin(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        setIsAdmin(false)
        return
      }

      setIsAdmin(profile.role === 'admin')
    }

    checkAdmin()
  }, [])

  return isAdmin
}
