'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { joinLfgPost, leaveLfgPost, closeLfgPost } from '@/app/(site)/lfg/actions'
import { toast } from 'sonner'
import { UserPlus, UserMinus, X } from 'lucide-react'

interface LfgJoinButtonProps {
  lfgPostId: string
  slotsTotal: number
  slotsFilled: number
  status: string
  isCreator: boolean
  isJoined: boolean
}

export function LfgJoinButton({ 
  lfgPostId, 
  slotsTotal, 
  slotsFilled, 
  status,
  isCreator,
  isJoined 
}: LfgJoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [joined, setJoined] = useState(isJoined)
  const [currentSlotsFilled, setCurrentSlotsFilled] = useState(slotsFilled)
  const [currentStatus, setCurrentStatus] = useState(status)

  const isFull = currentSlotsFilled >= slotsTotal
  const isClosed = currentStatus === 'closed' || currentStatus === 'cancelled'

  async function handleJoin() {
    setIsLoading(true)
    try {
      await joinLfgPost(lfgPostId)
      setJoined(true)
      setCurrentSlotsFilled(prev => prev + 1)
      if (currentSlotsFilled + 1 >= slotsTotal) {
        setCurrentStatus('full')
      }
      toast.success('Joined LFG post!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLeave() {
    setIsLoading(true)
    try {
      await leaveLfgPost(lfgPostId)
      setJoined(false)
      setCurrentSlotsFilled(prev => Math.max(0, prev - 1))
      if (currentStatus === 'full') {
        setCurrentStatus('open')
      }
      toast.success('Left LFG post')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to leave'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleClose() {
    setIsLoading(true)
    try {
      await closeLfgPost(lfgPostId)
      setCurrentStatus('closed')
      toast.success('LFG post closed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to close'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isClosed) {
    return (
      <Button variant="outline" disabled>
        <X className="mr-2 h-4 w-4" />
        Closed
      </Button>
    )
  }

  if (isCreator) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          <X className="mr-2 h-4 w-4" />
          Close Post
        </Button>
        <div className="text-sm text-muted-foreground flex items-center">
          {currentSlotsFilled}/{slotsTotal} slots filled
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <Button variant="outline" onClick={handleLeave} disabled={isLoading}>
        <UserMinus className="mr-2 h-4 w-4" />
        Leave
      </Button>
    )
  }

  if (isFull) {
    return (
      <Button variant="outline" disabled>
        Full ({currentSlotsFilled}/{slotsTotal})
      </Button>
    )
  }

  return (
    <Button onClick={handleJoin} disabled={isLoading}>
      <UserPlus className="mr-2 h-4 w-4" />
      Join ({currentSlotsFilled}/{slotsTotal})
    </Button>
  )
}
