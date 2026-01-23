# OAuth Authentication Fix Summary

## Date: 2026-01-23

## Problem
Discord OAuth authentication was failing with persistent redirect loops. Users would complete OAuth flow but be immediately redirected back to `/auth/login` instead of staying authenticated.

## Root Causes Identified

### 1. Client-Side PKCE Code Verifier Bug (GitHub Issue #55)
- `createBrowserClient` doesn't consistently set the PKCE code verifier cookie
- Code verifier cookie was sometimes written to localStorage instead of cookies
- When missing, `exchangeCodeForSession()` fails with "PKCE code verifier not found"

**Fix**: Implemented server-side OAuth initiation via Route Handler (`/api/auth/discord`)
- Uses `createServerClient` which has reliable cookie handling
- Code verifier cookie is set server-side before redirecting to Discord
- Bypasses the browser client bug entirely

### 2. Deferred Callback Timing Issue (GitHub Issue #2037)
- `supabase-js` v2.91.0+ defers `SIGNED_IN` event notifications using `setTimeout`
- `setAll()` callback executes **after** `exchangeCodeForSession()` resolves
- Auth token cookies were set after the redirect response was returned
- Browser never received auth token cookies, causing redirect loops

**Fix**: Added 50ms delay after `exchangeCodeForSession()` to allow deferred callbacks to execute
- Ensures cookies are set on redirect response before it's returned
- Workaround for known regression in supabase-js

### 3. Cookie Handling in Redirect Responses
- Next.js doesn't automatically copy cookies from cookie store to redirect responses
- Cookies must be explicitly set on the redirect response object
- Cookie options (SameSite, Secure, HttpOnly, Max-Age) must be preserved

**Fix**: Modified `setAll()` callback to add cookies directly to redirect response
- Cookies are set during the exchange, not after
- Full cookie options are preserved from Supabase

### 4. Proxy Interference
- Proxy was potentially running on OAuth routes
- Could interfere with code verifier cookie setting during initiation
- Could interfere with token exchange during callback

**Fix**: Excluded `/api/auth/discord` and `/auth/callback` from proxy matcher
- Proxy no longer runs on OAuth routes
- Prevents interference with OAuth flow

### 5. Host Consistency
- Mixing `localhost` and `127.0.0.1` causes cookie name mismatches
- Supabase cookie names include the host
- Different hosts = different cookies = mismatched state

**Fix**: Standardized on `localhost` everywhere
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- `supabase/config.toml`: `site_url = "http://localhost:3000"`
- Browser: Access app at `http://localhost:3000`

## Implementation Details

### Files Modified

1. **`app/api/auth/discord/route.ts`** (NEW)
   - Server-side OAuth initiation Route Handler
   - Uses `createServerClient` for reliable cookie handling
   - Copies code verifier cookie to redirect response
   - Excluded from proxy matcher

2. **`app/auth/callback/route.ts`**
   - Create redirect response BEFORE `exchangeCodeForSession()`
   - Modified `setAll()` to add cookies directly to redirect response
   - Added 50ms delay after `exchangeCodeForSession()` for deferred callbacks
   - Enhanced logging for debugging

3. **`components/login-form.tsx`**
   - Removed client-side OAuth initiation
   - Now navigates to `/api/auth/discord?next=/protected`

4. **`components/sign-up-form.tsx`**
   - Removed client-side OAuth initiation
   - Now navigates to `/api/auth/discord?next=/account`

5. **`app/login/actions.ts`**
   - Removed `signInWithDiscord` Server Action (no longer needed)

6. **`proxy.ts`**
   - Excluded `/api/auth/discord` from matcher
   - Already excluded `/auth/callback` (verified)

7. **`supabase/config.toml`**
   - Standardized on `localhost` for `site_url`
   - Added comments about host consistency

## Testing Results

✅ **OAuth flow completes successfully**
- Code verifier cookie is set before Discord redirect
- Code verifier cookie is found in callback route
- Auth token cookies are set before redirect response is returned
- No redirect loops back to `/auth/login`
- Session persists after redirect
- Session works across page refreshes

## Key Learnings

1. **Server-side OAuth initiation is more reliable** than client-side for SSR frameworks
2. **Cookie timing matters** - cookies must be set on response before it's returned
3. **Deferred callbacks require delays** - `setTimeout` in libraries can cause timing issues
4. **Host consistency is critical** - mixing hosts causes cookie mismatches
5. **Proxy exclusion is necessary** - OAuth routes need special handling

## Future Considerations

- Monitor for fix to GitHub Issue #2037 in supabase-js
- Once fixed, the 50ms delay can be removed
- Consider upgrading to newer versions of `@supabase/ssr` when available
- Document this pattern for other OAuth providers

## References

- [GitHub Issue #55](https://github.com/supabase/ssr/issues/55) - Code verifier cookie bug
- [GitHub Issue #2037](https://github.com/supabase/supabase-js/issues/2037) - Deferred callback regression
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
