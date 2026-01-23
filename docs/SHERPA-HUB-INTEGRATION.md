I'm going to pass you some details from the other Discord server owner about his objectives for how this might integrate into our ecosystem. 

Discord Server overview and purpose | SHERPA HUB - To be able to apply to be a Sherpa , watch a sherpa, or request a sherpa | LFG - all LFG channels are for any discord members to play together if a sherpa isn't required or if there are friend groups that form they have a spot to connect at any time | all "resources" & "build" channels are for discord members to further learn the game and sharpen there skills or even for people to learn raids before entering and a tool for sherpas to better teach all players of different types. The overall purpose of the server is to have an avenue for all destiny 2 players current, returning or new to get together and/ or learn different pieces of content in destiny 2 in order to strengthen the destiny 2 community.

Here’s how the objectives you’ve shared for the Sherpa Hub Discord server map onto the current Guild‑MNKY ecosystem and what changes would be needed to support a second server alongside Jupiter’s Girth:

What the Sherpa Hub wants to do

Sherpa hub: let members apply to be a Sherpa, watch existing Sherpas in action, or request a Sherpa.

Open LFG channels: allow any members to form groups when a Sherpa isn’t required or for friend groups that naturally form.

Resources & builds: curate guides, raid explanations and build recommendations so newcomers can learn the game and Sherpas can teach more effectively.

Overall goal: provide a welcoming on‑ramp for new/returning Destiny‑2 players and strengthen the broader community by connecting experienced players with novices.

Current state of the Guild‑MNKY code

The Supabase schema already supports multiple communities via an anchor_discord_guild_id and connected_discord_guild_ids array. However, the application code hard‑codes Jupiter’s Girth’s guild ID (573823015511392268) as the default community when creating events and LFG posts. This means any user with no community_id is automatically assigned to the Jupiter’s Girth community.

The verifyDiscordMembership function takes a guildId parameter and assigns users to the community whose anchor_discord_guild_id matches that value—so the Discord bot can already pass a different guild ID to map members into another community.

There is currently no schema or logic for “sherpa applications,” “sherpa requests,” or persistent “resources/builds”; those would need to be added.

Steps to integrate Sherpa Hub cleanly

Create a new community row in the communities table with the Sherpa Hub’s guild ID as its anchor_discord_guild_id and set connected_discord_guild_ids as appropriate (e.g., include Jupiter’s Girth’s guild ID if members should have cross‑community visibility).

Remove the hard‑coded guild ID from the event/LFG creation logic. Instead of assuming all unassigned users belong to Jupiter’s Girth, look up the user’s Discord guild (via your bot or an environment variable) and assign them to the matching community. Alternatively, expose an env var such as DEFAULT_ANCHOR_GUILD_ID that can be set on each deployment.

Add Sherpa‑specific tables (for example, sherpa_applications, sherpa_requests, and sherpa_sessions) to manage applications, requests, and pairings. You can reuse much of the existing event/LFG infrastructure for scheduling Sherpa sessions.

Use existing LFG posts for general group‑finding in the Sherpa Hub community. Filter posts by community_id so Sherpa Hub members see only their server’s LFG posts unless you want cross‑community play.

Create a resources/builds module, perhaps as a Notion‑powered knowledge base or a new Supabase table that stores links, guides and build codes. Surface these in your web UI for the Sherpa Hub community.

Update the Discord bot to call verifyDiscordMembership with the Sherpa Hub guild ID so members are placed into the correct community. Once assigned, they’ll inherit all the same role‑sync and session-refresh logic as Jupiter’s Girth members.

Consider cross‑community features: if Sherpas from one server can help players in the other, you can leverage the connected_discord_guild_ids field to allow events, LFG posts and Sherpa requests to be shared across communities.

By adding the Sherpa Hub as a second “community” and refactoring the hard‑coded guild ID, you can extend all of your existing scheduling, LFG and role‑sync capabilities to this new server. Building out dedicated Sherpa‑application and resources modules will then let you meet the second server’s unique objectives without disrupting the Jupiter’s Girth experience.

Sources
Do some additional research on Destiny's 2's implementation of the Guided games and use this to flesh out this concept using the new Discord. 

Here’s a structured breakdown of how Destiny 2’s Guided Games operated and how Bungie’s new Fireteam Finder system has largely replaced it, along with suggestions on how to adapt these ideas for your Sherpa Hub Discord.

1. How Guided Games worked (Beta 2017–2023)

Purpose and roles: Guided Games allowed solo players to pair with clans for end‑game activities. Participants chose to be either a Seeker (solo player) or a Guide (part of a clan fireteam). Seekers could join if they met the activity’s power/entry requirements and possessed a Guided Games ticket. Guides needed a fireteam where at least half of the members belonged to the same clan (e.g., two clan members in a three‑player team).

Guardian Oath and Oathkeeper Score: Before starting a session, all participants accepted the Guardian Oath—a pledge to be helpful, attentive, willing to learn/teach, and friendly. Completing sessions raised a clan’s Oathkeeper Score, which was visible to Seekers when choosing a group.

Leaving and penalties: Players could leave early, but abandoning without a team vote applied the Oathbreaker debuff, which prevented joining new Guided Games until it expired. A “vote to resign” option allowed the group to disband without penalty.

Moderation and code of conduct: Bungie enforced the Guardian Oath and clan culture rules; clans with inappropriate names/mottos could be temporarily banned from hosting Guided Games.

Lifecycle: Guided Games was listed as a beta feature and only supported a few raids. It was quietly deactivated in late 2023—Bungie’s Season of the Wish announcement (update 7.3.0) stated that Guided Games would be removed and urged players to obtain the related emblem before Nov 28 2023. Emblem tracking sites confirm the “Helping Hand” emblem (earned from Guided Games) was retired on that date. By 2025/2026, Fireteam Finder fully replaced it.

2. The Fireteam Finder system (2024 onward)

Universal group finder: Fireteam Finder is an in‑game, in‑app and website tool that lets players create or search listings for nearly every activity (raids, dungeons, Nightfall, seasonal events, PvP modes, etc.). Players can access it from the roster tab or via Bungie.net/the companion app.

Guardian Oath revival: Fireteam Finder still begins with a Guardian’s Oath—four principles encouraging kindness, sharing knowledge, respect for diversity and teamwork. Users must agree to these values before creating or joining a listing.

Listing customisation: Creators select activity type and difficulty, choose tags (e.g., “newbies welcome,” “teaching run,” “speed clear”), set join conditions (open join vs. application), specify mic and language requirements, preferred platform, minimum Guardian Rank, and whether the group is playing now or scheduled for later. Seekers can search for listings that fit their needs and either join automatically or submit an application.

Cross‑platform: Fireteam Finder supports all platforms and cross‑save; players cannot restrict by platform, but they can indicate a preference. Listings can be scheduled in advance, enabling better planning.

3. Adapting these ideas for Sherpa Hub Discord

Goal: Build an integrated Sherpa program that mirrors Guided Games’ mentorship experience while leveraging Discord for scheduling, communication and community building.

Role definitions and application system

Sherpas (Guides): Experienced players who volunteer to teach others. Create a Discord application form where members can apply to become Sherpas; include requirements such as minimum Power/Guardian Rank, raid experience, and acceptance of a Sherpa Code (modeled on the Guardian Oath). Use Supabase to store applications and approvals.

Seekers: Players requesting help with raids, dungeons, or specific encounters. Provide a simple Discord form for Seekers to request assistance, selecting activity, desired time window and number of slots needed.

Guardian Oath & Oathkeeper rating

Adapt the Guardian Oath principles (Helpful, Attentive, Observant, Friendly) and ask both Sherpas and Seekers to agree before each session.

Implement a post‑session rating system (Oathkeeper Score) where Seekers can rate Sherpas on teaching skill, patience and attitude; similarly, Sherpas can rate Seekers on willingness to learn and respect. Aggregate scores can be displayed on Sherpa profiles to encourage positive behaviour.

Session creation and discovery

Custom LFG listings: Use a Discord bot or web interface to create “session listings” reminiscent of Fireteam Finder. Sherpas can post available session times, activity type, difficulty, required group size, communication requirements, etc., matching the listing parameters described in Fireteam Finder.

Search & filters: Seekers can browse or search active listings based on activity, difficulty, tags (e.g., “teaching run,” “friendly group”), language and schedule. They can auto‑join or apply depending on Sherpa preference.

Scheduling and reminders

Support scheduled sessions (e.g., “Sunday 8 PM ET – Vault of Glass teaching run”) and auto‑generated reminder messages in Discord channels.

Integrate with Supabase to store upcoming sessions and send DM reminders.

Penalty and fair‑play policy

Borrow the Oathbreaker concept: if a participant abandons a session without consensus, flag them for a cooldown period before they can request another Sherpa. Encourage using a vote‑to‑resign function via a bot command so departures don’t penalise others.

Resources and build channels

Dedicate channels or pages for curated raid guides, role‑specific builds and teaching materials. Sherpas and community experts can contribute posts or upload docs.

Link to relevant Bungie resources (e.g., Fireteam Finder guide) and ensure materials are kept current.

Cross‑community support

Since your project now supports multiple Discord servers (e.g., Jupiter’s Girth and Sherpa Hub), store each community’s Discord Guild ID and map users to the correct community in Supabase.

Allow Sherpas to offer sessions across communities by linking the Sherpa’s profile to multiple guilds (leveraging the connected_discord_guild_ids array in your communities table). This enables cross‑community teaching while keeping statistics separate.

By adopting Guided Games’ spirit of mentorship and pairing it with Bungie’s modern Fireteam Finder features—such as custom listings, scheduling, and adherence to an oath—you can build a Sherpa Hub that meets the second server owner’s objectives: a welcoming place to apply to be a Sherpa, request or watch Sherpa runs, form LFG groups when a Sherpa isn’t needed, and access curated resources to master Destiny 2’s raids and activities.