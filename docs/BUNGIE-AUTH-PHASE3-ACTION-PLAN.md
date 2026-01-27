# Bungie Authentication Phase 3 Action Plan
## Immediate Implementation Guide Based on Deep Analysis

**Date**: January 31, 2026  
**Status**: Ready for Implementation  
**Based On**: Deep analysis of Braytech & RaidHub implementations

---

## Executive Summary

After comprehensive analysis of production Destiny 2 applications (Braytech & RaidHub), we recommend implementing **Discord Linked Roles** for Phase 3. This approach:

- ✅ **Fast**: 1-2 week implementation
- ✅ **Simple**: No OAuth complexity
- ✅ **Secure**: Leverages Discord's OAuth infrastructure
- ✅ **Effective**: Provides verification for Sherpa applications
- ✅ **Aligned**: Works with our Discord-first architecture

**Full Bungie OAuth** will be implemented in Phase 6 using RaidHub's server-side patterns.

---

## Phase 3 Implementation: Discord Linked Roles

### Step 1: Configure Discord Linked Role (Day 1)

**Action**: Create Linked Role in Discord Developer Portal

**Steps:**
1. Go to Discord Developer Portal → Your Application → Linked Roles
2. Click "Create Linked Role"
3. Configure:
   - **Name**: "Verified Guardian"
   - **Description**: "Verified Destiny 2 player with linked Bungie.net account"
   - **Connection**: Bungie.net (required)
   - **Verification**: Account age or other criteria

**API Configuration:**
```json
{
  "name": "Verified Guardian",
  "description": "Verified Destiny 2 player",
  "type": 1,
  "metadata": {
    "connections": {
      "bungie": {
        "required": true,
        "verification": "account_age"
      }
    }
  }
}
```

**Expected Outcome**: Linked Role created and available in Discord server settings

---

### Step 2: Update Discord Bot (Day 1-2)

**Action**: Add logic to assign "Verified Guardian" role when users link Bungie account

**File**: `discord-bot/src/events/guildMemberUpdate.ts` (or create new event handler)

**Implementation:**
```typescript
import { Events, GuildMember } from 'discord.js'

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    // Check if user has connected Bungie account via Linked Roles
    // Discord API: GET /users/@me/connections
    // If Bungie connection exists, assign "Verified Guardian" role
    
    const VERIFIED_GUARDIAN_ROLE_ID = process.env.VERIFIED_GUARDIAN_ROLE_ID
    
    // Check for Bungie connection (Discord handles this via Linked Roles)
    // We just need to verify the role assignment happens automatically
    // Or manually assign if needed
    
    // Note: Discord Linked Roles may auto-assign, but we can verify/manage it
  }
}
```

**Alternative Approach**: Use Discord's Linked Roles API to verify connections

**Expected Outcome**: Users who link Bungie accounts automatically get "Verified Guardian" role

---

### Step 3: Database Schema Update (Day 2)

**Action**: Add verification status to `sherpa_applications` table

**Migration File**: `supabase/migrations/20260131000001_add_bungie_verification.sql`

```sql
-- Add Bungie verification status to sherpa_applications
ALTER TABLE public.sherpa_applications
ADD COLUMN IF NOT EXISTS bungie_verified boolean NOT NULL DEFAULT false;

-- Add index for filtering verified applications
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_bungie_verified 
ON public.sherpa_applications(bungie_verified) 
WHERE bungie_verified = true;

-- Add comment
COMMENT ON COLUMN public.sherpa_applications.bungie_verified IS 
'Indicates if applicant has linked Bungie account via Discord Linked Roles';
```

**Expected Outcome**: Database schema updated with verification column

---

### Step 4: Update Application Form (Day 2-3)

**Action**: Add role check before allowing Sherpa application

**File**: `components/sherpa/application-form.tsx`

**Implementation:**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID

export function SherpaApplicationForm() {
  const [hasVerifiedGuardian, setHasVerifiedGuardian] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkVerification() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_role_ids')
        .eq('id', user.id)
        .single()

      const verified = profile?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false
      setHasVerifiedGuardian(verified)
      setLoading(false)
    }

    checkVerification()
  }, [])

  if (loading) {
    return <div>Checking verification status...</div>
  }

  if (hasVerifiedGuardian === false) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertTitle>Bungie Account Required</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            To apply as a Sherpa, you must link your Bungie.net account via Discord Linked Roles.
          </p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_GUILD_ID}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Link Bungie Account
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            After linking, refresh this page to continue your application.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  // ... existing form code ...
}
```

**Expected Outcome**: Users without "Verified Guardian" role see clear instructions

---

### Step 5: Update Server Actions (Day 3)

**Action**: Set `bungie_verified` flag when creating application

**File**: `app/(site)/sherpa/actions.ts`

**Implementation:**
```typescript
export async function createSherpaApplication(input: CreateSherpaApplicationInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check for Verified Guardian role
  const { data: profile } = await supabase
    .from('profiles')
    .select('discord_role_ids')
    .eq('id', user.id)
    .single()

  const VERIFIED_GUARDIAN_ROLE_ID = process.env.VERIFIED_GUARDIAN_ROLE_ID
  const bungie_verified = profile?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false

  // ... existing validation ...

  const { data, error } = await supabase
    .from('sherpa_applications')
    .insert({
      ...input,
      profile_id: user.id,
      community_id: community.id,
      bungie_verified, // Add verification status
      status: 'pending'
    })
    .select()
    .single()

  // ... rest of function ...
}
```

**Expected Outcome**: Applications created with correct verification status

---

### Step 6: Update Admin Review Interface (Day 3-4)

**Action**: Display verification status and add filtering

**File**: `components/sherpa/admin-review-applications.tsx`

**Changes:**

1. **Add Verification Badge:**
```typescript
// In pending applications table
<TableCell>
  {app.bungie_verified ? (
    <Badge variant="default" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <XCircle className="h-3 w-3" />
      Not Verified
    </Badge>
  )}
</TableCell>
```

2. **Add Filter Toggle:**
```typescript
const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

const filteredApplications = showVerifiedOnly
  ? applications.filter(app => app.bungie_verified)
  : applications

// Add filter UI
<div className="flex items-center gap-2 mb-4">
  <Label htmlFor="verified-filter">Show verified only</Label>
  <Switch
    id="verified-filter"
    checked={showVerifiedOnly}
    onCheckedChange={setShowVerifiedOnly}
  />
</div>
```

**Expected Outcome**: Admins can see and filter by verification status

---

### Step 7: Update Type Definitions (Day 4)

**Action**: Add `bungie_verified` to TypeScript types

**File**: `app/(site)/sherpa/actions.ts`

**Update:**
```typescript
export type SherpaApplicationWithProfile = {
  // ... existing fields ...
  bungie_verified: boolean  // Add this field
  // ... rest of fields ...
}
```

**Expected Outcome**: TypeScript types match database schema

---

### Step 8: Testing Checklist (Day 5)

**Manual Testing:**

- [ ] User without Bungie link sees requirement message
- [ ] User links Bungie account via Discord
- [ ] "Verified Guardian" role is assigned automatically
- [ ] User can now see application form
- [ ] Application is created with `bungie_verified = true`
- [ ] Admin sees verification badge in review interface
- [ ] Filter works correctly (show verified only)
- [ ] Verification status persists after page refresh

**Edge Cases:**

- [ ] User unlinks Bungie account → Role removed → Cannot apply
- [ ] User has role but role not synced to database → Handles gracefully
- [ ] Multiple applications → All show correct verification status

---

## Environment Variables

**Add to `.env.local`:**

```env
# Discord Linked Roles
NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID=your_role_id_here
DISCORD_GUILD_ID=your_guild_id_here
```

**Add to Discord Bot `.env`:**

```env
VERIFIED_GUARDIAN_ROLE_ID=your_role_id_here
```

---

## User-Facing Documentation

**Create**: `docs/USER-GUIDE-BUNGIE-LINKING.md`

**Content:**
```markdown
# How to Link Your Bungie Account

To apply as a Sherpa, you must link your Bungie.net account via Discord.

## Steps:

1. Open Discord and go to Server Settings → Linked Roles
2. Click "Connect" next to Bungie.net
3. Authorize the connection on Bungie.net
4. Return to the Sherpa application page
5. Refresh the page to see the application form

## Troubleshooting:

- **Role not appearing**: Wait a few minutes and refresh
- **Connection failed**: Make sure you're logged into Bungie.net
- **Still can't apply**: Contact an admin for help
```

---

## Success Metrics

**Phase 3 Success Criteria:**

- ✅ 80%+ of Sherpa applications have Bungie verification
- ✅ Admin review time reduced (verified applications prioritized)
- ✅ Zero security incidents (no token exposure)
- ✅ User satisfaction with verification process

**Metrics to Track:**

- Applications with verification: `SELECT COUNT(*) FROM sherpa_applications WHERE bungie_verified = true`
- Verification rate: `(verified_count / total_count) * 100`
- Time to verify: Average time from application to verification check

---

## Rollback Plan

**If Issues Arise:**

1. **Remove role requirement** (temporary):
   - Comment out role check in application form
   - Allow applications without verification
   - Fix issues in parallel

2. **Disable Linked Role** (if Discord issues):
   - Remove role assignment logic
   - Keep database column (for future use)
   - Revert to manual verification

3. **Database Rollback**:
   ```sql
   -- Remove verification column (if needed)
   ALTER TABLE public.sherpa_applications
   DROP COLUMN IF EXISTS bungie_verified;
   ```

---

## Next Steps After Phase 3

**Phase 6 Preparation:**

1. Monitor Phase 3 usage patterns
2. Gather user feedback on verification process
3. Plan full OAuth implementation timeline
4. Begin Bungie.net application registration
5. Design guardian card component

**Phase 6 Will Add:**

- Full Bungie API access (not just verification)
- Guardian profile display
- Activity history
- Readiness checker
- Loadout display

---

## References

- **Deep Analysis**: `docs/DEEP-ANALYSIS-BUNGIE-AUTH-IMPLEMENTATIONS.md`
- **Integration Analysis**: `docs/BUNGIE-AUTH-INTEGRATION-ANALYSIS.md`
- **Discord Linked Roles Docs**: https://support.discord.com/hc/en-us/articles/10388356626711

---

**Status**: ✅ Ready for Implementation  
**Timeline**: 1-2 weeks  
**Priority**: High (Phase 3 deliverable)
