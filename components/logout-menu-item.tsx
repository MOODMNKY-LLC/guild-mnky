'use client'

import { createClient } from '@/lib/supabase/client'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutMenuItem() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <DropdownMenuItem onClick={logout} className="cursor-pointer">
      <LogOut className="mr-2 h-4 w-4" />
      <span>Log out</span>
    </DropdownMenuItem>
  )
}
