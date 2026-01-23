import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { LfgCreateForm } from "@/components/lfg-create-form";
import { LfgJoinButton } from "@/components/lfg-join-button";
import { LfgRealtimePanel } from "./lfg-client";
import { LfgList } from "./lfg-list";
import { Suspense } from "react";

const fallbackLfgPosts = [
  {
    title: "Nightfall GM - Clean clears",
    window: "Tonight, 8:30 PM ET",
    intent: "Fast clears, comms on",
    slots: "2 / 3",
  },
  {
    title: "Teaching run - New raiders welcome",
    window: "Saturday, 6:00 PM ET",
    intent: "Patient walkthrough + callouts",
    slots: "5 / 6",
  },
  {
    title: "PVP team scrims",
    window: "Sunday, 9:00 PM ET",
    intent: "Practice tactics and rotations",
    slots: "8 / 10",
  },
];

const lfgPrinciples = [
  "Define the pace and intent up front.",
  "Share roles so the right people opt in.",
  "Close the post when the group is set.",
];

function formatLfgSlots(slotsFilled: number | null, slotsTotal: number | null) {
  if (!slotsTotal) {
    return "Open slots";
  }
  return `${slotsFilled ?? 0} / ${slotsTotal}`;
}

async function getLfgPosts() {
  const supabase = await createClient();
  
  // Get current user if authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: posts } = await supabase
    .from("lfg_posts")
    .select(`
      id,
      title,
      description,
      starts_at,
      slots_total,
      slots_filled,
      status,
      created_by
    `)
    .order("created_at", { ascending: false })
    .limit(6);

  if (!posts || !user) {
    return { posts: posts ?? [], userMemberships: new Set<string>() };
  }

  // Get user's memberships for these posts
  const postIds = posts.map(p => p.id);
  const { data: memberships } = await supabase
    .from("lfg_members")
    .select("lfg_post_id")
    .eq("profile_id", user.id)
    .in("lfg_post_id", postIds);

  const membershipSet = new Set(memberships?.map(m => m.lfg_post_id) || []);

  return { 
    posts, 
    userMemberships: membershipSet,
    currentUserId: user.id 
  };
}

async function LfgContent() {
  const { posts, userMemberships, currentUserId } = await getLfgPosts();
  
  const displayPosts =
    posts.length > 0
      ? posts.map((post) => ({
          id: post.id,
          title: post.title,
          description: post.description,
          window: post.starts_at 
            ? new Date(post.starts_at).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Time window TBD",
          slots: formatLfgSlots(post.slots_filled, post.slots_total),
          slotsTotal: post.slots_total,
          slotsFilled: post.slots_filled ?? 0,
          status: post.status,
          isCreator: post.created_by === currentUserId,
          isJoined: userMemberships.has(post.id),
        }))
      : fallbackLfgPosts.map((post, idx) => ({
          id: `fallback-${idx}`,
          ...post,
          description: post.intent || undefined,
          slotsTotal: 6,
          slotsFilled: parseInt(post.slots.split(' / ')[0]) || 0,
          status: 'open',
          isCreator: false,
          isJoined: false,
        }));

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            LFG Board
          </p>
          <h1 className="font-display text-4xl">
            Find the right run without the scroll
          </h1>
          <p className="mt-3 text-muted-foreground">
            LFG posts keep intent clear: activity, time window, and expectations
            all live in one card.
          </p>
        </div>
        <LfgCreateForm />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {displayPosts.map((post) => (
            <Card key={post.title} className="border-border/60 bg-card/80">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full text-xs uppercase tracking-[0.2em]">
                    Open
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {post.window}
                  </span>
                </div>
                <CardTitle className="font-display text-xl">
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {post.description && (
                  <p className="text-sm text-muted-foreground">{post.description}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                  <span>{post.slots}</span>
                </div>
                {typeof post.id === 'string' && !post.id.startsWith('fallback') && (
                  <div className="flex justify-end">
                    <LfgJoinButton
                      lfgPostId={post.id}
                      slotsTotal={post.slotsTotal}
                      slotsFilled={post.slotsFilled}
                      status={post.status}
                      isCreator={post.isCreator}
                      isJoined={post.isJoined}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                LFG guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {lfgPrinciples.map((principle) => (
                <p key={principle}>• {principle}</p>
              ))}
            </CardContent>
          </Card>
          <LfgRealtimePanel />
        </div>
      </section>
    </>
  );
}

export default async function LfgPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading LFG posts...</div>}>
        <LfgContent />
      </Suspense>
    </PageShell>
  );
}
