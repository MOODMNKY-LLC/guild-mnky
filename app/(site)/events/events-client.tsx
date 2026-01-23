'use client'

import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export function EventsRealtimePanel() {
  const username = useCurrentUserName() || 'Anonymous'
  
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Viewing now
          </CardTitle>
        </div>
        <CardDescription>
          See who's currently viewing events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RealtimeAvatarStack roomName="events-page" />
      </CardContent>
    </Card>
  )
}
