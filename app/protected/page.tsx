import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/server'

async function ProtectedContent() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{data.claims.email}</span>
      </p>
      <LogoutButton />
    </div>
  )
}

export default async function ProtectedPage() {
  return (
    <Suspense fallback={<div className="flex h-svh w-full items-center justify-center">Loading...</div>}>
      <ProtectedContent />
    </Suspense>
  )
}
