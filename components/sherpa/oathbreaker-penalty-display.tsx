'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { checkActivePenalties } from '@/app/(site)/sherpa/actions'
import { createClient } from '@/lib/supabase/client'

interface OathbreakerPenaltyDisplayProps {
  userId: string
  variant?: 'banner' | 'inline' | 'compact'
  showDetails?: boolean
}

interface Penalty {
  id: string
  penalty_type: string
  penalty_start: string
  penalty_end: string
  reason: string | null
}

export function OathbreakerPenaltyDisplay({ 
  userId, 
  variant = 'banner',
  showDetails = true 
}: OathbreakerPenaltyDisplayProps) {
  const [penalty, setPenalty] = useState<Penalty | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPenalty() {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        const { data: penaltyData, error } = await supabase
          .from('oathbreaker_penalties')
          .select('id, penalty_type, penalty_start, penalty_end, reason')
          .eq('profile_id', userId)
          .eq('is_active', true)
          .gt('penalty_end', new Date().toISOString())
          .order('penalty_end', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading penalty:', error)
        } else if (penaltyData) {
          setPenalty(penaltyData)
        }
      } catch (error) {
        console.error('Error checking penalties:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPenalty()

    // Update countdown every minute
    const interval = setInterval(() => {
      if (penalty) {
        updateTimeRemaining()
      }
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [userId])

  function updateTimeRemaining() {
    if (!penalty) return

    const now = Date.now()
    const endTime = new Date(penalty.penalty_end).getTime()
    const remaining = endTime - now

    if (remaining <= 0) {
      setPenalty(null)
      setTimeRemaining('')
      return
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`)
    } else {
      setTimeRemaining(`${minutes}m`)
    }
  }

  useEffect(() => {
    if (penalty) {
      updateTimeRemaining()
      // Update countdown every second for real-time display
      const countdownInterval = setInterval(() => {
        updateTimeRemaining()
      }, 1000)
      return () => clearInterval(countdownInterval)
    }
  }, [penalty])

  if (loading) {
    return null
  }

  if (!penalty) {
    return null
  }

  const penaltyTypeLabels: Record<string, string> = {
    abandoned_session: 'Abandoned Session',
    repeated_offense: 'Repeated Offense',
    vote_to_resign: 'Vote to Resign',
    other: 'Other',
  }

  if (variant === 'compact') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Penalty Active
        {timeRemaining && <span className="ml-1">({timeRemaining})</span>}
      </Badge>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="text-sm text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Active penalty: {penaltyTypeLabels[penalty.penalty_type] || penalty.penalty_type}
          {timeRemaining && ` • ${timeRemaining} remaining`}
        </span>
      </div>
    )
  }

  // Banner variant (default)
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Oathbreaker Penalty Active</AlertTitle>
      <AlertDescription className="space-y-2">
        <div>
          You have an active penalty and cannot create or join sessions until it expires.
        </div>
        {showDetails && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{penaltyTypeLabels[penalty.penalty_type] || penalty.penalty_type}</Badge>
              {timeRemaining && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Time remaining: {timeRemaining}</span>
                </div>
              )}
            </div>
            {penalty.reason && (
              <div className="text-sm text-muted-foreground">
                Reason: {penalty.reason}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Penalty expires: {new Date(penalty.penalty_end).toLocaleString()}
            </div>
          </>
        )}
      </AlertDescription>
    </Alert>
  )
}
