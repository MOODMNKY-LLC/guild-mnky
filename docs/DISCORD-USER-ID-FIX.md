# Discord User ID Extraction Fix

**Issue**: `discord_user_id` not being stored when users authenticate via Discord OAuth  
**Date**: 2026-01-23  
**Status**: ✅ Fixed

---

## Problem Identified

When users authenticate via Discord OAuth, the `discord_user_id` field in the `profiles` table was not being populated. This caused:
- Role syncing to fail ("Discord user ID not found in profile")
- Verification checks to fail
- Discord-related features to break

**Root Cause**: 
- The `handle_new_user()` trigger function was trying to extract `discord_user_id` from `raw_user_meta_data`
- Supabase stores Discord provider ID in `auth.identities` table, not `raw_user_meta_data`
- The trigger runs BEFORE the identity is inserted, causing a timing issue

---

## Solution Implemented

### 1. Updated Database Trigger (`20260131000002_fix_discord_user_id_extraction.sql`)

**Changes**:
- Updated `handle_new_user()` function to query `auth.identities` table
- Added fallback to extract from `raw_user_meta_data` if identities query fails
- Backfilled existing profiles with Discord user IDs from `auth.identities`

**Key Fix**:
```sql
-- Extract Discord user ID from auth.identities table
SELECT provider_id INTO discord_user_id
FROM auth.identities
WHERE user_id = new.id
  AND provider = 'discord'
LIMIT 1;
```

### 2. Updated Auth Callback (`app/auth/callback/route.ts`)

**Changes**:
- After successful OAuth exchange, extract Discord user ID from session data
- Update profile with `discord_user_id` if missing
- Non-blocking update (doesn't delay redirect)

**Extraction Logic**:
```typescript
const discordUserId = sessionData.user.user_metadata?.provider_id || 
                     sessionData.user.user_metadata?.sub ||
                     sessionData.user.identities?.find(id => id.provider === 'discord')?.provider_id
```

### 3. Enhanced Sync API Route (`app/api/sync-discord-roles/route.ts`)

**Changes**:
- Attempts to extract `discord_user_id` if missing
- Updates profile before syncing roles
- Provides helpful error messages if Discord user ID cannot be found

---

## Migration Applied

**Migration**: `20260131000002_fix_discord_user_id_extraction.sql`

**What it does**:
1. Updates `handle_new_user()` trigger to extract from `auth.identities`
2. Backfills existing profiles with Discord user IDs
3. Adds fallback extraction from metadata

---

## Testing

### For Existing Users:

1. **Sign out and sign back in** with Discord OAuth
   - The callback will now extract and store `discord_user_id`
   - Profile will be updated automatically

2. **Or use the sync API**:
   - Visit `/sherpa/apply`
   - Click "Sync Roles" button
   - The API will attempt to extract `discord_user_id` if missing

### For New Users:

- Discord user ID will be automatically extracted and stored
- No action needed

---

## Verification

**Check if your profile has `discord_user_id`**:

```sql
SELECT id, username, discord_user_id 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
```

**If NULL**, you can:
1. Sign out and sign back in (recommended)
2. Use the sync API route (will attempt to extract it)

---

## Next Steps

1. **Test the fix**:
   - Sign out
   - Sign back in with Discord
   - Check if `discord_user_id` is now set
   - Try "Sync Roles" button

2. **If still not working**:
   - Check Supabase logs for trigger errors
   - Verify Discord OAuth is configured correctly
   - Check `auth.identities` table for your user

---

**Status**: ✅ Migration Applied  
**Action Required**: Sign out and sign back in to update your profile
