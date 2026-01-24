# Voice Bot Implementation Guide
## Step-by-Step Integration Plan for Guild-MNKY Discord Bot

**Date**: January 24, 2026  
**Based On**: Comprehensive Research Report + ChatGPT Transcript  
**Status**: Ready for Implementation

---

## Overview

This guide provides concrete implementation steps for adding voice functionality to the guild-mnky Discord bot. The implementation follows a phased approach, building from core functionality to production-ready features.

---

## Phase 1: Core Infrastructure Setup

### Step 1.1: Install Dependencies

Add required packages to `guild-mnky/discord-bot/package.json`:

```bash
cd guild-mnky/discord-bot
pnpm add @discordjs/voice @discordjs/opus prism-media ffmpeg-static ws zod undici
pnpm add @openai/agents  # Optional: Agents SDK transport
pnpm add lru-cache bottleneck p-limit prom-client  # For tool system
pnpm add -D @types/ws
```

### Step 1.2: Update Environment Variables

Add to `.env.example` and configure in production:

```env
# OpenAI Realtime API
OPENAI_API_KEY=your_openai_api_key
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_TRANSPORT=realtime-ws  # or "agents-sdk"
OPENAI_VOICE=alloy

# Tool Safety (comma-separated)
WEB_ALLOWED_HOSTS=platform.openai.com,discord.js.org,github.com
MCP_ALLOWED_BASEURLS=http://localhost:8787,https://code-mnky-tools.moodmnky.com
```

### Step 1.3: Update Discord Client Intents

Modify `src/index.ts` to include voice intents:

```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // ADD THIS
  ],
})
```

---

## Phase 2: Audio Pipeline Implementation

### Step 2.1: Create Audio Utilities Directory

Create `src/audio/` directory with the following files:

**`src/audio/ffmpegResample.ts`** - PCM resampling utility:
```typescript
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export function makePcmResampler(params: { 
  inRate: number; 
  outRate: number; 
  channels: number 
}) {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not available");

  const { inRate, outRate, channels } = params;
  const args = [
    "-hide_banner", "-loglevel", "error",
    "-f", "s16le", "-ar", String(inRate), "-ac", String(channels), "-i", "pipe:0",
    "-f", "s16le", "-ar", String(outRate), "-ac", String(channels), "pipe:1",
  ];

  return spawn(ffmpegPath, args, { stdio: ["pipe", "pipe", "pipe"] });
}
```

**`src/audio/pcmChunker.ts`** - Audio chunking utility:
```typescript
import { Transform } from "node:stream";

export function makePcmChunker(bytesPerChunk: number) {
  let buf = Buffer.alloc(0);
  return new Transform({
    transform(chunk, _enc, cb) {
      buf = Buffer.concat([buf, chunk as Buffer]);
      while (buf.length >= bytesPerChunk) {
        this.push(buf.subarray(0, bytesPerChunk));
        buf = buf.subarray(bytesPerChunk);
      }
      cb();
    },
    flush(cb) {
      buf = Buffer.alloc(0);
      cb();
    },
  });
}
```

**`src/audio/discordInputToOpenAI.ts`** - Discord → OpenAI pipeline:
```typescript
import prism from "prism-media";
import { pipeline } from "node:stream";
import { makePcmResampler } from "./ffmpegResample.js";
import { makePcmChunker } from "./pcmChunker.js";

export function wireDiscordOpusToOpenAiPcm24k(params: {
  opusStream: NodeJS.ReadableStream;
  onChunkBase64: (b64pcm: string) => void;
  discordRate?: number;
  openaiRate?: number;
  channels?: number;
  chunkMs?: number;
}) {
  const discordRate = params.discordRate ?? 48000;
  const openaiRate = params.openaiRate ?? 24000;
  const channels = params.channels ?? 1;
  const chunkMs = params.chunkMs ?? 20;

  const bytesPerChunk = Math.floor((openaiRate * chunkMs) / 1000) * 2 * channels;

  const decoder = new prism.opus.Decoder({
    rate: discordRate,
    channels,
    frameSize: 960,
  });

  const ff = makePcmResampler({ inRate: discordRate, outRate: openaiRate, channels });
  const chunker = makePcmChunker(bytesPerChunk);

  chunker.on("data", (pcm: Buffer) => params.onChunkBase64(pcm.toString("base64")));

  pipeline(params.opusStream, decoder, ff.stdin, () => {});
  pipeline(ff.stdout, chunker, () => {});

  return {
    stop() {
      try { ff.kill("SIGKILL"); } catch {}
      try { decoder.destroy(); } catch {}
      try { (params.opusStream as any).destroy?.(); } catch {}
    },
  };
}
```

**`src/audio/openAIOutputToDiscord.ts`** - OpenAI → Discord pipeline:
```typescript
import { PassThrough } from "node:stream";
import prism from "prism-media";
import { makePcmResampler } from "./ffmpegResample.js";

export function makeOpenAiPcm24kToDiscordOpus(params?: {
  openaiRate?: number;
  discordRate?: number;
  channels?: number;
}) {
  const openaiRate = params?.openaiRate ?? 24000;
  const discordRate = params?.discordRate ?? 48000;
  const channels = params?.channels ?? 1;

  const pcmIn = new PassThrough();
  const opusOut = new PassThrough();
  const ff = makePcmResampler({ inRate: openaiRate, outRate: discordRate, channels });
  const encoder = new prism.opus.Encoder({
    rate: discordRate,
    channels,
    frameSize: 960,
  });

  pcmIn.pipe(ff.stdin);
  ff.stdout.pipe(encoder).pipe(opusOut);

  return {
    opusStream: opusOut,
    writePcmBase64(b64: string) {
      pcmIn.write(Buffer.from(b64, "base64"));
    },
    end() {
      try { pcmIn.end(); } catch {}
      try { ff.kill("SIGTERM"); } catch {}
    },
  };
}
```

---

## Phase 3: OpenAI Transport Layer

### Step 3.1: Create Transport Interface

**`src/openai/transport.ts`**:
```typescript
export type ToolCallHandler = (call: {
  name: string;
  callId: string;
  argumentsJson: string;
}) => Promise<string>;

export type VoiceLLMTransport = {
  start(): Promise<void>;
  stop(): Promise<void>;
  appendAudioChunk(pcmBase64: string): void;
  commitAudio(): void;
  requestResponse(): void;
  sendUserText(text: string): void;
  onAudioDelta(cb: (pcmBase64: string) => void): void;
  setToolHandler(handler: ToolCallHandler): void;
  configure(opts: {
    instructions: string;
    tools: any[];
    voice?: string;
  }): void;
};
```

### Step 3.2: Implement WebSocket Transport

**`src/openai/realtimeWsTransport.ts`** - See ChatGPT transcript lines 2175-2294 for complete implementation.

Key components:
- WebSocket connection management
- Event routing for audio deltas and tool calls
- Session configuration
- Error handling and reconnection logic

### Step 3.3: Implement Agents SDK Transport (Optional)

**`src/openai/agentsSdkTransport.ts`** - See ChatGPT transcript lines 2295-2403 for complete implementation.

This provides an alternative transport using OpenAI's Agents SDK for simplified session management.

---

## Phase 4: Tool System

### Step 4.1: Create Tool Registry

**`src/tools/registry.ts`**:
```typescript
import { z } from "zod";

export type ToolDef = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  run: (args: any) => Promise<any>;
};

export class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  register(tool: ToolDef) {
    this.tools.set(tool.name, tool);
  }

  listForOpenAI() {
    return Array.from(this.tools.values()).map((t) => ({
      type: "function",
      name: t.name,
      description: t.description,
      parameters: { type: "object" },
    }));
  }

  async exec(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const parsed = tool.schema.parse(args);
    return tool.run(parsed);
  }
}
```

### Step 4.2: Create Supabase Tools

**`src/tools/supabaseTools.ts`** - Integrate with existing database utilities:
```typescript
import { z } from "zod";
import { supabase } from "../utils/database.js";

export function registerSupabaseTools(reg: ToolRegistry) {
  // Example: Query Sherpa sessions
  reg.register({
    name: "query_sherpa_sessions",
    description: "Query Sherpa sessions from the database",
    schema: z.object({
      status: z.enum(["upcoming", "past", "active"]).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    run: async ({ status, limit }) => {
      let query = supabase.from("sherpa_sessions").select("*").limit(limit);
      if (status === "upcoming") {
        query = query.gt("scheduled_time", new Date().toISOString());
      } else if (status === "past") {
        query = query.lt("scheduled_time", new Date().toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      return { ok: true, sessions: data };
    },
  });

  // Add more tools wrapping existing bot functionality
}
```

---

## Phase 5: Voice Session Integration

### Step 5.1: Create VoiceSession Class

**`src/discord/voiceSession.ts`** - Core integration class:

Key responsibilities:
- Manage Discord voice connection
- Wire audio pipelines
- Configure OpenAI transport
- Handle tool execution
- Manage session lifecycle

See ChatGPT transcript lines 2407-2600+ for complete implementation reference.

### Step 5.2: Add Voice Commands

Create **`src/commands/voice/join.ts`**:
```typescript
import { ChatInputCommandInteraction } from "discord.js";
import { VoiceSession } from "../../discord/voiceSession.js";

const sessions = new Map<string, VoiceSession>();

export async function handleVoiceJoin(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const vc = member.voice.channel;

  if (!vc) {
    await interaction.reply({
      content: "❌ You must be in a voice channel to use this command.",
      ephemeral: true,
    });
    return;
  }

  // Stop existing session
  sessions.get(interaction.guildId!)?.stop();

  const session = new VoiceSession({
    guildId: interaction.guildId!,
    channelId: vc.id,
    adapterCreator: interaction.guild!.voiceAdapterCreator,
  });

  sessions.set(interaction.guildId!, session);
  await session.start();

  await interaction.reply({
    content: `✅ Joined ${vc.name}. Speak normally to interact!`,
    ephemeral: true,
  });
}
```

Create **`src/commands/voice/leave.ts`**:
```typescript
import { ChatInputCommandInteraction } from "discord.js";

const sessions = new Map<string, any>();

export async function handleVoiceLeave(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const session = sessions.get(interaction.guildId!);
  if (!session) {
    await interaction.reply({
      content: "❌ No active voice session.",
      ephemeral: true,
    });
    return;
  }

  session.stop();
  sessions.delete(interaction.guildId!);

  await interaction.reply({
    content: "✅ Left voice channel.",
    ephemeral: true,
  });
}
```

### Step 5.3: Register Voice Commands

Update **`src/deploy-commands.ts`** to include voice commands:
```typescript
// Add to commands array
{
  name: "voice",
  description: "Voice interaction commands",
  options: [
    {
      name: "join",
      description: "Join voice channel and start voice interaction",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "leave",
      description: "Leave voice channel",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
}
```

Update **`src/events/interactionCreate.ts`** to route voice commands:
```typescript
// Add to handleSlashCommand function
else if (commandName === "voice") {
  switch (subcommandName) {
    case "join":
      await handleVoiceJoin(interaction, communityId);
      break;
    case "leave":
      await handleVoiceLeave(interaction, communityId);
      break;
  }
}
```

---

## Phase 6: Testing & Validation

### Step 6.1: Basic Functionality Tests

1. **Join Test**: Verify bot joins voice channel successfully
2. **Audio Input Test**: Speak and verify audio chunks are sent to OpenAI
3. **Audio Output Test**: Verify bot responses play in voice channel
4. **Tool Call Test**: Request tool execution and verify results

### Step 6.2: Integration Tests

1. **Multi-Guild Test**: Verify separate sessions per guild
2. **Error Recovery Test**: Test reconnection after network interruption
3. **Resource Cleanup Test**: Verify proper cleanup on disconnect

---

## Phase 7: Production Hardening (Future)

### Step 7.1: Add Monitoring

- Audio buffer depth metrics
- Tool call counts and latencies
- WebSocket reconnection frequency
- Error rates

### Step 7.2: Implement VAD

- Enable server-side VAD in OpenAI session config
- Improve turn detection accuracy

### Step 7.3: Add Barge-in

- Detect user speech during bot playback
- Truncate and clear output buffers
- Prioritize new input

---

## Quick Reference

### Key Files Structure

```
guild-mnky/discord-bot/
├── src/
│   ├── audio/              # Audio pipeline modules
│   │   ├── ffmpegResample.ts
│   │   ├── pcmChunker.ts
│   │   ├── discordInputToOpenAI.ts
│   │   └── openAIOutputToDiscord.ts
│   ├── openai/             # OpenAI transport layer
│   │   ├── transport.ts
│   │   ├── realtimeWsTransport.ts
│   │   └── agentsSdkTransport.ts
│   ├── tools/              # Tool system
│   │   ├── registry.ts
│   │   └── supabaseTools.ts
│   ├── discord/
│   │   └── voiceSession.ts # Core voice session
│   └── commands/
│       └── voice/          # Voice commands
│           ├── join.ts
│           └── leave.ts
```

### Environment Variables Required

- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_REALTIME_MODEL` - Model name (default: "gpt-realtime")
- `OPENAI_TRANSPORT` - Transport type ("realtime-ws" or "agents-sdk")
- `OPENAI_VOICE` - Voice selection (default: "alloy")

### Critical Implementation Notes

1. **Audio Format**: Discord uses 48kHz Opus, OpenAI uses 24kHz PCM
2. **Chunk Size**: 20ms chunks (960 bytes for 24kHz mono PCM)
3. **Buffer Management**: Manual with WebSocket, automatic with Agents SDK
4. **Tool Safety**: Always validate inputs with Zod schemas
5. **Error Handling**: Implement reconnection logic for WebSocket
6. **Resource Cleanup**: Always stop audio pipelines and close connections

---

## Next Steps

1. Review the comprehensive research report: `VOICE-BOT-INTEGRATION-RESEARCH-REPORT.md`
2. Review the ChatGPT transcript: `CHATGPT-DISCORD-VOICE-BOT.md`
3. Begin Phase 1 implementation
4. Test incrementally after each phase
5. Iterate based on testing results

---

## Support & Resources

- **Research Report**: `docs/VOICE-BOT-INTEGRATION-RESEARCH-REPORT.md`
- **ChatGPT Transcript**: `CHATGPT-DISCORD-VOICE-BOT.md` (in parent directory)
- **OpenAI Realtime API Docs**: https://platform.openai.com/docs/api-reference/realtime
- **Discord.js Voice Docs**: https://discordjs.guide/voice/
