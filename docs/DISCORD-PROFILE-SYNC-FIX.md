# Discord Profile Data Sync Fix

**Issue**: Admin review interface showing "Unknown User" and placeholder avatar  
**Date**: 2026-01-23  
**Status**: ✅ Fixed

---

## Problem Identified

When viewing Sherpa applications in the admin review interface, applicants were showing as "Unknown User" with placeholder avatars, even though they authenticated via Discord OAuth.

**Root Cause**:
1. Discord OAuth profile data (avatar_url, username, full_name) wasn't being extracted and stored in the `profiles` table
2. The trigger function extracts some data, but Discord OAuth metadata structure may vary
3. Existing users who signed in before the fix don't have Discord profile data populated

---

## Solution Implemented

### 1. Enhanced Auth Callback (`app/auth/callback/route.ts`)

**Changes**:
- After successful OAuth, extracts Discord profile data from `user_metadata`:
  - `avatar_url` - Discord avatar URL
  - `preferred_username` or `username` - Discord username
  - `full_name` or `name` - Discord display name
- Updates profile with Discord data if missing
- Non-blocking update (doesn't delay redirect)

**Extraction Logic**:
```typescript
const discordAvatar = userMetadata.avatar_url || userMetadata.picture
const discordUsername = userMetadata.preferred_username || userMetadata.username || userMetadata.name
const discordFullName = userMetadata.full_name || userMetadata.name
```

### 2. Updated Admin Review Component (`components/sherpa/admin-review-applications.tsx`)

**Changes**:
- Added fallback to use `discord_username` from application if profile fields are missing
- Shows Discord username in applicant display
- Added visual indicator if profile data is missing
- Improved avatar fallback to use Discord username initial

**Display Priority**:
1. `profiles.username` (from Discord OAuth)
2. `profiles.full_name` (from Discord OAuth)
3. `discord_username` (from application form)
4. "Unknown User" (fallback)

### 3. New Sync API Route (`app/api/auth/sync-discord-profile/route.ts`)

**Purpose**: Manually sync Discord profile data for existing users

**Features**:
- Fetches Discord user info via Discord API
- Updates avatar_url, username, full_name
- Only updates if missing or different
- Returns updated profile data

**Usage**: `POST /api/auth/sync-discord-profile`

---

## For Existing Users

If your profile shows "Unknown User" or missing avatar:

### Option 1: Sign Out and Sign Back In (Recommended)
1. Sign out of the app
2. Sign back in with Discord OAuth
3. The callback will automatically populate your Discord profile data

### Option 2: Use Sync API (Future Enhancement)
- A "Sync Profile" button could be added to settings
- Calls `/api/auth/sync-discord-profile` to fetch and update Discord data

---

## For New Users

- Discord profile data will be automatically populated on first sign-in
- Avatar, username, and display name will be extracted from Discord OAuth

---

## Testing

**To verify the fix**:
1. Sign out and sign back in with Discord
2. Check your profile - should show Discord username and avatar
3. Submit a Sherpa application
4. View in admin review interface - should show your Discord info

**Admin View**:
- Should see Discord username and avatar for applicants
- If profile data is missing, shows Discord username from application form
- Visual indicator if profile sync needed

---

**Status**: ✅ Fixed  
**Action Required**: Sign out and sign back in to populate your Discord profile data
