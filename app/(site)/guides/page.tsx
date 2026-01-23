import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/site/page-shell";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

const fallbackGuides = [
  {
    title: "Raid Callouts: Clean Room Rotations",
    tag: "Raid Guide",
    updated: "Updated 3 days ago",
  },
  {
    title: "Support Build Library",
    tag: "Builds",
    updated: "Updated last week",
  },
  {
    title: "New Member Onboarding",
    tag: "Community",
    updated: "Updated 2 weeks ago",
  },
  {
    title: "LFG Etiquette and Expectations",
    tag: "Culture",
    updated: "Updated 1 month ago",
  },
];

const knowledgeFlow = [
  {
    title: "Authored in Notion",
    description:
      "Leadership drafts, edits, and publishes in a shared Notion workspace.",
  },
  {
    title: "Synced to the HQ",
    description:
      "A scheduled job pulls approved guides into the app for fast access.",
  },
  {
    title: "Visible to the community",
    description:
      "Guides stay pinned and searchable, so tribal knowledge becomes shared memory.",
  },
];

function formatGuideUpdated(updatedAt: string | null) {
  if (!updatedAt) {
    return "Updated recently";
  }
  const date = new Date(updatedAt);
  return `Updated ${date.toLocaleDateString("en-US")}`;
}

async function getGuides() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("title,tag,updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(8);

  return data ?? [];
}

async function GuidesContent() {
  const guides = await getGuides();
  const displayGuides =
    guides.length > 0
      ? guides.map((guide) => ({
          title: guide.title,
          tag: guide.tag ?? "Guide",
          updated: formatGuideUpdated(guide.updated_at),
        }))
      : fallbackGuides;

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Guides & Knowledge
          </p>
          <h1 className="font-display text-4xl">
            Keep the playbook close at hand
          </h1>
          <p className="mt-3 text-muted-foreground">
            This is where the clan documents what it learns, so every new
            member starts ahead of the curve.
          </p>
        </div>
        <Button size="lg" variant="outline">
          Publish a guide
        </Button>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {displayGuides.map((guide) => (
            <Card key={guide.title} className="border-border/60 bg-card/80">
              <CardHeader>
                <Badge className="w-fit rounded-full text-xs uppercase tracking-[0.2em]">
                  {guide.tag}
                </Badge>
                <CardTitle className="font-display text-xl">
                  {guide.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {guide.updated}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Knowledge flow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {knowledgeFlow.map((step) => (
              <div key={step.title}>
                <p className="font-semibold text-foreground">{step.title}</p>
                <p>{step.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default async function GuidesPage() {
  return (
    <PageShell>
      <Suspense fallback={<div>Loading guides...</div>}>
        <GuidesContent />
      </Suspense>
    </PageShell>
  );
}
