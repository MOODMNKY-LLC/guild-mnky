'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { rsvpToEvent, removeRSVP } from '@/app/(site)/events/actions'
import { toast } from 'sonner'
import { Check, Calendar, X } from 'lucide-react'

interface EventRSVPButtonProps {
  eventId: string
  currentStatus?: 'going' | 'maybe' | 'declined' | null
  isRSVPed: boolean
}

export function EventRSVPButton({ eventId, currentStatus, isRSVPed }: EventRSVPButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'going' | 'maybe' | 'declined' | null>(currentStatus || null)

  async function handleRSVP(newStatus: 'going' | 'maybe' | 'declined') {
    setIsLoading(true)
    try {
      await rsvpToEvent({
        event_id: eventId,
        status: newStatus,
      })
      setStatus(newStatus)
      toast.success(`RSVP updated: ${newStatus}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to RSVP'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRemoveRSVP() {
    setIsLoading(true)
    try {
      await removeRSVP(eventId)
      setStatus(null)
      toast.success('RSVP removed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove RSVP'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isRSVPed && !status) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            <Calendar className="mr-2 h-4 w-4" />
            RSVP
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleRSVP('going')}>
            <Check className="mr-2 h-4 w-4" />
            Going
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRSVP('maybe')}>
            Maybe
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRSVP('declined')}>
            <X className="mr-2 h-4 w-4" />
            Can't Make It
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={status === 'going' ? 'default' : 'outline'} 
          disabled={isLoading}
        >
          {status === 'going' && <Check className="mr-2 h-4 w-4" />}
          {status === 'maybe' && 'Maybe'}
          {status === 'declined' && <X className="mr-2 h-4 w-4" />}
          {status || 'RSVP'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleRSVP('going')}
          disabled={status === 'going'}
        >
          <Check className="mr-2 h-4 w-4" />
          Going
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleRSVP('maybe')}
          disabled={status === 'maybe'}
        >
          Maybe
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleRSVP('declined')}
          disabled={status === 'declined'}
        >
          <X className="mr-2 h-4 w-4" />
          Can't Make It
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRemoveRSVP} className="text-destructive">
          Remove RSVP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
