# Authentication Fixes Applied

## Date: 2026-01-23

## Issues Identified by ChatGPT Analysis

### 1. Auth Callback Cookie Handling ✅ FIXED
**Problem**: After `exchangeCodeForSession()`, cookies were being set in the cookie store but not properly copied to the redirect response with all their options preserved.

**Root Cause**: Next.js `cookieStore.getAll()` only returns `name` and `value` - it doesn't return cookie options. We were trying to read options that don't exist.

**Solution**: 
- **CRITICAL FIX**: Create the redirect response BEFORE calling `exchangeCodeForSession()`
- Have `setAll()` add cookies DIRECTLY to the redirect response during the exchange
- This ensures cookies are set on the response DURING the exchange, not after it completes
- Previously, cookies were being set after the response was already returned, causing them to be lost

### 2. Proxy Interception ✅ VERIFIED
**Problem**: Proxy was potentially interfering with the OAuth callback route.

**Solution**: 
- Verified that the proxy matcher already excludes `/auth/callback` route
- Added explicit comment explaining why this exclusion is critical
- The pattern `'/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'` correctly excludes the callback route

### 3. Host Mismatch ✅ FIXED
**Problem**: Mixing `localhost` and `127.0.0.1` causes cookie name mismatches because Supabase cookie names include the host.

**Solution**: 
- Standardized on `localhost` everywhere
- Updated `supabase/config.toml` with explicit comments about using `localhost` consistently
- Ensured `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` uses `localhost` (already correct)
- Added warnings in config about not mixing hosts

## Files Modified

1. **`app/auth/callback/route.ts`**
   - **CRITICAL**: Create redirect response BEFORE `exchangeCodeForSession()` call
   - Modified `setAll()` to add cookies directly to redirect response during exchange
   - Added 50ms delay after `exchangeCodeForSession()` to allow deferred callbacks to execute
   - This fixes timing issue where cookies were set after response was returned
   - Ensures auth token cookie is included in redirect response headers
   - **Status**: ✅ Confirmed working - OAuth flow completes successfully without redirect loops

2. **`proxy.ts`**
   - Added explicit comment about why `/auth/callback` must be excluded
   - Verified matcher pattern is correct

3. **`supabase/config.toml`**
   - Added comments about using `localhost` consistently
   - Documented why mixing hosts causes issues

### 4. Deferred Callback Timing Issue ✅ FIXED (2026-01-23)
**Problem**: In `supabase-js` v2.91.0+, `exchangeCodeForSession()` defers cookie setting using `setTimeout`, causing `setAll()` to be called after the response is returned. This resulted in auth token cookies not being included in the redirect response, causing redirect loops.

**Root Cause**: Known regression in `supabase-js` v2.91.0+ (GitHub Issue #2037) where `SIGNED_IN` event notifications are deferred, causing cookies to be set asynchronously after the function resolves.

**Solution**: 
- Added `await new Promise((resolve) => setTimeout(resolve, 50))` after `exchangeCodeForSession()`
- This delay allows deferred callbacks to execute before returning the response
- Ensures cookies are set on the redirect response before it's sent to the browser
- Workaround documented with reference to GitHub issue

**Status**: ✅ **CONFIRMED WORKING** - Tested and verified on 2026-01-23

## Testing Checklist

- [x] Test Discord OAuth login locally ✅
- [x] Verify session persists after redirect ✅
- [x] Check that cookies are set correctly in browser DevTools ✅
- [ ] Test in production environment
- [x] Verify no redirect loops occur ✅
- [x] Confirm session works across page refreshes ✅

## Important Notes

1. **Always use `localhost`** when accessing the app locally, not `127.0.0.1`
2. **Cookie names include host**: `sb-localhost-auth-token` vs `sb-127-auth-token` are different cookies
3. **Proxy exclusion is critical**: The proxy must not run on `/auth/callback` to avoid interfering with token exchange
4. **Cookie copying is essential**: Redirect responses don't automatically include cookies from the cookie store - they must be explicitly copied

## Production Considerations

For production, ensure:
- `NEXT_PUBLIC_SUPABASE_URL` matches your production domain
- `site_url` in Supabase dashboard matches your production domain
- `additional_redirect_urls` includes your production callback URL
- No mixing of different host formats (e.g., `example.com` vs `www.example.com`)
