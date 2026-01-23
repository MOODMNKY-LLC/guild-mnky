'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountClientProps {
  children: React.ReactNode
}

export function AccountClient({ children }: AccountClientProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a valid session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.error('No valid session found:', error)
          router.push('/auth/login')
          return
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  return <>{children}</>
}