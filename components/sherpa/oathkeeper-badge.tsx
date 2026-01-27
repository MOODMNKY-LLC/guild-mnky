'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, Award, Star, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OathkeeperBadgeProps {
  score: number | null | undefined
  variant?: 'default' | 'compact' | 'detailed'
  showScore?: boolean
  className?: string
}

export function OathkeeperBadge({ 
  score, 
  variant = 'default',
  showScore = true,
  className 
}: OathkeeperBadgeProps) {
  if (score === null || score === undefined) {
    // New Sherpa - no score yet
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <User className="h-3 w-3" />
        Novice
      </Badge>
    )
  }

  const getBadgeTier = (score: number) => {
    if (score >= 90) {
      return {
        name: 'Oathkeeper',
        icon: Shield,
        color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
        iconColor: 'text-yellow-600',
      }
    } else if (score >= 75) {
      return {
        name: 'Guide',
        icon: Award,
        color: 'bg-slate-500/20 text-slate-600 border-slate-500/50',
        iconColor: 'text-slate-600',
      }
    } else if (score >= 60) {
      return {
        name: 'Mentor',
        icon: Star,
        color: 'bg-orange-500/20 text-orange-600 border-orange-500/50',
        iconColor: 'text-orange-600',
      }
    } else {
      return {
        name: 'Novice',
        icon: User,
        color: 'bg-gray-500/20 text-gray-600 border-gray-500/50',
        iconColor: 'text-gray-600',
      }
    }
  }

  const tier = getBadgeTier(score)
  const Icon = tier.icon

  if (variant === 'compact') {
    return (
      <Badge variant="outline" className={cn("gap-1", tier.color, className)}>
        <Icon className={cn("h-3 w-3", tier.iconColor)} />
        {tier.name}
      </Badge>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className={cn("gap-1", tier.color)}>
          <Icon className={cn("h-3 w-3", tier.iconColor)} />
          {tier.name}
        </Badge>
        {showScore && (
          <span className="text-sm font-medium text-muted-foreground">
            {score.toFixed(1)}
          </span>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <Badge variant="outline" className={cn("gap-1", tier.color, className)}>
      <Icon className={cn("h-3 w-3", tier.iconColor)} />
      {tier.name}
      {showScore && <span className="ml-1">({score.toFixed(1)})</span>}
    </Badge>
  )
}
