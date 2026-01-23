import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Progress component will be added via ShadCN if needed
import { PageShell } from "@/components/site/page-shell";
import { CheckCircle2, Circle, Clock, Rocket } from "lucide-react";

type PhaseStatus = "complete" | "next" | "planned";

interface RoadmapPhase {
  phase: string;
  title: string;
  status: PhaseStatus;
  description: string;
  features: string[];
  completionDate?: string;
  progress?: number;
}

const roadmapPhases: RoadmapPhase[] = [
  {
    phase: "Phase 1",
    title: "Community OS MVP",
    status: "complete",
    description:
      "Foundation for multi-community support, Discord authentication, and core coordination features.",
    features: [
      "Discord authentication and role sync",
      "Events and scheduling system",
      "LFG (Looking for Group) boards",
      "Guides and knowledge base",
      "Multi-community foundation",
      "Community helper functions",
    ],
    completionDate: "January 2026",
    progress: 100,
  },
  {
    phase: "Phase 2",
    title: "Sherpa Hub System",
    status: "complete",
    description:
      "Complete Sherpa mentorship system with applications, requests, sessions, and Oathkeeper scoring.",
    features: [
      "Sherpa application system",
      "Request system for Seekers",
      "Session management and tracking",
      "Guardian Oath acceptance",
      "Oathkeeper scoring system",
      "Rating and feedback system",
      "Multi-community integration",
    ],
    completionDate: "January 2026",
    progress: 100,
  },
  {
    phase: "Phase 3",
    title: "Sherpa Enhancements",
    status: "next",
    description:
      "Advanced Sherpa features including Oathbreaker penalties, score badges, and admin tools.",
    features: [
      "Oathbreaker penalty system and UI",
      "Oathkeeper score badges (Oathkeeper, Guide, Mentor)",
      "Vote to resign feature",
      "Admin review interface",
      "Enhanced score display and filtering",
      "Score history visualization",
    ],
    progress: 0,
  },
  {
    phase: "Phase 4",
    title: "Resources & Builds Module",
    status: "planned",
    description:
      "Knowledge base for guides, builds, and community resources with ratings and featured content.",
    features: [
      "Resource browser and creation",
      "Build code support (DIM links)",
      "Markdown content support",
      "Resource ratings and reviews",
      "Featured resources system",
      "Category organization",
    ],
    progress: 0,
  },
  {
    phase: "Phase 5",
    title: "Discord Bot Integration",
    status: "planned",
    description:
      "Discord-native commands for Sherpa operations, enabling workflows directly from Discord.",
    features: [
      "/sherpa apply - Application via Discord",
      "/sherpa request - Create request via Discord",
      "/sherpa sessions - List active sessions",
      "/sherpa profile - View Sherpa profiles",
      "/sherpa rating - Submit session ratings",
      "/sherpa-admin review - Admin commands",
    ],
    progress: 0,
  },
  {
    phase: "Phase 6",
    title: "Advanced Features",
    status: "planned",
    description:
      "Cross-community features, advanced scheduling, and integration enhancements.",
    features: [
      "Cross-community session visibility",
      "Advanced scheduling and calendar",
      "Destiny 2 deep integration (Bungie OAuth)",
      "Readiness views and participation summaries",
      "Multi-game expansion support",
      "Unified roster across communities",
    ],
    progress: 0,
  },
];

function getStatusIcon(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case "next":
      return <Rocket className="h-5 w-5 text-primary" />;
    case "planned":
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return "default";
    case "next":
      return "default";
    case "planned":
      return "outline";
  }
}

function getStatusBadgeText(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return "Complete";
    case "next":
      return "Next";
    case "planned":
      return "Planned";
  }
}

function getStatusColor(status: PhaseStatus) {
  switch (status) {
    case "complete":
      return "border-green-500/30 bg-green-500/5";
    case "next":
      return "border-primary/50 bg-primary/5";
    case "planned":
      return "border-border/60 bg-card/75";
  }
}

export default function RoadmapPage() {
  const completedPhases = roadmapPhases.filter((p) => p.status === "complete").length;
  const totalPhases = roadmapPhases.length;
  const overallProgress = Math.round((completedPhases / totalPhases) * 100);

  return (
    <PageShell>
      <section className="mb-12">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Development Roadmap
          </p>
          <h1 className="font-display text-4xl font-semibold mb-4">
            Building the Future of Community Coordination
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Our roadmap outlines the planned development phases for Guild-MNKY, from
            foundational features to advanced integrations. Track our progress as we
            build tools that respect time, enable teaching, and strengthen communities.
          </p>
        </div>

        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-xl">Overall Progress</CardTitle>
                <CardDescription>
                  {completedPhases} of {totalPhases} phases completed
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {overallProgress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-8">
        {roadmapPhases.map((phase, index) => {
          const isLast = index === roadmapPhases.length - 1;
          const isComplete = phase.status === "complete";
          const isNext = phase.status === "next";

          return (
            <div key={phase.phase} className="relative">
              {/* Timeline connector */}
              {!isLast && (
                <div
                  className={`absolute left-6 top-16 bottom-0 w-0.5 ${
                    isComplete
                      ? "bg-green-500/30"
                      : isNext
                      ? "bg-primary/30"
                      : "bg-border"
                  }`}
                />
              )}

              <div className="flex gap-6">
                {/* Timeline icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                      isComplete
                        ? "border-green-500 bg-green-500/10"
                        : isNext
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    {getStatusIcon(phase.status)}
                  </div>
                </div>

                {/* Phase content */}
                <div className="flex-1 pb-8">
                  <Card
                    className={`border-border/60 ${getStatusColor(phase.status)}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant={getStatusBadgeVariant(phase.status)}
                              className={
                                isComplete
                                  ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
                                  : isNext
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : ""
                              }
                            >
                              {phase.phase}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getStatusBadgeText(phase.status)}
                            </Badge>
                          </div>
                          <CardTitle className="font-display text-2xl mb-2">
                            {phase.title}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {phase.description}
                          </CardDescription>
                        </div>
                      </div>
                      {phase.completionDate && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Completed: {phase.completionDate}
                        </div>
                      )}
                      {phase.progress !== undefined && phase.progress > 0 && (
                        <div className="mt-4">
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500 rounded-full"
                              style={{ width: `${phase.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Features:
                        </p>
                        <ul className="space-y-2">
                          {phase.features.map((feature, featureIndex) => (
                            <li
                              key={featureIndex}
                              className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                              <span
                                className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                  isComplete
                                    ? "bg-green-500"
                                    : isNext
                                    ? "bg-primary"
                                    : "bg-muted-foreground"
                                }`}
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-16">
        <Card className="border-border/60 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Want to Contribute?
            </CardTitle>
            <CardDescription>
              Have ideas or feedback? We'd love to hear from you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/protected">Join the Community</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sherpa">Explore Sherpa Hub</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/guides">View Knowledge Base</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
