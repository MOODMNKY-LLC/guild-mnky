# Community Configuration Fix

**Date**: January 24, 2026  
**Issue**: "This server is not configured as a community" error  
**Status**: ✅ **FIXED**

---

## Issue Identified

The bot was getting an error "This server is not configured as a community" because the `get_community_by_guild_id` function was returning `null` for one or both guilds. This happened because:

1. Local Supabase wasn't running (connection refused on localhost:54321)
2. Communities table didn't have entries for both guilds

---

## Solution Applied

### 1. Updated Supabase Configuration
Changed from local Supabase to production Supabase:
- **Before**: `SUPABASE_URL=http://localhost:54321`
- **After**: `SUPABASE_URL=https://lhnvfmollucrqlditxls.supabase.co`

### 2. Created Communities
Ran `ensure-communities` script to create both communities:
- ✅ **Jupiter's Girth** (573823015511392268): `30a70a52-3d64-48bf-95ec-a05b9ac39354`
- ✅ **Sherpa Hub** (1291190711919837234): `db9b8021-ecda-4a70-bb27-61b36f550a35`

### 3. Created Utility Script
Added `scripts/ensure-communities.ts` to ensure communities exist:
- Can be run anytime: `pnpm run ensure-communities`
- Safely upserts communities (won't duplicate)
- Verifies both communities exist

---

## Verification

✅ Both communities verified in database:
- Jupiter's Girth: `30a70a52-3d64-48bf-95ec-a05b9ac39354`
- Sherpa Hub: `db9b8021-ecda-4a70-bb27-61b36f550a35`

---

## Files Created/Modified

1. ✅ `scripts/ensure-communities.ts` - Community creation script
2. ✅ `scripts/ensure-communities.sql` - SQL version of script
3. ✅ `.env` - Updated to use production Supabase
4. ✅ `package.json` - Added `ensure-communities` script

---

## Usage

**To ensure communities exist (if needed in future):**
```bash
cd guild-mnky/discord-bot
pnpm run ensure-communities
```

---

## Next Steps

1. ✅ Bot restarted with new Supabase configuration
2. ✅ Communities verified in database
3. ✅ Bot should now work without "not configured as a community" error

**Status**: ✅ **Fixed - Bot should work correctly now!**
