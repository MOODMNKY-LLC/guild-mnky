# Authentication Redirect Flow

## Current Redirect Flow

### 1. OAuth Flow (Discord)
```
User clicks "Sign in with Discord"
  → Redirects to Discord OAuth
  → Discord redirects back to: /auth/callback?code=...&next=/account
  → Callback exchanges code for session
  → Redirects to: /account (or whatever `next` param specifies)
```

### 2. Password Login Flow
```
User submits login form
  → Server action: app/login/actions.ts
  → Calls supabase.auth.signInWithPassword()
  → On success: redirects to /account
```

### 3. Protected Routes
```
User accesses /protected/*
  → Checks authentication via supabase.auth.getClaims()
  → If not authenticated: redirects to /auth/login
  → If authenticated: renders page
```

### 4. Account Page
```
User accesses /account
  → Checks authentication via supabase.auth.getUser()
  → If not authenticated: redirects to /auth/login
  → If authenticated: renders account page
```

### 5. Proxy/Middleware (Every Request)
```
Every request goes through proxy.ts
  → Calls updateSession() to refresh auth tokens
  → Handles special case: /?code=... → redirects to /auth/callback
```

## Current Complexity Issues

1. **Multiple Redirect Destinations**:
   - OAuth → `/account`
   - Password login → `/account`
   - But `/protected` is the actual dashboard
   - Creates confusion about where users should land

2. **Origin Matching Complexity**:
   - Supabase on `127.0.0.1:54321`
   - Next.js on `127.0.0.1:3000` (configured)
   - But users might access via `localhost:3000`
   - Requires complex detection and error handling

3. **Cookie Domain Handling**:
   - Explicit domain handling for IP addresses
   - SameSite attribute management
   - Development vs production logic

4. **Excessive Debug Logging**:
   - Development-only logs everywhere
   - Makes code harder to read
   - Not needed in production

## Simplified Redirect Flow (IMPLEMENTED)

**Single Destination After Login**: `/protected` (Dashboard)

```
All successful logins → /protected
All unauthenticated access → /auth/login
```

### Changes Made

1. ✅ **OAuth Callback**: Changed default `next` from `/account` to `/protected`
2. ✅ **Login Actions**: Changed redirect from `/account` to `/protected`
3. ✅ **Removed Origin Detection**: Documented requirement to use `127.0.0.1:3000`
4. ✅ **Simplified Cookie Handling**: Using defaults from `@supabase/ssr`
5. ✅ **Reduced Logging**: Removed excessive debug logs

### Benefits

- **Clearer**: One destination after login (dashboard)
- **Simpler**: Less conditional logic
- **Easier to Debug**: Less code to understand
- **More Maintainable**: Standard patterns

## Current Redirect Flow (After Simplification)

### 1. OAuth Flow (Discord)
```
User clicks "Sign in with Discord"
  → Redirects to Discord OAuth
  → Discord redirects back to: /auth/callback?code=...&next=/protected
  → Callback exchanges code for session
  → Redirects to: /protected (dashboard)
```

### 2. Password Login Flow
```
User submits login form
  → Server action: app/login/actions.ts
  → Calls supabase.auth.signInWithPassword()
  → On success: redirects to /protected
```

### 3. Protected Routes
```
User accesses /protected/*
  → Checks authentication via supabase.auth.getClaims()
  → If not authenticated: redirects to /auth/login
  → If authenticated: renders page
```

### 4. Account Page
```
User accesses /account
  → Checks authentication via supabase.auth.getUser()
  → If not authenticated: redirects to /auth/login
  → If authenticated: renders account page
```

### 5. Proxy/Middleware (Every Request)
```
Every request goes through proxy.ts
  → Calls updateSession() to refresh auth tokens
  → Handles special case: /?code=... → redirects to /auth/callback?next=/protected
```
