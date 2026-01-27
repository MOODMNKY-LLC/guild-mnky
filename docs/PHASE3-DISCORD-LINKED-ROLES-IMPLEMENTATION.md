# Phase 3: Discord Linked Roles Implementation

**Date**: 2026-01-23  
**Status**: ✅ Implementation Complete  
**Deliverable**: Bungie Account Verification via Discord Linked Roles

---

## Executive Summary

Implemented Discord Linked Roles integration to verify users have linked Bungie.net accounts before allowing Sherpa applications. This provides a simple, secure verification mechanism without requiring full OAuth implementation.

**Key Features**:
- ✅ Database migration for `bungie_verified` column
- ✅ Server action updates to check Verified Guardian role
- ✅ Application form verification check component
- ✅ Admin review interface with verification status display
- ✅ Filter toggle for verified-only applications

---

## Implementation Details

### 1. Database Migration

**File**: `supabase/migrations/20260131000001_add_bungie_verification.sql`

**Changes**:
- Added `bungie_verified` boolean column to `sherpa_applications` table
- Created index for filtering verified applications
- Added column comment for documentation

**Status**: ✅ Complete

### 2. Server Actions Updates

**File**: `app/(site)/sherpa/actions.ts`

**Changes**:
- Updated `CreateSherpaApplicationInput` type to match schema (`motivation`, `specialties`, `availability`, `discord_username`)
- Added Bungie verification check in `createSherpaApplication()`
- Updated `SherpaApplicationWithProfile` type to include `bungie_verified`
- Added `checkBungieVerification()` helper function
- Updated `getSherpaApplicationsForAdmin()` query to include `bungie_verified`

**Key Logic**:
```typescript
// Check for Verified Guardian role
const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID
let bungie_verified = false

if (VERIFIED_GUARDIAN_ROLE_ID) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('discord_role_ids')
    .eq('id', user.id)
    .single()

  bungie_verified = profile?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false
}
```

**Status**: ✅ Complete

### 3. Verification Check Component

**File**: `components/sherpa/bungie-verification-check.tsx`

**Features**:
- Checks if user has Verified Guardian role
- Shows instructions if not verified
- Provides link to Discord server settings
- Loading state while checking
- Optional `required` prop for flexibility

**Status**: ✅ Complete

### 4. Application Form Updates

**File**: `components/sherpa/application-form.tsx`

**Changes**:
- Updated schema to match database fields (`motivation`, `specialties`, `availability`, `discord_username`)
- Integrated `BungieVerificationCheck` component
- Auto-populates Discord username from profile
- Updated form fields to match new schema

**Status**: ✅ Complete

### 5. Admin Review Interface Updates

**File**: `components/sherpa/admin-review-applications.tsx`

**Changes**:
- Added verification badge column to pending applications table
- Added verification badge column to reviewed applications table
- Added "Show verified only" filter toggle
- Added verification status to review dialog
- Updated filtering logic to respect verification filter

**Status**: ✅ Complete

---

## Environment Variables

**Required** (`.env.local`):
```env
NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID=your_role_id_here
NEXT_PUBLIC_DISCORD_GUILD_ID=your_guild_id_here
```

**Note**: If `VERIFIED_GUARDIAN_ROLE_ID` is not set, verification check is bypassed (backward compatibility).

---

## Dual-Community Considerations

**Community-Specific Behavior**:
- **Sherpa Hub**: Verification required (primary use case)
- **Jupiter's Girth**: Verification optional (if feature enabled)

**Implementation**:
- Verification check respects community context
- Can be extended with community feature flags in future
- Current implementation works for both communities

---

## User Flow

### For Applicants:

1. **User visits application page**
   - `BungieVerificationCheck` component checks for Verified Guardian role
   - If not verified: Shows instructions with link to Discord
   - If verified: Shows application form

2. **User links Bungie account** (if needed)
   - Opens Discord → Server Settings → Linked Roles
   - Connects Bungie.net account
   - Returns to application page and refreshes

3. **User submits application**
   - Form validates all fields
   - Server action checks verification status
   - Application created with `bungie_verified` flag

### For Admins:

1. **Admin views applications**
   - Sees verification badge for each application
   - Can filter to show only verified applications
   - Verification status visible in review dialog

2. **Admin reviews application**
   - Verification status prominently displayed
   - Can prioritize verified applications
   - Verification status persists after approval/denial

---

## Testing Checklist

### Manual Testing:

- [ ] User without Bungie link sees requirement message
- [ ] User links Bungie account via Discord
- [ ] "Verified Guardian" role is assigned automatically (Discord handles this)
- [ ] User can now see application form after refresh
- [ ] Application is created with `bungie_verified = true`
- [ ] Admin sees verification badge in review interface
- [ ] Filter works correctly (show verified only)
- [ ] Verification status persists after page refresh
- [ ] Verification status shown in review dialog

### Edge Cases:

- [ ] User unlinks Bungie account → Role removed → Cannot apply (needs testing)
- [ ] User has role but role not synced to database → Handles gracefully
- [ ] Multiple applications → All show correct verification status
- [ ] `VERIFIED_GUARDIAN_ROLE_ID` not set → Applications allowed (backward compatibility)

---

## Next Steps

### Immediate:

1. **Run Migration**:
   ```bash
   npx supabase migration up
   ```

2. **Set Environment Variables**:
   - Add `NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID` to `.env.local`
   - Add `NEXT_PUBLIC_DISCORD_GUILD_ID` to `.env.local`

3. **Configure Discord Linked Role**:
   - Go to Discord Developer Portal
   - Create Linked Role for "Verified Guardian"
   - Configure Bungie.net connection requirement

4. **Test End-to-End**:
   - Test application flow with verified user
   - Test application flow with unverified user
   - Test admin review interface

### Future Enhancements:

1. **Community Feature Flags**:
   - Add `community_feature_flags` table
   - Make verification requirement configurable per community

2. **Verification Sync**:
   - Add Discord bot event handler for `guildMemberUpdate`
   - Auto-sync role changes to database

3. **Verification Status Page**:
   - Create dedicated page showing verification status
   - Show instructions for linking account

---

## Related Documentation

- **Action Plan**: `docs/BUNGIE-AUTH-PHASE3-ACTION-PLAN.md`
- **Deep Analysis**: `docs/DEEP-ANALYSIS-BUNGIE-AUTH-IMPLEMENTATIONS.md`
- **Dual Community Architecture**: `docs/DUAL-COMMUNITY-ARCHITECTURE.md`
- **Comprehensive Analysis**: `docs/COMPREHENSIVE-FEATURE-ARCHITECTURE-ANALYSIS.md`

---

## Rollback Plan

**If Issues Arise**:

1. **Remove role requirement** (temporary):
   - Comment out `BungieVerificationCheck` component
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

**Document Status**: ✅ Complete  
**Last Updated**: 2026-01-23  
**Next Review**: After migration and testing
