# Next Steps Roadmap

**Date**: January 30, 2026  
**Current Status**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 🚧 (Partial)

---

## Immediate Next Steps (Priority Order)

### Option 1: Complete Phase 2 Missing Components ⭐ **RECOMMENDED**

**Goal**: Finish remaining UI components for core functionality

**Missing Components**:
1. **Rating Form Component** (`components/sherpa/oathkeeper-rating-form.tsx`)
   - Form to submit ratings after completed sessions
   - Fields: helpfulness (1-5), patience (1-5), teaching_skill (1-5), overall (1-5), feedback
   - Use ShadCN Form + Slider or Select components
   - Server action: `submitOathkeeperRating()` ✅ (already exists)

2. **Session Creation Form** (`components/sherpa/session-create-form.tsx`)
   - Form for Sherpas to create new sessions
   - Link to requests or create standalone sessions
   - Server action: `createSherpaSession()` ✅ (already exists)

3. **Admin Review Interface** (`app/(site)/sherpa/admin/page.tsx`)
   - Page for admins to review applications
   - Approve/deny applications
   - View pending applications list

**Estimated Time**: 2-3 hours  
**Impact**: Completes core user workflows

---

### Option 2: Complete Phase 3 Features

**Goal**: Implement remaining Phase 3 functionality

**Missing Features**:
1. **Oathbreaker Penalty UI**
   - Display active penalties
   - Show cooldown timers
   - Prevent session creation/joining when penalized
   - Database: `oathbreaker_penalties` table ✅ (exists)

2. **Oathkeeper Score Display Enhancements**
   - Badge system: "Oathkeeper" (90+), "Guide" (75-89), "Mentor" (60-74)
   - Display scores on Sherpa profile cards
   - Filter/search by score in request browsing

3. **Vote to Resign Feature**
   - UI for participants to vote to end session without penalty
   - Show vote count and status
   - Database: `sherpa_session_votes` table (needs verification)

**Estimated Time**: 3-4 hours  
**Impact**: Completes Guardian Oath & penalty system

---

### Option 3: Testing & Validation ⭐ **ALSO RECOMMENDED**

**Goal**: Test current implementation end-to-end

**Testing Checklist**:
1. **Manual Testing**
   - [ ] Create Sherpa application → Verify in database
   - [ ] Create Sherpa request → Verify display
   - [ ] Create session (as Sherpa) → Verify creation
   - [ ] Accept Guardian Oath → Verify acceptance recorded
   - [ ] Start session → Verify status update
   - [ ] Complete session → Verify completion + score update

2. **Database Testing**
   - [ ] Verify Oathkeeper score calculation
   - [ ] Test RLS policies (community isolation)
   - [ ] Test helper functions
   - [ ] Verify triggers work

3. **UI Testing**
   - [ ] Form validation works
   - [ ] Error messages display correctly
   - [ ] Loading states work
   - [ ] Toast notifications appear
   - [ ] Router refresh works

**Estimated Time**: 1-2 hours  
**Impact**: Ensures everything works before moving forward

---

### Option 4: Phase 4 - Resources & Builds Module

**Goal**: Create knowledge base for guides and builds

**Components Needed**:
1. **Database Schema**
   - `resources` table
   - `resource_ratings` table
   - `resource_categories` enum

2. **UI Components**
   - Resource browser
   - Resource creation form
   - Resource detail page
   - Build code display

3. **Features**
   - Markdown content support
   - External link support
   - Build code (DIM links) support
   - Resource ratings
   - Featured resources

**Estimated Time**: 4-6 hours  
**Impact**: Adds valuable community resource

---

### Option 5: Discord Bot Integration

**Goal**: Implement Discord bot commands for Sherpa operations

**Commands to Implement**:
1. `/sherpa apply` - Application via Discord
2. `/sherpa request` - Create request via Discord
3. `/sherpa sessions` - List sessions
4. `/sherpa profile` - View Sherpa profile
5. `/sherpa rating` - Submit rating
6. `/sherpa-admin review` - Admin review commands

**Estimated Time**: 6-8 hours  
**Impact**: Enables Discord-native workflows

---

## Recommended Path Forward

### **Immediate (Today)**
1. ✅ **Testing** - Test current Phase 2 implementation
2. ✅ **Rating Form** - Complete missing rating UI component
3. ✅ **Session Creation Form** - Add UI for creating sessions

### **Short-term (This Week)**
4. **Admin Review Interface** - Enable application review workflow
5. **Oathbreaker Penalty UI** - Display and enforce penalties
6. **Score Display Enhancements** - Badge system and filtering

### **Medium-term (Next Week)**
7. **Phase 4 Resources Module** - Knowledge base implementation
8. **Discord Bot Commands** - Bot integration for Sherpa operations

---

## Quick Wins (Can Do Now)

### 1. Rating Form Component (30 minutes)
- Create `components/sherpa/oathkeeper-rating-form.tsx`
- Use existing `submitOathkeeperRating()` server action
- Add to session detail page

### 2. Session Creation Form (30 minutes)
- Create `components/sherpa/session-create-form.tsx`
- Use existing `createSherpaSession()` server action
- Add to sessions page

### 3. Fix Missing Closing Brace (5 minutes)
- Fix syntax error in `submitOathkeeperRating()` action (line 454)

---

## Decision Matrix

**If you want to...**

**...test what we built**: → **Option 3** (Testing & Validation)  
**...complete core features**: → **Option 1** (Missing Components)  
**...add advanced features**: → **Option 2** (Phase 3 Features)  
**...add community resources**: → **Option 4** (Resources Module)  
**...enable Discord workflows**: → **Option 5** (Discord Bot)

---

## Current Status Summary

**✅ Complete**:
- Phase 1: Multi-community foundation
- Phase 2: Database schema, server actions, main UI pages
- Guardian Oath modal component
- Discord bot alignment verified

**🚧 Partial**:
- Phase 3: Oathkeeper scoring (backend ✅, UI ⬜)
- Phase 3: Oathbreaker penalties (database ✅, UI ⬜)

**⬜ Not Started**:
- Phase 4: Resources & Builds Module
- Discord Bot command implementation
- Admin review interface
- Rating form UI
- Session creation form UI

---

## Recommendation

**Start with Option 1 + Option 3**:
1. Fix the syntax error in rating action
2. Create rating form component (quick win)
3. Create session creation form (quick win)
4. Test everything end-to-end
5. Then proceed to Phase 3 enhancements

This gives you a **fully functional core system** ready for user testing, then you can add enhancements incrementally.

---

**What would you like to tackle next?**
