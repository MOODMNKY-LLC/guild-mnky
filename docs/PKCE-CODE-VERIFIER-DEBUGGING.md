# PKCE Code Verifier Cookie Debugging Guide

## Issue: "PKCE code verifier not found in storage"

This error occurs when `exchangeCodeForSession()` is called, but the code verifier cookie is missing. This cookie should be set by `createBrowserClient` when `signInWithOAuth()` is called.

## Root Causes

1. **Known Bug in @supabase/ssr** (GitHub Issue #55)
   - `signInWithOAuth()` doesn't consistently set the code verifier cookie
   - Especially after logging out and logging back in
   - Workaround: Ensure cookies are properly configured

2. **Cookie Storage Issues**
   - Browser blocking cookies (privacy settings, extensions)
   - Cookie attributes preventing storage (domain, path, SameSite)
   - Cookies being cleared between OAuth initiation and callback

3. **Host Mismatch**
   - Code verifier set for one host (e.g., `localhost`)
   - Callback accessed from different host (e.g., `127.0.0.1`)
   - **Solution**: Always use `localhost` consistently

## Debugging Steps

### 1. Check Browser Console Logs

After clicking "Sign in with Discord", check browser console for:

```
[Login Form] Cookies before OAuth: [...]
[Login Form] Cookies after OAuth initiation: [...]
[Login Form] Code verifier cookie present: true/false
```

**Expected**: Should see code verifier cookie after OAuth initiation.

### 2. Check Browser Cookies (Application Tab)

1. Open DevTools → Application → Cookies → `http://localhost:3000`
2. After clicking "Sign in with Discord", look for:
   - `sb-<project-ref>-auth-token-code-verifier`
   - Cookie should have:
     - **Path**: `/`
     - **Domain**: (empty or `localhost`)
     - **SameSite**: `Lax` (for HTTP) or `None` (for HTTPS)
     - **Secure**: `false` (for HTTP) or `true` (for HTTPS)

**If cookie is missing**: `createBrowserClient` isn't setting it (known bug).

### 3. Check Network Tab

1. Open DevTools → Network
2. Filter by "Fetch/XHR"
3. After clicking "Sign in with Discord":
   - Look for request to Supabase OAuth endpoint
   - Check if cookies are being sent in request headers
   - Look for `Set-Cookie` headers in response

**Expected**: Should see `Set-Cookie` header for code verifier cookie.

### 4. Check Terminal Logs

After Discord redirects back, check terminal for:

```
[Auth Callback] ===== ROUTE HANDLER CALLED =====
[Auth Callback] Code param: present/missing
[Auth Callback] State param: present/missing
[Auth Callback] ===== COOKIES BEFORE CLIENT CREATION =====
[Auth Callback] Code verifier cookie: FOUND/MISSING
```

**If code verifier is MISSING**: Cookie wasn't set or was cleared before callback.

## Potential Solutions

### Solution 1: Ensure Consistent Host Usage

**Problem**: Cookie set for `localhost` but callback accessed from `127.0.0.1` (or vice versa).

**Fix**: Always use `http://localhost:3000` (not `127.0.0.1:3000`).

**Verification**:
- Check `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- Check `supabase/config.toml`: `site_url = "http://localhost:3000"`
- Access app via: `http://localhost:3000/auth/login`

### Solution 2: Clear All Cookies and Retry

**Problem**: Stale cookies from previous attempts interfering.

**Fix**:
1. DevTools → Application → Cookies
2. Delete ALL cookies for `localhost:3000` and `localhost:54321`
3. Close and reopen browser (or use incognito)
4. Retry OAuth flow

### Solution 3: Check Browser Cookie Settings

**Problem**: Browser blocking cookies.

**Fix**:
1. Check browser privacy settings
2. Disable cookie-blocking extensions temporarily
3. Try incognito/private mode
4. Check browser console for cookie-related errors

### Solution 4: Verify @supabase/ssr Version

**Problem**: Bug in specific version of `@supabase/ssr`.

**Fix**:
```bash
# Check current version
npm list @supabase/ssr

# Update to latest
npm install @supabase/ssr@latest
```

**Current version**: `latest` (should be fine, but verify)

### Solution 5: Workaround - Server-Side OAuth Initiation

**Problem**: Browser client bug preventing cookie storage.

**Fix**: Initiate OAuth from server-side (Server Action or Route Handler).

**Example**:
```typescript
// app/login/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithDiscord() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/protected`,
    },
  })
  
  if (error) {
    throw error
  }
  
  if (data.url) {
    redirect(data.url)
  }
}
```

**Note**: This requires the OAuth URL to be returned, which Supabase does provide.

## Current Status

✅ **Callback route**: Properly configured to handle code exchange  
✅ **Proxy**: Excludes `/auth/callback` to avoid interference  
✅ **Host consistency**: Standardized on `localhost`  
✅ **Logging**: Comprehensive logging added to track cookie state  
⚠️ **Browser client**: Using default `createBrowserClient` (known bug may affect it)

## Next Steps

1. **Test with enhanced logging**: The new logging in `login-form.tsx` will show if cookies are being set
2. **Check browser console**: Look for `[Login Form]` logs showing cookie state
3. **Check terminal logs**: Look for `[Auth Callback]` logs showing code verifier presence
4. **If still failing**: Consider implementing server-side OAuth initiation as workaround

## Related Issues

- [GitHub Issue #55](https://github.com/supabase/ssr/issues/55): `signInWithOAuth` doesn't consistently set verifier cookie
- [GitHub Issue #36](https://github.com/supabase/ssr/issues/36): Cookies not setting properly

## References

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [PKCE Flow Explanation](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Next.js Cookie-Based Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
