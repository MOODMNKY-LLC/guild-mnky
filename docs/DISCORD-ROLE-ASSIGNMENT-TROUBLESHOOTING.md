# Discord Role Assignment Troubleshooting

**Error**: `403 Missing Access (50001)` when assigning Sherpa role  
**Date**: 2026-01-23  
**Status**: ⚠️ Permission Issue

---

## Problem

When approving a Sherpa application, the system fails to assign the Discord role with error:
```
403 {"message": "Missing Access", "code": 50001}
```

---

## Root Cause

The bot's role has the correct hierarchy (position 3 > Sherpa position 1), but the **"Manage Roles" permission** is not enabled for the bot's role.

---

## Solution

### Step 1: Enable "Manage Roles" Permission

1. **Open Discord Server Settings**:
   - Right-click server name → **Server Settings**

2. **Go to Roles**:
   - Click **Roles** in left sidebar

3. **Find Bot's Role** ("GIRTH"):
   - Scroll to find the bot's role
   - Click on it to edit

4. **Enable "Manage Roles" Permission**:
   - Scroll to **Permissions** section
   - Find **"Manage Roles"** permission
   - ✅ **Enable it** (toggle ON)
   - Click **Save Changes**

### Step 2: Verify Role Hierarchy

Ensure bot's role is **above** Sherpa role:
- **GIRTH** (bot's role) - Position 3 ✅
- **Sherpa** role - Position 1 ✅

**If bot's role is below Sherpa role**:
- Drag bot's role **above** Sherpa role in the roles list
- Higher position = higher hierarchy

### Step 3: Check Role Settings

Ensure Sherpa role is **not managed by an integration**:
- Go to **Roles** → **Sherpa** role
- Check if it says "Managed by integration"
- If yes, you may need to create a new role or use a different role

### Step 4: Verify User is in Server

The user must be a member of the Discord server:
- Check if user is in server member list
- If not, they need to join first

---

## Verification

After enabling permissions:

1. **Test role assignment**:
   - Approve a test application
   - Check if role is assigned successfully
   - Check logs for success message

2. **Check bot permissions**:
   ```bash
   node scripts/check-bot-permissions.js
   ```

3. **Verify in Discord**:
   - User should have "Sherpa" role
   - Role should appear in user's role list

---

## Common Issues

### Issue 1: Bot Role Too Low
**Symptom**: Bot's role position is lower than target role  
**Fix**: Move bot's role above target role in Server Settings → Roles

### Issue 2: Missing Permission
**Symptom**: Bot has correct hierarchy but can't assign roles  
**Fix**: Enable "Manage Roles" permission for bot's role

### Issue 3: Role Managed by Integration
**Symptom**: Role is managed by another bot/integration  
**Fix**: Use a different role or disable integration management

### Issue 4: User Not in Server
**Symptom**: 404 error or user not found  
**Fix**: User must join the Discord server first

---

## Quick Fix Checklist

- [ ] Bot's role has "Manage Roles" permission enabled
- [ ] Bot's role is higher than Sherpa role in hierarchy
- [ ] Sherpa role is not managed by integration
- [ ] User is a member of the Discord server
- [ ] Bot token is valid and bot is online

---

## After Fixing

Once permissions are enabled:
1. ✅ Role assignment will work automatically
2. ✅ Database will sync role assignment
3. ✅ No code changes needed

---

**Status**: ⚠️ Requires Discord Server Permission Fix  
**Action Required**: Enable "Manage Roles" permission for bot's role in Discord Server Settings
