'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { joinSherpaSession } from '@/app/(site)/sherpa/actions'
import { toast } from 'sonner'

export function JoinSessionButton({ sessionId }: { sessionId: string }) {
  const [isJoining, setIsJoining] = useState(false)

  async function handleJoin() {
    setIsJoining(true)
    try {
      const result = await joinSherpaSession(sessionId)
      if (result.success) {
        toast.success('Successfully joined session!', {
          description: 'You have been enrolled in this session.',
        })
        // Refresh the page to show updated enrollment
        window.location.reload()
      }
    } catch (error: any) {
      toast.error('Failed to join session', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Button onClick={handleJoin} disabled={isJoining} size="sm">
      {isJoining ? 'Joining...' : 'Join Session'}
    </Button>
  )
}
