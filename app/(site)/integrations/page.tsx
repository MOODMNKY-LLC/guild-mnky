import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/site/page-shell";

type Integration = {
  name: string;
  status: string;
  description: string;
  actions: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

const integrations: Integration[] = [
  {
    name: "Discord",
    status: "Primary",
    description:
      "Identity, roles, and announcements are synced from Discord to keep the community aligned.",
    actions: ["Role sync", "Membership gating", "Event pings"],
  },
  {
    name: "Notion",
    status: "Library",
    description:
      "Guides, playbooks, and documentation are authored in Notion, then published into the HQ.",
    actions: ["Docs sync", "Playbooks", "Announcements"],
  },
  {
    name: "Destiny 2",
    status: "Roadmap",
    description:
      "Opt-in linking for activity readiness, loadout snapshots, and seasonal progression.",
    actions: ["Bungie OAuth", "Readiness views", "Activity data"],
    ctaLabel: "Link Bungie account",
    ctaHref: "/auth/bungie/start",
  },
];

const roadmap = [
  "Discord auth is required for access.",
  "Notion sync starts with read-only publishing.",
  "Bungie linking stays opt-in and consent driven.",
];

export default function IntegrationsPage() {
  return (
    <PageShell>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Integrations
          </p>
          <h1 className="font-display text-4xl">
            The OS connects the tools we already trust
          </h1>
          <p className="mt-3 text-muted-foreground">
            Discord handles identity. Notion stores our knowledge. Destiny 2
            integration arrives with clear consent and purpose.
          </p>
        </div>
        <Button size="lg" variant="outline">
          View capability matrix
        </Button>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {integrations.map((integration) => (
          <Card key={integration.name} className="border-border/60 bg-card/80">
            <CardHeader>
              <Badge className="w-fit rounded-full text-xs uppercase tracking-[0.2em]">
                {integration.status}
              </Badge>
              <CardTitle className="font-display text-xl">
                {integration.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>{integration.description}</p>
              <div className="flex flex-wrap gap-2">
                {integration.actions.map((action) => (
                  <span
                    key={action}
                    className="rounded-full border border-border/70 px-3 py-1 text-xs"
                  >
                    {action}
                  </span>
                ))}
              </div>
              {integration.ctaHref && integration.ctaLabel ? (
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href={integration.ctaHref}>{integration.ctaLabel}</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Integration principles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {roadmap.map((note) => (
              <p key={note}>• {note}</p>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
