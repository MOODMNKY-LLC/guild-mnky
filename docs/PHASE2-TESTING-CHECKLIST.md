# Phase 2 Testing Checklist

**Date**: January 30, 2026  
**Purpose**: End-to-end testing of Phase 2 implementation

---

## Pre-Testing Setup

- [ ] Ensure Supabase is running locally (`npx supabase start`)
- [ ] Verify all migrations are applied (`npx supabase migration list`)
- [ ] Check environment variables are set (`.env.local`)
- [ ] Start Next.js dev server (`npm run dev`)
- [ ] Have test user accounts ready (Jupiter's Girth and Sherpa Hub)

---

## 1. Application Flow Testing

### 1.1 Create Application
- [ ] Navigate to `/sherpa/apply`
- [ ] Fill out application form:
  - [ ] Application text (50+ characters)
  - [ ] Experience level selection
  - [ ] Preferred activities
  - [ ] Bungie profile URL (optional)
- [ ] Submit application
- [ ] Verify success toast appears
- [ ] Verify redirect to `/sherpa`
- [ ] Check database: `SELECT * FROM sherpa_applications WHERE profile_id = '<user_id>'`
- [ ] Verify status is 'pending'

### 1.2 Application Validation
- [ ] Try submitting with < 50 characters → Should show error
- [ ] Try submitting duplicate application → Should show error
- [ ] Verify form validation messages appear

---

## 2. Request Flow Testing

### 2.1 Create Request
- [ ] Navigate to `/sherpa/requests`
- [ ] Click "Create Request" button
- [ ] Fill out request form:
  - [ ] Activity type (required)
  - [ ] Activity name (optional)
  - [ ] Difficulty (optional)
  - [ ] Players needed (1-6)
  - [ ] Preferred time (optional)
  - [ ] Description (optional)
- [ ] Submit request
- [ ] Verify success toast appears
- [ ] Verify request appears in list
- [ ] Check database: `SELECT * FROM sherpa_requests WHERE seeker_profile_id = '<user_id>'`
- [ ] Verify status is 'open'

### 2.2 Cancel Request
- [ ] Find your open request
- [ ] Cancel the request
- [ ] Verify status changes to 'cancelled'
- [ ] Verify request no longer appears in open requests list

---

## 3. Session Flow Testing

### 3.1 Create Session (As Sherpa)
- [ ] Ensure user is an approved Sherpa
- [ ] Navigate to `/sherpa/sessions`
- [ ] Click "Create Session" button
- [ ] Fill out session form:
  - [ ] Activity type (required)
  - [ ] Activity name (optional)
  - [ ] Difficulty (optional)
  - [ ] Scheduled start time (required)
  - [ ] Scheduled end time (optional)
  - [ ] Seeker IDs (at least one)
- [ ] Submit session
- [ ] Verify success toast appears
- [ ] Verify redirect to sessions page
- [ ] Check database: `SELECT * FROM sherpa_sessions WHERE sherpa_id = '<sherpa_id>'`
- [ ] Verify status is 'scheduled'

### 3.2 Start Session
- [ ] Find scheduled session
- [ ] Click "Start Session" button
- [ ] Verify Guardian Oath modal appears
- [ ] Accept Guardian Oath
- [ ] Verify session status changes to 'in_progress'
- [ ] Check database: Verify `actual_start` is set
- [ ] Check database: Verify oath acceptance recorded

### 3.3 Complete Session
- [ ] Find in-progress session
- [ ] Click "Complete Session" button
- [ ] Verify success toast appears
- [ ] Verify session status changes to 'completed'
- [ ] Check database: Verify `actual_end` is set
- [ ] Check database: Verify Oathkeeper score updated (if ratings exist)

---

## 4. Rating Flow Testing

### 4.1 Submit Rating
- [ ] Find completed session
- [ ] Click "Rate Session" button
- [ ] Rating form should appear
- [ ] Select participant to rate
- [ ] Fill out ratings:
  - [ ] Helpfulness (1-5)
  - [ ] Patience (1-5)
  - [ ] Teaching Skill (1-5, if rating Sherpa)
  - [ ] Overall (1-5)
  - [ ] Feedback (optional)
- [ ] Submit rating
- [ ] Verify success toast appears
- [ ] Check database: `SELECT * FROM oathkeeper_ratings WHERE session_id = '<session_id>'`
- [ ] Verify rating recorded correctly
- [ ] If rating Sherpa: Verify Oathkeeper score updated

### 4.2 Rating Validation
- [ ] Try rating same participant twice → Should show error
- [ ] Try rating non-participant → Should show error
- [ ] Try rating incomplete session → Should show error

---

## 5. Guardian Oath Testing

### 5.1 Oath Acceptance
- [ ] Start a session (triggers oath modal)
- [ ] Read Guardian Oath principles
- [ ] Accept oath
- [ ] Verify acceptance recorded
- [ ] Check database: `SELECT * FROM guardian_oath_acceptances WHERE session_id = '<session_id>'`
- [ ] Verify session can start after acceptance

### 5.2 Oath Display
- [ ] Verify all 4 principles display correctly
- [ ] Verify formatting is readable
- [ ] Verify modal closes after acceptance

---

## 6. Multi-Community Testing

### 6.1 Community Isolation
- [ ] Create application as Jupiter's Girth user
- [ ] Verify application only visible to Jupiter's Girth community
- [ ] Create request as Sherpa Hub user
- [ ] Verify request only visible to Sherpa Hub community
- [ ] Verify data isolation works correctly

### 6.2 Cross-Community (If Enabled)
- [ ] Check if `connected_discord_guild_ids` allows cross-community visibility
- [ ] Verify cross-community features work as expected

---

## 7. Oathkeeper Score Testing

### 7.1 Score Calculation
- [ ] Complete multiple sessions with ratings
- [ ] Verify score calculates correctly:
  - [ ] Formula: helpfulness (30%) + patience (30%) + teaching_skill (40%)
  - [ ] Score range: 0.00 to 100.00
  - [ ] Based on last 30 sessions
- [ ] Check database: `SELECT oathkeeper_score FROM sherpas WHERE id = '<sherpa_id>'`
- [ ] Verify score updates automatically after rating submission

### 7.2 Score Display
- [ ] Verify score displays on Sherpa profile card
- [ ] Verify score displays on session cards
- [ ] Verify score formatting (2 decimal places)

---

## 8. Error Handling Testing

### 8.1 Authentication Errors
- [ ] Try accessing pages without login → Should redirect to login
- [ ] Verify error messages are user-friendly

### 8.2 Permission Errors
- [ ] Try creating session as non-Sherpa → Should show error
- [ ] Try starting session as non-Sherpa → Should show error
- [ ] Try rating non-participant → Should show error

### 8.3 Validation Errors
- [ ] Test all form validations
- [ ] Verify error messages appear
- [ ] Verify forms don't submit with invalid data

---

## 9. UI/UX Testing

### 9.1 Loading States
- [ ] Verify loading indicators appear during actions
- [ ] Verify buttons disable during submission
- [ ] Verify forms show "Submitting..." state

### 9.2 Toast Notifications
- [ ] Verify success toasts appear
- [ ] Verify error toasts appear
- [ ] Verify toast messages are clear and helpful

### 9.3 Navigation
- [ ] Verify router refresh after actions
- [ ] Verify redirects work correctly
- [ ] Verify back navigation works

---

## 10. Database Testing

### 10.1 Data Integrity
- [ ] Verify foreign key constraints work
- [ ] Verify unique constraints prevent duplicates
- [ ] Verify cascade deletes work correctly

### 10.2 RLS Policies
- [ ] Verify users can only see their community's data
- [ ] Verify users can only modify their own data
- [ ] Verify admins have appropriate access

---

## 11. Performance Testing

### 11.1 Query Performance
- [ ] Verify queries complete quickly (< 500ms)
- [ ] Check for N+1 query issues
- [ ] Verify indexes are being used

### 11.2 UI Performance
- [ ] Verify pages load quickly
- [ ] Verify forms are responsive
- [ ] Verify no unnecessary re-renders

---

## Testing Results

### Passed Tests
- [ ] List all tests that passed

### Failed Tests
- [ ] List all tests that failed
- [ ] Document issues found
- [ ] Note any bugs discovered

### Issues Found
- [ ] Document any bugs
- [ ] Document any UX issues
- [ ] Document any performance issues

---

## Post-Testing Actions

- [ ] Fix any critical bugs found
- [ ] Document any known issues
- [ ] Update implementation notes
- [ ] Prepare for Phase 3

---

**Testing Date**: _______________  
**Tester**: _______________  
**Environment**: Local / Production  
**Results**: Pass / Fail / Partial
