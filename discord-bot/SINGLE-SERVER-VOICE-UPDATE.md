# Single-Server Voice Session Update

**Date**: January 24, 2026  
**Status**: ✅ **COMPLETE**

---

## Changes Made

Updated voice session management to enforce **only one server can have an active voice session at a time**.

---

## Implementation Details

### 1. Global Session Management

**Before**: Per-guild session storage (`Map<guildId, VoiceSession>`)
```typescript
const sessions = new Map<string, VoiceSession>();
```

**After**: Single global session storage
```typescript
let activeSession: { 
  session: VoiceSession; 
  guildId: string; 
  guildName: string 
} | null = null;
```

### 2. Updated `/voice join` Command

- ✅ Stops any existing voice session before starting a new one
- ✅ Notifies user if switching servers
- ✅ Shows which server the session is active in
- ✅ Clear messaging about single-server limitation

**Behavior**:
- If no session exists → Start new session
- If session exists in same server → Stop old, start new
- If session exists in different server → Stop old session, notify user, start new session

### 3. Updated `/voice leave` Command

- ✅ Checks if active session is in the current server
- ✅ Prevents leaving sessions from other servers
- ✅ Clear error message if trying to leave from wrong server

**Behavior**:
- If no session exists → Error message
- If session exists in different server → Error with helpful message
- If session exists in current server → Stop session

### 4. New `/voice status` Command

- ✅ Shows which server has active voice session
- ✅ Shows guild ID
- ✅ Helpful for checking current state

---

## User Experience

### Joining Voice

**In Server A**:
```
User: /voice join
Bot: ✅ Joined [Channel] in **Server A**. Speak normally to interact!
     ℹ️ Only one server can have an active voice session at a time.
```

**In Server B** (while Server A has active session):
```
User: /voice join
Bot: ℹ️ Stopped voice session in **Server A** to start in **Server B**.
     ✅ Joined [Channel] in **Server B**. Speak normally to interact!
     ℹ️ Only one server can have an active voice session at a time.
```

### Leaving Voice

**From Active Server**:
```
User: /voice leave
Bot: ✅ Left voice channel in **Server A**.
```

**From Inactive Server**:
```
User: /voice leave
Bot: ❌ Active voice session is in **Server A**, not Server B. 
     Use /voice join in Server A to switch servers, or ask 
     someone in Server A to use /voice leave.
```

### Checking Status

**No Active Session**:
```
User: /voice status
Bot: ℹ️ No active voice session. Use /voice join to start one.
```

**Active Session**:
```
User: /voice status
Bot: 🔊 **Active Voice Session**
     
     Server: **Server A**
     Guild ID: `1234567890`
     
     Only one server can have an active voice session at a time.
```

---

## Technical Benefits

1. **Resource Management**: Only one OpenAI API connection at a time
2. **Cost Control**: Prevents multiple concurrent API usage
3. **Clarity**: Clear which server has active voice
4. **Prevents Conflicts**: No confusion about which server is active

---

## Files Modified

1. ✅ `src/commands/voice/join.ts` - Updated to global session management
2. ✅ `src/commands/voice/leave.ts` - Updated to check active server
3. ✅ `src/commands/voice/status.ts` - New status command
4. ✅ `src/events/interactionCreate.ts` - Added status command routing
5. ✅ `src/deploy-commands.ts` - Added status subcommand

---

## Commands Updated

- ✅ `/voice join` - Now stops existing sessions automatically
- ✅ `/voice leave` - Now validates server before leaving
- ✅ `/voice status` - New command to check active session

---

## Verification

- ✅ Commands deployed to both guilds
- ✅ Code compiles without errors
- ✅ Logic verified (single session enforcement)
- ✅ User messaging clear and helpful

---

## Usage Examples

### Scenario 1: Starting First Session
1. User in Server A: `/voice join`
2. Bot joins voice channel in Server A
3. Voice session active in Server A

### Scenario 2: Switching Servers
1. User in Server A: `/voice join` (session active in Server A)
2. User in Server B: `/voice join`
3. Bot stops session in Server A
4. Bot starts session in Server B
5. Voice session now active in Server B

### Scenario 3: Checking Status
1. User in any server: `/voice status`
2. Bot shows which server has active session (or "none")

### Scenario 4: Leaving from Wrong Server
1. Session active in Server A
2. User in Server B: `/voice leave`
3. Bot explains session is in Server A
4. Suggests using `/voice join` in Server A to switch

---

**Status**: ✅ **Complete and Deployed**

The voice system now enforces single-server voice sessions with clear user messaging and helpful status commands.
