# Multi-Community Implementation Plan

**Date**: January 23, 2026  
**Scope**: Jupiter's Girth + Sherpa Hub Integration  
**Status**: Phase 1 Complete, Phases 2-6 Planned

---

## Executive Summary

This document outlines a comprehensive implementation plan for integrating Jupiter's Girth (established, 81 members) and Sherpa Hub (new, 9 members, infrastructure-ready) into a unified multi-community ecosystem. The plan leverages Jupiter's Girth's established membership and Sherpa Hub's comprehensive infrastructure to create a symbiotic relationship enabling cross-community features, teaching resources, and growth.

**Current State**:
- **Jupiter's Girth**: 81 members, 42 channels, established 5+ years
- **Sherpa Hub**: 9 members, 91 channels, created 4 months ago
- **Integration**: Phase 1 complete, Phase 2 ready to begin

**Goal**: Create a unified ecosystem where both communities benefit from cross-community features, teaching resources, and shared infrastructure.

---

## 1. Current State Analysis

### 1.1 Server Comparison

| Metric | Jupiter's Girth | Sherpa Hub | Analysis |
|--------|----------------|------------|----------|
| **Members** | 81 | 9 | Jupiter's Girth has 9x more members |
| **Channels** | 42 | 91 | Sherpa Hub has 2x more channels (infrastructure-ready) |
| **Age** | 5+ years | 4 months | Jupiter's Girth is established, Sherpa Hub is new |
| **Type** | Standard | Community | Sherpa Hub has NEWS feature for announcements |
| **Structure** | Optimized | Growth-ready | Different optimization strategies |

### 1.2 Integration Status

**Phase 1: Foundation - COMPLETE ✅**
- ✅ Multi-community database schema
- ✅ Community helper functions
- ✅ Dynamic community assignment
- ✅ Cross-community connection configured
- ✅ Hard-coded guild IDs removed

**Phases 2-6: PLANNED ⏳**
- Phase 2: Sherpa Core Features
- Phase 3: Oath System
- Phase 4: Resources Module
- Phase 5: Cross-Community Features
- Phase 6: Discord Bot Updates

---

## 2. Implementation Phases

### Phase 2: Sherpa Core Features

**Goal**: Implement core Sherpa functionality for Sherpa Hub

**Timeline**: Week 2 (Days 1-5)

#### 2.1 Database Schema

**Migration**: `20260123000001_sherpa_schema.sql`

**Tables to Create**:
1. `sherpa_applications` - Application tracking
2. `sherpas` - Sherpa profiles
3. `sherpa_requests` - Seeker requests
4. `sherpa_sessions` - Session management
5. `sherpa_session_participants` - Participant tracking
6. `sherpa_ratings` - Rating system

**Enums to Create**:
- `sherpa_status` - Application status enum

#### 2.2 API Routes & Server Actions

**Files to Create**:
- `app/(site)/sherpa/actions.ts` - Server actions
- `app/api/sherpa/applications/route.ts` - Application API
- `app/api/sherpa/requests/route.ts` - Request API
- `app/api/sherpa/sessions/route.ts` - Session API

**Functions to Implement**:
- `createSherpaApplication()` - Submit application
- `reviewSherpaApplication()` - Admin review
- `createSherpaRequest()` - Seeker request
- `matchSherpaRequest()` - Match Sherpa to request
- `createSherpaSession()` - Create session
- `updateSessionStatus()` - Update session status
- `submitRating()` - Submit post-session rating

#### 2.3 UI Components

**Components to Create**:
- `components/sherpa-application-form.tsx` - Application form
- `components/sherpa-request-form.tsx` - Request form
- `components/sherpa-session-card.tsx` - Session display
- `components/sherpa-profile.tsx` - Sherpa profile
- `app/(site)/sherpa/page.tsx` - Sherpa hub page
- `app/(site)/sherpa/applications/page.tsx` - Applications page
- `app/(site)/sherpa/requests/page.tsx` - Requests page
- `app/(site)/sherpa/sessions/page.tsx` - Sessions page

**Deliverables**:
- ✅ Database schema for Sherpa tables
- ✅ API routes and server actions
- ✅ UI components for applications, requests, sessions
- ✅ Sherpa profile display
- ✅ Session management interface

---

### Phase 3: Guardian Oath System

**Goal**: Implement Guardian Oath acceptance and Oathkeeper rating system

**Timeline**: Week 3 (Days 1-5)

#### 3.1 Guardian Oath Implementation

**Features**:
- Oath acceptance before sessions
- Oath principles display
- Oath acceptance tracking
- Oath violation tracking

**Components**:
- `components/guardian-oath-modal.tsx` - Oath acceptance modal
- `components/oath-principles.tsx` - Oath display
- Database tracking in `sherpa_sessions` table

#### 3.2 Oathkeeper Rating System

**Features**:
- Post-session rating (1-5 scale)
- Rating aggregation
- Oathkeeper Score calculation
- Profile display of scores

**Components**:
- `components/session-rating-form.tsx` - Rating form
- `components/oathkeeper-score.tsx` - Score display
- Database: `sherpa_ratings` table

#### 3.3 Oathbreaker Penalty System

**Features**:
- Cooldown period tracking
- Abandonment detection
- Vote-to-resign mechanism
- Penalty application

**Components**:
- `components/vote-to-resign.tsx` - Vote component
- Database: Cooldown tracking in profiles
- Logic: Penalty application on abandonment

**Deliverables**:
- ✅ Guardian Oath acceptance system
- ✅ Oathkeeper rating system
- ✅ Oathbreaker penalty system
- ✅ Vote-to-resign mechanism

---

### Phase 4: Resources Module

**Goal**: Create curated resources and builds module

**Timeline**: Week 4 (Days 1-5)

#### 4.1 Database Schema

**Migration**: `20260123000002_resources_schema.sql`

**Tables to Create**:
- `sherpa_resources` - Resource storage
- `resource_categories` - Category organization
- `resource_tags` - Tagging system

#### 4.2 Resource Types

**Content Types**:
- Raid guides
- Dungeon guides
- Build recommendations
- Teaching materials
- Bungie resource links

#### 4.3 UI Components

**Components**:
- `app/(site)/resources/page.tsx` - Resources hub
- `components/resource-card.tsx` - Resource display
- `components/resource-filter.tsx` - Filtering
- `components/resource-search.tsx` - Search functionality

**Deliverables**:
- ✅ Resources database schema
- ✅ Resource management interface
- ✅ Resource browsing and search
- ✅ Category and tag organization

---

### Phase 5: Cross-Community Features

**Goal**: Enable cross-community visibility and collaboration

**Timeline**: Week 5 (Days 1-5)

#### 5.1 Cross-Community Visibility

**Features**:
- Cross-community LFG visibility
- Cross-community event visibility
- Cross-community resource sharing
- Cross-community session participation

**Implementation**:
- Update RLS policies for cross-community access
- Add `connected_discord_guild_ids` filtering
- Create cross-community UI components

#### 5.2 Cross-Community Teaching

**Features**:
- Sherpas can teach across communities
- Cross-community session creation
- Cross-community statistics tracking
- Cross-community resource access

**Implementation**:
- Update session creation logic
- Add community selection in UI
- Track statistics per community
- Enable resource sharing

#### 5.3 Cross-Community UI

**Components**:
- `components/community-selector.tsx` - Community selection
- `components/cross-community-badge.tsx` - Cross-community indicator
- Update existing components for cross-community support

**Deliverables**:
- ✅ Cross-community visibility
- ✅ Cross-community teaching
- ✅ Cross-community statistics
- ✅ Cross-community UI components

---

### Phase 6: Discord Bot Updates

**Goal**: Implement Discord bot commands and event handlers

**Timeline**: Week 6 (Days 1-5)

#### 6.1 Multi-Guild Bot Support

**Features**:
- Handle multiple guild IDs
- Route commands to correct community
- Per-community bot configuration
- Guild-specific event handling

**Implementation**:
- Update bot to handle multiple guilds
- Add guild ID routing logic
- Configure per-community settings

#### 6.2 Sherpa Bot Commands

**Commands to Implement**:
- `/sherpa apply` - Start application process
- `/sherpa request [activity]` - Create request
- `/sherpa sessions` - List upcoming sessions
- `/sherpa oath` - Display Guardian Oath
- `/sherpa rating [session_id]` - Rate session
- `/sherpa vote-resign [session_id]` - Vote to resign

**Implementation**:
- Create command handlers
- Integrate with API routes
- Add Discord UI components (buttons, modals)

#### 6.3 Event Handlers

**Events to Handle**:
- Guild member join - Call `verifyDiscordMembership()`
- Session reminders - Send DM reminders
- Oath acceptance - Handle via Discord buttons
- Session status updates - Post to channels

**Implementation**:
- Create event handlers
- Integrate with session system
- Add notification system

**Deliverables**:
- ✅ Multi-guild bot support
- ✅ Sherpa bot commands
- ✅ Event handlers
- ✅ Discord UI components

---

## 3. Cross-Community Strategy

### 3.1 Member Growth Strategy

**Jupiter's Girth → Sherpa Hub**:
- Promote Sherpa Hub resources to Jupiter's Girth members
- Encourage teaching participation
- Share success stories
- Cross-promote activities

**Sherpa Hub → Jupiter's Girth**:
- Leverage Jupiter's Girth membership for growth
- Offer teaching resources to Jupiter's Girth
- Enable cross-community sessions
- Share resource library

### 3.2 Content Strategy

**Resource Sharing**:
- Share resources between communities
- Cross-community resource library
- Collaborative content creation
- Resource contribution from both communities

**Teaching Strategy**:
- Sherpas can teach across communities
- Cross-community session participation
- Shared teaching resources
- Collaborative teaching programs

### 3.3 Engagement Strategy

**Cross-Community Activities**:
- Joint events
- Cross-community LFG
- Shared resources
- Collaborative teaching

**Communication**:
- Cross-community announcements
- Shared updates
- Success story sharing
- Community highlights

---

## 4. Implementation Timeline

### Week 1: Foundation (Complete) ✅
- ✅ Database migrations
- ✅ Community setup
- ✅ Helper functions
- ✅ Application refactoring

### Week 2: Sherpa Core Features ⏳
- Day 1-2: Database schema
- Day 3-4: API routes and server actions
- Day 5: UI components

### Week 3: Oath System ⏳
- Day 1-2: Guardian Oath implementation
- Day 3-4: Oathkeeper rating system
- Day 5: Oathbreaker penalty system

### Week 4: Resources Module ⏳
- Day 1-2: Resources schema and API
- Day 3-4: Resources UI components
- Day 5: Integration testing

### Week 5: Cross-Community Features ⏳
- Day 1-2: Cross-community visibility
- Day 3-4: Cross-community teaching
- Day 5: Cross-community UI

### Week 6: Discord Bot Updates ⏳
- Day 1-2: Multi-guild bot support
- Day 3-4: Bot commands
- Day 5: Event handlers

---

## 5. Success Metrics

### Phase 2 Metrics (Sherpa Core Features)

**Targets**:
- 5+ Sherpa applications submitted
- 3+ Sherpas approved
- 10+ Seeker requests
- 5+ Sessions created

### Phase 3 Metrics (Oath System)

**Targets**:
- 100% Oath acceptance rate
- 80%+ session completion rate
- Average Oathkeeper Score: 4.0+
- 0 Oathbreaker violations

### Phase 4 Metrics (Resources)

**Targets**:
- 20+ resources added
- 5+ categories created
- 50%+ member resource usage
- 10+ resource contributions

### Phase 5 Metrics (Cross-Community)

**Targets**:
- 20%+ cross-community engagement
- 5+ cross-community sessions
- 30%+ resource sharing
- 10%+ member growth

### Phase 6 Metrics (Discord Bot)

**Targets**:
- 10+ bot commands used daily
- 5+ event handlers active
- 80%+ command success rate
- 50%+ member bot usage

---

## 6. Risk Mitigation

### 6.1 Technical Risks

**Risk**: Database schema changes break existing functionality  
**Mitigation**: Thorough testing, migration rollback plan, staged deployment

**Risk**: Cross-community features cause performance issues  
**Mitigation**: Optimize queries, add caching, monitor performance

**Risk**: Discord bot rate limits  
**Mitigation**: Implement rate limiting, queue system, error handling

### 6.2 Community Risks

**Risk**: Low adoption of Sherpa features  
**Mitigation**: Marketing campaign, onboarding flow, success stories

**Risk**: Cross-community conflicts  
**Mitigation**: Clear guidelines, moderation, community management

**Risk**: Resource quality issues  
**Mitigation**: Review process, quality standards, contributor guidelines

---

## 7. Dependencies

### 7.1 Technical Dependencies

- ✅ Phase 1 complete (foundation)
- ⏳ Discord bot access and permissions
- ⏳ Database migration capabilities
- ⏳ API route implementation
- ⏳ UI component library

### 7.2 Community Dependencies

- ⏳ Sherpa Hub member growth
- ⏳ Jupiter's Girth member engagement
- ⏳ Content contributors
- ⏳ Community moderators
- ⏳ Sherpa volunteers

---

## 8. Next Steps

### Immediate (This Week)

1. **Begin Phase 2 Implementation**
   - Create database schema migration
   - Start API route development
   - Begin UI component creation

2. **Verify Cross-Community Connection**
   - Test database connection
   - Verify helper functions
   - Confirm environment variables

3. **Plan Content Strategy**
   - Identify initial resources
   - Plan resource categories
   - Create content templates

### Short-term (Next 2 Weeks)

1. **Complete Phase 2**
   - Finish database schema
   - Complete API routes
   - Finish UI components
   - Test end-to-end flow

2. **Begin Phase 3 Planning**
   - Design Oath system
   - Plan rating system
   - Design penalty system

3. **Content Creation**
   - Create initial resources
   - Set up resource categories
   - Populate resource library

### Long-term (Next Month)

1. **Complete Phases 3-6**
   - Implement Oath system
   - Build resources module
   - Enable cross-community features
   - Add Discord bot commands

2. **Launch & Marketing**
   - Launch Sherpa program
   - Promote to both communities
   - Onboard first Sherpas
   - Share success stories

3. **Iterate & Improve**
   - Gather feedback
   - Analyze metrics
   - Improve features
   - Expand capabilities

---

## 9. Conclusion

This implementation plan creates a unified multi-community ecosystem where Jupiter's Girth's established membership and Sherpa Hub's comprehensive infrastructure work together to enable cross-community features, teaching resources, and growth.

**Key Success Factors**:
1. **Phased Approach**: Incremental implementation reduces risk
2. **Cross-Community Focus**: Leverages strengths of both communities
3. **Content Strategy**: Resources drive engagement
4. **Member Growth**: Cross-promotion accelerates growth

**Expected Outcomes**:
- Sherpa Hub membership growth (9 → 50+)
- Cross-community engagement (20%+)
- Teaching resource library (20+ resources)
- Active Sherpa program (5-10 Sherpas)
- Cross-community sessions (10+ per month)

The plan positions both communities for success by leveraging their unique strengths while creating shared value through cross-community features and collaboration.
