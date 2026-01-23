import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/site/page-shell";

const highlightStats = [
  { label: "Communities", value: "2" },
  { label: "Active Sherpas", value: "0+" },
  { label: "Sessions completed", value: "0+" },
  { label: "Guides & playbooks", value: "46" },
];

const pillars = [
  {
    title: "Community Hub",
    description:
      "A shared home for planning, coordination, and knowledge that does not vanish in chat scroll.",
  },
  {
    title: "Events & Scheduling",
    description:
      "Clear sessions, clear expectations. See who is in, what is needed, and why it matters.",
  },
  {
    title: "LFG Boards",
    description:
      "Structured groups with roles, time windows, and intent so every run starts aligned.",
  },
  {
    title: "Sherpa Hub",
    description:
      "Structured mentorship with Guardian Oath principles, Oathkeeper scoring, and session management for teaching and learning.",
  },
  {
    title: "Guides & Knowledge",
    description:
      "A living library of callouts, strategies, and community wisdom built over time.",
  },
];

const integrations = [
  {
    title: "Discord",
    note: "Primary identity and role sync. The social surface stays put.",
  },
  {
    title: "Notion",
    note: "Operational library for docs, playbooks, and long-form knowledge.",
  },
  {
    title: "Destiny 2",
    note: "Deep integration roadmap for activity-aware scheduling and readiness.",
  },
  {
    title: "Future Games",
    note: "A flexible integration layer for whatever the community plays next.",
  },
];

const roadmap: Array<{
  phase: string;
  title: string;
  status?: "complete" | "next" | "planned";
  items: string[];
}> = [
  {
    phase: "Phase 1",
    title: "Community OS MVP",
    status: "complete",
    items: ["Discord auth + role sync", "Events + LFG", "Guides + announcements", "Multi-community foundation"],
  },
  {
    phase: "Phase 2",
    title: "Sherpa Hub System",
    status: "complete",
    items: ["Sherpa applications", "Request system", "Session management", "Oathkeeper scoring", "Guardian Oath"],
  },
  {
    phase: "Phase 3",
    title: "Sherpa Enhancements",
    status: "next",
    items: ["Oathbreaker penalties", "Oathkeeper badges", "Vote to resign", "Admin review interface"],
  },
];

export default function HomePage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-lg">
        <div className="absolute inset-0">
          <Image
            src="/girth-app-bg.png"
            alt="Jupiter's Girth community skyline"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <Badge className="rounded-full px-4 py-1 text-xs uppercase tracking-[0.3em]">
              Community OS
            </Badge>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
              Multi-community platform built around respect, coordination,
              teaching, and the time we share together.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Games change. Communities last. We organize, teach, mentor, and show up
              prepared, so every session feels worth it. Supporting Jupiter's Girth and Sherpa Hub.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/protected">Enter the community</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sherpa">Explore Sherpa Hub</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/guides">Knowledge base</Link>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-xs items-end justify-center sm:max-w-sm">
            <div className="absolute -bottom-6 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
            <Image
              src="/girth-avatar.png"
              alt="Jupiter's Girth mascot"
              width={360}
              height={360}
              className="relative z-10 drop-shadow-[0_20px_40px_rgba(36,12,74,0.45)]"
            />
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-4">
        {highlightStats.map((stat) => (
          <Card key={stat.label} className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="font-display text-3xl">
                {stat.value}
              </CardTitle>
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              What this is
            </CardTitle>
            <CardDescription>
              A community HQ that respects time, keeps expectations clear, and
              builds a shared memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Events and LFG are structured, not buried.</p>
            <p>Sherpa Hub enables structured teaching and mentorship with Guardian Oath principles.</p>
            <p>Guides and callouts stay accessible.</p>
            <p>Roles keep leadership, mentoring, and availability visible.</p>
            <p>Multi-community support connects Jupiter's Girth and Sherpa Hub seamlessly.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              What this is not
            </CardTitle>
            <CardDescription>
              We are not replacing Discord or chasing a single game forever.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Discord is still the voice and social surface.</p>
            <p>This is not a grind-heavy or elitist environment.</p>
            <p>Destiny 2 is core, but the roadmap stays multi-game.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Core surfaces
            </p>
            <h2 className="font-display text-3xl">
              Built to coordinate without the noise
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/events">See the calendar</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="border-border/60 bg-card/75">
              <CardHeader>
                <CardTitle className="font-display text-xl">
                  {pillar.title}
                </CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Integrations
          </p>
          <h2 className="font-display text-3xl">
            Discord is the social surface. The HQ is the operating system.
          </h2>
          <p className="text-muted-foreground">
            Notion powers the knowledge layer today. Destiny 2 is first in line
            for deep integration, and the system is built to expand.
          </p>
          <Button asChild>
            <Link href="/integrations">View integration map</Link>
          </Button>
        </div>
        <div className="grid gap-4">
          {integrations.map((integration) => (
            <Card
              key={integration.title}
              className="border-border/60 bg-card/80"
            >
              <CardHeader className="space-y-2">
                <CardTitle className="font-display text-lg">
                  {integration.title}
                </CardTitle>
                <CardDescription>{integration.note}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Roadmap
          </p>
          <h2 className="font-display text-3xl">
            Build phases that keep the community durable
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {roadmap.map((phase) => (
            <Card 
              key={phase.phase} 
              className={`border-border/60 ${
                phase.status === 'complete' 
                  ? 'bg-card/75 border-green-500/30' 
                  : phase.status === 'next'
                  ? 'bg-card/90 border-primary/50'
                  : 'bg-card/75'
              }`}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`w-fit rounded-full text-xs uppercase tracking-[0.2em] ${
                      phase.status === 'complete'
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : phase.status === 'next'
                        ? 'bg-primary/20 text-primary'
                        : ''
                    }`}
                  >
                    {phase.phase}
                  </Badge>
                  {phase.status === 'complete' && (
                    <Badge variant="outline" className="text-xs">
                      ✓ Complete
                    </Badge>
                  )}
                  {phase.status === 'next' && (
                    <Badge variant="outline" className="text-xs border-primary/50">
                      Next
                    </Badge>
                  )}
                </div>
                <CardTitle className="font-display text-xl">
                  {phase.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {phase.items.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
