import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/site/mobile-nav";

const navLinks = [
  { label: "Community", href: "/" },
  { label: "Events", href: "/events" },
  { label: "LFG", href: "/lfg" },
  { label: "Guides", href: "/guides" },
  { label: "Roster", href: "/roster" },
  { label: "Integrations", href: "/integrations" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg">
              JG
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold uppercase tracking-[0.16em]">
                Jupiter's Girth
              </p>
              <p className="text-xs text-muted-foreground">
                Community HQ and coordination hub
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <MobileNav links={navLinks} />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/protected">Enter HQ</Link>
          </Button>
          <Suspense fallback={<span className="text-xs">Loading...</span>}>
            <AuthButton />
          </Suspense>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
