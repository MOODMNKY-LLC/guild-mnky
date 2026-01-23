# Server-Side OAuth Implementation

## Overview

We've implemented server-side OAuth initiation as a workaround for GitHub Issue #55, where `createBrowserClient` doesn't consistently set the PKCE code verifier cookie.

## Implementation

### Route Handler (`app/api/auth/discord/route.ts`)

**Purpose**: Initiate Discord OAuth flow server-side using `createServerClient`, which has reliable cookie handling.

**How it works**:
1. Client navigates to `/api/auth/discord?next=/protected`
2. Route Handler uses `createServerClient` to initiate OAuth
3. Code verifier cookie is set server-side (reliable)
4. Route Handler redirects to Discord OAuth URL (with cookies in response)
5. Discord redirects back to `/auth/callback?code=...`
6. Callback route exchanges code for session

**Key Features**:
- Uses `createServerClient` with explicit cookie handling
- Tracks cookies set during OAuth initiation
- Copies all cookies to redirect response
- Logs code verifier cookie status in development

### Updated Components

**Login Form** (`components/login-form.tsx`):
- Removed client-side OAuth initiation
- Now navigates to `/api/auth/discord?next=/protected`
- No longer uses `createBrowserClient` for OAuth

**Sign-Up Form** (`components/sign-up-form.tsx`):
- Same changes as login form
- Navigates to `/api/auth/discord?next=/account`

## Why This Works

1. **Reliable Cookie Storage**: `createServerClient` has explicit cookie handling via `cookies()` from `next/headers`, which is more reliable than browser client's automatic cookie handling.

2. **Bypasses Browser Bug**: We're no longer using `createBrowserClient` for OAuth initiation, so we bypass the known bug where it doesn't consistently set the code verifier cookie.

3. **Server-Side Control**: We have full control over cookie attributes and can ensure they're set correctly on the redirect response.

## Flow Diagram

```
User clicks "Sign in with Discord"
  ↓
Client navigates to: /api/auth/discord?next=/protected
  ↓
Route Handler:
  - Uses createServerClient (reliable cookie handling)
  - Calls signInWithOAuth()
  - Code verifier cookie SET ✅ (server-side)
  - Redirects to Discord OAuth URL (with cookies)
  ↓
Discord OAuth:
  - User authorizes app
  - Redirects to: /auth/callback?code=...&state=...
  ↓
Callback Route:
  - Reads code verifier cookie ✅ (should be present)
  - Exchanges code for session
  - Sets auth token cookie
  - Redirects to /protected
```

## Testing

1. **Clear all cookies**:
   - DevTools → Application → Cookies
   - Delete all cookies for `localhost:3000`

2. **Test OAuth flow**:
   - Navigate to `http://localhost:3000/auth/login`
   - Click "Continue with Discord"
   - Should redirect to Discord
   - After authorization, should redirect back and stay on `/protected`

3. **Check terminal logs**:
   - Look for `[OAuth Route Handler]` logs
   - Should see "Code verifier cookie: SET ✅"
   - Callback route should see "Code verifier cookie: FOUND"

4. **Check browser cookies**:
   - After clicking login, check DevTools → Application → Cookies
   - Should see code verifier cookie before Discord redirect
   - After callback, should see auth token cookie

## Benefits

✅ **Reliable**: Uses server-side cookie handling which is more reliable  
✅ **Bypasses Bug**: No longer affected by GitHub Issue #55  
✅ **Better Control**: Full control over cookie attributes and redirect flow  
✅ **Consistent**: Same pattern for both login and sign-up  

## Critical Implementation Details

### Proxy Exclusion

**CRITICAL**: The proxy (`proxy.ts`) **MUST** exclude `/api/auth/discord` from its matcher. The proxy runs `updateSession()` which calls `getClaims()`, and this can interfere with the code verifier cookie being set during OAuth initiation.

**Current Configuration**:
```typescript
matcher: [
  '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/auth/discord|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
]
```

### Cookie Handling

**CRITICAL**: The PKCE code verifier cookie **MUST** be copied to the redirect response. The Route Handler:

1. Tracks all cookies set during `signInWithOAuth()` in `cookiesSetDuringInitiation`
2. Creates a `NextResponse.redirect()` to the Discord OAuth URL
3. Copies all tracked cookies to the redirect response with their full options preserved
4. This ensures the browser receives the code verifier cookie before redirecting to Discord

**Why this matters**: If the code verifier cookie isn't sent to the browser, `exchangeCodeForSession()` will fail with "PKCE code verifier not found in storage".

### Host Consistency

**CRITICAL**: Use `localhost` consistently (not `127.0.0.1`) to avoid cookie name mismatches:

- ✅ `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- ✅ `supabase/config.toml`: `site_url = "http://localhost:3000"`
- ✅ Browser: Access app at `http://localhost:3000`

Cookie names include the host, so mixing `localhost` and `127.0.0.1` causes mismatched cookies (e.g., `sb-localhost-auth-token-code-verifier` vs `sb-127-auth-token-code-verifier`).

### State Parameter

Supabase automatically generates and manages the OAuth `state` parameter. **Do not** manually add state or modify the OAuth URL returned by `signInWithOAuth()`. The state is tied to the PKCE flow and must be handled by Supabase.

## Potential Issues

1. ~~**Proxy Interference**~~: ✅ **FIXED** - Proxy now excludes `/api/auth/discord` from matcher

2. **Cookie Attributes**: Cookie attributes (SameSite, Secure, HttpOnly, Max-Age) are preserved from Supabase's `setAll()` callback. For localhost development, Supabase sets `SameSite=Lax` and `Secure=false` which is correct.

3. **Error Handling**: If OAuth initiation fails, Route Handler redirects to `/auth/login` with error params.

## Rollback Plan

If this doesn't work, we can:
1. Revert to client-side OAuth initiation
2. Wait for fix to GitHub Issue #55
3. Try alternative workarounds (e.g., explicit cookie configuration if supported)

## Deferred Callback Fix (Critical)

**CRITICAL**: In `supabase-js` v2.91.0+, `exchangeCodeForSession()` defers `SIGNED_IN` event notifications using `setTimeout`, which means `setAll()` may be called **after** the function resolves. This causes cookies to be set after the response is returned, resulting in redirect loops.

**Solution**: Add a 50ms delay after `exchangeCodeForSession()` to allow deferred callbacks to execute:

```typescript
const { error } = await supabase.auth.exchangeCodeForSession(code)

// CRITICAL: Wait for deferred callbacks to execute
// This is a workaround for: https://github.com/supabase/supabase-js/issues/2037
await new Promise((resolve) => setTimeout(resolve, 50))
```

**Why this works**: The delay allows the `setTimeout` in supabase-js to execute and call our `setAll()` callback before we return the response. This ensures cookies are set on the redirect response before it's sent to the browser.

**Status**: ✅ **CONFIRMED WORKING** - Tested and verified on 2026-01-23

## Verification Checklist

After implementing this workaround, verify:

- [x] Proxy excludes `/api/auth/discord` from matcher ✅
- [x] Code verifier cookie is set before Discord redirect ✅
- [x] Code verifier cookie is found in callback route ✅
- [x] Host consistency: Using `localhost` everywhere ✅
- [x] Cookie options preserved: SameSite, Secure, HttpOnly attributes are correct ✅
- [x] OAuth flow completes successfully without "PKCE code verifier not found" errors ✅
- [x] Auth token cookies are set before redirect response is returned ✅
- [x] No redirect loops back to `/auth/login` ✅

## References

- [GitHub Issue #55](https://github.com/supabase/ssr/issues/55) - Code verifier cookie bug
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow)
