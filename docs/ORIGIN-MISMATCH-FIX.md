# Origin Mismatch Fix - Critical Authentication Issue

## Root Cause Identified

From the console logs, the critical issue is:

**You are accessing the app via `http://localhost:3000` but Supabase is on `http://127.0.0.1:54321`**

### What Happens

1. ✅ Cookie `sb-127-auth-token-code-verifier` is set successfully on `localhost:3000`
2. ✅ OAuth redirect to Discord works
3. ❌ Discord redirects back to `localhost:3000/auth/callback`
4. ❌ Server-side callback tries to read cookie, but there's an origin mismatch
5. ❌ Error: `PKCE code verifier not found in storage`

### Why This Happens

Browsers treat `localhost` and `127.0.0.1` as **different origins**:
- Cookies set on `localhost:3000` are NOT accessible to `127.0.0.1:3000`
- Even though they point to the same server, browsers enforce strict origin matching for cookies

## The Fix

### Solution: Use Consistent Origins

**Access your app at `http://127.0.0.1:3000` (NOT `localhost:3000`)**

### Steps to Fix

1. **Stop your dev server** (Ctrl+C)

2. **Clear all cookies**:
   - DevTools → Application → Cookies
   - Delete ALL cookies for both `localhost:3000` and `127.0.0.1:3000`

3. **Restart dev server**:
   ```bash
   pnpm dev
   ```
   This runs on `127.0.0.1:3000` (as configured in `package.json`)

4. **Access the app at the correct URL**:
   - ✅ Use: `http://127.0.0.1:3000/auth/login`
   - ❌ NOT: `http://localhost:3000/auth/login`

5. **Test the OAuth flow**:
   - Click "Sign in with Discord"
   - Should work without errors

## Code Changes Made

### 1. Origin Mismatch Detection

Added automatic detection in `components/login-form.tsx`:
- Detects when Supabase is on `127.0.0.1` but app is accessed via `localhost`
- Shows clear error message preventing OAuth from starting
- Prevents the "code verifier not found" error

### 2. Enhanced Logging

Added detailed logging to show:
- Current origin vs expected origin
- Supabase URL configuration
- Origin match status

### 3. Debug Script Fix

Fixed `scripts/debug-auth-flow.js`:
- Removed `process.env` reference (not available in browser)
- Uses `window.location.hostname` instead

## Verification

After accessing via `127.0.0.1:3000`, check console logs:

```
[Login Form] OAuth Configuration: {
  redirectUrl: "http://127.0.0.1:3000/auth/callback?next=/account",
  currentOrigin: "http://127.0.0.1:3000",
  supabaseUrl: "http://127.0.0.1:54321",
  originMatch: "✅ MATCH",
  hostname: "127.0.0.1"
}
```

If you see `originMatch: "❌ MISMATCH"`, you're still accessing via the wrong URL.

## Why Next.js Runs on 127.0.0.1

We configured Next.js to run on `127.0.0.1:3000` in `package.json`:
```json
"dev": "next dev --webpack --hostname 127.0.0.1"
```

This ensures:
- Next.js origin: `127.0.0.1:3000`
- Supabase origin: `127.0.0.1:54321`
- ✅ Same hostname = cookies work!

## Browser Behavior

Browsers enforce strict origin matching:
- `http://localhost:3000` ≠ `http://127.0.0.1:3000` (different origins)
- Cookies set on one are NOT accessible to the other
- This is a security feature, not a bug

## Production

In production, this won't be an issue because:
- Both app and Supabase use the same domain (e.g., `girth.moodmnky.com`)
- No localhost/127.0.0.1 confusion
- Cookies work correctly across the same domain

## Summary

**The fix is simple**: Always access your local dev app at `http://127.0.0.1:3000` to match Supabase's `127.0.0.1:54321` origin.

The code now detects this mismatch and prevents OAuth from starting, showing a clear error message instead of silently failing.
