'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  website: string | null
  avatar_url: string | null
}

export function ProfileForm() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [website, setWebsite] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const getProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to view your profile')
        return
      }

      const { data, error: fetchError, status } = await supabase
        .from('profiles')
        .select('id, full_name, username, website, avatar_url')
        .eq('id', user.id)
        .single()

      if (fetchError && status !== 406) {
        throw fetchError
      }

      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setUsername(data.username || '')
        setWebsite(data.website || '')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading profile')
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    getProfile()
  }, [getProfile])

  async function updateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in to update your profile')
      }

      const updates = {
        id: user.id,
        full_name: fullName || null,
        username: username || null,
        website: website || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updates)

      if (updateError) throw updateError

      router.refresh()
      // Show success feedback
      alert('Profile updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Error updating profile')
      console.error('Error updating profile:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error && !profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your profile information. Changes will be saved to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={updateProfile} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
            />
            <p className="text-xs text-muted-foreground">
              Usernames must be unique. Leave empty if you don't want a username.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Update Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
