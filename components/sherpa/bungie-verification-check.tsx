'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// Trim at module load to match API behavior (env can have newline from Vercel CLI)
const VERIFIED_GUARDIAN_ROLE_ID = (process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID || '').trim() || undefined
const DISCORD_GUILD_ID = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID

interface BungieVerificationCheckProps {
  onVerified?: () => void
  required?: boolean
}

/**
 * Component that checks if user has Verified Guardian role (Discord Linked Roles)
 * Shows instructions if not verified, or allows children to render if verified
 */
export function BungieVerificationCheck({ 
  onVerified, 
  required = true 
}: BungieVerificationCheckProps) {
  const [hasVerifiedGuardian, setHasVerifiedGuardian] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  async function checkVerification() {
    if (!VERIFIED_GUARDIAN_ROLE_ID) {
      // If role ID not configured, allow access (backward compatibility)
      setHasVerifiedGuardian(true)
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasVerifiedGuardian(false)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('discord_role_ids')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error checking verification:', error)
        setHasVerifiedGuardian(false)
        setLoading(false)
        return
      }

      const expectedId = VERIFIED_GUARDIAN_ROLE_ID
      const verified = expectedId
        ? (profile?.discord_role_ids?.some((id: string) => String(id).trim() === expectedId) ?? false)
        : true
      setHasVerifiedGuardian(verified)
      
      if (verified && onVerified) {
        onVerified()
      }
    } catch (error) {
      console.error('Error checking verification:', error)
      setHasVerifiedGuardian(false)
    } finally {
      setLoading(false)
    }
  }

  async function syncRoles() {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync-discord-roles', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync roles')
      }

      if (data.hasVerifiedGuardian) {
        setHasVerifiedGuardian(true)
        if (onVerified) {
          onVerified()
        }
        toast.success('Roles synced! Verification confirmed.')
        // Trust API — do not run checkVerification(); it can overwrite with false
        // when client env (build-time NEXT_PUBLIC_*) differs from server or has trailing chars
      } else if (data.verificationConfigured === false) {
        toast.success('Roles synced. (Verification not configured in this environment.)')
        await checkVerification()
      } else {
        toast.info('Roles synced, but Verified Guardian role not found. Make sure you claimed the role in Server Settings → Linked Roles.')
        await checkVerification()
      }
    } catch (error: any) {
      toast.error(`Failed to sync roles: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    checkVerification()
  }, [supabase, onVerified])

  if (loading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking verification status...</AlertTitle>
        <AlertDescription>
          Verifying your Bungie account connection...
        </AlertDescription>
      </Alert>
    )
  }

  // If not required, always show children
  if (!required) {
    return null
  }

  // If verified, don't render anything (children will render)
  if (hasVerifiedGuardian === true) {
    return null
  }

  // Show verification requirement message
  return (
    <Alert variant="destructive" className="my-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Bungie Account Required</AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p>
          To apply as a Sherpa, you must link your Bungie.net account via Discord Linked Roles.
          This verifies that you have an active Destiny 2 account.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <a
              href={DISCORD_GUILD_ID 
                ? `https://discord.com/channels/${DISCORD_GUILD_ID}` 
                : 'https://discord.com'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Link Bungie Account
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={syncRoles}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Roles
              </>
            )}
          </Button>
        </div>
        <div className="text-sm space-y-2">
          <p className="font-semibold">Steps to get Verified Guardian role:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li><strong>Connect Bungie account:</strong> User Settings (⚙️) → Connections → Bungie.net → Authorize</li>
            <li><strong>Claim Linked Role:</strong> Right-click server name → Server Settings → Linked Roles → Find "Verified Guardian" → Click "Connect" or "Claim Role"</li>
            <li><strong>Click "Sync Roles" button above</strong> or refresh this page after claiming the role</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ <strong>Important:</strong> Linked Roles don't auto-assign. You must manually claim the role from Server Settings → Linked Roles after connecting your Bungie account.
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          If you've already claimed the role in Discord, click the "Sync Roles" button above to update your verification status.
        </p>
      </AlertDescription>
    </Alert>
  )
}
