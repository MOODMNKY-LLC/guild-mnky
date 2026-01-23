# Sherpa Hub Integration Plan

## Executive Summary

This document outlines a comprehensive plan to integrate the Sherpa Hub Discord server (guild ID: `1291190711919837234`) into the existing Guild-MNKY ecosystem alongside Jupiter's Girth (guild ID: `573823015511392268`). The integration will enable multi-community support, implement Sherpa-specific features inspired by Destiny 2's Guided Games and Fireteam Finder systems, and maintain backward compatibility with existing functionality.

## Research Foundation

### Destiny 2 Guided Games (2017-2023)
- **Guardian Oath**: Four principles - Helpful, Attentive, Observant, Willing to Learn/Teach, Friendly
- **Oathkeeper Score**: Clan-level metric measuring adherence to the Guardian Oath, visible to Seekers
- **Oathbreaker Penalty**: Cooldown period preventing participation after abandoning sessions
- **Vote to Resign**: Group consensus mechanism to disband without penalties
- **45-minute commitment**: Guardian Oath buff duration requiring completion or group vote

### Destiny 2 Fireteam Finder (2024+)
- **Guardian Oath Revival**: Four pillars - Nurture Kindness, Share The Light, Honor Others, Stand Together
- **Custom Listings**: Activity type, difficulty, tags, join settings, mic requirements, language, minimum rank
- **Scheduling**: Support for "play now" or scheduled future sessions
- **Search & Filters**: Browse by activity, difficulty, tags, language, schedule
- **Cross-platform**: Universal support across all platforms

## Current State Analysis

### Existing Infrastructure ✅
- **Multi-community schema**: `communities` table with `anchor_discord_guild_id` and `connected_discord_guild_ids[]`
- **Discord bot integration**: `verifyDiscordMembership()` function accepts `guildId` parameter
- **Profile system**: `profiles` table with `community_id` foreign key
- **LFG system**: Posts, members, status tracking
- **Events system**: RSVPs, capacity management
- **RLS policies**: Community-scoped access control

### Hard-coded Dependencies ❌
- **LFG Actions** (`app/(site)/lfg/actions.ts:38`): Hard-codes Jupiter's Girth guild ID
- **Events Actions** (`app/(site)/events/actions.ts:41`): Hard-codes Jupiter's Girth guild ID
- **Migration files**: Reference Jupiter's Girth as default community
- **Default community logic**: Assumes unassigned users belong to Jupiter's Girth

### Missing Features ❌
- **Sherpa applications**: No schema for applying to become a Sherpa
- **Sherpa requests**: No system for Seekers to request help
- **Sherpa sessions**: No dedicated session management
- **Guardian Oath system**: No oath acceptance or tracking
- **Oathkeeper rating**: No rating/review system
- **Oathbreaker penalties**: No cooldown/penalty system
- **Resources/builds module**: No knowledge base for guides and builds
- **Cross-community visibility**: Logic exists but not fully implemented

## Integration Phases

### Phase 1: Foundation & Multi-Community Support
**Goal**: Enable multi-community infrastructure without breaking existing functionality

#### 1.1 Database Schema Updates
**Migration**: `20260125000000_sherpa_hub_foundation.sql`

```sql
-- Create Sherpa Hub community record
INSERT INTO public.communities (name, anchor_discord_guild_id, connected_discord_guild_ids)
VALUES (
  'Sherpa Hub',
  '1291190711919837234',
  ARRAY['573823015511392268']::text[] -- Connected to Jupiter's Girth for cross-community
)
ON CONFLICT (anchor_discord_guild_id) DO NOTHING;

-- Add helper function to get user's community from Discord guild
CREATE OR REPLACE FUNCTION public.get_community_by_guild_id(guild_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  community_uuid uuid;
BEGIN
  SELECT id INTO community_uuid
  FROM public.communities
  WHERE anchor_discord_guild_id = guild_id
  LIMIT 1;
  
  RETURN community_uuid;
END;
$$;
```

#### 1.2 Refactor Hard-coded Guild IDs
**Files to Update**:
- `app/(site)/lfg/actions.ts`
- `app/(site)/events/actions.ts`
- `lib/discord.ts` (add helper function)

**Changes**:
```typescript
// Replace hard-coded guild ID lookup with:
// Option 1: Use DEFAULT_ANCHOR_GUILD_ID env var
const defaultGuildId = process.env.DEFAULT_ANCHOR_GUILD_ID || '573823015511392268'

// Option 2: Use user's Discord guild membership (preferred)
// Query user's Discord guilds via bot API and match to community
```

#### 1.3 Environment Variables
**Add to `.env.local` and Vercel**:
```env
# Default anchor guild (fallback for users without community assignment)
DEFAULT_ANCHOR_GUILD_ID=573823015511392268

# Sherpa Hub guild ID
SHERPA_HUB_GUILD_ID=1291190711919837234
```

#### 1.4 User Community Assignment Logic
**Create**: `lib/community-helpers.ts`
```typescript
/**
 * Get user's community from their Discord guild membership
 * Falls back to DEFAULT_ANCHOR_GUILD_ID if no match found
 */
export async function getUserCommunity(userId: string): Promise<string | null> {
  // Implementation: Query user's Discord guilds, match to communities table
  // Return community_id UUID
}
```

**Deliverables**:
- ✅ Sherpa Hub community record created
- ✅ Hard-coded guild IDs removed
- ✅ Environment variable configuration
- ✅ User community assignment helper function
- ✅ Backward compatibility maintained

---

### Phase 2: Sherpa Core Features
**Goal**: Implement Sherpa application, request, and session management

#### 2.1 Database Schema - Sherpa Tables
**Migration**: `20260125000001_sherpa_schema.sql`

```sql
-- Sherpa status enum
DO $$ BEGIN
  CREATE TYPE public.sherpa_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sherpa applications
CREATE TABLE IF NOT EXISTS public.sherpa_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  application_text text NOT NULL,
  experience_level text, -- e.g., "experienced", "veteran", "expert"
  preferred_activities text[], -- e.g., ["raids", "dungeons", "nightfalls"]
  bungie_profile_url text,
  status public.sherpa_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sherpa_applications_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- Sherpa profiles (created when application is approved)
CREATE TABLE IF NOT EXISTS public.sherpas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.sherpa_applications(id),
  oathkeeper_score numeric(5,2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00
  total_sessions_completed int NOT NULL DEFAULT 0,
  total_seekers_helped int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  bio text,
  specialties text[], -- Activity types they specialize in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sherpas_one_per_profile_community UNIQUE (profile_id, community_id)
);

-- Sherpa requests (Seekers requesting help)
CREATE TABLE IF NOT EXISTS public.sherpa_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- e.g., "raid", "dungeon", "nightfall"
  activity_name text, -- e.g., "Vault of Glass", "Prophecy"
  difficulty text, -- e.g., "normal", "master", "grandmaster"
  requested_slots int NOT NULL DEFAULT 1, -- How many players need help
  preferred_time_window timestamptz, -- When they want to play
  description text,
  status text NOT NULL DEFAULT 'open', -- 'open', 'matched', 'completed', 'cancelled'
  matched_sherpa_id uuid REFERENCES public.sherpas(id),
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sherpa sessions (actual teaching sessions)
CREATE TABLE IF NOT EXISTS public.sherpa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sherpa_id uuid NOT NULL REFERENCES public.sherpas(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.sherpa_requests(id),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_name text,
  difficulty text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'abandoned'
  guardian_oath_accepted boolean NOT NULL DEFAULT false,
  oath_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Session participants (Sherpa + Seekers)
CREATE TABLE IF NOT EXISTS public.sherpa_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'sherpa' or 'seeker'
  guardian_oath_accepted boolean NOT NULL DEFAULT false,
  oath_accepted_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  left_reason text, -- 'completed', 'vote_to_resign', 'abandoned', 'disconnected'
  CONSTRAINT sherpa_session_participants_unique UNIQUE (session_id, profile_id)
);

-- Guardian Oath acceptance tracking
CREATE TABLE IF NOT EXISTS public.guardian_oath_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  oath_version text NOT NULL DEFAULT 'v1', -- Track oath version for future updates
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guardian_oath_acceptances_unique UNIQUE (session_id, profile_id)
);

-- Oathkeeper ratings (post-session reviews)
CREATE TABLE IF NOT EXISTS public.oathkeeper_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  rater_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating_type text NOT NULL, -- 'sherpa_to_seeker' or 'seeker_to_sherpa'
  helpfulness_score int NOT NULL CHECK (helpfulness_score >= 1 AND helpfulness_score <= 5),
  patience_score int NOT NULL CHECK (patience_score >= 1 AND patience_score <= 5),
  teaching_skill_score int, -- Only for sherpa ratings, CHECK (teaching_skill_score >= 1 AND teaching_skill_score <= 5)
  willingness_to_learn_score int, -- Only for seeker ratings, CHECK (willingness_to_learn_score >= 1 AND willingness_to_learn_score <= 5)
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oathkeeper_ratings_one_per_session_pair UNIQUE (session_id, rater_profile_id, rated_profile_id)
);

-- Oathbreaker penalties (cooldown tracking)
CREATE TABLE IF NOT EXISTS public.oathbreaker_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sherpa_sessions(id) ON DELETE CASCADE,
  penalty_type text NOT NULL, -- 'abandoned_session', 'vote_to_resign', 'other'
  penalty_start timestamptz NOT NULL DEFAULT now(),
  penalty_end timestamptz NOT NULL, -- Calculated based on penalty type
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_profile ON public.sherpa_applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_community ON public.sherpa_applications(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_applications_status ON public.sherpa_applications(status);
CREATE INDEX IF NOT EXISTS idx_sherpas_profile ON public.sherpas(profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpas_community ON public.sherpas(community_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_seeker ON public.sherpa_requests(seeker_profile_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_requests_status ON public.sherpa_requests(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_sherpa ON public.sherpa_sessions(sherpa_id);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_status ON public.sherpa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_scheduled_start ON public.sherpa_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_oathbreaker_penalties_profile_active ON public.oathbreaker_penalties(profile_id, is_active) WHERE is_active = true;
```

#### 2.2 API Routes & Server Actions
**Create**:
- `app/api/sherpa/applications/route.ts` - CRUD for applications
- `app/api/sherpa/requests/route.ts` - CRUD for requests
- `app/api/sherpa/sessions/route.ts` - Session management
- `app/api/sherpa/oath/route.ts` - Guardian Oath acceptance
- `app/api/sherpa/ratings/route.ts` - Oathkeeper rating submission
- `app/(site)/sherpa/actions.ts` - Server actions for Sherpa features

#### 2.3 UI Components
**Create**:
- `app/(site)/sherpa/page.tsx` - Main Sherpa Hub page
- `app/(site)/sherpa/apply/page.tsx` - Application form
- `app/(site)/sherpa/requests/page.tsx` - Browse/request help
- `app/(site)/sherpa/sessions/page.tsx` - Session management
- `components/sherpa/application-form.tsx`
- `components/sherpa/request-form.tsx`
- `components/sherpa/session-card.tsx`
- `components/sherpa/guardian-oath-modal.tsx`
- `components/sherpa/oathkeeper-rating-form.tsx`

**Deliverables**:
- ✅ Complete Sherpa database schema
- ✅ API routes for all Sherpa operations
- ✅ UI components for Sherpa workflows
- ✅ Guardian Oath acceptance system
- ✅ Oathkeeper rating infrastructure

---

### Phase 3: Guardian Oath & Oathkeeper System
**Goal**: Implement oath acceptance, rating system, and penalty tracking

#### 3.1 Guardian Oath Implementation
**Oath Text** (based on Destiny 2's four pillars):
```
I - Nurture Kindness: I will be patient, understanding, and supportive
II - Share The Light: I will teach and learn with respect and enthusiasm  
III - Honor Others: I will respect diverse perspectives and skill levels
IV - Stand Together: I will commit to completing sessions and supporting my fireteam
```

**Implementation**:
- Modal component requiring acceptance before session start
- Store acceptance in `guardian_oath_acceptances` table
- Display oath status in session UI
- Require acceptance for all participants (Sherpa + Seekers)

#### 3.2 Oathkeeper Rating System
**Algorithm** (inspired by Guided Games):
```typescript
// Calculate Oathkeeper Score for a Sherpa
// Formula: Weighted average of ratings over last 30 sessions
// Weights: helpfulness (30%), patience (30%), teaching_skill (40%)
// Score range: 0.00 to 100.00

function calculateOathkeeperScore(sherpaId: string): number {
  // Query last 30 sessions with ratings
  // Calculate weighted average
  // Return score (0-100)
}
```

**Display**:
- Show on Sherpa profile cards
- Filter/search by score in request browsing
- Badge system: "Oathkeeper" (90+), "Guide" (75-89), "Mentor" (60-74)

#### 3.3 Oathbreaker Penalty System
**Penalty Types**:
- **Abandoned Session**: 24-hour cooldown
- **Vote to Resign**: No penalty (group consensus)
- **Repeated Offenses**: Escalating penalties (24h → 48h → 1 week)

**Implementation**:
- Check `oathbreaker_penalties` table before allowing session creation/joining
- Display cooldown status in UI
- Auto-expire penalties based on `penalty_end` timestamp

**Deliverables**:
- ✅ Guardian Oath modal and acceptance flow
- ✅ Oathkeeper score calculation function
- ✅ Rating submission UI and API
- ✅ Oathbreaker penalty tracking and enforcement
- ✅ Score display in Sherpa profiles

---

### Phase 4: Resources & Builds Module
**Goal**: Create knowledge base for guides, builds, and teaching materials

#### 4.1 Database Schema
**Migration**: `20260125000002_resources_schema.sql`

```sql
-- Resource categories enum
DO $$ BEGIN
  CREATE TYPE public.resource_category AS ENUM ('guide', 'build', 'raid_walkthrough', 'dungeon_walkthrough', 'strategy', 'video', 'tool');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category public.resource_category NOT NULL,
  content text, -- Markdown content for guides
  external_url text, -- For videos, tools, external links
  build_code text, -- For build resources (DIM links, etc.)
  activity_type text, -- e.g., "raid", "dungeon", "nightfall"
  activity_name text, -- e.g., "Vault of Glass"
  difficulty text,
  tags text[],
  author_profile_id uuid REFERENCES public.profiles(id),
  is_featured boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Resource ratings (helpful/not helpful)
CREATE TABLE IF NOT EXISTS public.resource_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resource_ratings_unique UNIQUE (resource_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_community ON public.resources(community_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_activity ON public.resources(activity_type, activity_name);
CREATE INDEX IF NOT EXISTS idx_resources_featured ON public.resources(is_featured) WHERE is_featured = true;
```

#### 4.2 Integration Options
**Option A: Supabase-only** (Recommended for MVP)
- Store resources in `resources` table
- Markdown content support
- File uploads via Supabase Storage

**Option B: Notion Integration** (Future enhancement)
- Sync resources from Notion database
- Use existing Notion docs infrastructure
- Mark resources as "synced from Notion"

#### 4.3 UI Components
**Create**:
- `app/(site)/resources/page.tsx` - Resources browser
- `app/(site)/resources/[id]/page.tsx` - Resource detail view
- `components/resources/resource-card.tsx`
- `components/resources/resource-form.tsx` - Create/edit resources
- `components/resources/build-viewer.tsx` - DIM link renderer

**Deliverables**:
- ✅ Resources database schema
- ✅ Resource CRUD API routes
- ✅ Resources browser UI
- ✅ Build code viewer (DIM links)
- ✅ Resource rating system

---

### Phase 5: Cross-Community Features
**Goal**: Enable Sherpas to help Seekers across communities

#### 5.1 Cross-Community Visibility Logic
**Implementation**:
```typescript
// Check if community A can see community B's content
function canSeeCommunityContent(
  viewerCommunityId: string,
  contentCommunityId: string
): boolean {
  // Same community: always visible
  if (viewerCommunityId === contentCommunityId) return true;
  
  // Check connected_discord_guild_ids
  // Query communities table to see if communities are connected
  // Return true if connected
}
```

#### 5.2 Cross-Community Session Support
- Allow Sherpas to offer sessions to connected communities
- Filter requests by "my community" vs "all connected communities"
- Track cross-community stats separately

#### 5.3 UI Updates
- Community selector in session creation
- "Cross-community" badge on sessions
- Filter options in request browser

**Deliverables**:
- ✅ Cross-community visibility helper functions
- ✅ UI support for cross-community sessions
- ✅ Filtering and display logic
- ✅ Statistics tracking per community

---

### Phase 6: Discord Bot Updates
**Goal**: Update Discord bot to support multiple guilds and Sherpa commands

#### 6.1 Multi-Guild Bot Configuration
**Update**: Discord bot to handle multiple guild IDs
- Listen for events from both Jupiter's Girth and Sherpa Hub
- Route commands/events to correct community based on `guildId`
- Support per-community bot configuration via `integration_config`

#### 6.2 New Bot Commands
**Sherpa Hub Commands**:
- `/sherpa apply` - Start Sherpa application process
- `/sherpa request [activity]` - Create a Sherpa request
- `/sherpa sessions` - List upcoming sessions
- `/sherpa oath` - Display Guardian Oath
- `/sherpa rating [session_id]` - Rate a completed session
- `/sherpa vote-resign [session_id]` - Vote to end session without penalty

#### 6.3 Bot Event Handlers
- **Guild Member Join**: Call `verifyDiscordMembership()` with correct guild ID
- **Session Reminders**: Send DM reminders 1 hour before scheduled sessions
- **Oath Acceptance**: Handle oath acceptance via Discord buttons
- **Session Status Updates**: Post updates to dedicated channels

**Deliverables**:
- ✅ Multi-guild bot support
- ✅ Sherpa-specific commands
- ✅ Event handlers for Sherpa workflows
- ✅ Discord UI components (buttons, modals, embeds)

---

## Implementation Timeline

### Week 1: Foundation (Phase 1)
- Day 1-2: Database migrations and community setup
- Day 3-4: Refactor hard-coded guild IDs
- Day 5: Environment variable configuration and testing

### Week 2: Core Sherpa Features (Phase 2)
- Day 1-2: Database schema for Sherpa tables
- Day 3-4: API routes and server actions
- Day 5: Basic UI components

### Week 3: Oath System (Phase 3)
- Day 1-2: Guardian Oath implementation
- Day 3-4: Oathkeeper rating system
- Day 5: Oathbreaker penalty system

### Week 4: Resources Module (Phase 4)
- Day 1-2: Resources schema and API
- Day 3-4: Resources UI components
- Day 5: Integration testing

### Week 5: Cross-Community & Bot (Phases 5-6)
- Day 1-2: Cross-community visibility logic
- Day 3-4: Discord bot updates
- Day 5: End-to-end testing and deployment

## Technical Considerations

### RLS Policies
All new tables must have RLS policies that:
- Filter by `community_id` for community-scoped access
- Allow cross-community access when communities are connected
- Respect user roles (admin, officer, member, sherpa)

### Performance
- Index all foreign keys and frequently queried columns
- Consider caching Oathkeeper scores
- Paginate large result sets (sessions, requests, resources)

### Security
- Validate all user inputs
- Enforce community boundaries
- Prevent rating manipulation (one rating per session pair)
- Sanitize markdown content in resources

### Testing Strategy
1. **Unit Tests**: Individual functions and helpers
2. **Integration Tests**: API routes with test database
3. **E2E Tests**: Full workflows (apply → approve → session → rating)
4. **Cross-Community Tests**: Verify visibility and access controls

## Migration Checklist

### Pre-Deployment
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify RLS policies work correctly
- [ ] Test Discord bot with both guilds
- [ ] Update environment variables in Vercel

### Deployment Steps
1. Run database migrations in order
2. Create Sherpa Hub community record
3. Deploy code changes
4. Update Discord bot configuration
5. Test end-to-end workflows
6. Monitor for errors

### Post-Deployment
- [ ] Verify users can be assigned to Sherpa Hub
- [ ] Test Sherpa application flow
- [ ] Verify Guardian Oath acceptance works
- [ ] Test cross-community visibility
- [ ] Monitor performance metrics

## Success Metrics

### Adoption Metrics
- Number of Sherpa applications submitted
- Number of active Sherpas per community
- Number of Sherpa requests created
- Number of sessions completed

### Quality Metrics
- Average Oathkeeper scores
- Session completion rate
- Oathbreaker penalty frequency
- Resource view counts and ratings

### Engagement Metrics
- Cross-community session participation
- Resource contribution rate
- User retention in Sherpa Hub
- Community growth metrics

## Future Enhancements

### Phase 7: Advanced Features (Post-MVP)
- **Sherpa Badges**: Visual recognition for achievements
- **Sherpa Leaderboards**: Top-rated Sherpas by activity type
- **Automated Matching**: AI-powered Seeker-Sherpa matching
- **Session Replay**: Record and share teaching sessions
- **Sherpa Training Program**: Structured onboarding for new Sherpas
- **Mobile App**: Native mobile experience for session management
- **Bungie API Integration**: Pull activity completion data
- **Discord Rich Presence**: Show active sessions in Discord status

## Risk Mitigation

### Technical Risks
- **Data Migration**: Risk of data loss during community assignment
  - *Mitigation*: Comprehensive backups, staged rollout
- **Performance**: Large number of sessions/ratings could slow queries
  - *Mitigation*: Proper indexing, pagination, caching
- **Discord Rate Limits**: Bot commands could hit API limits
  - *Mitigation*: Rate limiting, queuing, error handling

### Business Risks
- **Low Adoption**: Sherpas may not apply or Seekers may not request
  - *Mitigation*: Marketing in Discord, incentives, easy onboarding
- **Quality Control**: Poor Sherpas could damage reputation
  - *Mitigation*: Application review process, rating system, suspension mechanism
- **Cross-Community Conflicts**: Different community cultures
  - *Mitigation*: Clear community guidelines, moderation tools

## Documentation Requirements

### User Documentation
- Sherpa application guide
- How to request a Sherpa
- Guardian Oath explanation
- Rating system guide
- Resources contribution guide

### Developer Documentation
- API endpoint documentation
- Database schema reference
- RLS policy explanations
- Discord bot command reference
- Deployment procedures

## Conclusion

This integration plan provides a comprehensive roadmap for adding Sherpa Hub support to the Guild-MNKY ecosystem. By following the phased approach, we can deliver value incrementally while maintaining system stability and backward compatibility. The implementation draws inspiration from Destiny 2's proven systems while adapting them to our Discord/Supabase architecture.

The key to success will be:
1. **Incremental delivery**: Each phase delivers working functionality
2. **Backward compatibility**: Jupiter's Girth continues to work unchanged
3. **Community focus**: Features designed around real user needs
4. **Quality assurance**: Rating and penalty systems maintain standards
5. **Cross-community support**: Enables Sherpas to help across servers

By completing all six phases, we'll have a robust, multi-community platform that supports both competitive play (Jupiter's Girth) and mentorship (Sherpa Hub) within the Destiny 2 community.
