import Link from "next/link";

const footerLinks = [
  { label: "Community Hub", href: "/protected" },
  { label: "Events", href: "/events" },
  { label: "Guides", href: "/guides" },
  { label: "Integrations", href: "/integrations" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Jupiter's Girth HQ
          </p>
          <p className="text-sm text-muted-foreground">
            Built for coordination, respect, and the time we share together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
