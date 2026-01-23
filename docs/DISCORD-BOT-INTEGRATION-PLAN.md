# Discord Bot Integration Plan - Comprehensive Implementation Guide

**Date**: January 23, 2026  
**Scope**: Jupiter's Girth + Sherpa Hub Multi-Community Discord Bot  
**Status**: Planning Phase - Ready for Implementation  
**Generated Using**: Deep Thinking Protocol + Comprehensive Research

---

## Executive Summary

This document provides a comprehensive, detailed plan for integrating Discord bot functionality across Jupiter's Girth (81 members, established) and Sherpa Hub (9 members, infrastructure-ready) communities. The plan includes recommended bot commands, complete user flows, required permissions, multi-guild architecture patterns, and phased implementation strategy.

**Key Objectives**:
1. Enable multi-guild bot support with guild-specific routing
2. Implement Sherpa-specific slash commands for mentorship workflows
3. Integrate bot commands with existing Supabase database and Next.js application
4. Support cross-community features while maintaining data isolation
5. Provide seamless user experience across both Discord servers

**Architecture**: Single bot instance handling multiple guilds with guild-scoped command routing and event handling.

---

## 1. Bot Architecture & Multi-Guild Support

### 1.1 Architecture Overview

**Single Bot, Multiple Guilds**:
- One Discord bot application serves both Jupiter's Girth and Sherpa Hub
- Bot listens to events from both guilds simultaneously
- Commands and events are routed to the correct community based on `interaction.guildId`
- Database queries use `getCommunityByGuildId()` to determine community context

**Guild-Scoped Data Isolation**:
- All database operations include `community_id` filtering
- User data is scoped to their primary community (`discord_guild_id` → `community_id`)
- Cross-community features use `connected_discord_guild_ids` array for visibility
- RLS policies enforce community-scoped access

### 1.2 Command Registration Strategy

**Guild-Specific Commands (Recommended)**:
- **Sherpa Hub**: Guild-specific commands for faster iteration and testing
- **Benefits**: Instant updates (no 1-hour global propagation delay), guild-specific customization
- **Use Case**: `/sherpa` command group (Sherpa Hub only)

**Global Commands (Optional)**:
- **Jupiter's Girth**: Consider global commands if features are stable and shared
- **Benefits**: Consistent experience across all servers, single registration
- **Use Case**: Basic utility commands, if needed

**Hybrid Approach**:
- Guild-specific for Sherpa Hub (development/testing)
- Global for stable features shared across communities
- Migration path: Start guild-specific, promote to global when stable

### 1.3 Event Handling Architecture

**Guild Event Routing**:
```typescript
// Pseudo-code structure
client.on('guildMemberAdd', async (member) => {
  const guildId = member.guild.id;
  const communityId = await getCommunityByGuildId(guildId);
  
  if (communityId) {
    await verifyDiscordMembership(member.user.id, guildId);
    await handleGuildMemberJoin(member, communityId);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guildId) return; // DM commands not supported
  
  const communityId = await getCommunityByGuildId(interaction.guildId);
  if (!communityId) return; // Unknown guild
  
  // Route to appropriate command handler based on community
  await routeCommand(interaction, communityId);
});
```

**Event Types to Handle**:
- `guildMemberAdd` - User joins server → Call `verifyDiscordMembership()`
- `guildMemberRemove` - User leaves server → Optional: Mark as inactive
- `interactionCreate` - Slash command, button, modal interactions
- `messageCreate` - Optional: Legacy text commands (if MESSAGE CONTENT INTENT enabled)

---

## 2. Required Permissions & Intents

### 2.1 Gateway Intents (Privileged)

**SERVER MEMBERS INTENT** - **REQUIRED** ✅
- **Purpose**: Access to guild member events, member lists, role assignment
- **Required For**:
  - Member join/leave events
  - Role assignment (Sherpa role, Oathkeeper role)
  - Member verification (`verifyDiscordMembership()`)
  - Application review (checking member status)
- **How to Enable**: Discord Developer Portal → Bot → Privileged Gateway Intents → Enable "Server Members Intent"
- **Verification**: Required if bot is in 75+ servers (not applicable for 2 servers)

**MESSAGE CONTENT INTENT** - **OPTIONAL** ⚠️
- **Purpose**: Read message content, attachments, embeds
- **Required For**: Legacy text commands (prefix-based commands)
- **Not Required For**: Slash commands (use application commands instead)
- **Recommendation**: **DO NOT ENABLE** unless specifically needed for legacy support
- **Alternative**: Use slash commands exclusively (better UX, no intent needed)

**PRESENCE INTENT** - **OPTIONAL** ⚠️
- **Purpose**: Access to user presence data (online status, activities)
- **Required For**: Presence-based features (e.g., "show online Sherpas")
- **Recommendation**: **DO NOT ENABLE** unless presence features are planned
- **Alternative**: Use member list without presence data

### 2.2 Bot Permissions (OAuth2 Scopes)

**Required Scopes**:
- `bot` - Bot user account
- `applications.commands` - Slash command registration

**Required Bot Permissions** (Bitwise Permission Integer):
```
Send Messages (0x0000000800)
Manage Messages (0x00002000)
Read Message History (0x00010000)
Add Reactions (0x00000040)
Embed Links (0x00004000)
Attach Files (0x00008000)
Manage Roles (0x10000000)
Manage Channels (0x00000010) - Optional, for session channel creation
```

**Permission Integer Calculation**:
```
0x0000000800 + 0x00002000 + 0x00010000 + 0x00000040 + 0x00004000 + 0x00008000 + 0x10000000
= 268445696 (decimal)
```

**Permission Breakdown**:
- **Send Messages**: Post command responses, session announcements
- **Manage Messages**: Edit/delete bot messages, clean up old posts
- **Read Message History**: Context for commands, message-based features
- **Add Reactions**: Confirmation reactions, voting mechanisms
- **Embed Links**: Rich embeds for session cards, profiles
- **Attach Files**: Resource attachments, session materials
- **Manage Roles**: Assign Sherpa role, Oathkeeper role, community roles
- **Manage Channels** (Optional): Create temporary session channels

### 2.3 Role-Based Command Permissions

**Default Member Permissions** (Per Command):
- **Public Commands**: `defaultMemberPermissions: null` (everyone can use)
- **Sherpa-Only Commands**: `defaultMemberPermissions: PermissionFlagsBits.ManageRoles` (or custom role check)
- **Admin Commands**: `defaultMemberPermissions: PermissionFlagsBits.Administrator`

**Custom Role Checks** (In Command Handler):
```typescript
// Check if user has "Sherpa" role
const member = interaction.member as GuildMember;
const sherpaRole = member.roles.cache.find(role => role.name === 'Sherpa');
if (!sherpaRole) {
  return interaction.reply({ 
    content: '❌ This command requires the Sherpa role.', 
    ephemeral: true 
  });
}
```

---

## 3. Command Specifications

### 3.1 `/sherpa` Command Group

**Group Structure**:
```
/sherpa [subcommand] [options]
```

**Subcommands**:

#### 3.1.1 `/sherpa apply`
**Purpose**: Start Sherpa application process  
**Guild**: Sherpa Hub only  
**Permissions**: Public (all members)  
**User Flow**:
1. User executes `/sherpa apply`
2. Bot responds with modal form:
   - **Field 1**: "Experience Level" (Short text, required)
     - Placeholder: "e.g., 1000+ hours, multiple raid clears"
   - **Field 2**: "Specialties" (Short text, required)
     - Placeholder: "e.g., Raids, Dungeons, PvP"
   - **Field 3**: "Availability" (Short text, required)
     - Placeholder: "e.g., Weekends 2-8 PM EST"
   - **Field 4**: "Why do you want to be a Sherpa?" (Paragraph, required)
     - Placeholder: "Tell us about your teaching philosophy..."
   - **Field 5**: "Discord Username" (Short text, required)
     - Placeholder: "Your Discord username#1234"
3. User submits modal
4. Bot creates application record in `sherpa_applications` table
5. Bot sends confirmation (ephemeral): "✅ Application submitted! Your application ID: `[id]`. An admin will review it soon."
6. Bot posts to `#sherpa-applications` channel (if exists):
   - Embed with application details
   - Buttons: "Approve" | "Deny"
   - Admin-only interaction

**Database Action**:
```sql
INSERT INTO sherpa_applications (
  user_id, 
  community_id, 
  experience_level, 
  specialties, 
  availability, 
  motivation, 
  discord_username, 
  status
) VALUES (...);
```

**Response Type**: Modal (initial), Ephemeral (confirmation), Channel Post (admin notification)

---

#### 3.1.2 `/sherpa request [activity] [difficulty] [scheduled_time]`
**Purpose**: Create a Sherpa request (Seeker workflow)  
**Guild**: Sherpa Hub only  
**Permissions**: Public  
**Options**:
- `activity` (String, required): Activity type (e.g., "Last Wish Raid", "Dungeon: Prophecy")
- `difficulty` (String, optional): Difficulty level (choices: "Normal", "Master", "Grandmaster")
- `scheduled_time` (String, optional): ISO 8601 timestamp for scheduled sessions
- `notes` (String, optional): Additional details (max 500 chars)

**User Flow**:
1. User executes `/sherpa request activity:"Last Wish Raid" difficulty:"Normal"`
2. Bot responds with confirmation embed:
   - Activity, difficulty, requester info
   - Button: "Add Details" (opens modal for notes)
   - Button: "Submit Request"
3. User clicks "Submit Request" (or modal submission if details added)
4. Bot creates request in `sherpa_requests` table
5. Bot posts to `#sherpa-requests` channel:
   - Rich embed with request details
   - Buttons: "Claim Request" (Sherpas only) | "View Details"
   - Auto-expires after 7 days if unclaimed
6. Bot sends confirmation (ephemeral): "✅ Request posted! Sherpas will be notified."

**Database Action**:
```sql
INSERT INTO sherpa_requests (
  requester_id,
  community_id,
  activity_type,
  difficulty,
  scheduled_time,
  notes,
  status
) VALUES (...);
```

**Response Type**: Ephemeral (confirmation), Channel Post (public request)

---

#### 3.1.3 `/sherpa sessions [filter]`
**Purpose**: List upcoming or past Sherpa sessions  
**Guild**: Sherpa Hub only  
**Permissions**: Public  
**Options**:
- `filter` (String, optional): Filter type (choices: "upcoming", "past", "my-sessions", "all")

**User Flow**:
1. User executes `/sherpa sessions filter:"upcoming"`
2. Bot queries `sherpa_sessions` table:
   - Filter by `status` (upcoming: "scheduled", "in-progress")
   - Filter by `community_id`
   - Limit to 10 results
3. Bot responds with paginated embed:
   - List of sessions with details (activity, Sherpa, time, participants)
   - Buttons: "Previous Page" | "Next Page" | "Join Session" (if applicable)
   - Footer: "Page 1 of 3"
4. User can click "Join Session" to join (if slots available)

**Database Query**:
```sql
SELECT * FROM sherpa_sessions
WHERE community_id = $1
  AND status IN ('scheduled', 'in-progress')
ORDER BY scheduled_time ASC
LIMIT 10;
```

**Response Type**: Ephemeral (paginated list)

---

#### 3.1.4 `/sherpa profile [user]`
**Purpose**: Display Sherpa profile and statistics  
**Guild**: Sherpa Hub only  
**Permissions**: Public  
**Options**:
- `user` (User, optional): Target user (defaults to command executor)

**User Flow**:
1. User executes `/sherpa profile` or `/sherpa profile user:@SherpaName`
2. Bot queries `sherpas` and `sherpa_ratings` tables:
   - Sherpa status, specialties, Oathkeeper Score
   - Total sessions, completion rate, average rating
3. Bot responds with rich embed:
   - Profile header (avatar, name, status badge)
   - Statistics (sessions completed, Oathkeeper Score, specialties)
   - Recent ratings (last 5)
   - Button: "View Full Profile" (links to web app)
4. If user is not a Sherpa: "❌ This user is not a registered Sherpa."

**Database Query**:
```sql
SELECT 
  s.*,
  COUNT(DISTINCT ss.id) as total_sessions,
  AVG(sr.rating) as avg_rating,
  COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.id END) as completed_sessions
FROM sherpas s
LEFT JOIN sherpa_sessions ss ON s.user_id = ss.sherpa_id
LEFT JOIN sherpa_ratings sr ON ss.id = sr.session_id
WHERE s.user_id = $1 AND s.community_id = $2
GROUP BY s.id;
```

**Response Type**: Ephemeral (profile embed)

---

#### 3.1.5 `/sherpa oath`
**Purpose**: Display Guardian Oath principles  
**Guild**: Sherpa Hub only  
**Permissions**: Public  
**User Flow**:
1. User executes `/sherpa oath`
2. Bot responds with rich embed:
   - Title: "Guardian Oath"
   - Four principles:
     1. **Nurture Kindness**: Treat all players with respect and patience
     2. **Share The Light**: Share knowledge and help others grow
     3. **Honor Others**: Recognize and appreciate contributions
     4. **Stand Together**: Commit to completing sessions or voting to resign
   - Footer: "By accepting this oath, you commit to these principles."
   - Button: "Accept Oath" (for new Sherpas)
3. If user clicks "Accept Oath":
   - Bot records acceptance in database
   - Bot assigns "Oathkeeper" role (if exists)
   - Bot sends confirmation: "✅ You have accepted the Guardian Oath!"

**Database Action** (if oath accepted):
```sql
UPDATE sherpas 
SET oath_accepted_at = NOW(), oath_accepted = true
WHERE user_id = $1 AND community_id = $2;
```

**Response Type**: Ephemeral (oath display), Role Assignment (if accepted)

---

#### 3.1.6 `/sherpa rating [session_id]`
**Purpose**: Rate a completed Sherpa session  
**Guild**: Sherpa Hub only  
**Permissions**: Public (participants only)  
**Options**:
- `session_id` (String, required): Session ID from completed session

**User Flow**:
1. User executes `/sherpa rating session_id:"abc123"`
2. Bot verifies user was a participant in the session
3. Bot responds with modal form:
   - **Field 1**: "Rating" (Short text, required)
     - Placeholder: "1-5 (5 = Excellent)"
   - **Field 2**: "Comments" (Paragraph, optional)
     - Placeholder: "What did you think of the session?"
4. User submits modal
5. Bot creates rating record in `sherpa_ratings` table
6. Bot updates Sherpa's Oathkeeper Score (average of all ratings)
7. Bot sends confirmation: "✅ Rating submitted! Thank you for your feedback."
8. Bot notifies Sherpa (DM or channel): "You received a new rating: [rating]/5"

**Database Action**:
```sql
INSERT INTO sherpa_ratings (
  session_id,
  rater_id,
  sherpa_id,
  rating,
  comments
) VALUES (...);

-- Update Oathkeeper Score
UPDATE sherpas
SET oathkeeper_score = (
  SELECT AVG(rating) FROM sherpa_ratings WHERE sherpa_id = $1
)
WHERE user_id = $1;
```

**Response Type**: Modal (rating form), Ephemeral (confirmation)

---

#### 3.1.7 `/sherpa vote-resign [session_id]`
**Purpose**: Vote to end a session without penalty (Oathbreaker protection)  
**Guild**: Sherpa Hub only  
**Permissions**: Public (session participants only)  
**Options**:
- `session_id` (String, required): Active session ID

**User Flow**:
1. User executes `/sherpa vote-resign session_id:"abc123"`
2. Bot verifies session is active and user is a participant
3. Bot checks if vote already exists (prevent duplicate votes)
4. Bot creates vote record in `sherpa_session_votes` table
5. Bot counts votes: If majority (50%+1) vote to resign:
   - Update session status to "resigned" (no penalty)
   - Notify all participants
   - Clear cooldown penalties
6. Bot responds with embed:
   - Current vote count: "3/5 participants voted to resign"
   - Button: "Vote to Resign" (if not voted)
   - Status: "Vote in progress" or "Session resigned"
7. If majority reached: Bot posts to channel: "✅ Session resigned by group consensus. No penalties applied."

**Database Action**:
```sql
INSERT INTO sherpa_session_votes (
  session_id,
  voter_id,
  vote_type
) VALUES ($1, $2, 'resign');

-- Check if majority reached
SELECT COUNT(*) FROM sherpa_session_votes
WHERE session_id = $1 AND vote_type = 'resign';

-- If majority: Update session
UPDATE sherpa_sessions
SET status = 'resigned', resigned_at = NOW()
WHERE id = $1;
```

**Response Type**: Ephemeral (vote status), Channel Post (if resigned)

---

### 3.2 `/sherpa-admin` Command Group (Admin Only)

**Group Structure**:
```
/sherpa-admin [subcommand] [options]
```

**Permissions**: Administrator role or custom "Sherpa Admin" role

#### 3.2.1 `/sherpa-admin review [application_id] [action] [reason]`
**Purpose**: Review and approve/deny Sherpa applications  
**Guild**: Sherpa Hub only  
**Permissions**: Administrator  
**Options**:
- `application_id` (String, required): Application ID from `/sherpa apply`
- `action` (String, required): "approve" or "deny"
- `reason` (String, optional): Reason for approval/denial

**User Flow**:
1. Admin executes `/sherpa-admin review application_id:"abc123" action:"approve" reason:"Excellent experience"`
2. Bot updates `sherpa_applications` table:
   - Set `status` to "approved" or "denied"
   - Set `reviewed_by` to admin user ID
   - Set `reviewed_at` to current timestamp
   - Set `review_reason` to reason
3. If approved:
   - Create record in `sherpas` table
   - Assign "Sherpa" role to user
   - Send DM to applicant: "✅ Your Sherpa application has been approved!"
4. If denied:
   - Send DM to applicant: "❌ Your application was denied. Reason: [reason]"
5. Bot responds: "✅ Application [action]d. User notified."

**Database Action**:
```sql
UPDATE sherpa_applications
SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_reason = $3
WHERE id = $4;

-- If approved: Create Sherpa record
INSERT INTO sherpas (user_id, community_id, specialties, ...)
SELECT user_id, community_id, specialties, ...
FROM sherpa_applications
WHERE id = $4;
```

**Response Type**: Ephemeral (confirmation), DM (to applicant)

---

#### 3.2.2 `/sherpa-admin list [status]`
**Purpose**: List applications, requests, or sessions by status  
**Guild**: Sherpa Hub only  
**Permissions**: Administrator  
**Options**:
- `status` (String, optional): Filter by status (choices: "pending", "approved", "denied", "all")

**User Flow**:
1. Admin executes `/sherpa-admin list status:"pending"`
2. Bot queries `sherpa_applications` table filtered by status
3. Bot responds with paginated embed:
   - List of applications with details
   - Buttons: "Approve" | "Deny" (per application)
   - Footer: "Page 1 of 2"
4. Admin can click buttons to approve/deny directly

**Response Type**: Ephemeral (paginated list)

---

#### 3.2.3 `/sherpa-admin stats`
**Purpose**: Display Sherpa program statistics  
**Guild**: Sherpa Hub only  
**Permissions**: Administrator  
**User Flow**:
1. Admin executes `/sherpa-admin stats`
2. Bot queries aggregated statistics:
   - Total Sherpas, Active Sherpas, Pending Applications
   - Total Sessions, Completion Rate, Average Rating
   - Oathkeeper Score distribution
3. Bot responds with rich embed:
   - Statistics dashboard
   - Charts/graphs (if supported)
   - Export button (links to web app analytics)

**Database Query**:
```sql
SELECT 
  COUNT(DISTINCT s.id) as total_sherpas,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_sherpas,
  COUNT(DISTINCT sa.id) FILTER (WHERE sa.status = 'pending') as pending_applications,
  COUNT(DISTINCT ss.id) as total_sessions,
  AVG(sr.rating) as avg_rating,
  AVG(s.oathkeeper_score) as avg_oathkeeper_score
FROM sherpas s
LEFT JOIN sherpa_applications sa ON s.user_id = sa.user_id
LEFT JOIN sherpa_sessions ss ON s.user_id = ss.sherpa_id
LEFT JOIN sherpa_ratings sr ON ss.id = sr.session_id
WHERE s.community_id = $1;
```

**Response Type**: Ephemeral (statistics embed)

---

## 4. User Flows (Step-by-Step)

### 4.1 Sherpa Application Flow

**Actor**: Prospective Sherpa  
**Goal**: Become a registered Sherpa

1. **Initiate Application**
   - User executes `/sherpa apply`
   - Bot responds with modal form

2. **Complete Application**
   - User fills out 5 fields:
     - Experience Level
     - Specialties
     - Availability
     - Motivation
     - Discord Username
   - User submits modal

3. **Application Processing**
   - Bot creates `sherpa_applications` record with status "pending"
   - Bot sends confirmation (ephemeral): "Application submitted! ID: [id]"
   - Bot posts to `#sherpa-applications` channel with embed and action buttons

4. **Admin Review**
   - Admin reviews application in channel or via `/sherpa-admin review`
   - Admin clicks "Approve" or executes `/sherpa-admin review application_id:"abc" action:"approve"`

5. **Approval Processing**
   - Bot updates application status to "approved"
   - Bot creates `sherpas` record
   - Bot assigns "Sherpa" role to user
   - Bot sends DM to applicant: "✅ Application approved! You are now a Sherpa."

6. **Completion**
   - User receives "Sherpa" role
   - User can now claim requests and create sessions

**Total Steps**: 6  
**Estimated Time**: 5-10 minutes (application) + 1-3 days (review)

---

### 4.2 Seeker Request Flow

**Actor**: Seeker (player needing help)  
**Goal**: Get help from a Sherpa

1. **Create Request**
   - User executes `/sherpa request activity:"Last Wish Raid" difficulty:"Normal"`
   - Bot responds with confirmation embed and "Submit Request" button

2. **Submit Request**
   - User clicks "Submit Request"
   - Bot creates `sherpa_requests` record with status "open"
   - Bot posts to `#sherpa-requests` channel with embed and "Claim Request" button

3. **Sherpa Claims Request**
   - Sherpa clicks "Claim Request" button
   - Bot verifies user has "Sherpa" role
   - Bot updates request status to "claimed" and sets `claimed_by` to Sherpa ID
   - Bot sends DM to Seeker: "✅ Your request has been claimed by [Sherpa Name]!"
   - Bot sends DM to Sherpa: "✅ You claimed a request. Contact the Seeker to schedule."

4. **Session Creation**
   - Sherpa and Seeker coordinate via DM or channel
   - Sherpa executes `/sherpa session create` (or web app)
   - Bot creates `sherpa_sessions` record

5. **Session Execution**
   - Session occurs at scheduled time
   - Participants join voice channel
   - Sherpa guides Seeker through activity

6. **Session Completion**
   - After completion, Bot prompts for rating: `/sherpa rating session_id:"abc"`
   - Seeker rates session (1-5 stars + comments)
   - Bot updates Sherpa's Oathkeeper Score
   - Bot marks session as "completed"

**Total Steps**: 6  
**Estimated Time**: 2-5 minutes (request) + Variable (session duration)

---

### 4.3 Oath Acceptance Flow

**Actor**: New Sherpa  
**Goal**: Accept Guardian Oath

1. **View Oath**
   - User executes `/sherpa oath`
   - Bot displays Guardian Oath embed with 4 principles

2. **Accept Oath**
   - User clicks "Accept Oath" button
   - Bot verifies user is a registered Sherpa

3. **Record Acceptance**
   - Bot updates `sherpas` table: `oath_accepted = true`, `oath_accepted_at = NOW()`
   - Bot assigns "Oathkeeper" role (if exists)
   - Bot sends confirmation: "✅ You have accepted the Guardian Oath!"

4. **Completion**
   - User now has "Oathkeeper" role
   - Oath acceptance tracked in database

**Total Steps**: 3  
**Estimated Time**: 1-2 minutes

---

### 4.4 Vote to Resign Flow

**Actor**: Session Participants  
**Goal**: End session without penalty (Oathbreaker protection)

1. **Initiate Vote**
   - Participant executes `/sherpa vote-resign session_id:"abc123"`
   - Bot verifies session is active and user is a participant

2. **Record Vote**
   - Bot creates vote record in `sherpa_session_votes`
   - Bot counts current votes: "2/5 participants voted to resign"

3. **Vote Progress**
   - Other participants can vote via button or command
   - Bot updates vote count in real-time

4. **Majority Reached**
   - When 50%+1 vote to resign:
     - Bot updates session status to "resigned"
     - Bot clears cooldown penalties for all participants
     - Bot posts to channel: "✅ Session resigned by group consensus. No penalties."

5. **Completion**
   - Session marked as "resigned" (not "abandoned")
   - No Oathbreaker penalties applied
   - Participants free to create new sessions

**Total Steps**: 4  
**Estimated Time**: 1-5 minutes (voting)

---

## 5. Integration Points

### 5.1 Database Integration

**Tables Used**:
- `communities` - Community lookup by `anchor_discord_guild_id`
- `profiles` - User profiles with `discord_guild_id` and `community_id`
- `sherpa_applications` - Application tracking
- `sherpas` - Sherpa profiles
- `sherpa_requests` - Seeker requests
- `sherpa_sessions` - Session management
- `sherpa_session_participants` - Participant tracking
- `sherpa_ratings` - Rating system
- `sherpa_session_votes` - Vote to resign tracking

**Helper Functions**:
- `getCommunityByGuildId(guild_id)` - Get community UUID from Discord guild ID
- `getUserCommunity(user_id)` - Get user's community with fallback logic
- `verifyDiscordMembership(user_id, guild_id)` - Verify and assign user to community

**RLS Policies**:
- All queries filtered by `community_id` for data isolation
- Cross-community queries use `connected_discord_guild_ids` array

### 5.2 API Integration

**Next.js API Routes** (Called by Bot):
- `POST /api/sherpa/applications` - Create application
- `POST /api/sherpa/requests` - Create request
- `POST /api/sherpa/sessions` - Create session
- `POST /api/sherpa/ratings` - Submit rating
- `GET /api/sherpa/stats` - Get statistics

**Authentication**:
- Bot uses `DISCORD_BOT_TOKEN` for API authentication
- API routes verify bot token via `Authorization: Bearer [token]` header
- User context derived from Discord user ID in command interaction

### 5.3 Web App Integration

**Links from Discord to Web App**:
- "View Full Profile" button → `https://poke-mnky.moodmnky.com/sherpa/profile/[user_id]`
- "View Session Details" button → `https://poke-mnky.moodmnky.com/sherpa/sessions/[session_id]`
- "Manage Applications" button → `https://poke-mnky.moodmnky.com/sherpa/admin/applications`

**Web App → Discord**:
- Web app can trigger Discord notifications via webhook
- Session reminders sent via DM
- Application status updates via DM

---

## 6. Implementation Phases

### Phase 1: Bot Foundation (Week 1)

**Goals**:
- Set up Discord bot with multi-guild support
- Configure permissions and intents
- Implement basic command routing

**Tasks**:
1. Create Discord bot application (if not exists)
2. Enable SERVER MEMBERS INTENT in Developer Portal
3. Configure bot permissions (268445696 decimal)
4. Add bot to both Jupiter's Girth and Sherpa Hub servers
5. Implement guild-scoped command routing
6. Test basic interaction handling

**Deliverables**:
- ✅ Bot added to both servers
- ✅ Intents and permissions configured
- ✅ Command routing infrastructure
- ✅ Basic "ping" command for testing

---

### Phase 2: Core Sherpa Commands (Week 2)

**Goals**:
- Implement `/sherpa apply` command
- Implement `/sherpa request` command
- Implement `/sherpa sessions` command

**Tasks**:
1. Create `/sherpa` command group
2. Implement `/sherpa apply` with modal form
3. Implement `/sherpa request` with options
4. Implement `/sherpa sessions` with filtering
5. Integrate with database (create records)
6. Test end-to-end flows

**Deliverables**:
- ✅ `/sherpa apply` command functional
- ✅ `/sherpa request` command functional
- ✅ `/sherpa sessions` command functional
- ✅ Database integration tested

---

### Phase 3: Admin Commands (Week 3)

**Goals**:
- Implement `/sherpa-admin` command group
- Enable application review workflow
- Add statistics command

**Tasks**:
1. Create `/sherpa-admin` command group
2. Implement `/sherpa-admin review` command
3. Implement `/sherpa-admin list` command
4. Implement `/sherpa-admin stats` command
5. Add role-based permission checks
6. Test admin workflows

**Deliverables**:
- ✅ `/sherpa-admin review` command functional
- ✅ `/sherpa-admin list` command functional
- ✅ `/sherpa-admin stats` command functional
- ✅ Permission checks working

---

### Phase 4: Oath & Rating System (Week 4)

**Goals**:
- Implement `/sherpa oath` command
- Implement `/sherpa rating` command
- Implement `/sherpa vote-resign` command

**Tasks**:
1. Implement `/sherpa oath` with oath display and acceptance
2. Implement `/sherpa rating` with modal form
3. Implement `/sherpa vote-resign` with voting logic
4. Add Oathkeeper Score calculation
5. Add role assignment (Oathkeeper role)
6. Test oath and rating flows

**Deliverables**:
- ✅ `/sherpa oath` command functional
- ✅ `/sherpa rating` command functional
- ✅ `/sherpa vote-resign` command functional
- ✅ Oathkeeper Score calculation working

---

### Phase 5: Profile & Polish (Week 5)

**Goals**:
- Implement `/sherpa profile` command
- Add rich embeds and UI polish
- Add error handling and edge cases

**Tasks**:
1. Implement `/sherpa profile` with statistics
2. Enhance all commands with rich embeds
3. Add comprehensive error handling
4. Add input validation
5. Add rate limiting
6. Performance optimization

**Deliverables**:
- ✅ `/sherpa profile` command functional
- ✅ All commands have rich embeds
- ✅ Error handling comprehensive
- ✅ Performance optimized

---

### Phase 6: Event Handlers & Notifications (Week 6)

**Goals**:
- Implement guild member join handler
- Add session reminder system
- Add notification system

**Tasks**:
1. Implement `guildMemberAdd` event handler
2. Call `verifyDiscordMembership()` on join
3. Implement session reminder system (scheduled tasks)
4. Add DM notification system
5. Add channel posting for announcements
6. Test event handlers

**Deliverables**:
- ✅ Member join handler functional
- ✅ Session reminders working
- ✅ Notification system operational
- ✅ Event handlers tested

---

## 7. Testing Strategy

### 7.1 Unit Testing

**Command Handlers**:
- Test each command handler independently
- Mock Discord interactions
- Verify database operations
- Test error cases

### 7.2 Integration Testing

**End-to-End Flows**:
- Test complete user flows (application → approval → session)
- Test cross-community features
- Test permission checks
- Test rate limiting

### 7.3 User Acceptance Testing

**Beta Testing**:
- Deploy to test server
- Invite beta testers
- Gather feedback
- Iterate based on feedback

---

## 8. Security Considerations

### 8.1 Permission Checks

**Role-Based Access**:
- Verify user has required role before executing commands
- Check permissions at command level and database level
- Prevent privilege escalation

### 8.2 Input Validation

**Sanitization**:
- Validate all user input
- Sanitize text inputs (prevent injection)
- Limit input lengths
- Validate Discord user IDs and guild IDs

### 8.3 Rate Limiting

**Protection**:
- Implement rate limiting per user
- Prevent command spam
- Limit API calls to database
- Monitor for abuse

---

## 9. Monitoring & Analytics

### 9.1 Command Usage Tracking

**Metrics**:
- Command execution counts
- Error rates
- Response times
- User engagement

### 9.2 Database Monitoring

**Metrics**:
- Query performance
- Connection pool usage
- Error rates
- Data growth

### 9.3 Discord API Monitoring

**Metrics**:
- Rate limit usage
- API errors
- Gateway connection status
- Event processing latency

---

## 10. Success Metrics

### Phase 1 Metrics
- Bot successfully added to both servers
- Commands register correctly
- Basic routing works

### Phase 2 Metrics
- 5+ applications submitted via `/sherpa apply`
- 10+ requests created via `/sherpa request`
- 50+ command executions per week

### Phase 3 Metrics
- 3+ applications reviewed via `/sherpa-admin review`
- Admin commands used regularly
- Statistics command provides useful data

### Phase 4 Metrics
- 80%+ oath acceptance rate
- 10+ ratings submitted
- Vote to resign used when needed

### Phase 5 Metrics
- Profile command used regularly
- Rich embeds improve UX
- Error rate < 1%

### Phase 6 Metrics
- 100% of new members verified on join
- Session reminders sent successfully
- Notification system operational

---

## 11. Conclusion

This comprehensive plan provides a detailed roadmap for integrating Discord bot functionality across Jupiter's Girth and Sherpa Hub communities. The phased approach ensures incremental delivery while maintaining system stability.

**Key Success Factors**:
1. **Multi-Guild Architecture**: Single bot serving multiple communities with proper data isolation
2. **Command Design**: Intuitive slash commands with modals, buttons, and rich embeds
3. **Integration**: Seamless connection with Supabase database and Next.js application
4. **User Experience**: Clear flows, helpful responses, and error handling
5. **Security**: Proper permissions, input validation, and rate limiting

**Expected Outcomes**:
- Active Sherpa program with 5-10 registered Sherpas
- 10+ sessions per week
- 80%+ session completion rate
- 4.0+ average Oathkeeper Score
- Seamless cross-community collaboration

The implementation will transform both communities into a unified mentorship ecosystem, enabling teaching, learning, and growth across Discord and the web application.

---

## Appendix A: Command Reference Quick Sheet

### Public Commands
- `/sherpa apply` - Start application process
- `/sherpa request [activity] [difficulty] [scheduled_time]` - Create request
- `/sherpa sessions [filter]` - List sessions
- `/sherpa profile [user]` - View profile
- `/sherpa oath` - Display Guardian Oath
- `/sherpa rating [session_id]` - Rate session
- `/sherpa vote-resign [session_id]` - Vote to resign

### Admin Commands
- `/sherpa-admin review [application_id] [action] [reason]` - Review application
- `/sherpa-admin list [status]` - List applications/requests
- `/sherpa-admin stats` - View statistics

---

## Appendix B: Permission Integer Reference

**Decimal**: `268445696`  
**Hex**: `0x10008040C00`  
**Permissions**:
- Send Messages
- Manage Messages
- Read Message History
- Add Reactions
- Embed Links
- Attach Files
- Manage Roles
- Manage Channels (optional)

---

## Appendix C: Database Schema Reference

**Key Tables**:
- `sherpa_applications` - Application tracking
- `sherpas` - Sherpa profiles
- `sherpa_requests` - Seeker requests
- `sherpa_sessions` - Session management
- `sherpa_ratings` - Rating system
- `sherpa_session_votes` - Vote tracking

**Key Functions**:
- `getCommunityByGuildId(guild_id)` - Community lookup
- `getUserCommunity(user_id)` - User community with fallback

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Status**: Ready for Implementation
