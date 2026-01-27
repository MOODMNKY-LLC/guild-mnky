import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserCommunity } from "@/lib/community-helpers";
import { OathbreakerPenaltyDisplay } from "@/components/sherpa/oathbreaker-penalty-display";
import { OathkeeperBadge } from "@/components/sherpa/oathkeeper-badge";

const sherpaPrinciples = [
  "Nurture Kindness: Be patient, understanding, and supportive",
  "Share The Light: Teach and learn with respect and enthusiasm",
  "Honor Others: Respect diverse perspectives and skill levels",
  "Stand Together: Commit to completing sessions and supporting your fireteam",
];

async function getSherpaStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { 
      isSherpa: false, 
      hasApplication: false, 
      totalSherpas: 0,
      activeSessions: 0,
      openRequests: 0 
    };
  }

  const communityId = await getUserCommunity(user.id);
  if (!communityId) {
    return { 
      isSherpa: false, 
      hasApplication: false, 
      totalSherpas: 0,
      activeSessions: 0,
      openRequests: 0 
    };
  }

  // Check if user is a Sherpa
  const { data: sherpa } = await supabase
    .from('sherpas')
    .select('id, oathkeeper_score, total_sessions_completed, is_active')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .eq('is_active', true)
    .single();

  // Check if user has pending application
  const { data: application } = await supabase
    .from('sherpa_applications')
    .select('id, status')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .single();

  // Get community stats
  const { count: totalSherpas } = await supabase
    .from('sherpas')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('is_active', true);

  const { count: activeSessions } = await supabase
    .from('sherpa_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .in('status', ['scheduled', 'in_progress']);

  const { count: openRequests } = await supabase
    .from('sherpa_requests')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'open');

  return {
    isSherpa: !!sherpa,
    hasApplication: !!application,
    sherpaData: sherpa,
    totalSherpas: totalSherpas || 0,
    activeSessions: activeSessions || 0,
    openRequests: openRequests || 0,
  };
}

async function SherpaContent() {
  const stats = await getSherpaStats();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      {user && <OathbreakerPenaltyDisplay userId={user.id} variant="banner" />}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sherpa Hub
          </p>
          <h1 className="font-display text-4xl">
            Teach, Learn, and Grow Together
          </h1>
          <p className="mt-3 text-muted-foreground">
            Connect experienced players with those seeking guidance. Built on the principles of the Guardian Oath.
          </p>
        </div>
        <div className="flex gap-2">
          {!stats.isSherpa && !stats.hasApplication && (
            <Button asChild>
              <Link href="/sherpa/apply">Apply to be a Sherpa</Link>
            </Button>
          )}
          {stats.hasApplication && (
            <Button variant="outline" disabled>
              Application Pending
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/sherpa/requests">Browse Requests</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardDescription>Active Sherpas</CardDescription>
                <CardTitle className="text-3xl">{stats.totalSherpas}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardDescription>Active Sessions</CardDescription>
                <CardTitle className="text-3xl">{stats.activeSessions}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-2">
                <CardDescription>Open Requests</CardDescription>
                <CardTitle className="text-3xl">{stats.openRequests}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Sherpa Status Card */}
          {stats.isSherpa && stats.sherpaData && (
            <Card className="border-border/60 bg-card/80">
              <CardHeader>
                <CardTitle className="font-display text-xl">Your Sherpa Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Oathkeeper Score</span>
                  <OathkeeperBadge 
                    score={stats.sherpaData.oathkeeper_score} 
                    variant="detailed"
                    showScore={true}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sessions Completed</span>
                  <span className="font-semibold">{stats.sherpaData.total_sessions_completed || 0}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/sherpa/sessions">Manage Sessions</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/sherpa/requests">View Requests</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/sherpa/requests">
                  Request Help from a Sherpa
                </Link>
              </Button>
              {stats.isSherpa && (
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/sherpa/sessions">
                    Manage Sessions
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/sherpa/sessions">
                  Browse All Sessions
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Guardian Oath
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {sherpaPrinciples.map((principle, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">{idx + 1}.</span>
                  <p>{principle}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

export default async function SherpaPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading Sherpa Hub...</div>}>
        <SherpaContent />
      </Suspense>
    </PageShell>
  );
}
