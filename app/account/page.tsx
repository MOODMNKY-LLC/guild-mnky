import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile-form'
import { AvatarUpload } from '@/app/protected/settings/avatar-upload'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

async function AccountContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Account
        </p>
        <h1 className="font-display text-3xl">Manage your account</h1>
        <p className="text-sm text-muted-foreground">
          Update your profile information and preferences.
        </p>
      </header>

      <div className="space-y-6">
        <ProfileForm />

        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">Profile Avatar</CardTitle>
            <CardDescription>
              Upload a custom avatar image for your profile. This will be displayed
              across the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">Account Information</CardTitle>
            <CardDescription>
              Your account details from authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Email:</span>{' '}
              <span>{user.email}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">User ID:</span>{' '}
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            {profile && (
              <div>
                <span className="font-medium text-muted-foreground">Profile Created:</span>{' '}
                <span>
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh w-full items-center justify-center">
          Loading account...
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  )
}
