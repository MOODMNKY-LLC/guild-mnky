# Deep Analysis: Bungie Authentication Implementations
## Comprehensive Code Analysis of Braytech & RaidHub

**Date**: January 31, 2026  
**Analysis Type**: Deep Code Review & Pattern Extraction  
**Repos Analyzed**: 
- `Rhincodon/braytech.org` (Braytech)
- `Raid-Hub/Web-App` (RaidHub Frontend)
- `Raid-Hub/API` (RaidHub Backend)

---

## Executive Summary

This document provides a **comprehensive, deep-dive analysis** of how two production Destiny 2 applications implement Bungie.net OAuth2 authentication. The analysis extracts patterns, best practices, architectural decisions, and implementation details that directly inform our Phase 3 implementation strategy.

**Key Finding**: Both implementations follow similar OAuth2 patterns but differ significantly in:
- **Token Storage**: Braytech uses client-side localStorage; RaidHub uses server-side database
- **Token Refresh**: Braytech refreshes on-demand; RaidHub refreshes proactively in session callbacks
- **Architecture**: Braytech is client-heavy; RaidHub is server-first with NextAuth
- **Error Handling**: RaidHub has more sophisticated error categorization and recovery

**Recommendation for Phase 3**: Adopt a **hybrid approach**:
- **Phase 3 (Immediate)**: Use Discord Linked Roles (no OAuth needed)
- **Phase 6 (Future)**: Implement server-side token storage pattern from RaidHub with proactive refresh

---

## Table of Contents

1. [Architecture Comparison](#1-architecture-comparison)
2. [OAuth Flow Implementation](#2-oauth-flow-implementation)
3. [Token Management Strategies](#3-token-management-strategies)
4. [Error Handling & Recovery](#4-error-handling--recovery)
5. [Database Schema Patterns](#5-database-schema-patterns)
6. [API Client Patterns](#6-api-client-patterns)
7. [Session Management](#7-session-management)
8. [Code Patterns & Best Practices](#8-code-patterns--best-practices)
9. [Phase 3 Implementation Recommendations](#9-phase-3-implementation-recommendations)
10. [Phase 6 Implementation Roadmap](#10-phase-6-implementation-roadmap)

---

## 1. Architecture Comparison

### 1.1 Braytech Architecture

**Stack:**
- React (Class Components)
- Redux for state management
- Client-side token storage (localStorage)
- Direct Bungie API calls from client

**Key Characteristics:**
- **Simple**: Minimal abstraction layers
- **Client-Heavy**: Most logic runs in browser
- **Stateless Server**: No server-side session management
- **Direct OAuth**: Handles OAuth callback in React component

**File Structure:**
```
src/
  components/
    BungieAuth/
      index.js          # OAuth component + token exchange
  utils/
    bungie.js           # API client + token refresh logic
    localStorage.js     # Token storage utilities
    reduxStore.js      # Global state
```

**OAuth Flow:**
1. User clicks "Authenticate" → Redirects to Bungie OAuth
2. Bungie redirects back with `code` parameter
3. Component detects `code` in URL → Calls `GetOAuthAccessToken()`
4. Token exchange happens client-side
5. Tokens stored in localStorage
6. Component fetches membership data

### 1.2 RaidHub Architecture

**Stack:**
- Next.js 14 (App Router)
- NextAuth v5 (Auth.js)
- Prisma ORM + SQLite/Turso
- Server-side token storage
- TypeScript throughout

**Key Characteristics:**
- **Server-First**: OAuth handled server-side via NextAuth
- **Database-Backed**: Tokens stored in `Account` table
- **Proactive Refresh**: Tokens refreshed in session callback
- **Type-Safe**: Full TypeScript with generated types from `bungie-net-core`

**File Structure:**
```
src/
  lib/server/auth/
    index.ts                    # NextAuth configuration
    adapter.ts                  # Prisma adapter (custom)
    providers/
      bungie.ts                 # Bungie OAuth provider
    sessionCallback.ts          # Token refresh logic
    signInCallback.ts           # Token storage on sign-in
    updateBungieAccessTokens.ts # Token update utility
    updateDestinyProfiles.ts    # Profile sync utility
  services/bungie/
    BungieClient.ts             # Base client (abstract)
    ServerBungieClient.ts       # Server-side client
    ClientBungieClient.ts       # Client-side client
  components/providers/session/
    ClientSessionManager.tsx    # Client-side token sync
    BungieClientProvider.tsx    # React context provider
```

**OAuth Flow:**
1. User clicks "Sign in with Bungie" → NextAuth handles redirect
2. NextAuth calls Bungie OAuth provider
3. Bungie redirects to NextAuth callback
4. `signInCallback` stores tokens in database
5. `sessionCallback` refreshes tokens proactively
6. Client receives fresh tokens via session

### 1.3 Comparison Matrix

| Aspect | Braytech | RaidHub | Our Recommendation |
|--------|----------|---------|-------------------|
| **Token Storage** | localStorage (client) | Database (server) | **Server-side** (more secure) |
| **Token Refresh** | On-demand (when expired) | Proactive (session callback) | **Proactive** (better UX) |
| **OAuth Handler** | React component | NextAuth provider | **NextAuth** (if Phase 6) |
| **Error Handling** | Basic (try/catch) | Sophisticated (error types) | **Sophisticated** (better UX) |
| **Type Safety** | JavaScript | TypeScript + types | **TypeScript** (our stack) |
| **API Client** | Simple fetch wrapper | Class-based with retry logic | **Class-based** (more robust) |
| **Session Management** | Redux state | NextAuth sessions | **NextAuth** (if Phase 6) |

---

## 2. OAuth Flow Implementation

### 2.1 Braytech OAuth Flow

**Initiation:**
```javascript
// Simple redirect to Bungie OAuth
window.location = `https://www.bungie.net/en/OAuth/Authorize?client_id=${CLIENT_ID}&response_type=code`;
```

**Callback Handling:**
```javascript
// Component detects code in URL
componentDidMount() {
  const code = queryString.parse(location.search)?.code;
  
  if (!tokens && code) {
    this.getAccessTokens(code); // Exchange code for tokens
  }
}

getAccessTokens = async (code) => {
  await bungie.GetOAuthAccessToken(
    `client_id=${CLIENT_ID}&grant_type=authorization_code&code=${code}`
  );
  this.getMemberships(); // Fetch user data
}
```

**Token Exchange:**
```javascript
// Uses Basic Auth header with client credentials
export const GetOAuthAccessToken = async (body) =>
  apiRequest('/Platform/App/OAuth/Token/', {
    method: 'post',
    headers: {
      Authorization: `Basic ${window.btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
    },
    body
  });
```

**Key Observations:**
- ✅ Simple and straightforward
- ✅ Works entirely client-side
- ⚠️ Client secret exposed in frontend code (security risk)
- ⚠️ No state parameter (CSRF vulnerability)
- ⚠️ No error recovery for expired refresh tokens

### 2.2 RaidHub OAuth Flow

**Provider Configuration:**
```typescript
// Uses NextAuth provider pattern
export default function BungieProvider(creds: {
  apiKey: string
  clientId: string
  clientSecret: string
}): OAuth2Config<DestinyLinkedProfilesResponse> {
  return {
    id: "bungie",
    name: "Bungie",
    type: "oauth",
    checks: ["state"], // CSRF protection
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    authorization: {
      url: "https://www.bungie.net/en/OAuth/Authorize",
      params: { scope: "" } // Scope fixed at registration
    },
    token: "https://www.bungie.net/platform/app/oauth/token/",
    userinfo: {
      url: "foo://bar", // Custom userinfo handler
      async request({ tokens }) {
        // Fetch linked profiles using access token
        const res = await getLinkedProfiles(
          new AuthBungieClient(tokens.access_token!),
          {
            membershipType: 254,
            membershipId: tokens.membership_id as string
          }
        )
        return res.Response
      }
    },
    profile(data): BungieUser {
      return {
        id: data.bnetMembership.membershipId,
        name: data.bnetMembership.displayName,
        image: `https://www.bungie.net${data.bnetMembership.iconPath}`,
        userMembershipData: data
      }
    }
  }
}
```

**Sign-In Callback:**
```typescript
export const signInCallback = async (params) => {
  if (params.account?.provider === "bungie" && params.profile) {
    if ("createdAt" in params.user && params.user.createdAt.getTime() > 0) {
      await Promise.all([
        updateBungieAccessTokens({
          userId: params.account.providerAccountId,
          access: {
            value: params.account.access_token!,
            expires: new Date(params.account.expires_at! * 1000)
          },
          refresh: {
            value: params.account.refresh_token!,
            expires: new Date(Date.now() + params.account.refresh_expires_in! * 1000)
          }
        }),
        updateDestinyProfiles(params.profile)
      ])
    }
  }
  return true
}
```

**Key Observations:**
- ✅ Server-side token storage (secure)
- ✅ CSRF protection via state parameter
- ✅ Automatic profile sync on sign-in
- ✅ Type-safe with TypeScript
- ✅ Uses `bungie-net-core` library for type safety

### 2.3 OAuth Flow Comparison

| Step | Braytech | RaidHub | Best Practice |
|------|----------|---------|---------------|
| **Initiation** | Direct redirect | NextAuth `signIn()` | NextAuth (if using) |
| **State Parameter** | ❌ Missing | ✅ Included | **Required** (CSRF protection) |
| **Token Exchange** | Client-side | Server-side | **Server-side** (security) |
| **Token Storage** | localStorage | Database | **Database** (persistent, secure) |
| **Error Handling** | Basic | Comprehensive | **Comprehensive** (better UX) |
| **Profile Fetch** | Manual after tokens | Automatic in provider | **Automatic** (cleaner) |

---

## 3. Token Management Strategies

### 3.1 Braytech Token Management

**Storage:**
```javascript
// Tokens stored in localStorage as JSON
const tokens = {
  access: {
    value: response.access_token,
    expires: now + response.expires_in * 1000
  },
  refresh: {
    value: response.refresh_token,
    expires: now + response.refresh_expires_in * 1000
  },
  bnetMembershipId: response.membership_id,
  destinyMemberships: memberships.Response.destinyMemberships
}

ls.set('setting.auth', tokens); // localStorage.setItem
```

**Refresh Logic:**
```javascript
// Refreshes token on-demand when making API call
if (tokens && options.withAuth && !options.headers.Authorization) {
  let now = new Date().getTime() + 10000; // 10 second buffer
  let then = new Date(tokens.access.expires).getTime();

  if (now > then) {
    // Token expired, refresh it
    await GetOAuthAccessToken(
      `grant_type=refresh_token&refresh_token=${tokens.refresh.value}`
    );
    tokens = ls.get('setting.auth'); // Get updated tokens
  }
  
  options.headers.Authorization = `Bearer ${tokens.access.value}`;
}
```

**Characteristics:**
- ⚠️ **On-Demand Refresh**: Only refreshes when making API call
- ⚠️ **Client-Side Only**: No server-side token management
- ⚠️ **No Proactive Refresh**: User might hit expired token
- ✅ **Simple**: Easy to understand and debug
- ⚠️ **No Error Recovery**: If refresh fails, user must re-authenticate

### 3.2 RaidHub Token Management

**Storage:**
```typescript
// Tokens stored in Prisma Account table
model Account {
  id                String  @id @default(uuid())
  userId            String
  provider          String  // "bungie"
  providerAccountId String  // Bungie membership ID
  refreshToken      String?
  accessToken       String?
  expiresAt         Int?    // Unix timestamp (seconds)
  refreshExpiresAt  Int?    // Unix timestamp (seconds)
  // ... other fields
}
```

**Proactive Refresh (Session Callback):**
```typescript
export const sessionCallback = async ({ session, user }) => {
  const bungieToken = await refreshBungieAuth(user.bungieAccount, user.id)
  
  return {
    ...session,
    bungieAccessToken: bungieToken.token,
    errors: bungieToken.errors
  }
}

async function refreshBungieAuth(bungie: BungieAccount, userId: string) {
  // Check if token is still valid (with 5 minute buffer)
  if (
    bungie.expiresAt &&
    bungie.accessToken &&
    Date.now() < (bungie.expiresAt - 300) * 1000
  ) {
    return {
      token: {
        value: bungie.accessToken,
        expires: new Date(bungie.expiresAt * 1000).toISOString()
      },
      errors: []
    }
  }
  
  // Token expired or expiring soon, refresh it
  else if (
    bungie.refreshToken &&
    (!bungie.refreshExpiresAt || Date.now() < bungie.refreshExpiresAt * 1000)
  ) {
    const bungieTokens = await refreshAuthorization(
      bungie.refreshToken,
      {
        client_id: process.env.BUNGIE_CLIENT_ID!,
        client_secret: process.env.BUNGIE_CLIENT_SECRET!
      },
      bungieClient
    ).catch((err) => {
      // Handle specific error types
      if (err instanceof BungieServiceError) {
        switch (err.cause.error_description) {
          case "SystemDisabled":
            errors.push("BungieAPIOffline")
            break
          case "RefreshTokenNotYetValid":
          case "AuthorizationRecordExpired":
          case "AuthorizationRecordRevoked":
            errors.push("ExpiredBungieRefreshToken")
            break
        }
      }
      return null
    })

    if (bungieTokens) {
      // Update tokens in database
      await updateBungieAccessTokens({
        userId,
        access: {
          value: bungieTokens.access_token,
          expires: new Date(Date.now() + bungieTokens.expires_in * 1000)
        },
        refresh: {
          value: bungieTokens.refresh_token,
          expires: new Date(Date.now() + bungieTokens.refresh_expires_in * 1000)
        }
      })
    }

    return {
      token: bungieTokens ? {
        value: bungieTokens.access_token,
        expires: new Date(Date.now() + bungieTokens.expires_in * 1000).toISOString()
      } : undefined,
      errors
    }
  }
  
  // Refresh token expired
  else {
    return {
      token: undefined,
      errors: ["ExpiredRefreshTokenError"]
    }
  }
}
```

**Client-Side Token Sync:**
```typescript
// ClientSessionManager.tsx - Syncs tokens from session to API client
useEffect(() => {
  if (session.data.bungieAccessToken) {
    bungieClient.setToken({
      value: session.data.bungieAccessToken.value,
      expires: new Date(session.data.bungieAccessToken.expires)
    })

    // Calculate when to refetch session (before token expires)
    const timeRemaining = expires.getTime() - Date.now()
    setNextRefetch(Math.max(timeRemaining - 30_000, 1000)) // 30 second buffer
  }
}, [session])
```

**Characteristics:**
- ✅ **Proactive Refresh**: Refreshes before expiration (5 min buffer)
- ✅ **Server-Side Storage**: Secure, persistent token storage
- ✅ **Error Categorization**: Specific error types for better UX
- ✅ **Automatic Recovery**: Handles various error scenarios
- ✅ **Client Sync**: Automatically syncs tokens to client API client
- ✅ **Refetch Timing**: Calculates optimal refetch interval

### 3.3 Token Management Comparison

| Feature | Braytech | RaidHub | Winner |
|---------|----------|---------|--------|
| **Storage Location** | localStorage | Database | **RaidHub** (more secure) |
| **Refresh Strategy** | On-demand | Proactive | **RaidHub** (better UX) |
| **Refresh Buffer** | 10 seconds | 5 minutes | **RaidHub** (more reliable) |
| **Error Handling** | Basic | Comprehensive | **RaidHub** (better UX) |
| **Token Persistence** | Browser-dependent | Database | **RaidHub** (cross-device) |
| **Security** | ⚠️ Client-side | ✅ Server-side | **RaidHub** (more secure) |

---

## 4. Error Handling & Recovery

### 4.1 Braytech Error Handling

**Approach:**
```javascript
// Basic try/catch with Redux notifications
const request = await fetch(url, options)
  .catch(e => {
    store.dispatch({
      type: 'PUSH_NOTIFICATION',
      payload: {
        error: true,
        displayProperties: {
          name: `HTTP error`,
          description: `A network error occurred. ${e.message}.`
        }
      }
    })
  })

const response = await request.json()

if (response && response.ErrorCode && response.ErrorCode !== 1) {
  store.dispatch({
    type: 'PUSH_NOTIFICATION',
    payload: {
      error: true,
      displayProperties: {
        name: 'Bungie',
        description: `${response.ErrorCode} ${response.ErrorStatus} ${response.Message}`
      }
    }
  })
  return response
}
```

**Characteristics:**
- ✅ User-friendly error messages
- ⚠️ Generic error handling
- ⚠️ No retry logic
- ⚠️ No error categorization
- ⚠️ User must manually retry

### 4.2 RaidHub Error Handling

**Error Type System:**
```typescript
export type AuthError =
  | "BungieAccessTokenError"
  | "BungieAPIOffline"
  | "ExpiredBungieRefreshToken"
  | "RaidHubAuthorizationError"
  | "PrismaError"
```

**Error Categorization:**
```typescript
// Specific error handling in refresh logic
.catch((err: unknown) => {
  if (err instanceof BungieServiceError && err.cause.error === "server_error") {
    switch (err.cause.error_description) {
      case "SystemDisabled":
        errors.push("BungieAPIOffline")
        break
      case "RefreshTokenNotYetValid":
      case "AccessTokenHasExpired":
      case "AuthorizationCodeInvalid":
      case "AuthorizationRecordExpired":
      case "AuthorizationRecordRevoked":
      case "AuthorizationCodeStale":
        errors.push("ExpiredBungieRefreshToken")
        break
    }
  }
  return null
})
```

**Client-Side Error Recovery:**
```typescript
// ClientSessionManager.tsx - Handles errors from session
useEffect(() => {
  switch (session.status) {
    case "authenticated":
      if (session.data.errors.includes("ExpiredBungieRefreshToken")) {
        bungieClient.clearToken()
        void signOut() // Force re-authentication
      } else if (session.data.errors.includes("BungieAPIOffline")) {
        setNextRefetch(120_000) // Retry in 2 minutes
      } else if (
        session.data.errors.includes("BungieAccessTokenError") &&
        isAttemptingToRefetchToken
      ) {
        setFailedTokenRequests(prev => prev + 1)
        setNextRefetch(10_000) // Retry in 10 seconds
      }
      // ... token sync logic
  }
}, [session])
```

**Retry Logic in API Client:**
```typescript
// BaseBungieClient.ts - Retries on specific error codes
static readonly RetryableErrorCodes = new Set<PlatformErrorCodes>([
  1672, // DestinyThrottledByGameServer
  1688  // DestinyDirectBabelClientTimeout
])

protected async handle<T>(url: URL, payload: RequestInit): Promise<T> {
  try {
    return await this.request(url, payload)
  } catch (err) {
    if (
      err instanceof BungiePlatformError &&
      ClientBungieClient.RetryableErrorCodes.has(err.ErrorCode)
    ) {
      url.searchParams.set("retry", err.cause.ErrorStatus)
      return this.request(url, payload) // Retry once
    }
    throw err
  }
}
```

**Characteristics:**
- ✅ **Categorized Errors**: Specific error types for different scenarios
- ✅ **Automatic Retry**: Retries on transient errors
- ✅ **User-Friendly**: Errors passed to client for display
- ✅ **Recovery Strategies**: Different strategies for different errors
- ✅ **Rate Limit Handling**: Handles throttling gracefully

### 4.3 Error Handling Comparison

| Aspect | Braytech | RaidHub | Best Practice |
|--------|----------|---------|---------------|
| **Error Types** | Generic | Categorized | **Categorized** (better UX) |
| **Retry Logic** | ❌ None | ✅ Automatic | **Automatic** (better UX) |
| **Error Recovery** | Manual | Automatic | **Automatic** (better UX) |
| **User Feedback** | Notifications | Session errors | **Session errors** (consistent) |
| **Rate Limit Handling** | ❌ None | ✅ Retry logic | **Retry logic** (better UX) |

---

## 5. Database Schema Patterns

### 5.1 Braytech Database Schema

**No Database**: Braytech uses localStorage exclusively. No server-side database for tokens.

**Stored Data (localStorage):**
```javascript
{
  access: {
    value: "access_token_string",
    expires: 1234567890000 // Unix timestamp (milliseconds)
  },
  refresh: {
    value: "refresh_token_string",
    expires: 1234567890000
  },
  bnetMembershipId: "123456789",
  destinyMemberships: [
    {
      membershipType: 1, // Xbox
      membershipId: "987654321",
      displayName: "GuardianName"
    }
  ]
}
```

**Limitations:**
- ⚠️ No cross-device sync
- ⚠️ Lost on browser clear
- ⚠️ No server-side validation
- ⚠️ No audit trail

### 5.2 RaidHub Database Schema

**Prisma Schema:**
```prisma
model User {
  id                 String              @id @map("bungie_membership_id")
  email              String?             @unique
  name               String?
  image              String?
  role_              String              @default("USER")
  accounts           Account[]           @relation("UserToAccount")
  profiles           Profile[]           @relation("UserToProfile")
  sessions           Session[]           @relation("UserToSession")
  // ...
}

model Account {
  id                String  @id @default(uuid())
  userId            String  @map("bungie_membership_id")
  type              String
  provider          String  // "bungie"
  providerAccountId String  @map("provider_account_id")
  refreshToken      String? @map("refresh_token")
  accessToken       String? @map("access_token")
  expiresAt         Int?    @map("expires_at") // Unix timestamp (seconds)
  refreshExpiresAt  Int?    @map("refresh_expires_at")
  tokenType         String? @map("token_type")
  scope             String?
  // ...
  
  @@unique([provider, providerAccountId], name: "uniqueProviderAccountId")
  @@unique([provider, userId], name: "uniqueProviderUser")
}

model Profile {
  destinyMembershipId   String  @id @map("destiny_membership_id")
  destinyMembershipType Int     @map("destiny_membership_type")
  bungieMembershipId    String? @map("bungie_membership_id")
  isPrimary             Boolean @map("is_primary")
  vanity                String? @unique
  user                  User?   @relation("UserToProfile", fields: [bungieMembershipId], references: [id])
  // ...
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("bungie_membership_id")
  sessionToken String   @unique @map("session_token")
  expires      DateTime @default(now())
  user         User     @relation("UserToSession", fields: [userId], references: [id], onDelete: Cascade)
  // ...
}
```

**Key Design Decisions:**
- ✅ **User ID = Bungie Membership ID**: Uses Bungie ID as primary key
- ✅ **Separate Profile Table**: Tracks multiple Destiny profiles per user
- ✅ **Account Table**: Stores OAuth tokens with expiration timestamps
- ✅ **Session Table**: NextAuth session management
- ✅ **Unique Constraints**: Prevents duplicate accounts/profiles
- ✅ **Cascade Deletes**: Clean up related data on user deletion

**Token Storage Pattern:**
```typescript
// Tokens stored as plain strings (not encrypted in schema)
// Encryption should be handled at application level
model Account {
  accessToken       String? // Plain text (should encrypt in production)
  refreshToken      String? // Plain text (should encrypt in production)
  expiresAt         Int?    // Unix timestamp (seconds)
  refreshExpiresAt  Int?    // Unix timestamp (seconds)
}
```

### 5.3 Database Schema Recommendations

**For Our Implementation:**

```sql
-- Bungie connections table (Phase 6)
CREATE TABLE public.bungie_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Bungie identifiers
  bungie_membership_id bigint NOT NULL,
  destiny_membership_type int NOT NULL, -- 1=Xbox, 2=PSN, 3=Steam, etc.
  destiny_membership_id bigint NOT NULL,
  
  -- Encrypted tokens (use Supabase Vault or application encryption)
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  
  -- Expiration timestamps
  token_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  
  -- Metadata
  scopes text[] NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz,
  last_verified_at timestamptz,
  
  -- Constraints
  CONSTRAINT bungie_connections_one_per_profile UNIQUE (profile_id),
  CONSTRAINT bungie_connections_unique_membership UNIQUE (bungie_membership_id)
);

-- Indexes for performance
CREATE INDEX idx_bungie_connections_profile ON public.bungie_connections(profile_id);
CREATE INDEX idx_bungie_connections_expires ON public.bungie_connections(token_expires_at) 
  WHERE token_expires_at > now();

-- RLS Policies
ALTER TABLE public.bungie_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bungie connection"
  ON public.bungie_connections FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can create their own bungie connection"
  ON public.bungie_connections FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own bungie connection"
  ON public.bungie_connections FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own bungie connection"
  ON public.bungie_connections FOR DELETE
  USING (auth.uid() = profile_id);
```

---

## 6. API Client Patterns

### 6.1 Braytech API Client

**Simple Fetch Wrapper:**
```javascript
async function apiRequest(path, options = {}) {
  const defaults = {
    headers: {},
    stats: false,
    withAuth: false,
    errors: { hide: false }
  }

  options = { ...defaults, ...options }

  // Add API key
  options.headers['X-API-Key'] = process.env.REACT_APP_BUNGIE_API_KEY

  // Handle token refresh if needed
  if (tokens && options.withAuth && !options.headers.Authorization) {
    let now = new Date().getTime() + 10000
    let then = new Date(tokens.access.expires).getTime()

    if (now > then) {
      await GetOAuthAccessToken(
        `grant_type=refresh_token&refresh_token=${tokens.refresh.value}`
      )
      tokens = ls.get('setting.auth')
    }
    
    options.headers.Authorization = `Bearer ${tokens.access.value}`
  }

  const request = await fetch(`https://${stats ? 'stats' : 'www'}.bungie.net${path}`, options)
  const response = await request.json()

  // Error handling
  if (response && response.ErrorCode && response.ErrorCode !== 1) {
    // Dispatch error notification
    return response
  }

  return response
}
```

**Characteristics:**
- ✅ Simple and straightforward
- ✅ Automatic token refresh on API calls
- ⚠️ No retry logic
- ⚠️ Basic error handling
- ⚠️ No request queuing

### 6.2 RaidHub API Client

**Class-Based Architecture:**
```typescript
// Base abstract class
export default abstract class BaseBungieClient implements BungieClientProtocol {
  constructor(private fetchFn: typeof fetch) {}

  public readonly fetch = async <T>(config: BungieFetchConfig): Promise<T> => {
    const payload = this.generatePayload(config)
    return this.handle(config.url, payload)
  }

  protected readonly request = async <T>(url: URL, payload: RequestInit): Promise<T> => {
    const res = await this.fetchFn(url, payload)
    const text = await res.text()
    const contentType = res.headers.get("Content-Type")

    if (!res.ok) {
      if (contentType?.includes("application/json")) {
        const data = JSON.parse(text)
        if ("ErrorCode" in data && data.ErrorCode !== 1) {
          throw new BungiePlatformError(data, res.status, url.pathname)
        }
      }
    }

    return JSON.parse(text) as T
  }

  protected abstract generatePayload(config: BungieFetchConfig): { headers: Headers }
  protected abstract handle<T>(url: URL, payload: RequestInit): Promise<T>

  // Error code constants
  static readonly AuthErrorCodes = new Set<PlatformErrorCodes>([
    99,   // WebAuthRequired
    22,   // WebAuthModuleAsyncFailed
    2124, // AuthorizationRecordRevoked
    2123, // AuthorizationRecordExpired
    2122, // AuthorizationCodeStale
    2106  // AuthorizationCodeInvalid
  ])

  static readonly RetryableErrorCodes = new Set<PlatformErrorCodes>([
    1672, // DestinyThrottledByGameServer
    1688  // DestinyDirectBabelClientTimeout
  ])
}

// Server-side client
export default class ServerBungieClient extends BaseBungieClient {
  generatePayload(config: BungieFetchConfig): { headers: Headers } {
    const apiKey = process.env.BUNGIE_API_KEY
    if (!apiKey) throw new Error("Missing BUNGIE_API_KEY")

    const payload: RequestInit & { headers: Headers } = {
      method: config.method,
      body: config.body,
      headers: new Headers(config.headers),
      next: this.next, // Next.js cache config
      cache: this.cache
    }

    payload.headers.set("X-API-KEY", apiKey)
    payload.headers.set("Origin", baseUrl)

    return payload
  }

  async handle<T>(url: URL, payload: RequestInit): Promise<T> {
    try {
      return await this.request(url, payload) as T
    } catch (err) {
      // Retry on specific error codes
      if (
        err instanceof BungiePlatformError &&
        ServerBungieClient.RetryableErrorCodes.has(err.ErrorCode)
      ) {
        url.searchParams.set("retry", err.cause.ErrorStatus)
        return this.request(url, payload) as T
      }
      throw err
    }
  }
}

// Client-side client
export default class ClientBungieClient extends BaseBungieClient {
  private accessToken: string | null = null
  private readonly emitter = new EventEmitter()

  generatePayload(config: BungieFetchConfig): { headers: Headers } {
    const apiKey = process.env.BUNGIE_API_KEY
    if (!apiKey) throw new Error("Missing BUNGIE_API_KEY")

    const payload: RequestInit & { headers: Headers } = {
      method: config.method,
      body: config.body,
      credentials: "omit",
      headers: new Headers(config.headers ?? {})
    }

    if (config.url.pathname.match(/\/Platform\//)) {
      payload.headers.set("X-API-KEY", apiKey)
      if (this.accessToken) {
        payload.headers.set("Authorization", `Bearer ${this.accessToken}`)
      }
    }

    return payload
  }

  async handle<T>(url: URL, payload: RequestInit): Promise<T> {
    try {
      return await this.request(url, payload)
    } catch (err) {
      // Handle unauthorized errors (trigger token refresh)
      if (
        !!this.accessToken &&
        url.pathname.match(/\/Platform\//) &&
        ((err instanceof BungieHTTPError && err.status === 401) ||
         (err instanceof BungiePlatformError &&
          ClientBungieClient.AuthErrorCodes.has(err.ErrorCode)))
      ) {
        return await new Promise(resolve => {
          const timeout = setTimeout(() => {
            this.emitter.off("new-token", listener)
            url.searchParams.set("retry", "authorization-timeout")
            resolve(this.request(url, payload))
          }, 5000)
          
          const listener = () => {
            clearTimeout(timeout)
            url.searchParams.set("retry", "reauthorized")
            resolve(this.request(url, payload))
          }
          
          this.emitter.once("new-token", listener)
          this.emitter.emit("unauthorized") // Trigger token refresh
        })
      }
      // Retry on throttling
      else if (
        err instanceof BungiePlatformError &&
        ClientBungieClient.RetryableErrorCodes.has(err.ErrorCode)
      ) {
        url.searchParams.set("retry", err.cause.ErrorStatus)
        return this.request(url, payload)
      }
      throw err
    }
  }

  public readonly setToken = (token: { value: string; expires: Date }) => {
    if (token.value !== this.accessToken) {
      this.emitter.emit("new-token")
    }
    this.accessToken = token.value
  }
}
```

**Characteristics:**
- ✅ **Class-Based**: Extensible architecture
- ✅ **Separation of Concerns**: Server vs Client clients
- ✅ **Error Handling**: Specific error types and retry logic
- ✅ **Token Management**: Automatic token injection
- ✅ **Event-Driven**: Token refresh coordination via events
- ✅ **Type Safety**: Uses `bungie-net-core` types

### 6.3 API Client Recommendations

**For Our Implementation:**

```typescript
// lib/bungie/client.ts
import type { BungieFetchConfig } from "bungie-net-core"

export abstract class BaseBungieClient {
  constructor(protected fetchFn: typeof fetch) {}

  protected abstract generatePayload(config: BungieFetchConfig): RequestInit & { headers: Headers }
  protected abstract handle<T>(url: URL, payload: RequestInit): Promise<T>

  public async fetch<T>(config: BungieFetchConfig): Promise<T> {
    const payload = this.generatePayload(config)
    return this.handle(config.url, payload)
  }

  // Error code constants (from RaidHub)
  static readonly AuthErrorCodes = new Set([99, 22, 2124, 2123, 2122, 2106])
  static readonly RetryableErrorCodes = new Set([1672, 1688])
}

// Server-side client
export class ServerBungieClient extends BaseBungieClient {
  generatePayload(config: BungieFetchConfig) {
    const apiKey = process.env.BUNGIE_API_KEY
    if (!apiKey) throw new Error("Missing BUNGIE_API_KEY")

    return {
      method: config.method,
      body: config.body,
      headers: new Headers({
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        ...config.headers
      })
    }
  }

  async handle<T>(url: URL, payload: RequestInit): Promise<T> {
    // Implementation with retry logic
  }
}
```

---

## 7. Session Management

### 7.1 Braytech Session Management

**Approach**: Redux state + localStorage

**No Server Sessions**: All state managed client-side

**Token Persistence**: localStorage only

**Limitations:**
- ⚠️ No cross-device sync
- ⚠️ No server-side validation
- ⚠️ Lost on browser clear

### 7.2 RaidHub Session Management

**Approach**: NextAuth sessions + database

**Session Callback Pattern:**
```typescript
// Every session access triggers token refresh check
export const sessionCallback = async ({ session, user }) => {
  const [bungieToken, raidhubToken] = await Promise.all([
    refreshBungieAuth(user.bungieAccount, user.id),
    refreshRaidHubBearer({ userId: user.id, token: user.raidHubAccessToken, ... })
  ])

  return {
    user,
    primaryDestinyMembershipId: user.profiles.find(p => p.isPrimary)?.destinyMembershipId,
    bungieAccessToken: bungieToken.token,
    raidHubAccessToken: raidhubToken?.token,
    errors: [...bungieToken.errors, ...raidhubToken?.errors ?? []],
    expires: session.expires
  }
}
```

**Client-Side Session Sync:**
```typescript
// ClientSessionManager.tsx - Syncs session tokens to API client
useEffect(() => {
  if (session.data.bungieAccessToken) {
    bungieClient.setToken({
      value: session.data.bungieAccessToken.value,
      expires: new Date(session.data.bungieAccessToken.expires)
    })

    // Calculate refetch interval (refresh before token expires)
    const timeRemaining = expires.getTime() - Date.now()
    setNextRefetch(Math.max(timeRemaining - 30_000, 1000))
  }
}, [session])
```

**Characteristics:**
- ✅ **Proactive Refresh**: Tokens refreshed on every session access
- ✅ **Database-Backed**: Sessions stored in database
- ✅ **Cross-Device**: Sessions work across devices
- ✅ **Automatic Sync**: Client automatically syncs tokens
- ✅ **Error Propagation**: Errors passed to client via session

### 7.3 Session Management Comparison

| Aspect | Braytech | RaidHub | Recommendation |
|--------|----------|---------|----------------|
| **Session Storage** | localStorage | Database | **Database** (cross-device) |
| **Token Refresh** | On-demand | Proactive | **Proactive** (better UX) |
| **Cross-Device** | ❌ No | ✅ Yes | **Yes** (better UX) |
| **Error Handling** | Basic | Comprehensive | **Comprehensive** |
| **Session Expiry** | Token expiry | Configurable | **Configurable** |

---

## 8. Code Patterns & Best Practices

### 8.1 OAuth Initiation Pattern

**Braytech:**
```javascript
// Simple redirect
window.location = `https://www.bungie.net/en/OAuth/Authorize?client_id=${CLIENT_ID}&response_type=code`;
```

**RaidHub:**
```typescript
// NextAuth handles everything
import { signIn } from "next-auth/react"
await signIn("bungie")
```

**Best Practice:**
- Use NextAuth if implementing full OAuth (Phase 6)
- For Phase 3, use Discord Linked Roles (no OAuth needed)

### 8.2 Token Refresh Pattern

**Braytech (On-Demand):**
```javascript
// Check expiration before each API call
if (now > expires) {
  await refreshToken()
}
```

**RaidHub (Proactive):**
```typescript
// Refresh in session callback (before expiration)
if (Date.now() < (expiresAt - 300) * 1000) {
  // Still valid (5 min buffer)
} else {
  // Refresh proactively
  await refreshToken()
}
```

**Best Practice:**
- ✅ **Proactive Refresh**: Refresh before expiration (5 min buffer)
- ✅ **Session Callback**: Refresh in session callback for automatic updates
- ✅ **Error Recovery**: Handle refresh failures gracefully

### 8.3 Error Handling Pattern

**Braytech:**
```javascript
// Generic error handling
if (response.ErrorCode !== 1) {
  showError(response.Message)
}
```

**RaidHub:**
```typescript
// Categorized error handling
type AuthError =
  | "BungieAccessTokenError"
  | "BungieAPIOffline"
  | "ExpiredBungieRefreshToken"

// Specific error handling
switch (error.error_description) {
  case "SystemDisabled":
    errors.push("BungieAPIOffline")
    break
  case "AuthorizationRecordExpired":
    errors.push("ExpiredBungieRefreshToken")
    break
}
```

**Best Practice:**
- ✅ **Error Types**: Define specific error types
- ✅ **Error Categorization**: Handle different errors differently
- ✅ **User Feedback**: Pass errors to client for display
- ✅ **Recovery Strategies**: Different strategies for different errors

### 8.4 API Client Pattern

**Braytech:**
```javascript
// Simple function wrapper
export const GetProfile = async (options) =>
  apiRequest(`/Platform/Destiny2/...`, options)
```

**RaidHub:**
```typescript
// Class-based with type safety
class ServerBungieClient extends BaseBungieClient {
  async fetch<T>(config: BungieFetchConfig): Promise<T> {
    // Implementation
  }
}

// Usage with bungie-net-core
import { getProfile } from "bungie-net-core/endpoints/Destiny2"
const profile = await getProfile(client, { membershipType, membershipId, components })
```

**Best Practice:**
- ✅ **Class-Based**: Extensible architecture
- ✅ **Type Safety**: Use `bungie-net-core` for types
- ✅ **Separation**: Separate server/client clients
- ✅ **Error Handling**: Built-in retry logic

---

## 9. Phase 3 Implementation Recommendations

### 9.1 Recommended Approach: Discord Linked Roles

**Why:**
- ✅ **No OAuth Complexity**: Discord handles OAuth flow
- ✅ **Fast Implementation**: Can be done in 1-2 weeks
- ✅ **Leverages Existing**: Uses our Discord integration
- ✅ **Provides Verification**: Users get "Verified Guardian" role
- ✅ **Gatekeeping**: Can require role for Sherpa features

**Implementation Steps:**

1. **Configure Discord Linked Role** (Day 1)
   ```typescript
   // Discord Developer Portal → Linked Roles
   // Create role requiring Bungie.net connection
   {
     name: "Verified Guardian",
     description: "Verified Destiny 2 player",
     metadata: {
       connections: {
         bungie: { required: true }
       }
     }
   }
   ```

2. **Update Discord Bot** (Day 1-2)
   ```typescript
   // discord-bot/src/events/guildMemberUpdate.ts
   // Listen for role updates and assign "Verified Guardian" role
   client.on('guildMemberUpdate', async (oldMember, newMember) => {
     // Check if user connected Bungie account
     // Assign role if connected
   })
   ```

3. **Update Sherpa Application** (Day 2-3)
   ```typescript
   // components/sherpa/application-form.tsx
   // Check for "Verified Guardian" role before allowing application
   const hasVerifiedGuardianRole = userDiscordRoles.includes(VERIFIED_GUARDIAN_ROLE_ID)
   
   if (!hasVerifiedGuardianRole) {
     return <BungieLinkRequired />
   }
   ```

4. **Add Verification Badge** (Day 3-4)
   ```typescript
   // components/sherpa/admin-review-applications.tsx
   // Display verification status
   {app.bungie_verified && (
     <Badge variant="default">Verified Guardian</Badge>
   )}
   ```

5. **Database Updates** (Day 4)
   ```sql
   -- Add verification status column
   ALTER TABLE public.sherpa_applications
   ADD COLUMN bungie_verified boolean DEFAULT false;

   -- Add index for filtering
   CREATE INDEX idx_sherpa_applications_bungie_verified 
   ON public.sherpa_applications(bungie_verified) 
   WHERE bungie_verified = true;
   ```

### 9.2 Phase 3 Code Changes

**Files to Modify:**

1. **`components/sherpa/application-form.tsx`**
   ```typescript
   // Add role check
   const { data: discordRoles } = await supabase
     .from('profiles')
     .select('discord_role_ids')
     .eq('id', user.id)
     .single()

   const hasVerifiedGuardian = discordRoles?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID)
   
   if (!hasVerifiedGuardian) {
     return (
       <Alert>
         <AlertTitle>Bungie Account Required</AlertTitle>
         <AlertDescription>
           Please link your Bungie.net account via Discord Linked Roles to apply as a Sherpa.
         </AlertDescription>
       </Alert>
     )
   }
   ```

2. **`components/sherpa/admin-review-applications.tsx`**
   ```typescript
   // Add verification badge
   <TableCell>
     {app.bungie_verified ? (
       <Badge variant="default">✓ Verified</Badge>
     ) : (
       <Badge variant="outline">Not Verified</Badge>
     )}
   </TableCell>
   ```

3. **`app/(site)/sherpa/actions.ts`**
   ```typescript
   // Add verification check to application creation
   export async function createSherpaApplication(input: CreateSherpaApplicationInput) {
     // ... existing code ...
     
     // Check for Verified Guardian role
     const { data: profile } = await supabase
       .from('profiles')
       .select('discord_role_ids')
       .eq('id', user.id)
       .single()
     
     const bungie_verified = profile?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false
     
     const { data, error } = await supabase
       .from('sherpa_applications')
       .insert({
         ...input,
         bungie_verified
       })
   }
   ```

### 9.3 Phase 3 Timeline

**Week 1:**
- Day 1: Configure Discord Linked Role
- Day 2: Update Discord bot to assign roles
- Day 3: Add role check to application form
- Day 4: Add verification badge to admin review
- Day 5: Testing and refinement

**Week 2:**
- Day 1-2: Database migration and updates
- Day 3-4: UI polish and error handling
- Day 5: Documentation and deployment

---

## 10. Phase 6 Implementation Roadmap

### 10.1 Full Bungie OAuth Implementation

**Architecture Decision**: Adopt RaidHub's server-side pattern

**Key Components:**

1. **OAuth Provider** (NextAuth)
   ```typescript
   // lib/auth/providers/bungie.ts
   // Similar to RaidHub's BungieProvider
   ```

2. **Token Storage** (Database)
   ```sql
   -- Use bungie_connections table (see Section 5.3)
   ```

3. **Token Refresh** (Session Callback)
   ```typescript
   // lib/auth/session-callback.ts
   // Proactive refresh with 5-minute buffer
   ```

4. **API Client** (Class-Based)
   ```typescript
   // lib/bungie/client.ts
   // ServerBungieClient and ClientBungieClient
   ```

5. **Error Handling** (Categorized)
   ```typescript
   // lib/bungie/errors.ts
   // Specific error types and recovery strategies
   ```

### 10.2 Phase 6 Timeline

**Week 1-2: OAuth Setup**
- Register Bungie.net application
- Implement OAuth provider
- Create database schema
- Implement token storage

**Week 3-4: API Integration**
- Build API client wrapper
- Implement token refresh
- Add error handling
- Create guardian card component

**Week 5-6: UI & Polish**
- Guardian profile display
- Activity history
- Readiness checker
- Testing and refinement

---

## 11. Key Takeaways & Recommendations

### 11.1 For Phase 3 (Immediate)

**✅ Use Discord Linked Roles:**
- Fastest path to verification
- No OAuth complexity
- Leverages existing Discord integration
- Provides immediate value

**Implementation:**
- Configure Linked Role in Discord
- Update bot to assign roles
- Add role check to Sherpa application
- Display verification status

**Timeline:** 1-2 weeks

### 11.2 For Phase 6 (Future)

**✅ Adopt RaidHub's Server-Side Pattern:**
- Server-side token storage (secure)
- Proactive token refresh (better UX)
- Comprehensive error handling
- Type-safe API client

**Key Patterns to Adopt:**
1. **Database-Backed Tokens**: Store in `bungie_connections` table
2. **Proactive Refresh**: Refresh in session callback (5 min buffer)
3. **Error Categorization**: Specific error types for better UX
4. **Class-Based API Client**: Extensible architecture
5. **Type Safety**: Use `bungie-net-core` library

**Timeline:** 4-6 weeks

### 11.3 Code Patterns to Reuse

**From RaidHub:**
- ✅ Session callback token refresh pattern
- ✅ Error categorization system
- ✅ Class-based API client architecture
- ✅ Client-side token sync pattern
- ✅ Retry logic for transient errors

**From Braytech:**
- ✅ Simple OAuth initiation (if not using NextAuth)
- ✅ User-friendly error messages
- ✅ Clean component structure

### 11.4 Security Considerations

**Token Encryption:**
- ⚠️ **RaidHub stores tokens in plain text** (should encrypt)
- ✅ **Our Implementation**: Use Supabase Vault or application-level encryption

**Token Storage:**
- ✅ **Server-Side**: More secure than client-side
- ✅ **Database**: Persistent and cross-device
- ✅ **RLS Policies**: Enforce access control

**OAuth Security:**
- ✅ **State Parameter**: CSRF protection (RaidHub does this)
- ✅ **HTTPS Only**: Required by Bungie
- ✅ **Scope Limitation**: Request only needed scopes

---

## 12. Implementation Checklist

### Phase 3: Discord Linked Roles

- [ ] Register Discord Linked Role in Developer Portal
- [ ] Configure Bungie.net as required connection
- [ ] Update Discord bot to assign "Verified Guardian" role
- [ ] Add role check to Sherpa application form
- [ ] Add `bungie_verified` column to `sherpa_applications`
- [ ] Display verification badge in admin review
- [ ] Add filter for verified applications
- [ ] Test end-to-end flow
- [ ] Document user-facing instructions

### Phase 6: Full Bungie OAuth

- [ ] Register Bungie.net application
- [ ] Create `bungie_connections` table
- [ ] Implement OAuth provider (NextAuth or custom)
- [ ] Create token storage utilities
- [ ] Implement session callback with token refresh
- [ ] Build API client wrapper (`ServerBungieClient`)
- [ ] Build client-side API client (`ClientBungieClient`)
- [ ] Implement error handling system
- [ ] Create guardian card component
- [ ] Add activity history display
- [ ] Implement readiness checker
- [ ] Add settings page for linking/unlinking
- [ ] Test token refresh flow
- [ ] Test error recovery scenarios
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation

---

## 13. References

### Code References

**Braytech:**
- OAuth Component: `temp/braytech-analysis/src/components/BungieAuth/index.js`
- API Client: `temp/braytech-analysis/src/utils/bungie.js`
- Token Storage: `temp/braytech-analysis/src/utils/localStorage.js`

**RaidHub:**
- OAuth Provider: `temp/raidhub-analysis/src/lib/server/auth/providers/bungie.ts`
- Session Callback: `temp/raidhub-analysis/src/lib/server/auth/sessionCallback.ts`
- Token Update: `temp/raidhub-analysis/src/lib/server/auth/updateBungieAccessTokens.ts`
- API Client: `temp/raidhub-analysis/src/services/bungie/BungieClient.ts`
- Client Sync: `temp/raidhub-analysis/src/components/providers/session/ClientSessionManager.tsx`
- Database Schema: `temp/raidhub-analysis/prisma/schema.prisma`

### External References

- [Bungie.net API Documentation](https://bungie-net.github.io/)
- [Bungie OAuth Documentation](https://github.com/Bungie-net/api/wiki/OAuth-Documentation)
- [Discord Linked Roles Guide](https://support.discord.com/hc/en-us/articles/10388356626711-Connections-Linked-Roles-Admins)
- [bungie-net-core Library](https://www.npmjs.com/package/bungie-net-core)
- [NextAuth Documentation](https://next-auth.js.org/)

---

## 14. Conclusion

This deep analysis reveals that **RaidHub's server-side, proactive token refresh pattern** is superior for production applications, while **Braytech's simplicity** is good for learning and prototyping.

**For Phase 3**, we recommend **Discord Linked Roles** as the fastest path to verification without OAuth complexity.

**For Phase 6**, we recommend adopting **RaidHub's patterns**:
- Server-side token storage
- Proactive token refresh
- Comprehensive error handling
- Class-based API client
- Type-safe implementation

The analysis provides concrete code patterns, database schemas, and implementation steps that can be directly adapted to our codebase.

---

**Document Status**: ✅ Complete - Ready for Implementation  
**Next Steps**: Review with team, decide on Phase 3 approach, begin implementation
