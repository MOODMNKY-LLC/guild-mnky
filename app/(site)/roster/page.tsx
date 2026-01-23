import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

const fallbackRoster = [
  { name: "Nova", role: "Officer", focus: "Scheduling" },
  { name: "Cipher", role: "Guide", focus: "Teaching runs" },
  { name: "Rune", role: "Strategist", focus: "Build crafting" },
  { name: "Vale", role: "Organizer", focus: "Community events" },
  { name: "Echo", role: "Mentor", focus: "Onboarding" },
  { name: "Lyric", role: "Support", focus: "Roster health" },
];

const cultureNotes = [
  "Skill matters, but respect comes first.",
  "We show up prepared and communicate clearly.",
  "Teaching is a responsibility, not a favor.",
];

async function getRoster() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roster_members")
    .select("display_name,role,focus,is_officer")
    .order("is_officer", { ascending: false })
    .limit(12);

  return data ?? [];
}

async function RosterContent() {
  const roster = await getRoster();
  const displayRoster =
    roster.length > 0
      ? roster.map((member) => ({
          name: member.display_name,
          role: member.role ?? (member.is_officer ? "Officer" : "Member"),
          focus: member.focus ?? "Community support",
        }))
      : fallbackRoster;

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Roster
          </p>
          <h1 className="font-display text-4xl">
            The people who hold the line
          </h1>
          <p className="mt-3 text-muted-foreground">
            Visibility for leadership, mentorship, and participation so the
            community stays strong and balanced.
          </p>
        </div>
        <Button size="lg">Invite a member</Button>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {displayRoster.map((member) => (
            <Card key={member.name} className="border-border/60 bg-card/80">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {member.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-display text-lg">
                    {member.name}
                  </CardTitle>
                  <Badge className="mt-2 w-fit rounded-full text-xs uppercase tracking-[0.2em]">
                    {member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Focus: {member.focus}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Culture anchor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {cultureNotes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default async function RosterPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading roster...</div>}>
        <RosterContent />
      </Suspense>
    </PageShell>
  );
}
