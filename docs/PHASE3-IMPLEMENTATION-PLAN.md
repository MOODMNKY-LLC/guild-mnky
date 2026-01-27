# Phase 3 Implementation Plan - Sherpa Enhancements

**Date**: 2026-01-23  
**Status**: 🚧 In Progress  
**Branch**: `feat/phase-3-sherpa-enhancements`

---

## ✅ Completed Deliverables

### Deliverable 1: Admin Review Interface ✅
- ✅ Database RLS policies for admin review
- ✅ Server actions for fetching/updating applications
- ✅ Admin review UI component
- ✅ Integration into Admin Panel
- ✅ Auto-creation of Sherpa records on approval
- ✅ Discord role auto-assignment

### Deliverable 2: Discord Linked Roles ✅
- ✅ Bungie verification via Discord Linked Roles
- ✅ Database sync for verification status
- ✅ UI components for verification check
- ✅ Manual sync API route

---

## 🎯 Remaining Phase 3 Deliverables

### Deliverable 3: Oathbreaker Penalty UI
**Priority**: High  
**Estimated Time**: 2-3 hours

**Database**: ✅ Already exists (`oathbreaker_penalties` table)

**Components Needed**:
1. **Penalty Display Component** (`components/sherpa/oathbreaker-penalty-display.tsx`)
   - Show active penalties
   - Display cooldown timer (countdown)
   - Warning banner when penalized
   - Prevent session creation/joining when active

2. **Penalty Check Logic** (Server Actions)
   - `checkActivePenalties(userId)` - Check if user has active penalties
   - `getPenaltyCooldown(userId)` - Get time remaining
   - Integrate into `createSherpaSession()` and `joinSession()` actions

3. **Admin Penalty Management** (Optional)
   - Admin UI to view/manage penalties
   - Apply/remove penalties manually

**Pages to Update**:
- `/sherpa/sessions` - Show penalty warning, disable create button
- `/sherpa/requests` - Show penalty warning, disable join button
- `/sherpa` - Display penalty status on dashboard

---

### Deliverable 4: Oathkeeper Score Badges & Display
**Priority**: High  
**Estimated Time**: 2-3 hours

**Database**: ✅ Already exists (`oathkeeper_score` column in `sherpas` table)

**Components Needed**:
1. **Score Badge Component** (`components/sherpa/oathkeeper-badge.tsx`)
   - Badge tiers:
     - **Oathkeeper** (90-100): Gold badge, highest tier
     - **Guide** (75-89): Silver badge, experienced
     - **Mentor** (60-74): Bronze badge, developing
     - **Novice** (<60): Gray badge, new Sherpa
   - Display score number
   - Tooltip with score breakdown

2. **Score Display Enhancements**
   - Add badges to Sherpa profile cards
   - Display on `/sherpa` dashboard
   - Show on session cards
   - Add to request browsing

3. **Score Filtering** (`components/sherpa/score-filter.tsx`)
   - Filter requests by minimum score
   - Filter Sherpas by badge tier
   - Search by score range

**Pages to Update**:
- `/sherpa` - Show badges on Sherpa cards
- `/sherpa/requests` - Add score filter
- `/sherpa/sessions` - Show Sherpa score on session cards

---

### Deliverable 5: Vote to Resign Feature
**Priority**: Medium  
**Estimated Time**: 2-3 hours

**Database**: ✅ Already exists (`sherpa_session_votes` table, `check_resignation_majority()` function)

**Components Needed**:
1. **Vote Component** (`components/sherpa/vote-to-resign.tsx`)
   - Button to vote to resign
   - Show current vote count
   - Show if majority reached (50%+1)
   - Display who has voted
   - Disable voting if already voted

2. **Vote Status Display**
   - Show vote progress (X/Y participants voted)
   - Visual indicator when majority reached
   - Auto-end session when majority reached

3. **Server Actions**
   - `voteToResign(sessionId)` - Submit resignation vote
   - `checkResignationStatus(sessionId)` - Get vote status
   - `endSessionByVote(sessionId)` - End session when majority reached

**Pages to Update**:
- `/sherpa/sessions/[id]` - Add vote component to session detail page
- Session detail view - Show vote status

---

### Deliverable 6: Enhanced Score Display & Filtering
**Priority**: Medium  
**Estimated Time**: 2-3 hours

**Components Needed**:
1. **Score History Visualization** (`components/sherpa/score-history-chart.tsx`)
   - Line chart showing score over time
   - Show rating events
   - Display trends

2. **Advanced Filtering** (`components/sherpa/sherpa-filters.tsx`)
   - Filter by score range
   - Filter by badge tier
   - Filter by specialties
   - Filter by availability
   - Sort by score, name, sessions completed

3. **Score Breakdown Modal** (`components/sherpa/score-breakdown-modal.tsx`)
   - Show detailed score calculation
   - Display recent ratings
   - Show rating averages (helpfulness, patience, teaching_skill)

**Pages to Update**:
- `/sherpa` - Add filtering and sorting
- `/sherpa/[id]` - Add score history chart
- `/sherpa/requests` - Enhanced filtering

---

## 📋 Implementation Order (Recommended)

### Week 1: Core Penalty & Badge System
1. **Oathbreaker Penalty UI** (Day 1-2)
   - Most critical for preventing abuse
   - Blocks session creation when penalized
   - Quick win with high impact

2. **Oathkeeper Score Badges** (Day 2-3)
   - Visual representation of quality
   - Motivates Sherpas to maintain high scores
   - Enhances user experience

### Week 2: Advanced Features
3. **Vote to Resign Feature** (Day 4-5)
   - Group consensus mechanism
   - Prevents Oathbreaker penalties for group decisions
   - Improves session flexibility

4. **Enhanced Score Display** (Day 6-7)
   - Score history and trends
   - Advanced filtering
   - Score breakdown details

---

## 🗄️ Database Schema Reference

### Oathbreaker Penalties
```sql
oathbreaker_penalties (
  id uuid PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id),
  session_id uuid REFERENCES sherpa_sessions(id),
  penalty_type text, -- 'abandoned_session', 'vote_to_resign', 'other'
  penalty_start timestamptz,
  penalty_end timestamptz,
  is_active boolean
)
```

### Oathkeeper Scores
```sql
sherpas (
  ...
  oathkeeper_score numeric(5,2), -- 0.00 to 100.00
  ...
)
```

### Session Votes
```sql
sherpa_session_votes (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sherpa_sessions(id),
  voter_profile_id uuid REFERENCES profiles(id),
  vote_type text, -- 'resign'
  created_at timestamptz
)
```

### Helper Functions
- `calculate_oathkeeper_score(sherpa_id)` - Calculate score from ratings
- `check_resignation_majority(session_id)` - Check if 50%+1 voted
- `get_session_participant_count(session_id)` - Get total participants

---

## 🎨 UI Component Structure

```
components/sherpa/
├── oathbreaker-penalty-display.tsx    # Penalty status & countdown
├── oathkeeper-badge.tsx                # Score badge component
├── score-filter.tsx                     # Filter by score/badge
├── vote-to-resign.tsx                  # Vote component
├── score-history-chart.tsx             # Score trend visualization
├── score-breakdown-modal.tsx           # Detailed score view
└── sherpa-filters.tsx                  # Advanced filtering
```

---

## 📝 Next Steps

1. **Start with Oathbreaker Penalty UI** (Highest Priority)
   - Prevents abuse
   - Quick implementation
   - High user impact

2. **Then Oathkeeper Badges** (High Priority)
   - Visual quality indicator
   - Motivates good behavior
   - Enhances UX

3. **Then Vote to Resign** (Medium Priority)
   - Group consensus feature
   - Prevents unfair penalties

4. **Finally Enhanced Display** (Medium Priority)
   - Advanced features
   - Nice-to-have enhancements

---

**Status**: Ready to Begin Implementation  
**First Deliverable**: Oathbreaker Penalty UI
