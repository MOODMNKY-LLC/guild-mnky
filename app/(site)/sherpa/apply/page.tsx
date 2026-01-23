import { PageShell } from "@/components/site/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SherpaApplicationForm } from "@/components/sherpa/application-form";
import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";
import { getUserCommunity } from "@/lib/community-helpers";
import { Suspense } from "react";

async function checkApplicationStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  const communityId = await getUserCommunity(user.id);
  if (!communityId) {
    return { canApply: false, reason: 'Unable to determine your community.' };
  }

  // Check if already a Sherpa
  const { data: sherpa } = await supabase
    .from('sherpas')
    .select('id')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .eq('is_active', true)
    .single();

  if (sherpa) {
    return { canApply: false, reason: 'You are already an active Sherpa.' };
  }

  // Check if has pending application
  const { data: application } = await supabase
    .from('sherpa_applications')
    .select('id, status')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .eq('status', 'pending')
    .single();

  if (application) {
    return { canApply: false, reason: 'You already have a pending application.' };
  }

  return { canApply: true };
}

async function ApplyContent() {
  const { canApply, reason } = await checkApplicationStatus();

  if (!canApply) {
    return (
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Application Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{reason}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Sherpa Application
        </p>
        <h1 className="font-display text-4xl mt-2">
          Apply to Become a Sherpa
        </h1>
        <p className="mt-3 text-muted-foreground">
          Share your experience and passion for teaching. Help others grow and strengthen the community.
        </p>
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle>Application Form</CardTitle>
          <CardDescription>
            Please fill out all required fields. Your application will be reviewed by admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SherpaApplicationForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ApplyPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <ApplyContent />
      </Suspense>
    </PageShell>
  );
}
