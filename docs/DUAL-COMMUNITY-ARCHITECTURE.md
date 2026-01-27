# Dual-Community Architecture Guide

**Date**: 2026-01-23  
**Status**: Active Architecture  
**Purpose**: Guide for building features that serve both Jupiter's Girth (community-focused) and Sherpa Hub (raid/LFG/sherpa-focused)

---

## Executive Summary

Guild-MNKY serves **two distinct Discord communities** with different focuses:

1. **Jupiter's Girth** (`573823015511392268`)
   - **Focus**: Community building, social engagement, general Destiny 2 activities
   - **Use Cases**: Events, general LFG, community discussions, casual play
   - **Features**: Events, RSVPs, community docs, general LFG channels

2. **Sherpa Hub** (`1291190711919837234`)
   - **Focus**: Raid/LFG coordination, Sherpa teaching, structured learning
   - **Use Cases**: Sherpa applications, teaching sessions, raid coordination, structured LFG
   - **Features**: Sherpa Hub, session management, rating system, checkpoint sharing

**Key Insight**: Features must be **modular** and **community-aware** to serve both communities effectively.

---

## 1. Community Structure

### 1.1 Database Schema

```sql
-- Communities table
communities (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  anchor_discord_guild_id text NOT NULL UNIQUE,
  connected_discord_guild_ids text[] DEFAULT '{}'
)

-- Current communities:
-- 1. Jupiter's Girth: anchor='573823015511392268', connected=['1291190711919837234']
-- 2. Sherpa Hub: anchor='1291190711919837234', connected=['573823015511392268']
```

**Cross-Community Visibility**:
- Communities can be "connected" via `connected_discord_guild_ids`
- Enables cross-community feature visibility
- Example: Sherpa Hub sessions visible to Jupiter's Girth members

### 1.2 User Community Assignment

**Priority Order**:
1. User's `discord_guild_id` → community lookup
2. User's existing `community_id` (if set)
3. Default anchor guild from environment

**Multi-Community Membership**:
- Users can belong to ONE primary community (`community_id`)
- Users can SEE content from connected communities
- Cross-community features require explicit opt-in

---

## 2. Feature Design Principles

### 2.1 Community-Scoped Features

**Definition**: Features that operate within a single community context.

**Examples**:
- Sherpa Applications (Sherpa Hub only)
- Community Events (Jupiter's Girth primary)
- LFG Posts (community-specific)

**Implementation Pattern**:
```typescript
// Always scope by community_id
const communityId = await getUserCommunity(userId)
const data = await supabase
  .from('feature_table')
  .select('*')
  .eq('community_id', communityId)
```

### 2.2 Cross-Community Features

**Definition**: Features visible across connected communities.

**Examples**:
- Sherpa Sessions (visible to both communities)
- Checkpoint Sharing (shared resource)
- Leaderboards (global or filtered)

**Implementation Pattern**:
```typescript
// Get user's community + connected communities
const userCommunity = await getUserCommunity(userId)
const { data: community } = await supabase
  .from('communities')
  .select('connected_discord_guild_ids')
  .eq('id', userCommunity)
  .single()

const connectedGuildIds = [
  community.anchor_discord_guild_id,
  ...community.connected_discord_guild_ids
]

// Query across connected communities
const data = await supabase
  .from('feature_table')
  .select('*')
  .in('community_id', connectedCommunityIds)
```

### 2.3 Modular Dashboard Features

**Definition**: Features that can be enabled/disabled per community or per user.

**Examples**:
- Weekly Rotations (useful for both)
- Checkpoints (Sherpa Hub primary, Jupiter's Girth optional)
- Triumphs (both communities)
- Collections (both communities)

**Implementation Pattern**:
```typescript
// Community-level feature flags
interface CommunityFeatureFlags {
  checkpoints_enabled: boolean
  weekly_rotations_enabled: boolean
  triumphs_enabled: boolean
  // ...
}

// User-level module preferences
interface UserDashboardModules {
  module_id: string
  enabled: boolean
  order: number
}
```

---

## 3. Feature Mapping by Community

### 3.1 Jupiter's Girth (Community-Focused)

**Core Features** (Always Enabled):
- ✅ Community Events & RSVPs
- ✅ General LFG Channels
- ✅ Community Documentation
- ✅ Member Directory

**Optional Features** (User-Configurable):
- ⚙️ Weekly Rotations (Braytech "This Week" / "Now")
- ⚙️ Triumphs/Seals Tracking
- ⚙️ Collections
- ⚙️ Cross-Community Sherpa Sessions (view only)

**Sherpa Hub Integration**:
- View Sherpa Hub sessions (read-only)
- Request Sherpa sessions (cross-community)
- Access checkpoint sharing (optional)

### 3.2 Sherpa Hub (Raid/LFG/Sherpa-Focused)

**Core Features** (Always Enabled):
- ✅ Sherpa Applications
- ✅ Session Management
- ✅ Rating System
- ✅ Checkpoint Sharing
- ✅ LFG Coordination

**Optional Features** (User-Configurable):
- ⚙️ Weekly Rotations (activity planning)
- ⚙️ Raid History (RaidHub-style)
- ⚙️ Leaderboards (competitive tracking)
- ⚙️ Teammates Tracking
- ⚙️ Triumphs/Seals (Sherpa achievements)

**Jupiter's Girth Integration**:
- View community events (read-only)
- Cross-post LFG to Jupiter's Girth
- Access community docs (optional)

---

## 4. Implementation Guidelines

### 4.1 Always Check Community Context

**Before Any Feature Access**:
```typescript
// Get user's community
const communityId = await getUserCommunity(userId)
if (!communityId) {
  throw new Error('User must belong to a community')
}

// Check if feature is available for this community
const featureAvailable = await checkFeatureAvailability(
  featureId,
  communityId
)
```

### 4.2 Respect Community Boundaries

**Don't**:
- ❌ Show Sherpa Hub admin features to Jupiter's Girth users
- ❌ Allow cross-community data modification without permission
- ❌ Mix community-specific data in queries

**Do**:
- ✅ Scope queries by `community_id`
- ✅ Check permissions per community
- ✅ Show cross-community content as "read-only" when appropriate
- ✅ Allow opt-in cross-community features

### 4.3 Feature Flags Per Community

**Database Schema**:
```sql
CREATE TABLE community_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  feature_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb, -- Feature-specific configuration
  UNIQUE(community_id, feature_id)
);
```

**Usage**:
```typescript
async function isFeatureEnabled(
  featureId: string,
  communityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('community_feature_flags')
    .select('enabled')
    .eq('community_id', communityId)
    .eq('feature_id', featureId)
    .single()
  
  return data?.enabled ?? false // Default to disabled if not set
}
```

---

## 5. Unified Dashboard Design

### 5.1 Community-Aware Modules

**Module Categories**:

1. **Core Modules** (Always Visible)
   - Community-specific core features
   - Example: Sherpa Hub → Sherpa Applications
   - Example: Jupiter's Girth → Events

2. **Shared Modules** (Cross-Community)
   - Features visible to both communities
   - Example: Weekly Rotations, Checkpoints (read-only for Jupiter's Girth)

3. **Optional Modules** (User-Configurable)
   - Features users can enable/disable
   - Example: Triumphs, Collections, Leaderboards

### 5.2 Dashboard Layout Per Community

**Sherpa Hub Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│  [Core] Sherpa Hub          [Core] Session Management  │
│  [Core] Checkpoints         [Shared] Weekly Rotations  │
│  [Optional] Raid History    [Optional] Leaderboards   │
│  [Optional] Triumphs        [Optional] Collections     │
└─────────────────────────────────────────────────────────┘
```

**Jupiter's Girth Dashboard**:
```
┌─────────────────────────────────────────────────────────┐
│  [Core] Events            [Core] LFG Channels         │
│  [Core] Community Docs    [Shared] Weekly Rotations   │
│  [Shared] Sherpa Sessions [Optional] Triumphs         │
│  [Optional] Collections   [Optional] Checkpoints      │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Module Visibility Rules

**Rule 1: Core Modules**
- Always visible for user's primary community
- Cannot be disabled
- Community-specific

**Rule 2: Shared Modules**
- Visible if feature enabled for ANY connected community
- Read-only if not user's primary community
- Example: Jupiter's Girth users can VIEW Sherpa Hub sessions but not CREATE them

**Rule 3: Optional Modules**
- User-configurable enable/disable
- Community-level feature flags can override
- Example: Checkpoints enabled for Sherpa Hub, optional for Jupiter's Girth

---

## 6. Cross-Community Features

### 6.1 Sherpa Sessions (Cross-Community)

**Visibility**:
- Sherpa Hub: Full access (create, view, manage)
- Jupiter's Girth: View-only, can request sessions

**Implementation**:
```typescript
// Check if user can create sessions
const canCreateSession = async (userId: string) => {
  const communityId = await getUserCommunity(userId)
  const { data: community } = await supabase
    .from('communities')
    .select('anchor_discord_guild_id')
    .eq('id', communityId)
    .single()
  
  // Only Sherpa Hub can create sessions
  return community?.anchor_discord_guild_id === SHERPA_HUB_GUILD_ID
}

// Check if user can view sessions
const canViewSessions = async (userId: string) => {
  const communityId = await getUserCommunity(userId)
  const { data: community } = await supabase
    .from('communities')
    .select('connected_discord_guild_ids')
    .eq('id', communityId)
    .single()
  
  // Can view if connected to Sherpa Hub
  return community?.connected_discord_guild_ids.includes(SHERPA_HUB_GUILD_ID)
}
```

### 6.2 Checkpoint Sharing

**Visibility**:
- Sherpa Hub: Full access (create, view, copy)
- Jupiter's Girth: View-only (optional module)

**Implementation**:
```typescript
// Checkpoint creation restricted to Sherpa Hub
const canCreateCheckpoint = async (userId: string) => {
  const communityId = await getUserCommunity(userId)
  return communityId === SHERPA_HUB_COMMUNITY_ID
}

// Checkpoint viewing available to both
const canViewCheckpoints = async (userId: string) => {
  const featureEnabled = await isFeatureEnabled('checkpoints', communityId)
  return featureEnabled
}
```

### 6.3 Weekly Rotations

**Visibility**:
- Both communities: Full access
- Useful for activity planning in both contexts

**Implementation**:
```typescript
// Available to all communities
const canViewRotations = async (userId: string) => {
  return true // Always available
}
```

---

## 7. Feature Development Checklist

When building a new feature, ask:

- [ ] **Which community(ies) need this feature?**
  - Jupiter's Girth only?
  - Sherpa Hub only?
  - Both communities?

- [ ] **What are the access levels?**
  - Full access (create, read, update, delete)?
  - Read-only for cross-community?
  - Opt-in required?

- [ ] **Is this a core feature or optional module?**
  - Core: Always visible, community-specific
  - Optional: User-configurable, can be disabled

- [ ] **Does this need community feature flags?**
  - Yes: Add to `community_feature_flags` table
  - No: Available to all communities

- [ ] **Are there cross-community implications?**
  - Yes: Implement visibility checks
  - No: Scope strictly to `community_id`

- [ ] **Does this integrate with existing features?**
  - Yes: Ensure community context is preserved
  - No: Design with community awareness from start

---

## 8. Examples

### Example 1: Checkpoint Sharing Module

**Community Mapping**:
- Sherpa Hub: Core module (always enabled)
- Jupiter's Girth: Optional module (user can enable)

**Implementation**:
```typescript
// Check if checkpoint module is available
const isCheckpointModuleAvailable = async (userId: string) => {
  const communityId = await getUserCommunity(userId)
  
  // Core for Sherpa Hub
  if (communityId === SHERPA_HUB_COMMUNITY_ID) {
    return true
  }
  
  // Optional for Jupiter's Girth
  const featureEnabled = await isFeatureEnabled('checkpoints', communityId)
  return featureEnabled
}
```

### Example 2: Weekly Rotations Module

**Community Mapping**:
- Both communities: Shared module (always available)

**Implementation**:
```typescript
// Always available to all communities
const WeeklyRotationsModule = () => {
  const communityId = useUserCommunity()
  
  // Fetch rotations (same data for all communities)
  const { data } = useWeeklyRotations()
  
  return <RotationsDisplay data={data} />
}
```

### Example 3: Sherpa Applications

**Community Mapping**:
- Sherpa Hub: Core module (always enabled)
- Jupiter's Girth: Not available

**Implementation**:
```typescript
// Only available for Sherpa Hub
const SherpaApplicationModule = () => {
  const communityId = useUserCommunity()
  
  if (communityId !== SHERPA_HUB_COMMUNITY_ID) {
    return <NotAvailableForYourCommunity />
  }
  
  return <ApplicationForm />
}
```

---

## 9. Migration Strategy

### Phase 1: Foundation (✅ Complete)
- Multi-community database schema
- Community helper functions
- Basic community scoping

### Phase 2: Feature Flags (Next)
- Create `community_feature_flags` table
- Implement feature flag checking
- Add admin UI for feature management

### Phase 3: Modular Dashboard (Future)
- Module system implementation
- User preference storage
- Community-aware module rendering

### Phase 4: Cross-Community Features (Future)
- Cross-community visibility logic
- Read-only access patterns
- Opt-in mechanisms

---

## 10. Key Takeaways

1. **Always scope by `community_id`** - Never assume single community
2. **Respect community boundaries** - Don't mix data across communities
3. **Enable cross-community features** - But with appropriate access levels
4. **Use feature flags** - For community-specific feature availability
5. **Design modularly** - Features should be enable/disable per community
6. **Consider both communities** - When designing new features

---

**Document Status**: ✅ Active  
**Last Updated**: 2026-01-23  
**Next Review**: After Phase 3 completion
