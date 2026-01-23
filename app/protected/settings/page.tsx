import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { syncNotionGuides } from "./actions";
import { AvatarUpload } from "./avatar-upload";
import { ProfileForm } from "@/components/profile-form";

const integrationChecklist = [
  "Discord is required for access and roles.",
  "Notion sync uses an internal bot token (no member auth).",
  "Destiny 2 linking is opt-in and consent driven.",
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Settings
        </p>
        <h1 className="font-display text-3xl">Integrations and access</h1>
        <p className="text-sm text-muted-foreground">
          Manage how the HQ connects to Discord, Notion, and game data.
        </p>
      </header>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Sync actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={syncNotionGuides}>
            <Button variant="outline" type="submit">
              Sync Notion guides
            </Button>
          </form>
          <Button variant="outline" disabled>
            Sync Discord roles
          </Button>
        </CardContent>
      </Card>

      <ProfileForm />

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Profile avatar</CardTitle>
          <CardDescription>
            Upload a custom avatar image for your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Integration checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {integrationChecklist.map((item) => (
            <p key={item}>- {item}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
