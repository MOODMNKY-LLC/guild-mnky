# Comprehensive Feature & Architecture Analysis: Braytech & RaidHub Integration

**Date**: 2026-01-23  
**Purpose**: Deep analysis of Braytech and RaidHub repositories to inform unified dashboard design and feature integration for Guild-MNKY

---

## Executive Summary

This document synthesizes findings from deep analysis of:
- **Braytech** (`Rhincodon/braytech.org`) - Comprehensive Destiny 2 companion app
- **RaidHub** (`Raid-Hub/Web-App` + `Raid-Hub/API`) - Raid-focused leaderboards and profiles

**Key Findings**:
1. **Data Architecture**: RaidHub's multi-layer caching (Dexie + React Query + Next.js ISR) is superior for performance
2. **Feature Richness**: Braytech offers more comprehensive feature set (Triumphs, Collections, Maps, Weekly Rotations)
3. **Architectural Patterns**: Both use client-side caching, but RaidHub's server-side patterns (PPR, ISR) are more modern
4. **Integration Opportunity**: Unified dashboard can combine Braytech's breadth with RaidHub's depth and performance

---

## 1. Data Architecture & Caching Patterns

### 1.1 RaidHub's Multi-Layer Caching Strategy

**Architecture**: Three-tier caching system

```
┌─────────────────────────────────────┐
│  Next.js ISR/PPR (Server-Side)      │  ← Long-term cache (hours/days)
│  - unstable_cache()                  │
│  - reactRequestDedupe()              │
│  - revalidate: 600 (10 min)         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  React Query (Client-Side)          │  ← Medium-term cache (minutes)
│  - staleTime: 1000 * 60 * 2 (2 min) │
│  - queryKey-based invalidation      │
│  - Background refetch                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Dexie (IndexedDB)                  │  ← Persistent cache (offline)
│  - Manifest definitions             │
│  - Multiple tables (items, etc.)    │
│  - In-memory Collection cache       │
└─────────────────────────────────────┘
```

**Key Files**:
- `src/lib/util/react-cache.ts` - Request deduplication wrapper
- `src/lib/profile/prefetch.ts` - Server-side prefetching with `unstable_cache`
- `src/components/providers/DestinyManifestManager.tsx` - Dexie + React Query integration
- `src/util/dexie/dexie.ts` - Multi-table Dexie schema
- `src/util/dexie/useDexieGetQuery.ts` - Hook with in-memory cache layer

**Patterns**:
1. **Request Deduplication**: `reactRequestDedupe()` wraps `unstable_cache()` to prevent duplicate requests
2. **Manifest Management**: Auto-updates manifest when version changes, stores in Dexie with in-memory Collection cache
3. **Retry Logic**: `saferFetch()` with exponential backoff for network failures
4. **Selective Caching**: Different revalidate times based on data volatility (6 hours for basic player data, 10 min for profiles)

### 1.2 Braytech's Simpler Caching

**Architecture**: Two-tier system

```
┌─────────────────────────────────────┐
│  Redux Store (In-Memory)            │  ← Session state
│  - Member profile data               │
│  - PGCR cache                       │
│  - Character data                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  localStorage + Dexie              │  ← Persistent storage
│  - Simple Dexie (manifest version) │
│  - localStorage (auth tokens)        │
│  - Bundled JSON manifest files      │
└─────────────────────────────────────┘
```

**Key Files**:
- `src/utils/dexie.js` - Single-table Dexie (manifest version only)
- `src/utils/manifest.js` - Bundled JSON manifest files (multi-language)
- `src/utils/reducers/PGCRcache.js` - Redux reducer for PGCR caching
- `src/components/RefreshService/index.js` - Auto-refresh service (30s interval)

**Patterns**:
1. **Bundled Manifests**: Pre-bundled JSON files for faster initial load
2. **Auto-Refresh**: Background service refreshes profile data every 30 seconds
3. **Redux State**: Centralized state management for member data
4. **Simple Persistence**: localStorage for auth, Dexie only for manifest version tracking

### 1.3 Comparison & Recommendations

| Aspect | RaidHub | Braytech | Recommendation |
|--------|---------|----------|----------------|
| **Server-Side Caching** | ✅ ISR/PPR with `unstable_cache` | ❌ None (client-only) | **Adopt RaidHub's approach** |
| **Client-Side Caching** | ✅ React Query | ✅ Redux | **Use React Query** (better Next.js integration) |
| **Offline Support** | ✅ Dexie (multi-table) | ✅ Dexie (simple) + localStorage | **Adopt RaidHub's Dexie structure** |
| **Manifest Strategy** | ✅ Dynamic fetch + cache | ✅ Bundled JSON | **Hybrid: Dynamic fetch with fallback to bundled** |
| **Request Deduplication** | ✅ `reactRequestDedupe` | ❌ None | **Adopt RaidHub's pattern** |
| **Retry Logic** | ✅ Exponential backoff | ❌ Basic error handling | **Adopt RaidHub's `saferFetch`** |

**Integration Strategy**:
1. Implement RaidHub's multi-layer caching architecture
2. Use React Query for client-side state (replace Redux)
3. Implement `reactRequestDedupe` for server-side prefetching
4. Use RaidHub's Dexie structure (multi-table) for manifest caching
5. Add bundled manifest fallback (Braytech approach) for faster initial load

---

## 2. Feature Sets Analysis

### 2.1 Braytech Features

**Core Features**:
1. **Character View** (`src/views/Character/index.js`)
   - Equipment display
   - Inventory items
   - Character-specific data

2. **Triumphs** (`src/views/Triumphs/index.js`)
   - Seal tracking
   - Almost complete tracking
   - Tracked triumphs
   - Unredeemed rewards
   - Sorting (score, rarity, completion)

3. **Collections** (`src/views/Collections/index.js`)
   - Badge collections
   - All items ranked by rarity
   - Hide/show acquired items
   - Presentation node navigation

4. **PGCRs (Post-Game Carnage Reports)** (`src/views/PGCRs/index.js`)
   - Crucible matches
   - Gambit matches
   - Raids
   - Strikes
   - Activity history

5. **This Week** (`src/views/ThisWeek/index.js`)
   - Flashpoint
   - Featured activities
   - Crucible rotators
   - Nightfalls
   - Raids
   - Dreaming City cycles
   - Escalation Protocol
   - Reckoning

6. **Now** (`src/views/Now/index.js`)
   - Daily modifiers
   - Heroic story missions
   - Vanguard strikes
   - Black Armory forges
   - Season pass
   - Seasonal artifact
   - Vendor rotations

7. **Maps** (`src/views/Maps/index.js`)
   - Interactive map views
   - Location tracking

8. **Pursuits** (`src/views/Pursuits/index.js`)
   - Quest tracking
   - Bounty management
   - Progress bars
   - Expiration tracking

9. **Clan** (`src/views/Clan/Roster/index.js`)
   - Clan roster
   - Member management

### 2.2 RaidHub Features

**Core Features**:
1. **Leaderboards** (`src/app/leaderboards/`)
   - Team leaderboards (world first, speedrun)
   - Individual leaderboards (global, raid-specific, Pantheon)
   - Speedrun.com integration
   - Pagination and search

2. **Profiles** (`src/components/profile/`)
   - User cards with badges
   - Raid history (classic, Pantheon, history tabs)
   - Teammates tracking
   - Instance finder
   - Activity history with partitioning

3. **PGCRs** (`src/app/pgcr/[instanceId]/page.tsx`)
   - Detailed activity reports
   - Player statistics
   - Completion status
   - Metadata (activity name, version, leaderboard rank)

4. **Checkpoints** (`src/components/checkpoints/checkpoints.tsx`)
   - Real-time checkpoint sharing
   - Activity grouping
   - Player count tracking
   - Bot integration

5. **Clan Pages** (`src/app/clan/[groupId]/page.tsx`)
   - Clan information
   - Member lists

### 2.3 Feature Gap Analysis

**Braytech Features Missing in RaidHub**:
- ✅ Triumphs/Seals tracking
- ✅ Collections (badges, items)
- ✅ Weekly rotation tracking (This Week, Now)
- ✅ Maps
- ✅ Pursuits/Quests
- ✅ Character equipment view

**RaidHub Features Missing in Braytech**:
- ✅ Leaderboards (comprehensive)
- ✅ Teammates tracking
- ✅ Instance finder
- ✅ Checkpoint sharing
- ✅ Activity history partitioning
- ✅ Speedrun.com integration

**Shared Features**:
- PGCRs (both have, but RaidHub's is more detailed)
- Clan rosters (both have)
- Profile views (both have, different focus)

### 2.4 Integration Recommendations

**Priority 1 - High Value, Low Complexity**:
1. **Weekly Rotations** (Braytech's "This Week" / "Now")
   - High user value
   - Relatively simple to implement
   - Fits well in unified dashboard

2. **Checkpoints** (RaidHub)
   - Already exists in RaidHub
   - High value for Sherpa Hub integration
   - Can be embedded as a module

3. **Activity History** (RaidHub's partitioning approach)
   - Better UX than Braytech's simple list
   - Can enhance PGCR views

**Priority 2 - High Value, Medium Complexity**:
1. **Triumphs/Seals** (Braytech)
   - High user engagement
   - Requires manifest data
   - Can be modular dashboard section

2. **Collections** (Braytech)
   - High user engagement
   - Requires manifest data
   - Can be modular dashboard section

3. **Leaderboards** (RaidHub)
   - High value for competitive players
   - Requires backend API (RaidHub API or custom)
   - Can be modular dashboard section

**Priority 3 - Lower Priority**:
1. **Maps** (Braytech)
   - Lower engagement
   - Can be added later

2. **Pursuits** (Braytech)
   - Requires authenticated Bungie API
   - Can be added after Phase 6 (Full Bungie OAuth)

---

## 3. Architectural Patterns

### 3.1 Next.js Patterns

**RaidHub**:
- ✅ **PPR (Partial Prerendering)**: `experimental: { ppr: true }` in `next.config.js`
- ✅ **ISR (Incremental Static Regeneration)**: `revalidate: 600` for profiles
- ✅ **Server Components**: Default, with `"use client"` only when needed
- ✅ **Metadata Generation**: `generateMetadata()` for SEO
- ✅ **Suspense Boundaries**: Used for async data loading

**Braytech**:
- ❌ **No Next.js**: Uses React Router (older architecture)
- ❌ **No SSR/ISR**: Client-side only
- ✅ **Code Splitting**: React Router lazy loading

**Recommendation**: Adopt RaidHub's Next.js patterns (PPR, ISR, Server Components)

### 3.2 State Management

**RaidHub**:
- ✅ **React Query**: Server state management
- ✅ **Context API**: For providers (manifest, locale, session)
- ✅ **Local Storage Hooks**: `useLocalStorage()` for preferences
- ✅ **URL State**: `useQueryParams()` for filter/search state

**Braytech**:
- ✅ **Redux**: Centralized state management
- ✅ **localStorage**: Direct usage for auth tokens
- ✅ **React Router**: URL state management

**Recommendation**: Use React Query (RaidHub approach) - better Next.js integration, less boilerplate

### 3.3 API Client Patterns

**RaidHub**:
- ✅ **Type-Safe API Client**: `bungie-net-core` library
- ✅ **Error Handling**: Custom error types (`BungiePlatformError`, `RaidHubError`)
- ✅ **Retry Logic**: `saferFetch()` with exponential backoff
- ✅ **Request Deduplication**: `reactRequestDedupe()`

**Braytech**:
- ✅ **Custom API Client**: `src/utils/bungie.js`
- ✅ **Basic Error Handling**: Error code checking
- ❌ **No Retry Logic**: Basic fetch with error handling

**Recommendation**: Adopt RaidHub's API client patterns (type-safe, retry logic, error handling)

### 3.4 Component Patterns

**RaidHub**:
- ✅ **Server Components First**: Default to server components
- ✅ **Client Components**: Only when needed (`"use client"`)
- ✅ **Suspense Boundaries**: For async data
- ✅ **Error Boundaries**: `ErrorCard` component
- ✅ **Loading States**: Skeleton loaders

**Braytech**:
- ✅ **Class Components**: Older React pattern
- ✅ **HOCs**: `compose()` for component enhancement
- ✅ **Redux Connect**: `connect()` HOC for state

**Recommendation**: Use RaidHub's modern React patterns (Server Components, Suspense, Error Boundaries)

---

## 4. Unified Dashboard Design

### 4.1 Modular Architecture

**Concept**: Dashboard with enable/disable modules, similar to Braytech's "This Week" modular approach but more flexible.

**Module Types**:
1. **Sherpa Hub Modules** (Core - Always Enabled)
   - Sherpa Applications
   - Session Management
   - Rating System

2. **Profile Modules** (Optional)
   - Character Equipment
   - Raid History (RaidHub-style)
   - Triumphs/Seals (Braytech)
   - Collections (Braytech)

3. **Activity Modules** (Optional)
   - Weekly Rotations (Braytech "This Week" / "Now")
   - Checkpoints (RaidHub)
   - PGCRs (Enhanced with RaidHub patterns)

4. **Social Modules** (Optional)
   - Clan Roster
   - Teammates (RaidHub)
   - Leaderboards (RaidHub)

5. **Utility Modules** (Optional)
   - Maps (Braytech)
   - Pursuits (Braytech - requires auth)

### 4.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header: User Profile, Settings, Module Toggle         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Sherpa Hub   │  │ Weekly       │  │ Checkpoints  │ │
│  │ (Core)       │  │ Rotations    │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Raid History │  │ Triumphs     │  │ Collections  │ │
│  │              │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Leaderboards │  │ Teammates    │                    │
│  │              │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**Responsive Behavior**:
- Desktop: Grid layout (3 columns)
- Tablet: Grid layout (2 columns)
- Mobile: Single column stack

### 4.3 Module Configuration

**User Preferences Storage**:
```typescript
interface DashboardModule {
  id: string
  name: string
  enabled: boolean
  order: number
  category: 'core' | 'profile' | 'activity' | 'social' | 'utility'
  requiresAuth?: boolean
  requiresBungieAuth?: boolean
}
```

**Implementation**:
- Store in Supabase `user_preferences` table
- Sync with localStorage for offline access
- Admin can enable/disable modules globally

### 4.4 Integration with Existing Sherpa Hub

**Seamless Integration Points**:
1. **Sherpa Applications** → Dashboard module (already exists)
2. **Session Management** → Dashboard module (already exists)
3. **Rating System** → Dashboard module (already exists)
4. **Checkpoints** → New module (RaidHub integration)
5. **Weekly Rotations** → New module (Braytech integration)
6. **Raid History** → New module (RaidHub integration, enhanced with Sherpa context)

**Sherpa-Specific Enhancements**:
- Link checkpoint sharing to Sherpa sessions
- Show Sherpa ratings in profile modules
- Integrate raid history with Sherpa session history
- Leaderboards filtered by Sherpa status

---

## 5. Implementation Roadmap

### Phase 3 (Current) - Foundation
- ✅ Admin Review Interface (Complete)
- 🔄 Discord Linked Roles (In Progress)
- ⏳ Vote to Resign
- ⏳ Oathbreaker Penalties
- ⏳ Oathkeeper Badges

### Phase 4 - Data Architecture Upgrade
1. **Implement RaidHub's Caching Patterns**
   - Add `reactRequestDedupe` utility
   - Implement `saferFetch` with retry logic
   - Set up Dexie multi-table structure
   - Add React Query for client-side state

2. **Next.js Optimization**
   - Enable PPR (Partial Prerendering)
   - Implement ISR for profile pages
   - Add Suspense boundaries
   - Implement metadata generation

### Phase 5 - Unified Dashboard Foundation
1. **Dashboard Infrastructure**
   - Create module system
   - Implement user preferences storage
   - Build module toggle UI
   - Create responsive grid layout

2. **Core Module Integration**
   - Migrate Sherpa Hub to dashboard modules
   - Add module navigation
   - Implement module ordering

### Phase 6 - Feature Integration (Priority Order)
1. **Checkpoints Module** (RaidHub)
   - Integrate checkpoint API
   - Create checkpoint sharing UI
   - Link to Sherpa sessions

2. **Weekly Rotations Module** (Braytech)
   - Implement rotation tracking
   - Create "This Week" / "Now" views
   - Add activity modules

3. **Raid History Module** (RaidHub)
   - Integrate activity history
   - Add partitioning (4-hour windows)
   - Link to PGCRs

4. **Triumphs Module** (Braytech)
   - Implement seal tracking
   - Add "Almost Complete" view
   - Create tracking UI

5. **Collections Module** (Braytech)
   - Implement badge collections
   - Add item rarity ranking
   - Create collection views

6. **Leaderboards Module** (RaidHub)
   - Integrate leaderboard API (or build custom)
   - Create leaderboard views
   - Add filtering and search

### Phase 7 - Advanced Features
1. **Teammates Module** (RaidHub)
2. **Maps Module** (Braytech)
3. **Pursuits Module** (Braytech - requires Bungie OAuth)

---

## 6. Technical Recommendations

### 6.1 Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "dexie": "^3.x",
    "dexie-react-hooks": "^1.x",
    "@discordjs/collection": "^1.x",
    "bungie-net-core": "^latest"
  }
}
```

### 6.2 File Structure

```
app/
  dashboard/
    page.tsx                    # Main dashboard page
    components/
      DashboardGrid.tsx         # Responsive grid layout
      ModuleToggle.tsx           # Module enable/disable UI
      modules/
        SherpaHubModule.tsx     # Core Sherpa Hub module
        CheckpointsModule.tsx    # Checkpoints module
        WeeklyRotationsModule.tsx # Weekly rotations module
        RaidHistoryModule.tsx   # Raid history module
        TriumphsModule.tsx      # Triumphs module
        CollectionsModule.tsx   # Collections module
        LeaderboardsModule.tsx  # Leaderboards module
lib/
  cache/
    reactRequestDedupe.ts       # Request deduplication
    saferFetch.ts               # Retry logic fetch
  dexie/
    dexie.ts                    # Dexie database setup
    useDexieGetQuery.ts         # Dexie query hook
  bungie/
    client.ts                   # Bungie API client
    types.ts                    # Type definitions
```

### 6.3 Database Schema Additions

```sql
-- User dashboard preferences
CREATE TABLE user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Manifest cache (for Dexie sync)
CREATE TABLE manifest_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  hash INTEGER NOT NULL,
  data JSONB NOT NULL,
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, hash, version)
);
```

---

## 7. Key Takeaways

1. **RaidHub's caching architecture is superior** - Multi-layer caching (ISR + React Query + Dexie) provides best performance
2. **Braytech's feature set is broader** - More comprehensive feature coverage, especially for casual players
3. **Modular dashboard approach** - Enables gradual feature integration without overwhelming users
4. **Server-side patterns matter** - RaidHub's Next.js patterns (PPR, ISR) provide better performance and SEO
5. **Integration is feasible** - Both apps use similar underlying technologies, making integration straightforward

---

## 8. Next Steps

1. **Review this document** with the team
2. **Prioritize features** based on user feedback and roadmap
3. **Begin Phase 4** (Data Architecture Upgrade) after Phase 3 completion
4. **Prototype dashboard** with core modules first
5. **Iterate** based on user testing and feedback

---

**Document Status**: ✅ Complete  
**Last Updated**: 2026-01-23  
**Next Review**: After Phase 3 completion
