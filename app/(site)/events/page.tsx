import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/server";
import { EventsRealtimePanel } from "./events-client";
import { EventsList } from "./events-list";
import { Suspense } from "react";

const fallbackEvents = [
  {
    title: "Vault of Glass Teaching Run",
    time: "Friday 8:00 PM ET",
    roles: ["Guide", "Runner", "Support"],
    slots: "4 / 6 filled",
  },
  {
    title: "Community Night: Chaos Drafts",
    time: "Saturday 9:30 PM ET",
    roles: ["Any role welcome"],
    slots: "12 / 16 filled",
  },
  {
    title: "Seasonal Challenge Push",
    time: "Sunday 7:00 PM ET",
    roles: ["Burst DPS", "Crowd control"],
    slots: "5 / 6 filled",
  },
];

const schedulingPrinciples = [
  {
    title: "Expectations stay visible",
    description:
      "Every event lists the roles needed, the pace, and the outcome we are chasing.",
  },
  {
    title: "Time boxes are respected",
    description:
      "Sessions start and stop on schedule to keep the week manageable.",
  },
  {
    title: "Teaching is explicit",
    description:
      "Teaching runs are flagged so new players can join without pressure.",
  },
];

function formatSlots(slotsFilled: number | null, slotsTotal: number | null) {
  if (!slotsTotal) {
    return "Open slots";
  }
  return `${slotsFilled ?? 0} / ${slotsTotal} filled`;
}

function formatEventTime(startAt: string | null) {
  if (!startAt) {
    return "Time to be announced";
  }
  const date = new Date(startAt);
  return date.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getEvents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title,start_at,roles,slots_total,slots_filled")
    .order("start_at", { ascending: true })
    .limit(6);

  return data ?? [];
}

async function EventsContent() {
  const events = await getEvents();
  const displayEvents =
    events.length > 0
      ? events.map((event) => ({
          title: event.title,
          time: formatEventTime(event.start_at),
          roles: event.roles ?? [],
          slots: formatSlots(event.slots_filled, event.slots_total),
        }))
      : fallbackEvents;

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Events & Scheduling
          </p>
          <h1 className="font-display text-4xl">Plan the week, not the chaos</h1>
          <p className="mt-3 text-muted-foreground">
            Events are treated like commitments. Clear roles, clear goals, and
            a shared expectation of success.
          </p>
        </div>
        <Button size="lg">Create an event</Button>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {displayEvents.map((event) => (
            <Card key={event.title} className="border-border/60 bg-card/80">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full text-xs uppercase tracking-[0.2em]">
                    Upcoming
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {event.time}
                  </span>
                </div>
                <CardTitle className="font-display text-xl">
                  {event.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  {event.roles.map((role: string) => (
                    <span
                      key={role}
                      className="rounded-full border border-border/70 px-3 py-1"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <span>{event.slots}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          <Card className="border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Scheduling principles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {schedulingPrinciples.map((principle) => (
                <div key={principle.title}>
                  <p className="font-semibold text-foreground">
                    {principle.title}
                  </p>
                  <p>{principle.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <EventsRealtimePanel />
        </div>
      </section>
    </>
  );
}

export default async function EventsPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading events...</div>}>
        <EventsContent />
      </Suspense>
    </PageShell>
  );
}
