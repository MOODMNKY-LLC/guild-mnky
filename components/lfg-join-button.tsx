'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { joinLfgPost, leaveLfgPost, closeLfgPost, deleteLfgPost } from '@/app/(site)/lfg/actions'
import { toast } from 'sonner'
import { UserPlus, UserMinus, X, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
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

  async function handleDelete() {
    // Confirm deletion since it's a destructive action
    if (!window.confirm('Are you sure you want to delete this LFG post? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteLfgPost(lfgPostId)
      toast.success('LFG post deleted')
      // Refresh the page to remove the deleted post from the list
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Creator controls (always shown for creators)
  const creatorControls = isCreator ? (
    <div className="flex gap-2 items-center">
      {!isClosed && (
        <Button variant="outline" onClick={handleClose} disabled={isLoading} size="sm">
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      )}
      <Button 
        variant="destructive" 
        onClick={handleDelete} 
        disabled={isLoading}
        size="sm"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
  ) : null

  // Join/Leave controls (shown for everyone, including creators)
  if (isClosed) {
    return (
      <div className="flex gap-2 items-center justify-end">
        {creatorControls}
        <Button variant="outline" disabled>
          <X className="mr-2 h-4 w-4" />
          Closed
        </Button>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="flex gap-2 items-center justify-end">
        {creatorControls}
        <Button variant="outline" onClick={handleLeave} disabled={isLoading}>
          <UserMinus className="mr-2 h-4 w-4" />
          Leave
        </Button>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="flex gap-2 items-center justify-end">
        {creatorControls}
        <Button variant="outline" disabled>
          Full ({currentSlotsFilled}/{slotsTotal})
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-center justify-end">
      {creatorControls}
      <Button onClick={handleJoin} disabled={isLoading}>
        <UserPlus className="mr-2 h-4 w-4" />
        Join ({currentSlotsFilled}/{slotsTotal})
      </Button>
    </div>
  )
}
