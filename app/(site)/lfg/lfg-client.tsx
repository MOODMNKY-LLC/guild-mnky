'use client'

import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'
import { RealtimeChat } from '@/components/realtime-chat'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LfgRealtimePanel() {
  const username = useCurrentUserName() || 'Anonymous'
  
  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader>
        <CardTitle className="font-display text-lg">Live coordination</CardTitle>
        <CardDescription>
          Chat and see who's active on the LFG board
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="viewers">
              <Users className="h-4 w-4 mr-2" />
              Viewers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-4">
            <div className="h-[400px] rounded-lg border border-border/60 overflow-hidden">
              <RealtimeChat 
                roomName="lfg-board" 
                username={username}
              />
            </div>
          </TabsContent>
          <TabsContent value="viewers" className="mt-4">
            <RealtimeAvatarStack roomName="lfg-page" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
