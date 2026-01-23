'use client'

import { useInfiniteQuery } from '@/hooks/use-infinite-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function formatLfgSlots(slotsFilled: number | null, slotsTotal: number | null) {
  if (!slotsTotal) {
    return "Open slots"
  }
  return `${slotsFilled ?? 0} / ${slotsTotal}`
}

export function LfgList() {
  const { data, isLoading, fetchNextPage, hasMore, isFetching } = useInfiniteQuery({
    tableName: 'lfg_posts',
    columns: 'title,window_text,intent,slots_total,slots_filled,status',
    pageSize: 6,
    trailingQuery: (query) => query.order('created_at', { ascending: false }),
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
        <p>No LFG posts yet.</p>
        <p className="text-sm mt-2">Be the first to post an LFG!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {data.map((post: any) => (
        <Card key={post.id || post.title} className="border-border/60 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full text-xs uppercase tracking-[0.2em]">
                {post.status || 'Open'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {post.window_text || "Time window TBD"}
              </span>
            </div>
            <CardTitle className="font-display text-xl">
              {post.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>{post.intent || "Intent to be updated"}</span>
            <span>{formatLfgSlots(post.slots_filled, post.slots_total)}</span>
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
              'Load more posts'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
