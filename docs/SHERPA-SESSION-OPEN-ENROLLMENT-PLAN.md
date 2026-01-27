# Sherpa Session Open Enrollment Implementation Plan

**Date**: January 27, 2026  
**Status**: Planning Phase - Comprehensive Analysis Complete  
**Related Features**: Phase 3 Sherpa Enhancements, Phase 6 Bungie Integration

---

## Executive Summary

This document provides a comprehensive plan for transforming the Sherpa session creation flow from a **request-driven, seeker-required model** to an **open enrollment model** where Sherpas can create sessions independently, and Seekers can discover and join available sessions. This plan addresses activity-specific fireteam limits, Bungie account verification for Seekers, notification systems (in-app and Discord), and cohesive UI/UX improvements.

**Key Objectives**:
1. Enable Sherpas to create sessions without requiring Seekers upfront
2. Allow Seekers to discover and join available sessions
3. Implement activity-specific fireteam size limits
4. Require Bungie verification for Seekers joining sessions
5. Add notification systems (in-app and Discord)
6. Improve session discovery and management UX

---

## 1. Current State Analysis

### 1.1 Current Architecture Issues

**Session Creation Flow**:
- ❌ **Requires Seekers at Creation**: `seeker_ids` array is required (minimum 1) in validation schema
- ❌ **Request-Driven Only**: Sessions primarily created from `sherpa_requests`, limiting spontaneous sessions
- ❌ **No Discovery Mechanism**: No way for Seekers to browse available sessions
- ❌ **No Activity Limits**: No enforcement of fireteam size limits based on activity type
- ❌ **No Verification Gate**: Seekers don't need Bungie verification to join sessions
- ❌ **No Notifications**: No in-app or Discord notifications when sessions are created
- ❌ **Poor UX for Independent Play**: Sherpas can't easily offer help during their playtime

**Database Schema**:
- ✅ `sherpa_sessions` table supports `seeker_ids` array (can be empty)
- ✅ `sherpa_session_participants` table exists for detailed tracking
- ✅ `bungie_verified` flag exists on `sherpa_applications` (not used for Seekers)
- ❌ No `max_seekers` or `max_participants` field on sessions
- ❌ No `is_open_for_enrollment` flag
- ❌ No notification preferences or tracking

**UI/UX**:
- ❌ Session creation form requires at least one seeker
- ❌ No session discovery/browse interface
- ❌ No "join session" functionality for Seekers
- ❌ No activity-specific UI hints about fireteam limits
- ❌ No notification center or preferences

### 1.2 Bungie Verification Current State

**Current Implementation**:
- ✅ Discord Linked Roles integration complete
- ✅ `VERIFIED_GUARDIAN_ROLE_ID` environment variable configured
- ✅ `bungie_verified` column on `sherpa_applications` table
- ✅ `BungieVerificationCheck` component exists
- ✅ Verification check in Sherpa application flow
- ❌ **Not used for Seekers** joining sessions
- ❌ No verification requirement for session participation

**Verification Flow**:
1. User links Bungie account via Discord Linked Roles
2. Discord assigns "Verified Guardian" role automatically
3. Role synced to `profiles.discord_role_ids` array
4. Application form checks for role before allowing submission
5. **Gap**: No similar check for Seekers joining sessions

### 1.3 Activity Fireteam Limits (Research-Based)

**Destiny 2 Activity Limits**:
- **Raids**: 6 players maximum (1 Sherpa + 5 Seekers)
- **Dungeons**: 3 players maximum (1 Sherpa + 2 Seekers)
- **Nightfalls (All difficulties)**: 3 players maximum (1 Sherpa + 2 Seekers)
- **PvP Competitive/Trials**: 3 players maximum (1 Sherpa + 2 Seekers)
- **PvP Control/Iron Banner**: 6 players maximum (1 Sherpa + 5 Seekers)
- **Gambit**: 4 players maximum (1 Sherpa + 3 Seekers)
- **PvP Rumble**: Solo only (not applicable for Sherpa sessions)

**Current Activity Types**:
- `raid` → Max 6 players
- `dungeon` → Max 3 players
- `nightfall` → Max 3 players
- `pvp` → Variable (3 or 6 depending on mode)
- `other` → Default to 6 players (safest)

### 1.4 Notification System Current State

**Discord Bot**:
- ✅ Bot infrastructure exists (`discord-bot/` directory)
- ✅ Multi-guild support implemented
- ✅ Event handlers for `guildMemberUpdate` exist
- ❌ **No session creation notifications**
- ❌ **No webhook integration for announcements**
- ❌ No scheduled notification system

**In-App Notifications**:
- ❌ No notification system implemented
- ❌ No notification preferences
- ❌ No notification center UI

---

## 2. Proposed Solution Architecture

### 2.1 Core Flow Changes

**New Session Creation Flow**:
1. **Sherpa Creates Session** (No Seekers Required)
   - Sherpa selects activity type, name, difficulty, scheduled time
   - System calculates `max_seekers` based on activity type
   - Session created with `status: 'open_for_enrollment'`
   - `seeker_ids` array starts empty `[]`
   - Session visible in "Available Sessions" browse view

2. **Notification Sent** (In-App + Discord)
   - In-app notification created for all verified Seekers in community
   - Discord announcement posted to Sherpa channel (if configured)
   - Discord DM sent to Sherpa confirming session creation

3. **Seekers Discover & Join**
   - Browse available sessions filtered by activity type, time, etc.
   - Click "Join Session" button
   - System checks:
     - ✅ User has Verified Guardian role (Bungie verified)
     - ✅ Session has available slots (`seeker_ids.length < max_seekers`)
     - ✅ User not already in session
     - ✅ No active Oathbreaker penalty
   - If checks pass: Add seeker to `seeker_ids` array and create `sherpa_session_participants` record
   - Notification sent to Sherpa that someone joined

4. **Session Management**
   - Sherpa can see all enrolled Seekers
   - Sherpa can remove Seekers (with reason tracking)
   - Seekers can leave session (with reason tracking)
   - When session starts: Status changes to `in_progress`
   - When session ends: Status changes to `completed`

### 2.2 Database Schema Changes

**New Columns Needed**:

```sql
-- Add to sherpa_sessions table
ALTER TABLE public.sherpa_sessions
ADD COLUMN IF NOT EXISTS max_seekers int NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_open_for_enrollment boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS enrollment_closes_at timestamptz, -- Optional: close enrollment before start
ADD COLUMN IF NOT EXISTS description text; -- Optional: session description/details

-- Add index for browsing open sessions
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_open_enrollment 
ON public.sherpa_sessions(is_open_for_enrollment, status, scheduled_start)
WHERE is_open_for_enrollment = true AND status = 'open_for_enrollment';

-- Add index for activity-based filtering
CREATE INDEX IF NOT EXISTS idx_sherpa_sessions_activity_type 
ON public.sherpa_sessions(activity_type, status, scheduled_start);
```

**Activity Limit Configuration** (Application-level constant or config table):

```typescript
// lib/sherpa/activity-limits.ts
export const ACTIVITY_FIRETEAM_LIMITS = {
  raid: 6,
  dungeon: 3,
  nightfall: 3,
  pvp: 6, // Default for Control/Iron Banner, can be overridden
  gambit: 4,
  other: 6, // Safe default
} as const;

export function getMaxSeekers(activityType: string, activityName?: string): number {
  const baseLimit = ACTIVITY_FIRETEAM_LIMITS[activityType as keyof typeof ACTIVITY_FIRETEAM_LIMITS] || 6;
  
  // Special handling for PvP modes
  if (activityType === 'pvp') {
    // Could check activityName for "Trials" or "Competitive" → 3 players
    // For now, default to 6 (Control/Iron Banner)
    return 6;
  }
  
  return baseLimit;
}
```

**Notification System Tables**:

```sql
-- In-app notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'session_created', 'session_joined', 'session_starting', 'session_cancelled'
  title text NOT NULL,
  message text NOT NULL,
  link_url text, -- Link to session detail page
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata for filtering
  community_id uuid REFERENCES public.communities(id),
  session_id uuid REFERENCES public.sherpa_sessions(id),
  
  CONSTRAINT notifications_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread 
ON public.notifications(profile_id, read, created_at DESC)
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_session 
ON public.notifications(session_id, created_at DESC);
```

### 2.3 UI/UX Changes

**Session Creation Form** (`components/sherpa/session-create-form.tsx`):
- ✅ Remove `seeker_ids` requirement (make optional)
- ✅ Add `max_seekers` field (auto-calculated, editable)
- ✅ Add `description` textarea for session details
- ✅ Add `enrollment_closes_at` datetime picker (optional)
- ✅ Show activity-specific hints: "Raids support up to 6 players (1 Sherpa + 5 Seekers)"
- ✅ Add toggle: "Open for enrollment" (default: true)
- ✅ Update validation: `seeker_ids` can be empty array

**Session Browse/Discovery Page** (`app/(site)/sherpa/sessions/browse/page.tsx` - NEW):
- ✅ List all sessions with `is_open_for_enrollment = true` and `status = 'open_for_enrollment'`
- ✅ Filter by: Activity type, Difficulty, Scheduled time range, Community
- ✅ Sort by: Scheduled start time (ascending), Seeker slots available
- ✅ Show: Activity name, Sherpa info, Scheduled time, Seeker slots (X/Y filled), Join button
- ✅ Join button checks verification and availability before allowing join

**Session Detail Page** (`app/(site)/sherpa/sessions/[id]/page.tsx` - NEW or UPDATE):
- ✅ Show full session details
- ✅ List enrolled Seekers with verification badges
- ✅ "Join Session" button for Seekers (if verified and slots available)
- ✅ "Leave Session" button for enrolled Seekers
- ✅ "Remove Seeker" button for Sherpa (with confirmation)
- ✅ Show fireteam composition: "1 Sherpa + 3 Seekers / 6 max"

**Sessions List Page** (`app/(site)/sherpa/sessions/page.tsx` - UPDATE):
- ✅ Add filter tabs: "My Sessions", "Available Sessions", "All Sessions"
- ✅ Show enrollment status badges
- ✅ Show seeker count vs. max: "3/5 Seekers"
- ✅ Add "Browse Available" button/link

**Notification Center** (`app/(site)/notifications/page.tsx` - NEW):
- ✅ List unread notifications
- ✅ Mark as read functionality
- ✅ Filter by type
- ✅ Link to related sessions/actions
- ✅ Badge count in navigation

### 2.4 Server Actions Changes

**Update `createSherpaSession`** (`app/(site)/sherpa/actions.ts`):
```typescript
export type CreateSherpaSessionInput = {
  request_id?: string
  activity_type: string
  activity_name?: string
  difficulty?: string
  scheduled_start: string
  scheduled_end?: string
  seeker_ids?: string[] // OPTIONAL - can be empty
  description?: string
  enrollment_closes_at?: string
  is_open_for_enrollment?: boolean // Default true
}

export async function createSherpaSession(input: CreateSherpaSessionInput) {
  // ... existing validation ...
  
  // Calculate max_seekers based on activity type
  const maxSeekers = getMaxSeekers(input.activity_type, input.activity_name)
  
  // Create session with open enrollment
  const { data: session, error } = await supabase
    .from('sherpa_sessions')
    .insert({
      // ... existing fields ...
      seeker_ids: input.seeker_ids || [], // Allow empty
      max_seekers: maxSeekers,
      is_open_for_enrollment: input.is_open_for_enrollment ?? true,
      description: input.description || null,
      enrollment_closes_at: input.enrollment_closes_at || null,
      status: 'open_for_enrollment', // New status
    })
    .select()
    .single()
  
  // Create notifications for verified Seekers
  await notifySeekersOfNewSession(session.id, session.community_id)
  
  // Send Discord notification
  await sendDiscordSessionNotification(session)
  
  return { success: true, session }
}
```

**New Action: `joinSherpaSession`**:
```typescript
export async function joinSherpaSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')
  
  // Check Bungie verification
  const isVerified = await checkBungieVerification(user.id)
  if (!isVerified) {
    throw new Error('You must have a verified Bungie account to join sessions. Link your account in Discord Server Settings → Linked Roles.')
  }
  
  // Get session details
  const { data: session } = await supabase
    .from('sherpa_sessions')
    .select('id, seeker_ids, max_seekers, is_open_for_enrollment, status, community_id')
    .eq('id', sessionId)
    .single()
  
  if (!session) throw new Error('Session not found')
  if (!session.is_open_for_enrollment) throw new Error('Session is not open for enrollment')
  if (session.status !== 'open_for_enrollment') throw new Error('Session enrollment is closed')
  
  const currentSeekers = session.seeker_ids || []
  if (currentSeekers.length >= session.max_seekers) {
    throw new Error(`Session is full (${session.max_seekers}/${session.max_seekers} Seekers)`)
  }
  if (currentSeekers.includes(user.id)) {
    throw new Error('You are already enrolled in this session')
  }
  
  // Check for active penalty
  const activePenalty = await checkActivePenalties(user.id)
  if (activePenalty) {
    throw new Error('You cannot join sessions while you have an active Oathbreaker penalty')
  }
  
  // Add seeker to session
  const updatedSeekers = [...currentSeekers, user.id]
  const { error } = await supabase
    .from('sherpa_sessions')
    .update({ seeker_ids: updatedSeekers })
    .eq('id', sessionId)
  
  if (error) throw new Error(`Failed to join session: ${error.message}`)
  
  // Create participant record
  await supabase
    .from('sherpa_session_participants')
    .insert({
      session_id: sessionId,
      profile_id: user.id,
      role: 'seeker',
      joined_at: new Date().toISOString(),
    })
  
  // Notify Sherpa
  await notifySherpaOfSeekerJoin(sessionId, user.id)
  
  revalidatePath('/sherpa/sessions')
  return { success: true }
}
```

**New Action: `leaveSherpaSession`**:
```typescript
export async function leaveSherpaSession(sessionId: string, reason?: string) {
  // Remove seeker from seeker_ids array
  // Update sherpa_session_participants with left_at and left_reason
  // Notify Sherpa
}
```

**New Action: `removeSeekerFromSession`** (Sherpa only):
```typescript
export async function removeSeekerFromSession(sessionId: string, seekerId: string, reason: string) {
  // Verify user is the Sherpa
  // Remove seeker from seeker_ids array
  // Update participant record
  // Notify removed Seeker
}
```

**New Helper: `checkBungieVerification`**:
```typescript
export async function checkBungieVerification(userId: string): Promise<boolean> {
  const VERIFIED_GUARDIAN_ROLE_ID = process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID
  if (!VERIFIED_GUARDIAN_ROLE_ID) return true // Backward compatibility
  
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('discord_role_ids')
    .eq('id', userId)
    .single()
  
  return profile?.discord_role_ids?.includes(VERIFIED_GUARDIAN_ROLE_ID) ?? false
}
```

### 2.5 Notification System Implementation

**In-App Notifications**:

**Create Notification Helper** (`lib/notifications.ts`):
```typescript
export async function createNotification(
  profileId: string,
  type: 'session_created' | 'session_joined' | 'session_starting' | 'session_cancelled' | 'seeker_joined',
  title: string,
  message: string,
  linkUrl?: string,
  metadata?: { community_id?: string; session_id?: string }
) {
  const supabase = await createClient()
  return supabase
    .from('notifications')
    .insert({
      profile_id: profileId,
      type,
      title,
      message,
      link_url: linkUrl,
      community_id: metadata?.community_id,
      session_id: metadata?.session_id,
    })
}
```

**Notification Functions**:
```typescript
// Notify all verified Seekers in community of new session
async function notifySeekersOfNewSession(sessionId: string, communityId: string) {
  // Get all verified Seekers in community (not Sherpas)
  // Create notification for each
}

// Notify Sherpa when Seeker joins
async function notifySherpaOfSeekerJoin(sessionId: string, seekerId: string) {
  // Get session Sherpa
  // Create notification
}
```

**Discord Notifications**:

**Discord Webhook Integration** (`lib/discord-webhooks.ts`):
```typescript
export async function sendDiscordSessionNotification(session: any) {
  const WEBHOOK_URL = process.env.DISCORD_SHERPA_SESSIONS_WEBHOOK_URL
  if (!WEBHOOK_URL) return // Optional feature
  
  // Format Discord embed with session details
  // Post to webhook URL
  // Include "Join Session" button linking to web app
}
```

**Discord Bot Integration** (`discord-bot/src/events/sessionCreated.ts` - NEW):
- Listen for session creation events (via webhook or database trigger)
- Post announcement to configured channel
- Format with rich embed showing activity, time, slots available

### 2.6 Status Flow Updates

**New Session Status**: `'open_for_enrollment'`
- Replaces `'scheduled'` for open enrollment sessions
- Transitions to `'scheduled'` when enrollment closes or session starts
- Can transition to `'cancelled'` if Sherpa cancels

**Status Flow**:
```
open_for_enrollment → scheduled → in_progress → completed
                    ↓
                 cancelled
```

**Enrollment Closing Logic**:
- If `enrollment_closes_at` is set: Auto-close enrollment at that time
- When session starts: Auto-close enrollment
- Sherpa can manually close enrollment

---

## 3. Implementation Phases

### Phase 1: Database & Core Logic (Week 1)
**Goals**: Foundation for open enrollment

**Tasks**:
1. ✅ Create migration for new columns (`max_seekers`, `is_open_for_enrollment`, etc.)
2. ✅ Create `activity-limits.ts` utility with fireteam limits
3. ✅ Update `createSherpaSession` to support empty `seeker_ids`
4. ✅ Create `joinSherpaSession` action with verification check
5. ✅ Create `leaveSherpaSession` action
6. ✅ Create `checkBungieVerification` helper
7. ✅ Update session status enum to include `'open_for_enrollment'`

**Deliverables**:
- Migration file applied
- Core server actions functional
- Verification checks working

### Phase 2: UI/UX Updates (Week 2)
**Goals**: User-facing changes for session creation and discovery

**Tasks**:
1. ✅ Update `SessionCreateForm` to remove seeker requirement
2. ✅ Add `max_seekers` calculation and display
3. ✅ Add activity limit hints in form
4. ✅ Create `BrowseSessionsPage` component
5. ✅ Add "Join Session" button with verification check
6. ✅ Update `SessionsPage` with filter tabs
7. ✅ Create `SessionDetailPage` with enrollment UI
8. ✅ Add enrollment status badges throughout

**Deliverables**:
- Session creation form updated
- Browse/discovery page functional
- Join/leave functionality working

### Phase 3: Notification System (Week 3)
**Goals**: In-app and Discord notifications

**Tasks**:
1. ✅ Create `notifications` table migration
2. ✅ Create notification helper functions
3. ✅ Implement `notifySeekersOfNewSession`
4. ✅ Implement `notifySherpaOfSeekerJoin`
5. ✅ Create `NotificationCenter` component
6. ✅ Add notification badge to navigation
7. ✅ Integrate Discord webhook for announcements
8. ✅ Add Discord bot event handler (optional)

**Deliverables**:
- In-app notifications working
- Discord notifications functional
- Notification center UI complete

### Phase 4: Polish & Testing (Week 4)
**Goals**: Refinement and validation

**Tasks**:
1. ✅ Add loading states and error handling
2. ✅ Add confirmation dialogs for destructive actions
3. ✅ Test edge cases (full sessions, verification failures, etc.)
4. ✅ Add analytics/tracking for session enrollment
5. ✅ Update documentation
6. ✅ User acceptance testing

**Deliverables**:
- Fully tested feature
- Documentation updated
- Ready for production

---

## 4. Current Issues Identified

### 4.1 Critical Issues

1. **Seeker Requirement Blocks Independent Sessions**
   - **Impact**: High - Prevents core use case
   - **Fix**: Make `seeker_ids` optional, allow empty array

2. **No Discovery Mechanism**
   - **Impact**: High - Seekers can't find available sessions
   - **Fix**: Create browse/discovery page with filters

3. **No Activity Limit Enforcement**
   - **Impact**: Medium - Could create invalid fireteams
   - **Fix**: Add `max_seekers` calculation and validation

4. **No Bungie Verification for Seekers**
   - **Impact**: Medium - Can't filter Seekers properly
   - **Fix**: Require verification in `joinSherpaSession`

### 4.2 UX Issues

1. **Poor Session Creation Flow**
   - Form requires Seekers upfront
   - No hints about activity limits
   - No way to create "open" sessions

2. **No Session Discovery**
   - No browse interface
   - No filtering by activity type
   - No way to see available slots

3. **No Notifications**
   - Seekers don't know about new sessions
   - Sherpas don't know when Seekers join
   - No reminders before session starts

### 4.3 Technical Debt

1. **Status Enum Missing `open_for_enrollment`**
   - Need to add to database enum type

2. **No Notification Infrastructure**
   - Need to build from scratch

3. **Discord Integration Incomplete**
   - Webhook system not implemented
   - Bot events not handling session creation

---

## 5. Risk Assessment & Mitigation

### 5.1 Risks

**High Risk**:
- **Breaking Changes**: Changing `seeker_ids` requirement could break existing code
  - **Mitigation**: Make field optional, add backward compatibility checks
- **Notification Spam**: Too many notifications could annoy users
  - **Mitigation**: Add notification preferences, rate limiting

**Medium Risk**:
- **Verification Check Performance**: Checking Discord roles for every join could be slow
  - **Mitigation**: Cache verification status, use database flag
- **Activity Limit Mismatches**: PvP modes have variable limits
  - **Mitigation**: Allow manual override, add activity name parsing

**Low Risk**:
- **Discord Webhook Failures**: Optional feature, graceful degradation
- **Enrollment Race Conditions**: Multiple Seekers joining simultaneously
  - **Mitigation**: Use database transactions, optimistic locking

### 5.2 Backward Compatibility

**Existing Sessions**:
- Sessions with `seeker_ids` populated continue to work
- `max_seekers` defaults to 5 if not set (safe default)
- `is_open_for_enrollment` defaults to `false` for existing sessions

**API Changes**:
- `createSherpaSession` accepts optional `seeker_ids`
- New actions (`joinSherpaSession`, etc.) are additive
- No breaking changes to existing endpoints

---

## 6. Success Metrics

### 6.1 Key Performance Indicators

1. **Session Creation Rate**: Increase in sessions created (target: +50%)
2. **Enrollment Rate**: Average Seekers per session (target: 3-4 Seekers)
3. **Discovery Usage**: Sessions browsed vs. created (target: 5:1 ratio)
4. **Verification Rate**: % of Seekers with Bungie verification (target: 80%+)
5. **Notification Engagement**: % of notifications clicked (target: 30%+)

### 6.2 User Satisfaction Metrics

1. **Session Fill Rate**: % of sessions that reach capacity
2. **Time to Fill**: Average time from creation to full enrollment
3. **Cancellation Rate**: % of sessions cancelled due to low enrollment
4. **User Feedback**: Survey responses on new flow

---

## 7. Future Enhancements

### 7.1 Short-Term (Next Quarter)

1. **Session Reminders**: Notify participants 15 minutes before start
2. **Activity-Specific UI**: Different forms for Raids vs. Dungeons
3. **Seeker Preferences**: Allow Seekers to set activity preferences for notifications
4. **Session Templates**: Save common session configurations

### 7.2 Long-Term (Next 6 Months)

1. **Bungie API Integration**: Pull activity details, verify completions
2. **Smart Matching**: Match Seekers to sessions based on needs
3. **Recurring Sessions**: Weekly/bi-weekly session series
4. **Session Analytics**: Track success rates, popular activities

---

## 8. Conclusion

This plan transforms the Sherpa session system from a **request-driven, seeker-required model** to an **open enrollment, discovery-based model** that better supports Sherpas offering help during independent playtime. The implementation addresses all identified issues while maintaining backward compatibility and providing a foundation for future enhancements.

**Next Steps**:
1. Review and approve this plan
2. Prioritize implementation phases
3. Begin Phase 1: Database & Core Logic
4. Iterate based on user feedback

---

**Document Version**: 1.0  
**Last Updated**: January 27, 2026  
**Author**: AI Assistant (Composer)  
**Status**: Ready for Review
