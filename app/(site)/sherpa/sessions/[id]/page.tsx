import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import { OathkeeperBadge } from "@/components/sherpa/oathkeeper-badge";
import { SessionActions } from "@/components/sherpa/session-actions";
import { OathkeeperRatingForm } from "@/components/sherpa/oathkeeper-rating-form";
import { BungieVerificationCheck } from "@/components/sherpa/bungie-verification-check";
import { JoinSessionButton } from "@/components/sherpa/join-session-button";
import { leaveSherpaSession } from "@/app/(site)/sherpa/actions";
import { LeaveSessionButton } from "@/components/sherpa/leave-session-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notFound } from "next/navigation";

async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: session, error } = await supabase
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
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return null;
  }

  // Get seeker profiles
  const seekerIds = (session.seeker_ids as string[]) || [];
  let seekerProfiles: any[] = [];
  
  if (seekerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, discord_role_ids')
      .in('id', seekerIds);
    
    seekerProfiles = profiles || [];
  }

  return {
    session,
    currentUserId: user?.id,
    seekerProfiles,
  };
}

function formatSessionTime(time: string | null) {
  if (!time) return 'TBD';
  const date = new Date(time);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
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

async function SessionDetailContent({ sessionId }: { sessionId: string }) {
  const data = await getSession(sessionId);
  
  if (!data) {
    notFound();
  }

  const { session, currentUserId, seekerProfiles } = data;
  const sherpaData = Array.isArray(session.sherpas) ? session.sherpas[0] : (session.sherpas as any);
  const sherpaProfile = Array.isArray(sherpaData?.profiles) ? sherpaData.profiles[0] : (sherpaData?.profiles as any);
  const sherpa = sherpaProfile;
  const isSherpa = currentUserId === sherpaData?.profile_id;
  const isSeeker = (session.seeker_ids as string[])?.includes(currentUserId || '');
  const currentSeekers = getSeekerCount(session.seeker_ids);
  const maxSeekers = session.max_seekers || 5;
  const availableSlots = hasAvailableSlots(currentSeekers, maxSeekers);
  const enrollmentClosed = session.enrollment_closes_at 
    ? new Date(session.enrollment_closes_at) < new Date()
    : false;

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/sherpa/sessions">
            <Button variant="ghost" size="sm" className="mb-4">
              ← Back to Sessions
            </Button>
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Session Details
          </p>
          <h1 className="font-display text-4xl">
            {session.activity_name || session.activity_type}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline">{session.activity_type}</Badge>
            {session.difficulty && (
              <Badge variant="secondary">{session.difficulty}</Badge>
            )}
            <Badge variant="default">
              {currentSeekers}/{maxSeekers} Seekers
            </Badge>
            {session.is_open_for_enrollment && (
              <Badge variant="default">Open Enrollment</Badge>
            )}
            {session.is_open_for_enrollment && !availableSlots && (
              <Badge variant="destructive">Full</Badge>
            )}
            {enrollmentClosed && (
              <Badge variant="secondary">Enrollment Closed</Badge>
            )}
          </div>
        </div>
        {(isSherpa || isSeeker) && (
          <div className="flex gap-2">
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
      </section>

      <div className="grid gap-6 mt-10 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{session.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Scheduled Start:</span>
                <p className="text-muted-foreground">{formatSessionTime(session.scheduled_start)}</p>
              </div>
              {session.scheduled_end && (
                <div>
                  <span className="font-semibold">Scheduled End:</span>
                  <p className="text-muted-foreground">{formatSessionTime(session.scheduled_end)}</p>
                </div>
              )}
              {session.enrollment_closes_at && (
                <div>
                  <span className="font-semibold">Enrollment Closes:</span>
                  <p className="text-muted-foreground">{formatSessionTime(session.enrollment_closes_at)}</p>
                </div>
              )}
              {session.actual_start && (
                <div>
                  <span className="font-semibold">Actual Start:</span>
                  <p className="text-muted-foreground">{formatSessionTime(session.actual_start)}</p>
                </div>
              )}
              {session.actual_end && (
                <div>
                  <span className="font-semibold">Actual End:</span>
                  <p className="text-muted-foreground">{formatSessionTime(session.actual_end)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sherpa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="font-semibold">
              {sherpa?.display_name || sherpa?.username || 'Unknown'}
            </div>
            {sherpaData?.oathkeeper_score !== null && sherpaData?.oathkeeper_score !== undefined && (
              <OathkeeperBadge 
                score={sherpaData.oathkeeper_score} 
                variant="detailed"
                showScore={true}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Participants ({currentSeekers}/{maxSeekers} Seekers)</CardTitle>
        </CardHeader>
        <CardContent>
          {seekerProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Seekers enrolled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {seekerProfiles.map((seeker: any) => {
                const isVerified = seeker.discord_role_ids?.includes(
                  process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID || ''
                ) ?? false;
                
                return (
                  <div key={seeker.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {seeker.display_name || seeker.username || 'Unknown'}
                      </span>
                      {isVerified && (
                        <Badge variant="outline" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    {isSherpa && seeker.id !== currentUserId && (
                      <Button variant="ghost" size="sm">
                        Remove
                      </Button>
                    )}
                    {isSeeker && seeker.id === currentUserId && (
                      <LeaveSessionButton sessionId={session.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {!isSherpa && !isSeeker && session.is_open_for_enrollment && availableSlots && !enrollmentClosed && (
            <div className="mt-4 space-y-2">
              <BungieVerificationCheck required={true} />
              <div className="flex justify-end">
                <JoinSessionButton sessionId={session.id} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Skip placeholder ID used for build validation
  if (id === '00000000-0000-0000-0000-000000000000' || !id) {
    return (
      <PageShell>
        <div>Loading session...</div>
      </PageShell>
    );
  }
  
  return (
    <PageShell>
      <Suspense fallback={<div>Loading session...</div>}>
        <SessionDetailContent sessionId={id} />
      </Suspense>
    </PageShell>
  );
}

// With cacheComponents enabled, we must return at least one real session ID
// This is used for build-time validation only - the page is still fully dynamic
export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const { data: sessions } = await supabase
      .from('sherpa_sessions')
      .select('id')
      .limit(1);
    
    if (sessions && sessions.length > 0) {
      return sessions.map(s => ({ id: s.id }));
    }
    
    // Fallback: return placeholder if no sessions exist
    return [{ id: '00000000-0000-0000-0000-000000000000' }];
  } catch (error) {
    // If database is not available during build, return placeholder
    return [{ id: '00000000-0000-0000-0000-000000000000' }];
  }
}
