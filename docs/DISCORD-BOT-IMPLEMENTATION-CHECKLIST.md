# Discord Bot Implementation Checklist

**Date**: January 23, 2026  
**Status**: Phase 2 Database Schema Complete  
**Next Phase**: Bot Code Structure & Command Implementation

---

## ✅ Completed

### Phase 1: Foundation
- [x] Multi-community database schema
- [x] Community helper functions (`getCommunityByGuildId`, `getUserCommunity`)
- [x] Sherpa Hub community record created
- [x] `discord_guild_id` column added to profiles table
- [x] Cross-community connection configured

### Phase 2: Database Schema ✅
- [x] **Migration Created**: `20260129000000_sherpa_core_schema.sql`
- [x] **Migration Executed**: User confirmed migrations applied

### Phase 2: Bot Code Structure ✅
- [x] **Project Structure Created**: `discord-bot/` directory
- [x] **Package Configuration**: `package.json`, `tsconfig.json`
- [x] **Core Files**: `src/index.ts`, event handlers, utilities
- [x] **Command Handlers**: All `/sherpa` and `/sherpa-admin` commands
- [x] **Command Deployment**: `deploy-commands.ts` script
- [x] **Documentation**: README.md, SETUP.md
- [x] Enums created: `sherpa_application_status`, `sherpa_request_status`, `sherpa_session_status`, `sherpa_role_type`
- [x] `sherpa_applications` table (aligned with `/sherpa apply` modal fields)
- [x] `sherpas` table (Sherpa profiles)
- [x] `sherpa_requests` table (aligned with `/sherpa request` command)
- [x] `sherpa_sessions` table (session management)
- [x] `sherpa_session_participants` table (participant tracking)
- [x] `sherpa_session_votes` table (vote to resign functionality)
- [x] `sherpa_ratings` table (aligned with `/sherpa rating` command)
- [x] Helper functions: `update_sherpa_oathkeeper_score`, `check_resignation_majority`, `get_session_participant_count`
- [x] Indexes created for performance
- [x] RLS policies configured for community-scoped access
- [x] Documentation comments added

### Documentation
- [x] Comprehensive Discord Bot Integration Plan created
- [x] Command specifications documented
- [x] User flows documented
- [x] Permissions matrix documented

---

## ⏳ In Progress

### Phase 2: Bot Code Structure
- [ ] Create Discord bot project structure
- [ ] Set up Discord.js client with multi-guild support
- [ ] Configure intents and permissions
- [ ] Implement guild-scoped command routing
- [ ] Create command handler framework

---

## 📋 Next Steps

### Immediate (This Week)

#### 1. Database Migration Execution
- [ ] Run migration: `npx supabase migration up --local`
- [ ] Verify tables created successfully
- [ ] Test helper functions
- [ ] Verify RLS policies work correctly
- [ ] Test community-scoped queries

#### 2. Bot Project Setup
- [ ] Create `discord-bot/` directory structure
- [ ] Initialize Node.js project with `package.json`
- [ ] Install dependencies: `discord.js`, `dotenv`, `@supabase/supabase-js`
- [ ] Create `.env` file for bot token and Supabase credentials
- [ ] Set up TypeScript configuration
- [ ] Create basic bot client initialization

#### 3. Bot Configuration
- [ ] Add bot to Discord Developer Portal
- [ ] Enable SERVER MEMBERS INTENT
- [ ] Configure bot permissions (268445696 decimal)
- [ ] Generate bot invite URL with correct scopes
- [ ] Add bot to Jupiter's Girth server
- [ ] Add bot to Sherpa Hub server

#### 4. Command Registration
- [ ] Create command registration script
- [ ] Register `/sherpa` command group (guild-specific for Sherpa Hub)
- [ ] Register `/sherpa-admin` command group (guild-specific for Sherpa Hub)
- [ ] Test command registration
- [ ] Verify commands appear in Discord

---

### Short-term (Next 2 Weeks)

#### Phase 2: Core Commands Implementation

**Week 1: Application & Request Commands**
- [ ] Implement `/sherpa apply` command
  - [ ] Create modal form builder
  - [ ] Handle modal submission
  - [ ] Create application record in database
  - [ ] Post to `#sherpa-applications` channel
  - [ ] Send confirmation message
- [ ] Implement `/sherpa request` command
  - [ ] Parse command options
  - [ ] Create request record
  - [ ] Post to `#sherpa-requests` channel
  - [ ] Add "Claim Request" button
  - [ ] Handle button interactions
- [ ] Implement `/sherpa sessions` command
  - [ ] Query sessions from database
  - [ ] Create paginated embed
  - [ ] Add pagination buttons
  - [ ] Handle filter options

**Week 2: Profile, Oath, Rating Commands**
- [ ] Implement `/sherpa profile` command
  - [ ] Query Sherpa profile and statistics
  - [ ] Create rich embed
  - [ ] Add "View Full Profile" button (links to web app)
- [ ] Implement `/sherpa oath` command
  - [ ] Display Guardian Oath embed
  - [ ] Add "Accept Oath" button
  - [ ] Handle oath acceptance
  - [ ] Assign "Oathkeeper" role
- [ ] Implement `/sherpa rating` command
  - [ ] Verify user was participant
  - [ ] Create rating modal
  - [ ] Handle rating submission
  - [ ] Update Oathkeeper Score
  - [ ] Notify Sherpa
- [ ] Implement `/sherpa vote-resign` command
  - [ ] Verify user is participant
  - [ ] Create vote record
  - [ ] Check for majority
  - [ ] Update session status if majority reached

#### Phase 3: Admin Commands
- [ ] Implement `/sherpa-admin review` command
  - [ ] Verify admin permissions
  - [ ] Update application status
  - [ ] Create Sherpa record if approved
  - [ ] Assign "Sherpa" role
  - [ ] Send DM notifications
- [ ] Implement `/sherpa-admin list` command
  - [ ] Query applications/requests by status
  - [ ] Create paginated embed
  - [ ] Add action buttons
- [ ] Implement `/sherpa-admin stats` command
  - [ ] Query aggregated statistics
  - [ ] Create statistics embed
  - [ ] Add export button

---

### Medium-term (Next Month)

#### Phase 4: Event Handlers
- [ ] Implement `guildMemberAdd` handler
  - [ ] Call `verifyDiscordMembership()`
  - [ ] Assign to community
  - [ ] Send welcome message
- [ ] Implement session reminder system
  - [ ] Scheduled task for upcoming sessions
  - [ ] Send DM reminders 1 hour before
  - [ ] Post to channel if configured
- [ ] Implement notification system
  - [ ] Application status updates
  - [ ] Request claimed notifications
  - [ ] Session updates
  - [ ] Rating notifications

#### Phase 5: Integration & Testing
- [ ] Create API routes for bot-to-app integration
  - [ ] `POST /api/sherpa/applications` - Create application
  - [ ] `POST /api/sherpa/requests` - Create request
  - [ ] `POST /api/sherpa/sessions` - Create session
  - [ ] `POST /api/sherpa/ratings` - Submit rating
- [ ] Test end-to-end flows
- [ ] Performance testing
- [ ] Error handling improvements
- [ ] Rate limiting implementation

#### Phase 6: UI Components (Web App)
- [ ] Create Sherpa application form component
- [ ] Create Sherpa request form component
- [ ] Create session display components
- [ ] Create profile display components
- [ ] Create admin review interface

---

## 🔍 Testing Checklist

### Database Testing
- [ ] Test application creation
- [ ] Test application approval/denial
- [ ] Test request creation and claiming
- [ ] Test session creation and management
- [ ] Test rating submission and Oathkeeper Score calculation
- [ ] Test vote to resign majority logic
- [ ] Test RLS policies (community isolation)
- [ ] Test cross-community visibility

### Bot Command Testing
- [ ] Test `/sherpa apply` modal submission
- [ ] Test `/sherpa request` with all options
- [ ] Test `/sherpa sessions` with filters
- [ ] Test `/sherpa profile` for different users
- [ ] Test `/sherpa oath` acceptance
- [ ] Test `/sherpa rating` submission
- [ ] Test `/sherpa vote-resign` voting
- [ ] Test `/sherpa-admin review` approval/denial
- [ ] Test `/sherpa-admin list` with filters
- [ ] Test `/sherpa-admin stats` display

### Integration Testing
- [ ] Test bot → database integration
- [ ] Test bot → API route integration
- [ ] Test web app → bot notifications
- [ ] Test multi-guild routing
- [ ] Test permission checks
- [ ] Test error handling
- [ ] Test rate limiting

### User Acceptance Testing
- [ ] Deploy to test server
- [ ] Invite beta testers
- [ ] Gather feedback
- [ ] Iterate based on feedback
- [ ] Document issues and resolutions

---

## 📊 Success Metrics

### Phase 2 Metrics (Database)
- [ ] Migration runs successfully
- [ ] All tables created
- [ ] All indexes created
- [ ] All RLS policies working
- [ ] Helper functions tested

### Phase 3 Metrics (Bot Commands)
- [ ] 5+ applications submitted via `/sherpa apply`
- [ ] 10+ requests created via `/sherpa request`
- [ ] 50+ command executions per week
- [ ] <1% error rate

### Phase 4 Metrics (Admin)
- [ ] 3+ applications reviewed via `/sherpa-admin review`
- [ ] Admin commands used regularly
- [ ] Statistics command provides useful data

### Phase 5 Metrics (Oath & Rating)
- [ ] 80%+ oath acceptance rate
- [ ] 10+ ratings submitted
- [ ] Vote to resign used when needed
- [ ] Oathkeeper Scores calculated correctly

---

## 🚨 Known Issues & Risks

### Technical Risks
- **Rate Limiting**: Discord API rate limits may affect high-volume usage
  - **Mitigation**: Implement rate limiting and queuing
- **Database Performance**: Complex queries may be slow
  - **Mitigation**: Optimize queries, add caching
- **Multi-Guild Complexity**: Routing logic may have edge cases
  - **Mitigation**: Thorough testing, error handling

### Community Risks
- **Low Adoption**: Users may not use bot commands
  - **Mitigation**: Marketing, onboarding, clear documentation
- **Permission Issues**: Users may not have required roles
  - **Mitigation**: Clear error messages, role assignment automation

---

## 📚 Reference Documents

- **Integration Plan**: `docs/DISCORD-BOT-INTEGRATION-PLAN.md`
- **Database Schema**: `supabase/migrations/20260129000000_sherpa_core_schema.sql`
- **Multi-Community Plan**: `docs/MULTI-COMMUNITY-IMPLEMENTATION-PLAN.md`
- **Sherpa Hub Analysis**: `docs/SHERPA-HUB-DISCORD-ANALYSIS.md`
- **Jupiter's Girth Analysis**: `docs/JUPITERS-GIRTH-DISCORD-ANALYSIS.md`

---

## 🎯 Current Focus

**Immediate Priority**: Execute database migration and verify schema

**Next Priority**: Set up Discord bot project structure and basic client

**Long-term Goal**: Complete Phase 2-6 implementation within 6 weeks

---

**Last Updated**: January 23, 2026  
**Next Review**: After migration execution
