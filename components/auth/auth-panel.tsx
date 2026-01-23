"use client";

import { Auth } from "@supabase/ui";
import { createClient } from "@/lib/supabase/client";

type AuthView =
  | "sign_in"
  | "sign_up"
  | "forgotten_password"
  | "magic_link"
  | "update_password";

export function AuthPanel({ view }: { view: AuthView }) {
  const supabase = createClient();

  return (
    <div className="w-full max-w-md">
      <Auth
        view={view}
        supabaseClient={supabase}
        providers={["discord"]}
        socialLayout="vertical"
        socialColors
      />
    </div>
  );
}
