import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { getUserCommunity } from "@/lib/community-helpers";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { OathkeeperBadge } from "@/components/sherpa/oathkeeper-badge";
import { BungieVerificationCheck } from "@/components/sherpa/bungie-verification-check";
import Link from "next/link";
import { JoinSessionButton } from "@/components/sherpa/join-session-button";

async function getAvailableSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const communityId = user ? await getUserCommunity(user.id) : null;

  const { data: sessions } = await supabase
    .from('sherpa_sessions')
    .select(`
      id,
      activity_type,
      activity_name,
      difficulty,
      scheduled_start,
      scheduled_end,
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
    .eq('community_id', communityId || '')
    .eq('is_open_for_enrollment', true)
    .in('status', ['open_for_enrollment', 'scheduled'])
    .order('scheduled_start', { ascending: true })
    .limit(50);

  return {
    sessions: sessions || [],
    currentUserId: user?.id,
  };
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

function getSeekerCount(seekerIds: string[] | null): number {
  return seekerIds?.length || 0;
}

function hasAvailableSlots(currentSeekers: number, maxSeekers: number): boolean {
  return currentSeekers < maxSeekers;
}

async function BrowseSessionsContent() {
  const { sessions, currentUserId } = await getAvailableSessions();

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Discover Sessions
          </p>
          <h1 className="font-display text-4xl">
            Available Sherpa Sessions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Browse and join available teaching sessions. Sessions require Bungie account verification.
          </p>
        </div>
        <Link href="/sherpa/sessions">
          <Button variant="outline" size="lg">
            View My Sessions
          </Button>
        </Link>
      </section>

      <section className="mt-10">
        {sessions.length === 0 ? (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No sessions available at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later or create your own session if you're a Sherpa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session: any) => {
              const sherpa = session.sherpas?.profiles;
              const currentSeekers = getSeekerCount(session.seeker_ids);
              const availableSlots = hasAvailableSlots(currentSeekers, session.max_seekers);
              const isEnrolled = session.seeker_ids?.includes(currentUserId || '');
              const enrollmentClosed = session.enrollment_closes_at 
                ? new Date(session.enrollment_closes_at) < new Date()
                : false;

              return (
                <Card key={session.id} className="border-border/60 bg-card/80">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="font-display text-xl">
                          {session.activity_name || session.activity_type}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline">{session.activity_type}</Badge>
                          {session.difficulty && (
                            <Badge variant="secondary">{session.difficulty}</Badge>
                          )}
                          <Badge variant="default">
                            {currentSeekers}/{session.max_seekers} Seekers
                          </Badge>
                          {!availableSlots && (
                            <Badge variant="destructive">Full</Badge>
                          )}
                          {enrollmentClosed && (
                            <Badge variant="secondary">Enrollment Closed</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.description && (
                      <p className="text-sm text-muted-foreground">{session.description}</p>
                    )}
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
                      {session.enrollment_closes_at && (
                        <>
                          <span>•</span>
                          <span>Enrollment closes: {formatSessionTime(session.enrollment_closes_at)}</span>
                        </>
                      )}
                    </div>
                    {!isEnrolled && availableSlots && !enrollmentClosed && (
                      <div className="space-y-2 pt-2">
                        <BungieVerificationCheck required={true} />
                        <div className="flex justify-end">
                          <JoinSessionButton sessionId={session.id} />
                        </div>
                      </div>
                    )}
                    {isEnrolled && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Link href={`/sherpa/sessions/${session.id}`}>
                          <Button variant="outline" size="sm">
                            View Session
                          </Button>
                        </Link>
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

export default async function BrowseSessionsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading sessions...</div>}>
        <BrowseSessionsContent />
      </Suspense>
    </PageShell>
  );
}
