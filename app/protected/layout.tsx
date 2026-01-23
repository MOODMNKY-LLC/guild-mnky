import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-semibold">
            Jupiter's Girth HQ
          </Link>
          <div className="flex items-center gap-3">
            <Suspense fallback={<span className="text-xs">Loading...</span>}>
              <AuthButton />
            </Suspense>
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-border/70 bg-card/80 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Navigation
          </p>
          <nav className="mt-4 flex flex-col gap-2 text-sm font-medium text-muted-foreground">
            <Link href="/protected" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Community hub
            </Link>
            <Link href="/events" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Events
            </Link>
            <Link href="/lfg" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              LFG board
            </Link>
            <Link href="/guides" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Guides
            </Link>
            <Link href="/roster" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Roster
            </Link>
            <Link href="/integrations" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Integrations
            </Link>
            <Link href="/protected/settings" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground">
              Settings
            </Link>
            <Link href="/protected/admin" className="rounded-lg px-3 py-2 hover:bg-accent/60 hover:text-foreground text-primary">
              Admin Panel
            </Link>
          </nav>
        </aside>
        <section className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
          {children}
        </section>
      </div>
    </div>
  );
}
