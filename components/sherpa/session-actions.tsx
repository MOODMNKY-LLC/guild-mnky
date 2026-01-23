'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { startSherpaSession, completeSherpaSession } from '@/app/(site)/sherpa/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { GuardianOathModal } from './guardian-oath-modal'

interface SessionActionsProps {
  sessionId: string
  status: string
  isSherpa: boolean
}

export function SessionActions({ sessionId, status, isSherpa }: SessionActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showOathModal, setShowOathModal] = useState(false)

  async function handleStart() {
    setIsLoading(true)
    try {
      const result = await startSherpaSession(sessionId)
      if (result.success) {
        toast.success('Session started!', {
          description: 'The session is now in progress.',
        })
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to start session', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleComplete() {
    setIsLoading(true)
    try {
      const result = await completeSherpaSession(sessionId)
      if (result.success) {
        toast.success('Session completed!', {
          description: 'Thank you for your service.',
        })
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to complete session', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'scheduled' && isSherpa) {
    return (
      <>
        <Button onClick={() => setShowOathModal(true)} disabled={isLoading}>
          Start Session
        </Button>
        <GuardianOathModal
          sessionId={sessionId}
          open={showOathModal}
          onOpenChange={setShowOathModal}
          onAccepted={handleStart}
        />
      </>
    )
  }

  if (status === 'in_progress' && isSherpa) {
    return (
      <Button onClick={handleComplete} disabled={isLoading}>
        {isLoading ? 'Completing...' : 'Complete Session'}
      </Button>
    )
  }

  return null
}
