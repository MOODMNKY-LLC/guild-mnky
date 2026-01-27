import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserCommunity } from "@/lib/community-helpers";
import { Suspense } from "react";
import { startSherpaSession, completeSherpaSession } from "@/app/(site)/sherpa/actions";
import { SessionActions } from "@/components/sherpa/session-actions";
import { OathkeeperRatingForm } from "@/components/sherpa/oathkeeper-rating-form";
import { SessionCreateForm } from "@/components/sherpa/session-create-form";
import { OathbreakerPenaltyDisplay } from "@/components/sherpa/oathbreaker-penalty-display";
import { OathkeeperBadge } from "@/components/sherpa/oathkeeper-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

async function getSherpaSessions(filter: 'all' | 'my' | 'available' = 'all') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const communityId = user ? await getUserCommunity(user.id) : null;

  let query = supabase
    .from('sherpa_sessions')
    .select(`
      id,
      activity_type,
      activity_name,
      difficulty,
      scheduled_start,
      scheduled_end,
      actual_start,
      actual_end,
      status,
      seeker_ids,
      max_seekers,
      is_open_for_enrollment,
      enrollment_closes_at,
      description,
      created_at,
      sherpas!inner (
        id,
        profile_id,
        oathkeeper_score,
        profiles!inner (
          id,
          display_name,
          username,
          avatar_url
        )
      )
    `)
    .eq('community_id', communityId || '');

  const { data: sessions } = await query
    .order('scheduled_start', { ascending: true })
    .limit(50);

  return {
    sessions: sessions || [],
    currentUserId: user?.id,
  };
}

function getSeekerCount(seekerIds: string[] | null): number {
  return seekerIds?.length || 0;
}

function formatSessionTime(time: string | null) {
  if (!time) return 'TBD';
  const date = new Date(time);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'scheduled':
      return 'default';
    case 'open_for_enrollment':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    case 'abandoned':
      return 'destructive';
    default:
      return 'outline';
  }
}

async function SessionsContent() {
  const { sessions, currentUserId } = await getSherpaSessions();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check for active penalties
  let hasActivePenalty = false;
  if (user) {
    const { data: penalty } = await supabase
      .from('oathbreaker_penalties')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .gt('penalty_end', new Date().toISOString())
      .maybeSingle();
    hasActivePenalty = !!penalty;
  }

  return (
    <>
      {user && <OathbreakerPenaltyDisplay userId={user.id} variant="banner" />}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sherpa Sessions
          </p>
          <h1 className="font-display text-4xl">
            Active Teaching Sessions
          </h1>
          <p className="mt-3 text-muted-foreground">
            View and manage Sherpa sessions. Join scheduled sessions or track your progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sherpa/sessions/browse">
            <Button variant="outline" size="lg">
              Browse Available
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" disabled={hasActivePenalty}>
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Sherpa Session</DialogTitle>
                <DialogDescription>
                  Schedule a new teaching session. Link to a request or create a standalone session.
                </DialogDescription>
              </DialogHeader>
              <SessionCreateForm />
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="mt-10">
        {sessions.length === 0 ? (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No sessions scheduled at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session: any) => {
              const sherpa = session.sherpas?.profiles;
              const isSherpa = currentUserId === session.sherpas?.profile_id;
              const isSeeker = (session.seeker_ids as string[])?.includes(currentUserId || '');
              const currentSeekers = getSeekerCount(session.seeker_ids);
              const maxSeekers = session.max_seekers || 5;
              const hasAvailableSlots = currentSeekers < maxSeekers;

              return (
                <Card key={session.id} className="border-border/60 bg-card/80">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-display text-xl">
                          {session.activity_name || session.activity_type}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline">{session.activity_type}</Badge>
                          {session.difficulty && (
                            <Badge variant="secondary">{session.difficulty}</Badge>
                          )}
                          <Badge variant={getStatusBadgeVariant(session.status)}>
                            {session.status.replace('_', ' ')}
                          </Badge>
                          {session.is_open_for_enrollment && (
                            <Badge variant="default">Open Enrollment</Badge>
                          )}
                          <Badge variant="outline">
                            {currentSeekers}/{maxSeekers} Seekers
                          </Badge>
                          {session.is_open_for_enrollment && !hasAvailableSlots && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>Sherpa: {sherpa?.display_name || sherpa?.username || 'Unknown'}</span>
                      {session.sherpas?.oathkeeper_score !== null && session.sherpas?.oathkeeper_score !== undefined && (
                        <>
                          <span>•</span>
                          <OathkeeperBadge 
                            score={session.sherpas.oathkeeper_score} 
                            variant="detailed"
                            showScore={true}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>Scheduled: {formatSessionTime(session.scheduled_start)}</span>
                      {session.actual_start && (
                        <>
                          <span>•</span>
                          <span>Started: {formatSessionTime(session.actual_start)}</span>
                        </>
                      )}
                      {session.actual_end && (
                        <>
                          <span>•</span>
                          <span>Completed: {formatSessionTime(session.actual_end)}</span>
                        </>
                      )}
                    </div>
                    {(isSherpa || isSeeker) && (
                      <div className="flex justify-end gap-2 pt-2">
                        <SessionActions
                          sessionId={session.id}
                          status={session.status}
                          isSherpa={isSherpa}
                        />
                        {session.status === 'completed' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Rate Session
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Rate Session Participants</DialogTitle>
                                <DialogDescription>
                                  Share your feedback about the session. Your ratings help improve the Sherpa program.
                                </DialogDescription>
                              </DialogHeader>
                              <OathkeeperRatingForm sessionId={session.id} />
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default async function SessionsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading sessions...</div>}>
        <SessionsContent />
      </Suspense>
    </PageShell>
  );
}
