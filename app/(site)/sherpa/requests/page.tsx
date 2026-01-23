import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserCommunity } from "@/lib/community-helpers";
import { Suspense } from "react";
import { SherpaRequestForm } from "@/components/sherpa/request-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

async function getSherpaRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const communityId = user ? await getUserCommunity(user.id) : null;

  const { data: requests } = await supabase
    .from('sherpa_requests')
    .select(`
      id,
      activity_type,
      activity_name,
      difficulty,
      requested_slots,
      preferred_time_window,
      description,
      status,
      created_at,
      profiles!sherpa_requests_seeker_profile_id_fkey (
        id,
        display_name,
        username,
        avatar_url
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    requests: requests || [],
    currentUserId: user?.id,
  };
}

function formatTimeWindow(timeWindow: string | null) {
  if (!timeWindow) return 'Flexible';
  const date = new Date(timeWindow);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function RequestsContent() {
  const { requests, currentUserId } = await getSherpaRequests();

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Sherpa Requests
          </p>
          <h1 className="font-display text-4xl">
            Request Help from a Sherpa
          </h1>
          <p className="mt-3 text-muted-foreground">
            Need help with a raid, dungeon, or activity? Create a request and experienced Sherpas will reach out.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg">Create Request</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Sherpa Request</DialogTitle>
              <DialogDescription>
                Tell Sherpas what you need help with. They'll be able to claim your request and schedule a session.
              </DialogDescription>
            </DialogHeader>
            <SherpaRequestForm />
          </DialogContent>
        </Dialog>
      </section>

      <section className="mt-10">
        {requests.length === 0 ? (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No open requests at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">Be the first to create one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request: any) => (
              <Card key={request.id} className="border-border/60 bg-card/80">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-xl">
                        {request.activity_name || request.activity_type}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">{request.activity_type}</Badge>
                        {request.difficulty && (
                          <Badge variant="secondary">{request.difficulty}</Badge>
                        )}
                        <Badge>{request.status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.description && (
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>Players needed: {request.requested_slots}</span>
                    <span>•</span>
                    <span>Time: {formatTimeWindow(request.preferred_time_window)}</span>
                    <span>•</span>
                    <span>
                      Requested by: {request.profiles?.display_name || request.profiles?.username || 'Unknown'}
                    </span>
                  </div>
                  {currentUserId === request.profiles?.id && (
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/sherpa/requests/${request.id}`}>View Details</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default async function RequestsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading requests...</div>}>
        <RequestsContent />
      </Suspense>
    </PageShell>
  );
}
