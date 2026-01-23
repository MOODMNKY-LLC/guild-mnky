"use client";

import Image from "next/image";
import { Calendar, BookOpen, Users } from "lucide-react";

const highlights = [
  {
    title: "Community-first scheduling",
    description: "Events and LFG stay structured, not buried in chat.",
    icon: Calendar,
  },
  {
    title: "Shared knowledge layer",
    description: "Guides, callouts, and playbooks stay searchable.",
    icon: BookOpen,
  },
  {
    title: "Discord-native identity",
    description: "Roles and access stay synced with the community.",
    icon: Users,
  },
];

export function AuthInfoPanel() {
  return (
    <aside className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-8 lg:min-h-full">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/girth-app-bg.png"
          alt="Jupiter's Girth skyline"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover object-center"
          priority
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between gap-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Jupiter&apos;s Girth HQ
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A community OS built around respect, coordination, and the time we
            share together.
          </p>
        </div>

        {/* Highlights Section */}
        <div className="space-y-5">
          {highlights.map((item) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.title} 
                className="flex gap-4 rounded-xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm transition-colors hover:bg-card/60"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border/60">
            <Image
              src="/girth-avatar.png"
              alt="Jupiter's Girth clan emblem"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Jupiter&apos;s Girth
            </p>
            <p className="text-xs text-muted-foreground">
              Destiny 2 Clan • Est. 2017
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
