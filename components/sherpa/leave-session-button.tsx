'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { leaveSherpaSession } from '@/app/(site)/sherpa/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function LeaveSessionButton({ sessionId }: { sessionId: string }) {
  const [isLeaving, setIsLeaving] = useState(false)
  const router = useRouter()

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this session?')) {
      return
    }

    setIsLeaving(true)
    try {
      const result = await leaveSherpaSession(sessionId)
      if (result.success) {
        toast.success('Left session successfully', {
          description: 'You have been removed from this session.',
        })
        router.push('/sherpa/sessions')
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to leave session', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <Button onClick={handleLeave} disabled={isLeaving} variant="outline" size="sm">
      {isLeaving ? 'Leaving...' : 'Leave Session'}
    </Button>
  )
}
