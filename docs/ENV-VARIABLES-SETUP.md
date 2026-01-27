# Environment Variables Setup Guide

**Date**: 2026-01-23  
**Purpose**: Guide for setting up environment variables for Phase 3 Discord Linked Roles

---

## ✅ Verification Complete

**Discord Server**: D2 SHERPA & LFG HUB  
**Guild ID**: `1291190711919837234`  
**Verified Guardian Role ID**: `1465601515833262081` ✅

**Role Configuration**:
- ✅ Role Name: "Verified Guardian"
- ✅ Role Type: Linked Role (has `guild_connections` tag)
- ✅ Color: #71368a (Purple)
- ✅ Position: 1

---

## Environment Variables Added

**File**: `.env.local`

```env
# Phase 3: Discord Linked Roles - Bungie Verification
NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID=1465601515833262081
NEXT_PUBLIC_DISCORD_GUILD_ID=1291190711919837234
```

---

## Verification Script

**Script**: `scripts/get-discord-role-id.js`

**Usage**:
```bash
node scripts/get-discord-role-id.js
```

**What it does**:
- Reads `.env.local` file
- Connects to Discord API using bot token
- Lists all roles in the guild
- Identifies Linked Roles (marked with ⭐)
- Finds "Verified Guardian" role
- Displays role ID and configuration

---

## Next Steps

1. ✅ **Environment variables set** - Added to `.env.local`
2. ✅ **Discord Linked Role configured** - Verified Guardian role exists
3. ⏳ **Test the flow**:
   - Visit `/sherpa/apply` page
   - Should see verification requirement if not linked
   - Link Bungie account via Discord
   - Refresh page to see application form

---

## Troubleshooting

**If verification check doesn't work**:

1. **Check environment variables are loaded**:
   - Restart Next.js dev server after adding variables
   - Variables prefixed with `NEXT_PUBLIC_` are available in browser

2. **Verify role ID is correct**:
   ```bash
   node scripts/get-discord-role-id.js
   ```
   - Should show Verified Guardian role with ID `1465601515833262081`

3. **Check Discord role sync**:
   - User must link Bungie account via Discord Server Settings → Linked Roles
   - Role should be assigned automatically by Discord
   - Bot syncs roles to database (check `profiles.discord_role_ids`)

4. **Verify bot permissions**:
   - Bot needs "Manage Roles" permission
   - Bot must be in the guild

---

## Production Setup

**For Vercel/Production**:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID` = `1465601515833262081`
   - `NEXT_PUBLIC_DISCORD_GUILD_ID` = `1291190711919837234`
3. Redeploy application

---

**Status**: ✅ Complete  
**Last Updated**: 2026-01-23
