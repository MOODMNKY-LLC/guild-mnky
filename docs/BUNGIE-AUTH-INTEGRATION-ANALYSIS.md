# Bungie Authentication Integration Analysis & Recommendations

**Date**: January 31, 2026  
**Status**: Analysis Complete - Ready for Implementation Planning  
**Related Roadmap**: Phase 6 - Advanced Features (Destiny 2 deep integration)

---

## Executive Summary

This document provides a comprehensive analysis of integrating Bungie.net OAuth2 authentication into Guild-MNKY, with specific focus on:
1. **Current application state** and where Bungie auth fits
2. **Bungie OAuth2 implementation** requirements and best practices
3. **Discord Linked Roles** integration for requiring Bungie account links
4. **Analysis of reference implementations** (Braytech, RaidHub)
5. **Recommended implementation approach** tailored to our Sherpa Hub system

**Key Recommendation**: Implement Bungie OAuth as an **opt-in enhancement** for Sherpa Hub features, with Discord Linked Roles as a **gatekeeper** for Sherpa-specific functionality. This aligns with Phase 6 roadmap while providing immediate value for Phase 3 Sherpa enhancements.

---

## 1. Current Application State

### 1.1 Authentication Architecture

**Current System:**
- **Primary Auth**: Discord OAuth via Supabase Auth
- **User Identity**: Stored in `profiles` table with `discord_user_id`
- **Role Management**: Discord roles synced to `profiles.role` (admin, officer, member)
- **Multi-Community**: Supports multiple Discord guilds via `communities` table

**Key Files:**
- `app/auth/callback/route.ts` - OAuth callback handler
- `lib/supabase/server.ts` - Server-side Supabase client
- `supabase/migrations/20260123000000_create_profiles.sql` - User profiles schema

### 1.2 Sherpa Hub Context

**Current Sherpa System:**
- Applications require: `experience_level`, `specialties`, `availability`, `motivation`, `discord_username`
- **No Bungie verification** currently required
- Applications are manually reviewed by admins/officers
- Focus is on teaching ability, not in-game stats

**Roadmap Alignment:**
- **Phase 3** (Current): Admin review interface, Oathbreaker penalties, score badges
- **Phase 6** (Planned): "Destiny 2 deep integration (Bungie OAuth)" - explicitly mentioned

### 1.3 Integration Points

**Where Bungie Auth Would Add Value:**

1. **Sherpa Applications** (`sherpa_applications` table)
   - Verify Destiny 2 experience claims
   - Display guardian stats/achievements
   - Validate raid completions, triumph scores

2. **Sherpa Profiles** (`sherpas` table)
   - Show guardian cards/emblems
   - Display activity history
   - Verify "verified raider" status

3. **Session Readiness** (`sherpa_sessions` table)
   - Check light level requirements
   - Verify subclass availability
   - Display loadout readiness

4. **Request Matching** (`sherpa_requests` table)
   - Match seekers with appropriate Sherpas based on activity experience
   - Verify Sherpa has completed the requested activity

---

## 2. Bungie OAuth2 Implementation

### 2.1 Technical Requirements

**OAuth2 Flow (Authorization Code Grant):**

```
1. User clicks "Link Bungie Account"
   → Redirect to: https://www.bungie.net/en/OAuth/Authorize?client_id={CLIENT_ID}&response_type=code&state={STATE}
   
2. User authorizes on Bungie.net
   → Bungie redirects to: {REDIRECT_URI}?code={AUTHORIZATION_CODE}&state={STATE}
   
3. Exchange code for tokens
   → POST https://www.bungie.net/Platform/App/OAuth/token/
   → Headers: X-API-Key: {API_KEY}
   → Body: grant_type=authorization_code&code={CODE}&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}
   
4. Receive tokens
   → access_token (short-lived, ~1 hour)
   → refresh_token (long-lived, ~90 days)
   → membership_id (Bungie.net membership ID)
```

**Required Scopes:**
- `ReadBasicUserProfile` - Basic user info, membership IDs
- `ReadDestinyInventoryAndVault` - Inventory, vault, progression (for readiness checks)
- Optional: `ReadUserData` - Additional user data

**API Key Requirement:**
- All API requests require `X-API-Key` header
- Register at: https://www.bungie.net/en/Application/Create
- Client Type: **Confidential** (we have server-side secret storage)

### 2.2 Token Management

**Storage Strategy:**
```sql
-- New table: bungie_connections
CREATE TABLE public.bungie_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bungie_membership_id bigint NOT NULL,
  destiny_membership_type int NOT NULL, -- 1=Xbox, 2=PlayStation, 3=Steam, 4=Stadia, 5=Epic, 10=Blizzard
  destiny_membership_id bigint NOT NULL,
  
  -- Encrypted tokens (use Supabase Vault or application-level encryption)
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  
  -- Metadata
  scopes text[] NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz,
  last_verified_at timestamptz,
  
  -- Constraints
  CONSTRAINT bungie_connections_one_per_profile UNIQUE (profile_id)
);
```

**Token Refresh Strategy:**
- Access tokens expire ~1 hour
- Refresh tokens expire ~90 days
- Implement background job to refresh tokens before expiration
- Use Supabase Edge Functions or external cron for refresh

### 2.3 Security Considerations

**Token Encryption:**
- **Option 1**: Supabase Vault (recommended for production)
- **Option 2**: Application-level encryption using `crypto` module
- **Never**: Store tokens in plain text

**RLS Policies:**
```sql
-- Users can only read their own Bungie connection
CREATE POLICY "Users can view their own bungie connection"
  ON public.bungie_connections FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own connection (during OAuth flow)
CREATE POLICY "Users can create their own bungie connection"
  ON public.bungie_connections FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own connection (token refresh)
CREATE POLICY "Users can update their own bungie connection"
  ON public.bungie_connections FOR UPDATE
  USING (auth.uid() = profile_id);
```

---

## 3. Discord Linked Roles Integration

### 3.1 What Are Linked Roles?

**Discord Linked Roles** allow server admins to:
- Require users to connect external accounts (like Bungie.net)
- Automatically grant roles based on verified connections
- Gate access to channels/features based on linked accounts

**Key Benefits for Our Use Case:**
1. **Automatic Verification**: Users who link Bungie accounts get a "Verified Guardian" role
2. **Gatekeeping**: Require Bungie link for Sherpa application submission
3. **Trust Building**: Visual indicator of verified Destiny 2 players
4. **Reduced Admin Burden**: Automated role assignment

### 3.2 Implementation Requirements

**Discord Bot Setup:**
1. Enable "Connections" feature in Discord Developer Portal
2. Register Linked Role metadata via Discord API
3. Configure Bungie.net as a supported connection
4. Set up role assignment logic

**Linked Role Metadata:**
```json
{
  "name": "Verified Guardian",
  "description": "Verified Destiny 2 player with linked Bungie account",
  "type": 1, // Role type
  "metadata": {
    "connections": {
      "bungie": {
        "required": true,
        "verification": "account_age" // or other verification criteria
      }
    }
  }
}
```

**Role Assignment Flow:**
```
1. User links Bungie account via Discord (Discord handles OAuth)
2. Discord verifies connection
3. Discord bot receives connection event
4. Bot assigns "Verified Guardian" role
5. Our app checks for role before allowing Sherpa features
```

### 3.3 Integration with Our App

**Two Approaches:**

**Approach A: Discord-First (Recommended)**
- Users link Bungie via Discord Linked Roles
- Our app reads Discord role to verify Bungie link
- Simpler: No OAuth flow in our app
- Limitation: Can't access Bungie API tokens directly

**Approach B: Dual Integration**
- Discord Linked Roles for role assignment
- Separate Bungie OAuth in our app for API access
- More complex but provides full API access
- Recommended for Phase 6 deep integration

**Recommendation**: Start with **Approach A** for Phase 3, evolve to **Approach B** in Phase 6.

---

## 4. Reference Implementation Analysis

### 4.1 Braytech.org Analysis

**Tech Stack:**
- React/Next.js frontend
- Bungie.net API integration
- OAuth2 flow for user authentication

**Key Patterns:**
1. **OAuth Flow**: Standard Authorization Code grant
2. **Token Storage**: Client-side (localStorage) + server-side refresh
3. **API Caching**: Aggressive caching of Bungie API responses
4. **User Experience**: Seamless linking flow with clear consent

**Relevant Code Patterns:**
```javascript
// OAuth initiation
const authUrl = `https://www.bungie.net/en/OAuth/Authorize?client_id=${CLIENT_ID}&response_type=code&state=${state}`;

// Token exchange
const tokenResponse = await fetch('https://www.bungie.net/Platform/App/OAuth/token/', {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: `grant_type=authorization_code&code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
});
```

**Takeaways:**
- Simple, straightforward OAuth implementation
- Focus on user experience and consent
- Good error handling for token expiration

### 4.2 RaidHub Analysis

**Tech Stack:**
- Next.js + React
- Prisma ORM + Turso database
- React Query for data fetching
- Bungie.net Core library

**Key Patterns:**
1. **Database-First**: Structured data model for Bungie data
2. **Caching Strategy**: Aggressive ISR + client-side revalidation
3. **Performance Focus**: FCP/LCP optimization
4. **Type Safety**: Auto-generated types from OpenAPI spec

**Relevant Patterns:**
- Uses `@bungie-net/core` library for type-safe API calls
- Implements background refresh jobs
- Caches guardian data with expiration timestamps

**Takeaways:**
- More sophisticated data modeling
- Better performance optimization
- Type-safe API integration

### 4.3 Comparison & Recommendations

| Aspect | Braytech | RaidHub | Our Recommendation |
|--------|----------|---------|-------------------|
| **OAuth Complexity** | Simple | Simple | Start simple (Braytech approach) |
| **Token Storage** | Client + Server | Server-only | Server-only (more secure) |
| **Data Caching** | Basic | Advanced | Implement caching early |
| **Type Safety** | Manual | Auto-generated | Use Bungie.net types |
| **User Flow** | Excellent | Good | Prioritize UX like Braytech |

---

## 5. Recommended Implementation Plan

### 5.1 Phase 3 Enhancement (Immediate - Sherpa Hub)

**Goal**: Add Bungie verification to Sherpa applications using Discord Linked Roles

**Implementation Steps:**

1. **Set Up Discord Linked Roles** (Week 1)
   - Configure Linked Role in Discord Developer Portal
   - Require Bungie.net connection
   - Create "Verified Guardian" role
   - Update Discord bot to assign role on connection

2. **Update Sherpa Application Flow** (Week 1-2)
   - Add "Bungie Account Required" notice
   - Check for "Verified Guardian" Discord role before allowing application
   - Display verification status in application form
   - Show guardian info if available (via Discord connection data)

3. **Admin Review Enhancement** (Week 2)
   - Display Bungie verification status in admin review interface
   - Show guardian stats if available via Discord
   - Add filter: "Show only verified guardians"

**Database Changes:**
```sql
-- Add verification status to sherpa_applications
ALTER TABLE public.sherpa_applications
ADD COLUMN bungie_verified boolean DEFAULT false;

-- Add index for filtering
CREATE INDEX idx_sherpa_applications_bungie_verified 
ON public.sherpa_applications(bungie_verified) 
WHERE bungie_verified = true;
```

**Files to Modify:**
- `components/sherpa/application-form.tsx` - Add verification check
- `components/sherpa/admin-review-applications.tsx` - Display verification status
- `app/(site)/sherpa/actions.ts` - Add verification validation

### 5.2 Phase 6 Deep Integration (Future - Full Bungie OAuth)

**Goal**: Full Bungie API integration with token management

**Implementation Steps:**

1. **Bungie OAuth Flow** (Week 1-2)
   - Create OAuth callback route: `app/auth/bungie/callback/route.ts`
   - Implement token exchange and storage
   - Add token refresh mechanism
   - Create settings page for linking/unlinking

2. **Database Schema** (Week 1)
   - Create `bungie_connections` table
   - Add RLS policies
   - Create helper functions for token management

3. **API Integration** (Week 2-3)
   - Create Bungie API client wrapper
   - Implement guardian profile fetching
   - Add activity history retrieval
   - Cache responses appropriately

4. **UI Enhancements** (Week 3-4)
   - Guardian card component
   - Activity history display
   - Readiness checker for sessions
   - Loadout display

**Database Schema:**
```sql
-- Full bungie_connections table (see Section 2.2)
-- Plus caching tables for API responses
CREATE TABLE public.bungie_profile_cache (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  guardian_data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
```

---

## 6. Implementation Recommendations

### 6.1 Immediate Action (Phase 3)

**Recommended Approach: Discord Linked Roles Only**

**Why:**
- ✅ Faster to implement (no OAuth flow needed)
- ✅ Leverages existing Discord integration
- ✅ Provides verification without API complexity
- ✅ Aligns with "Discord-first" architecture

**Implementation:**
1. Set up Discord Linked Role requiring Bungie connection
2. Update Sherpa application to check for role
3. Display verification badge in UI
4. Add admin filtering by verification status

**Timeline**: 1-2 weeks

### 6.2 Future Enhancement (Phase 6)

**Recommended Approach: Full Bungie OAuth + API Integration**

**Why:**
- ✅ Provides rich guardian data
- ✅ Enables readiness checks
- ✅ Supports activity matching
- ✅ Full control over data refresh

**Implementation:**
1. Implement Bungie OAuth flow
2. Store tokens securely
3. Build API client wrapper
4. Add guardian cards and stats
5. Implement caching strategy

**Timeline**: 4-6 weeks

### 6.3 Hybrid Approach (Recommended)

**Phase 3**: Discord Linked Roles for verification  
**Phase 6**: Add Bungie OAuth for rich data

**Benefits:**
- Get verification benefits immediately
- Build toward full integration
- Learn from Phase 3 usage patterns
- Incremental complexity

---

## 7. Code Structure Recommendations

### 7.1 File Organization

```
lib/
  bungie/
    client.ts          # Bungie API client wrapper
    oauth.ts           # OAuth flow handlers
    types.ts           # Bungie API types
    cache.ts           # Response caching utilities

app/
  auth/
    bungie/
      callback/
        route.ts       # OAuth callback handler
      link/
        route.ts       # Initiate OAuth flow

components/
  bungie/
    guardian-card.tsx  # Display guardian info
    link-button.tsx    # Link/unlink Bungie account
    verification-badge.tsx # Verification status badge

app/
  protected/
    settings/
      bungie/
        page.tsx       # Bungie account management
```

### 7.2 Environment Variables

```env
# Bungie API
BUNGIE_API_KEY=your_api_key_here
BUNGIE_CLIENT_ID=your_client_id_here
BUNGIE_CLIENT_SECRET=your_client_secret_here
BUNGIE_REDIRECT_URI=https://your-domain.com/auth/bungie/callback

# Discord Linked Roles (if using)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_LINKED_ROLE_ID=role_id_for_verified_guardian
```

---

## 8. Security & Privacy Considerations

### 8.1 Token Security

- ✅ Store tokens encrypted at rest
- ✅ Use HTTPS for all OAuth flows
- ✅ Implement token rotation
- ✅ Monitor for token leaks
- ✅ Provide easy "unlink" functionality

### 8.2 User Consent

- ✅ Clear explanation of what data is accessed
- ✅ Explicit consent for each scope
- ✅ Easy account unlinking
- ✅ Data deletion on unlink
- ✅ Privacy policy updates

### 8.3 Rate Limiting

- ✅ Respect Bungie API rate limits
- ✅ Implement request queuing
- ✅ Cache aggressively
- ✅ Background refresh jobs
- ✅ Graceful degradation on API errors

---

## 9. Testing Strategy

### 9.1 OAuth Flow Testing

- Test successful authorization
- Test token refresh
- Test error scenarios (denied, expired)
- Test multiple account linking
- Test account unlinking

### 9.2 API Integration Testing

- Test guardian profile fetching
- Test activity history retrieval
- Test caching behavior
- Test rate limit handling
- Test error recovery

### 9.3 Discord Integration Testing

- Test Linked Role assignment
- Test role verification checks
- Test role removal on unlink
- Test admin filtering

---

## 10. Success Metrics

### 10.1 Phase 3 Metrics

- % of Sherpa applications with Bungie verification
- Time to verify new applications
- Admin satisfaction with verification status
- User adoption of Bungie linking

### 10.2 Phase 6 Metrics

- % of users who link Bungie accounts
- API call success rate
- Cache hit rate
- User engagement with guardian features
- Session readiness accuracy

---

## 11. Next Steps

### Immediate (This Week)

1. ✅ Review this analysis document
2. ⬜ Decide on Phase 3 vs Phase 6 approach
3. ⬜ Set up Bungie.net application registration
4. ⬜ Configure Discord Linked Role (if Phase 3)

### Short-term (Next 2 Weeks)

1. ⬜ Implement chosen approach
2. ⬜ Test OAuth flow
3. ⬜ Update Sherpa application UI
4. ⬜ Deploy to staging

### Long-term (Phase 6)

1. ⬜ Plan full API integration
2. ⬜ Design guardian card components
3. ⬜ Implement caching strategy
4. ⬜ Build readiness checker

---

## 12. References

- [Bungie.net API Documentation](https://bungie-net.github.io/)
- [Bungie OAuth Documentation](https://github.com/Bungie-net/api/wiki/OAuth-Documentation)
- [Discord Linked Roles Guide](https://support.discord.com/hc/en-us/articles/10388356626711-Connections-Linked-Roles-Admins)
- [Braytech.org Source](https://github.com/Rhincodon/braytech.org)
- [RaidHub Source](https://github.com/Raid-Hub/Web-App)

---

## Appendix: Quick Start Checklist

**For Discord Linked Roles (Phase 3):**
- [ ] Register Discord application (if not done)
- [ ] Enable Connections feature
- [ ] Create Linked Role metadata
- [ ] Configure Bungie.net connection
- [ ] Update Discord bot to assign roles
- [ ] Add role check to Sherpa application
- [ ] Test end-to-end flow

**For Bungie OAuth (Phase 6):**
- [ ] Register Bungie.net application
- [ ] Get API key, client ID, client secret
- [ ] Set redirect URI
- [ ] Create database tables
- [ ] Implement OAuth callback route
- [ ] Create token storage/refresh logic
- [ ] Build API client wrapper
- [ ] Add UI components
- [ ] Test full integration

---

**Document Status**: ✅ Complete - Ready for Implementation Planning  
**Next Review**: After Phase 3 completion or before Phase 6 start
