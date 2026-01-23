'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { acceptGuardianOath } from '@/app/(site)/sherpa/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const oathPrinciples = [
  {
    number: 'I',
    title: 'Nurture Kindness',
    description: 'I will be patient, understanding, and supportive',
  },
  {
    number: 'II',
    title: 'Share The Light',
    description: 'I will teach and learn with respect and enthusiasm',
  },
  {
    number: 'III',
    title: 'Honor Others',
    description: 'I will respect diverse perspectives and skill levels',
  },
  {
    number: 'IV',
    title: 'Stand Together',
    description: 'I will commit to completing sessions and supporting my fireteam',
  },
]

interface GuardianOathModalProps {
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccepted?: () => void
}

export function GuardianOathModal({ sessionId, open, onOpenChange, onAccepted }: GuardianOathModalProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const result = await acceptGuardianOath(sessionId)
      
      if (result.success) {
        if (result.alreadyAccepted) {
          toast.info('You have already accepted the Guardian Oath for this session')
        } else {
          toast.success('Guardian Oath accepted!', {
            description: 'Thank you for committing to these principles.',
          })
        }
        onOpenChange(false)
        onAccepted?.()
        router.refresh()
      }
    } catch (error: any) {
      toast.error('Failed to accept oath', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Guardian Oath</DialogTitle>
          <DialogDescription>
            Before starting this session, all participants must accept the Guardian Oath.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {oathPrinciples.map((principle) => (
            <div key={principle.number} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {principle.number}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold">{principle.title}</h4>
                <p className="text-sm text-muted-foreground">{principle.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAccepting}
          >
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={isAccepting}>
            {isAccepting ? 'Accepting...' : 'Accept Oath'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
