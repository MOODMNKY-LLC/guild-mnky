# Discord Bot Commands - Complete Walkthrough

**Date**: January 30, 2026  
**Purpose**: Comprehensive guide to all Discord bot commands and user flows

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Command Overview](#command-overview)
3. [User Flows](#user-flows)
4. [Admin Flows](#admin-flows)
5. [Integration Points](#integration-points)
6. [Error Handling](#error-handling)
7. [Future Enhancements](#future-enhancements)

---

## System Architecture

### Overview

The Discord bot serves as a **bridge between Discord and the web application**, enabling users to interact with the Sherpa Hub system directly from Discord without leaving the platform.

### Key Components

**1. Interaction Handler** (`interactionCreate.ts`)
- Routes all Discord interactions (slash commands, buttons, modals)
- Validates guild membership and community context
- Handles errors gracefully

**2. Command Handlers** (`commands/sherpa/` and `commands/sherpa-admin/`)
- Process slash command interactions
- Validate user permissions and data
- Execute database operations
- Return formatted responses

**3. Database Layer** (`utils/database.ts`)
- Supabase client for all database operations
- Profile lookup by Discord user ID
- Community lookup by Discord guild ID
- Helper functions for common queries

**4. Embed Builder** (`utils/embeds.ts`)
- Creates formatted Discord embeds
- Consistent styling and messaging
- Success, error, and info embeds

### Data Flow

```
Discord User → Slash Command → Interaction Handler → Command Handler → Supabase Database → Response Embed → Discord User
```

### Community Isolation

- Each Discord guild maps to a `community_id` in the database
- All operations are scoped to the user's community
- Multi-community support: Jupiter's Girth and Sherpa Hub operate independently

---

## Command Overview

### User Commands (`/sherpa`)

| Command | Purpose | User Type |
|---------|---------|-----------|
| `/sherpa apply` | Submit application to become a Sherpa | Any user |
| `/sherpa request` | Create a request for Sherpa help | Any user (Seeker) |
| `/sherpa sessions` | List upcoming or past sessions | Any user |
| `/sherpa profile` | View Sherpa profile and statistics | Any user |
| `/sherpa oath` | View and accept Guardian Oath | Sherpas |
| `/sherpa rating` | Rate a completed session | Session participants |
| `/sherpa vote-resign` | Vote to end session without penalty | Session participants |

### Admin Commands (`/sherpa-admin`)

| Command | Purpose | User Type |
|---------|---------|-----------|
| `/sherpa-admin review` | Approve/deny applications | Administrators |
| `/sherpa-admin list` | List applications by status | Administrators |
| `/sherpa-admin stats` | View program statistics | Administrators |

---

## User Flows

### Flow 1: Becoming a Sherpa (`/sherpa apply`)

**Purpose**: Allow users to apply to become a Sherpa mentor

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa apply
   ```

2. **Bot validation**
   - Checks if user has existing application
   - If exists: Shows error with current status
   - If not: Proceeds to modal

3. **Modal form appears**
   - **Experience Level** (required, max 200 chars)
     - Example: "1000+ hours, multiple raid clears"
   - **Specialties** (required, max 200 chars)
     - Example: "Raids, Dungeons, PvP"
   - **Availability** (required, max 200 chars)
     - Example: "Weekends 2-8 PM EST"
   - **Motivation** (required, max 1000 chars, paragraph)
     - Example: "Tell us about your teaching philosophy..."
   - **Discord Username** (required, max 100 chars)
     - Example: "Your Discord username#1234"

4. **User submits modal**
   - Bot validates all fields
   - Checks if profile exists (via Discord user ID)
   - If no profile: Error message (user must log into web app first)

5. **Application creation**
   - Creates record in `sherpa_applications` table
   - Status: `pending`
   - Links to user's profile and community

6. **Confirmation**
   - Success embed with Application ID
   - Message: "An admin will review your application soon"

7. **Channel notification** (if configured)
   - Posts application embed to `SHERPA_APPLICATIONS_CHANNEL_ID`
   - Includes all application details
   - Ready for admin review

**Database Operations**:
- `INSERT INTO sherpa_applications`
- Links: `profile_id`, `community_id`

**Error Cases**:
- Existing application → Shows current status
- No profile → Must log into web app first
- Database error → Generic error message

---

### Flow 2: Requesting Help (`/sherpa request`)

**Purpose**: Allow Seekers to request Sherpa assistance

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa request activity:"Last Wish Raid" difficulty:"Normal" scheduled_time:"2026-02-01T18:00:00Z" notes:"Need help with Riven"
   ```

2. **Bot validation**
   - Validates required `activity` parameter
   - Optional: `difficulty`, `scheduled_time`, `notes`
   - Checks if user profile exists

3. **Request creation**
   - Creates record in `sherpa_requests` table
   - Status: `open`
   - Expires: 7 days from creation
   - Links to seeker profile and community

4. **Confirmation**
   - Success embed with Request ID
   - Message: "Your request has been posted!"

5. **Channel posting** (if configured)
   - Posts request embed to `SHERPA_REQUESTS_CHANNEL_ID`
   - Includes activity, difficulty, scheduled time, notes
   - Adds "Claim Request" button (not yet implemented)

**Database Operations**:
- `INSERT INTO sherpa_requests`
- Links: `seeker_profile_id`, `community_id`

**Error Cases**:
- No profile → Must log into web app first
- Invalid scheduled_time format → Error message
- Database error → Generic error message

**Future Enhancement**:
- "Claim Request" button will allow Sherpas to claim requests
- Creates session automatically when claimed

---

### Flow 3: Viewing Sessions (`/sherpa sessions`)

**Purpose**: List Sherpa sessions with filtering

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa sessions filter:upcoming
   ```

2. **Filter options**
   - `upcoming`: Scheduled or in-progress sessions (default)
   - `past`: Completed, cancelled, abandoned, or resigned sessions
   - `my-sessions`: User's own sessions (not fully implemented)
   - `all`: All sessions

3. **Database query**
   - Queries `sherpa_sessions` table
   - Filters by community and status
   - Orders by `scheduled_start` (ascending)
   - Limits to 10 results

4. **Response**
   - Info embed with session list
   - Each session shows:
     - Activity name/type
     - Scheduled start time (Discord timestamp)
     - Status
     - Session ID

**Database Operations**:
- `SELECT FROM sherpa_sessions`
- Joins with `sherpas` and `profiles` for Sherpa name

**Error Cases**:
- No sessions found → Info message
- Database error → Error message

---

### Flow 4: Viewing Profile (`/sherpa profile`)

**Purpose**: Display Sherpa profile and statistics

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa profile user:@username
   ```
   - If no user specified, defaults to command user

2. **Bot validation**
   - Looks up target user's profile via Discord ID
   - Checks if user is a registered Sherpa

3. **Statistics gathering**
   - Queries `sherpas` table for profile
   - Counts completed sessions
   - Counts total sessions

4. **Profile display**
   - **Oathkeeper Score**: X.XX/100
   - **Sessions Completed**: X/Y
   - **Seekers Helped**: Count
   - **Specialties**: List
   - **Status**: Active/Inactive

**Database Operations**:
- `SELECT FROM sherpas` (with profile join)
- `SELECT FROM sherpa_sessions` (for statistics)

**Error Cases**:
- Profile not found → Error message
- Not a Sherpa → Error message

---

### Flow 5: Guardian Oath (`/sherpa oath`)

**Purpose**: Display Guardian Oath principles and allow acceptance

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa oath
   ```

2. **Oath display**
   - Shows Guardian Oath embed with four principles:
     - Nurture Kindness
     - Share The Light
     - Honor Others
     - Stand Together

3. **Acceptance check**
   - If user is a Sherpa:
     - If already accepted: Shows footer "You have already accepted the Guardian Oath"
     - If not accepted: Shows "Accept Oath" button

4. **Button click** (if applicable)
   - Updates `sherpas` table:
     - `oath_accepted`: true
     - `oath_accepted_at`: current timestamp

5. **Role assignment** (if configured)
   - Assigns `OATHKEEPER_ROLE_ID` Discord role
   - Enables Oathkeeper badge/permissions

6. **Confirmation**
   - Success embed: "You have accepted the Guardian Oath! You are now an Oathkeeper."

**Database Operations**:
- `UPDATE sherpas SET oath_accepted = true`

**Error Cases**:
- Update fails → Error message
- Role assignment fails → Logged but doesn't block success

---

### Flow 6: Rating Sessions (`/sherpa rating`)

**Purpose**: Allow participants to rate completed sessions

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa rating session_id:"uuid-here"
   ```

2. **Bot validation**
   - Verifies user was a participant in the session
   - Checks if user already rated this session
   - Validates session exists

3. **Modal form appears**
   - **Rating** (required, 1-5)
     - Placeholder: "Enter a number from 1 to 5 (5 = Excellent)"
   - **Comments** (optional, max 1000 chars)
     - Placeholder: "What did you think of the session?"

4. **User submits modal**
   - Validates rating is 1-5
   - Gets session and Sherpa ID
   - Creates rating record

5. **Rating creation**
   - Inserts into `sherpa_ratings` table
   - Links: `session_id`, `rater_profile_id`, `rated_sherpa_id`

6. **Oathkeeper score update**
   - Calls `update_sherpa_oathkeeper_score` RPC function
   - Recalculates Sherpa's score based on recent ratings

7. **Confirmation**
   - Success embed: "Thank you for your feedback! Rating: X/5"

**Database Operations**:
- `INSERT INTO sherpa_ratings`
- `SELECT FROM sherpa_sessions` (to get Sherpa ID)
- `RPC update_sherpa_oathkeeper_score`

**Error Cases**:
- Not a participant → Error message
- Already rated → Error message
- Invalid rating → Error message
- Session not found → Error message

**Note**: Current implementation uses simplified rating (1-5). Full implementation should include:
- Helpfulness rating
- Patience rating
- Teaching skill rating (Sherpas only)
- Overall rating
- Feedback text

---

### Flow 7: Vote to Resign (`/sherpa vote-resign`)

**Purpose**: Allow group consensus to end session without penalties

**Step-by-Step Flow**:

1. **User executes command**
   ```
   /sherpa vote-resign session_id:"uuid-here"
   ```

2. **Bot validation**
   - Verifies user is a participant
   - Checks if user already voted
   - Validates session exists

3. **Vote creation**
   - Inserts into `sherpa_session_votes` table
   - Vote type: `resign`
   - Links: `session_id`, `voter_profile_id`

4. **Majority check**
   - Calls `check_resignation_majority` RPC function
   - Calculates if majority (50%+1) has voted

5. **If majority reached**:
   - Updates session status to `resigned`
   - Sets `resigned_at` timestamp
   - **No penalties applied** (key feature)
   - Success message: "Session resigned by group consensus. No penalties applied."

6. **If majority not reached**:
   - Shows vote count
   - Displays required votes for majority
   - Info message: "Your vote has been recorded. Votes: X/Y participants"

**Database Operations**:
- `INSERT INTO sherpa_session_votes`
- `RPC check_resignation_majority`
- `UPDATE sherpa_sessions` (if majority reached)
- `RPC get_session_participant_count`

**Error Cases**:
- Not a participant → Error message
- Already voted → Error message
- Database error → Error message

**Key Feature**: This allows groups to end sessions early without triggering Oathbreaker penalties, promoting group consensus over individual abandonment.

---

## Admin Flows

### Flow 8: Reviewing Applications (`/sherpa-admin review`)

**Purpose**: Allow admins to approve or deny Sherpa applications

**Step-by-Step Flow**:

1. **Admin executes command**
   ```
   /sherpa-admin review application_id:"uuid-here" action:approve reason:"Great experience and teaching philosophy"
   ```

2. **Permission check**
   - Verifies user has Administrator permissions
   - If not: Permission denied error

3. **Application lookup**
   - Queries `sherpa_applications` table
   - Validates application exists and belongs to community
   - Includes profile data for Discord user ID

4. **Status update**
   - Updates application:
     - `status`: `approved` or `denied`
     - `reviewed_by`: Admin's profile ID
     - `reviewed_at`: Current timestamp
     - `review_reason`: Provided reason

5. **If approved**:
   - Creates `sherpas` record:
     - Links to application
     - Copies specialties and availability
     - Status: `active`
     - `is_active`: true
   - Assigns `SHERPA_ROLE_ID` Discord role (if configured)

6. **DM notification**
   - Sends DM to applicant:
     - Approval: Success embed with congratulations
     - Denial: Error embed with reason
   - Includes next steps for approved applicants

7. **Confirmation**
   - Success embed: "Application approved/denied successfully. Applicant has been notified."

**Database Operations**:
- `UPDATE sherpa_applications`
- `INSERT INTO sherpas` (if approved)
- `SELECT FROM profiles` (for Discord user ID)

**Error Cases**:
- Permission denied → Error message
- Application not found → Error message
- Profile not found → Error message
- Role assignment fails → Logged but doesn't block success
- DM send fails → Logged but doesn't block success

---

### Flow 9: Listing Applications (`/sherpa-admin list`)

**Purpose**: View applications by status

**Step-by-Step Flow**:

1. **Admin executes command**
   ```
   /sherpa-admin list status:pending
   ```

2. **Permission check**
   - Verifies Administrator permissions

3. **Query applications**
   - Filters by status (default: `pending`)
   - Options: `pending`, `approved`, `denied`, `all`
   - Orders by `created_at` (descending)
   - Limits to 10 results

4. **Response**
   - Info embed with application list
   - Each application shows:
     - Username
     - Status
     - Application ID
     - Created timestamp (relative time)

**Database Operations**:
- `SELECT FROM sherpa_applications`
- Joins with `profiles` for username

**Error Cases**:
- Permission denied → Error message
- No applications found → Info message
- Database error → Error message

---

### Flow 10: Viewing Statistics (`/sherpa-admin stats`)

**Purpose**: Display program-wide statistics

**Step-by-Step Flow**:

1. **Admin executes command**
   ```
   /sherpa-admin stats
   ```

2. **Permission check**
   - Verifies Administrator permissions

3. **Statistics gathering** (parallel queries)
   - Total Sherpas count
   - Active Sherpas count
   - Pending Applications count
   - Total Requests count
   - Completed Sessions count
   - Average Rating (from all ratings)
   - Average Oathkeeper Score (from all Sherpas)

4. **Response**
   - Info embed with statistics:
     - Total Sherpas: X
     - Active Sherpas: X
     - Pending Applications: X
     - Total Requests: X
     - Completed Sessions: X
     - Average Rating: X.XX/5
     - Average Oathkeeper Score: X.XX/100

**Database Operations**:
- Multiple parallel `SELECT` queries:
  - `sherpas` (count, active count, score average)
  - `sherpa_applications` (pending count)
  - `sherpa_requests` (total count)
  - `sherpa_sessions` (completed count)
  - `sherpa_ratings` (average rating)

**Error Cases**:
- Permission denied → Error message
- Database error → Error message

---

## Integration Points

### 1. Profile Lookup

**Function**: `getProfileByDiscordId(discordUserId: string)`

**Purpose**: Maps Discord user ID to Supabase profile ID

**Flow**:
```
Discord User ID → Query profiles table → Return profile UUID
```

**Error Handling**: Returns `null` if profile not found

**Requirement**: User must have logged into web app at least once to create profile

---

### 2. Community Context

**Function**: `getCommunityByGuildId(guildId: string)`

**Purpose**: Maps Discord guild ID to community UUID

**Flow**:
```
Discord Guild ID → Query communities table → Return community UUID
```

**Error Handling**: Returns `null` if guild not configured as community

**Multi-Community Support**:
- Jupiter's Girth: `573823015511392268`
- Sherpa Hub: `1291190711919837234`

---

### 3. Discord Role Assignment

**Environment Variables**:
- `OATHKEEPER_ROLE_ID`: Role assigned when accepting Guardian Oath
- `SHERPA_ROLE_ID`: Role assigned when application approved

**Flow**:
```
Database update → Discord API → Role assignment → Log result
```

**Error Handling**: Errors are logged but don't block database operations

---

### 4. Channel Posting

**Environment Variables**:
- `SHERPA_APPLICATIONS_CHANNEL_ID`: Channel for application notifications
- `SHERPA_REQUESTS_CHANNEL_ID`: Channel for request postings

**Flow**:
```
Database operation → Create embed → Post to channel → Add buttons (if applicable)
```

**Error Handling**: Errors are logged but don't block database operations

---

### 5. Direct Messages

**Purpose**: Notify users of application status changes

**Flow**:
```
Status change → Lookup Discord user ID → Create embed → Send DM → Log result
```

**Error Handling**: Errors are logged but don't block status updates

---

## Error Handling

### Common Error Patterns

**1. Profile Not Found**
- **Cause**: User hasn't logged into web app
- **Message**: "Your profile could not be found. Please ensure you are logged into the web app first."
- **Resolution**: User must authenticate via web app

**2. Permission Denied**
- **Cause**: User lacks required permissions
- **Message**: "This command requires Administrator permissions."
- **Resolution**: Admin must grant permissions

**3. Already Exists**
- **Cause**: Duplicate operation (application, vote, rating)
- **Message**: "You already have [item] with status: [status]"
- **Resolution**: User should check existing records

**4. Not a Participant**
- **Cause**: User trying to interact with session they're not in
- **Message**: "You are not a participant in this session."
- **Resolution**: User must be part of session

**5. Database Errors**
- **Cause**: Supabase connection or query issues
- **Message**: "Failed to [operation]. Please try again later."
- **Resolution**: Check logs, retry operation

### Error Response Format

All errors use consistent embed format:
- **Title**: Error type
- **Description**: User-friendly message
- **Ephemeral**: `true` (only visible to command user)

---

## Future Enhancements

### Planned Features

**1. Request Claiming**
- Implement "Claim Request" button handler
- Allow Sherpas to claim open requests
- Auto-create session when claimed

**2. Session Management**
- `/sherpa session start` - Start scheduled session
- `/sherpa session complete` - Complete active session
- `/sherpa session cancel` - Cancel scheduled session

**3. Enhanced Rating**
- Multi-dimensional ratings (helpfulness, patience, teaching skill)
- Rate both Sherpa and Seekers
- Feedback text field

**4. Session Creation**
- `/sherpa session create` - Create session from Discord
- Link to request or create standalone
- Set participants and schedule

**5. Notification System**
- DM notifications for:
  - Application status changes
  - Request claims
  - Session reminders
  - Rating requests

**6. Advanced Filtering**
- Filter sessions by activity type
- Filter requests by difficulty
- Search Sherpas by specialty

**7. Leaderboards**
- `/sherpa leaderboard` - Top Oathkeeper scores
- `/sherpa leaderboard sessions` - Most sessions completed
- `/sherpa leaderboard seekers` - Most seekers helped

---

## Command Reference Quick Guide

### User Commands

```
/sherpa apply
→ Opens application modal form

/sherpa request activity:"Activity Name" [difficulty:"Normal"] [scheduled_time:"ISO8601"] [notes:"Details"]
→ Creates Sherpa request

/sherpa sessions [filter:"upcoming"|"past"|"my-sessions"|"all"]
→ Lists sessions (default: upcoming)

/sherpa profile [user:@username]
→ Shows Sherpa profile (default: your profile)

/sherpa oath
→ Displays Guardian Oath (with accept button if applicable)

/sherpa rating session_id:"uuid"
→ Opens rating modal for completed session

/sherpa vote-resign session_id:"uuid"
→ Votes to end session without penalty
```

### Admin Commands

```
/sherpa-admin review application_id:"uuid" action:"approve"|"deny" [reason:"Reason text"]
→ Reviews and approves/denies application

/sherpa-admin list [status:"pending"|"approved"|"denied"|"all"]
→ Lists applications (default: pending)

/sherpa-admin stats
→ Shows program statistics
```

---

## Technical Details

### Interaction Types

**1. Slash Commands**
- User types `/command subcommand [options]`
- Bot responds with embed or modal

**2. Buttons**
- Clickable buttons on embeds
- Custom ID format: `sherpa_[action]_[id]`
- Examples: `sherpa_oath_accept_[sherpa_id]`, `sherpa_request_claim_[request_id]`

**3. Modals**
- Multi-field forms
- Custom ID format: `sherpa_[type]_modal_[id]`
- Examples: `sherpa_apply_modal`, `sherpa_rating_modal_[session_id]`

### Database Tables Used

- `profiles` - User profiles
- `communities` - Community configuration
- `sherpa_applications` - Application records
- `sherpas` - Sherpa profiles
- `sherpa_requests` - Seeker requests
- `sherpa_sessions` - Session records
- `sherpa_session_participants` - Participant tracking
- `sherpa_ratings` - Rating records
- `sherpa_session_votes` - Vote records
- `oathkeeper_ratings` - Detailed ratings (web app)

### RPC Functions Used

- `get_community_by_guild_id(guild_id)` - Community lookup
- `update_sherpa_oathkeeper_score(sherpa_uuid)` - Score calculation
- `check_resignation_majority(session_uuid)` - Majority check
- `get_session_participant_count(session_uuid)` - Participant count

---

## Summary

The Discord bot provides a **complete Discord-native interface** for the Sherpa Hub system, enabling:

✅ **Application submission** without leaving Discord  
✅ **Request creation** with automatic channel posting  
✅ **Session viewing** with flexible filtering  
✅ **Profile viewing** with statistics  
✅ **Oath acceptance** with role assignment  
✅ **Session rating** with score updates  
✅ **Group consensus** via vote to resign  
✅ **Admin management** of applications and statistics  

All operations are **community-scoped**, **error-handled**, and **user-friendly**, providing a seamless experience that bridges Discord and the web application.

---

**Last Updated**: January 30, 2026  
**Bot Version**: Phase 2 Complete  
**Status**: ✅ Core Commands Implemented, Request Claiming Pending
