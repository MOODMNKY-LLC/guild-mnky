'use client'

import { useInfiniteQuery } from '@/hooks/use-infinite-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function formatSlots(slotsFilled: number | null, slotsTotal: number | null) {
  if (!slotsTotal) {
    return "Open slots"
  }
  return `${slotsFilled ?? 0} / ${slotsTotal} filled`
}

function formatEventTime(startAt: string | null) {
  if (!startAt) {
    return "Time to be announced"
  }
  const date = new Date(startAt)
  return date.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function EventsList() {
  const { data, isLoading, fetchNextPage, hasMore, isFetching } = useInfiniteQuery({
    tableName: 'events',
    columns: 'title,start_at,roles,slots_total,slots_filled',
    pageSize: 6,
    trailingQuery: (query) => query.order('start_at', { ascending: true }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No events scheduled yet.</p>
        <p className="text-sm mt-2">Check back soon or create the first event!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {data.map((event: any) => (
        <Card key={event.id || event.title} className="border-border/60 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full text-xs uppercase tracking-[0.2em]">
                Upcoming
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatEventTime(event.start_at)}
              </span>
            </div>
            <CardTitle className="font-display text-xl">
              {event.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {(event.roles || []).map((role: string) => (
                <span
                  key={role}
                  className="rounded-full border border-border/70 px-3 py-1"
                >
                  {role}
                </span>
              ))}
            </div>
            <span>{formatSlots(event.slots_filled, event.slots_total)}</span>
          </CardContent>
        </Card>
      ))}
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            variant="outline"
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more events'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
