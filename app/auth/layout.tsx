import type { ReactNode } from "react";
import { AuthInfoPanel } from "@/components/auth/auth-info-panel";
import { DotPattern } from "@/components/ui/dot-pattern";

// NOTE: This layout is automatically dynamic because auth routes use cookies()
// The cache warning is expected and harmless - auth routes should not be cached
// Using cookies() via proxy.ts makes routes dynamic by default, which is correct

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      {/* Animated dot pattern background with purple glow */}
      <DotPattern
        className="text-primary/30 dark:text-primary/20"
        glow={true}
        cr={1.2}
        width={24}
        height={24}
      />
      
      {/* Radial gradient overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Main content grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-stretch lg:py-16">
        {/* Auth form panel */}
        <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-background/70 p-6 shadow-lg backdrop-blur-sm sm:p-10">
          {children}
        </div>
        
        {/* Info panel */}
        <AuthInfoPanel />
      </div>
    </div>
  );
}
