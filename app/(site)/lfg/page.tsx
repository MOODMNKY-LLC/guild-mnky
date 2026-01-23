import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { LfgCreateForm } from "@/components/lfg-create-form";
import { LfgJoinButton } from "@/components/lfg-join-button";
import { LfgRealtimePanel } from "./lfg-client";
import { LfgList } from "./lfg-list";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { AvatarStack } from "@/components/avatar-stack";

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

  // If no posts, return empty arrays
  if (!posts || posts.length === 0) {
    return { 
      posts: [], 
      userMemberships: new Set<string>(),
      currentUserId: user?.id,
      postMembers: new Map<string, Array<{ id: string; display_name: string | null; full_name: string | null; username: string | null; avatar_url: string | null }>>()
    };
  }

  // Get all members for these posts with their profile data
  const postIds = posts.map(p => p.id);
  const { data: allMembers } = await supabase
    .from("lfg_members")
    .select(`
      lfg_post_id,
      profile_id,
      profiles (
        id,
        display_name,
        full_name,
        username,
        avatar_url
      )
    `)
    .in("lfg_post_id", postIds);

  // Organize members by post ID
  const postMembersMap = new Map<string, Array<{ id: string; display_name: string | null; full_name: string | null; username: string | null; avatar_url: string | null }>>();
  
  if (allMembers) {
    allMembers.forEach((member: any) => {
      // Supabase returns foreign key relationships as objects (not arrays) for single FK relationships
      const profile = member.profiles;
      if (!profile || !profile.id) return;
      
      const postId = member.lfg_post_id;
      
      if (!postMembersMap.has(postId)) {
        postMembersMap.set(postId, []);
      }
      
      postMembersMap.get(postId)!.push({
        id: profile.id,
        display_name: profile.display_name,
        full_name: profile.full_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
      });
    });
  }

  // If no user, still return posts but without memberships
  if (!user) {
    return { 
      posts, 
      userMemberships: new Set<string>(),
      currentUserId: undefined,
      postMembers: postMembersMap
    };
  }

  // Get user's memberships for these posts
  const { data: memberships } = await supabase
    .from("lfg_members")
    .select("lfg_post_id")
    .eq("profile_id", user.id)
    .in("lfg_post_id", postIds);

  const membershipSet = new Set(memberships?.map(m => m.lfg_post_id) || []);

  return { 
    posts, 
    userMemberships: membershipSet,
    currentUserId: user.id,
    postMembers: postMembersMap
  };
}

async function LfgContent() {
  const { posts, userMemberships, currentUserId, postMembers } = await getLfgPosts();
  
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
          members: postMembers.get(post.id) || [],
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
          members: [],
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
          {displayPosts.map((post) => {
            const isFallback = typeof post.id === 'string' && post.id.startsWith('fallback')
            const statusDisplay = post.status === 'open' ? 'Open' : 
                                 post.status === 'full' ? 'Full' :
                                 post.status === 'closed' ? 'Closed' :
                                 post.status === 'cancelled' ? 'Cancelled' : 'Open'
            
            return (
              <Card 
                key={post.title} 
                className={cn(
                  "border-border/60 bg-card/80",
                  isFallback && "border-dashed opacity-75"
                )}
              >
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {isFallback ? (
                      <Badge variant="outline" className="rounded-full text-xs uppercase tracking-[0.2em] border-amber-500/50 text-amber-600 dark:text-amber-400">
                        Demo
                      </Badge>
                    ) : (
                      <Badge className="rounded-full text-xs uppercase tracking-[0.2em]">
                        {statusDisplay}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post.window}
                    </span>
                  </div>
                  <CardTitle className="font-display text-xl">
                    {post.title}
                    {isFallback && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (Example)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {post.description && (
                    <p className="text-sm text-muted-foreground">{post.description}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>{post.slots}</span>
                  </div>
                  {/* Display RSVP'd users */}
                  {!isFallback && post.members && post.members.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          RSVP'd ({post.members.length}/{post.slotsTotal})
                        </span>
                      </div>
                      <AvatarStack
                        avatars={post.members.map((member) => ({
                          name: member.display_name || member.full_name || member.username || 'Unknown',
                          image: member.avatar_url || '',
                        }))}
                        maxAvatarsAmount={6}
                        orientation="vertical"
                        className="flex-wrap"
                      />
                    </div>
                  )}
                  {/* Only show buttons for real posts (not fallback posts) */}
                  {!isFallback && (
                    <div className="flex justify-end mt-2">
                      <LfgJoinButton
                        lfgPostId={post.id}
                        slotsTotal={post.slotsTotal ?? 6}
                        slotsFilled={post.slotsFilled ?? 0}
                        status={post.status ?? 'open'}
                        isCreator={post.isCreator ?? false}
                        isJoined={post.isJoined ?? false}
                      />
                    </div>
                  )}
                  {isFallback && (
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-muted-foreground italic">
                        Create a post to see action buttons
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
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
