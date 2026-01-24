/**
 * Voice Session
 * Manages Discord voice connection and OpenAI Realtime API integration
 */

import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import type { DiscordGatewayAdapterCreator } from "@discordjs/voice";
import { botLogger } from "../utils/logger.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerSupabaseTools } from "../tools/supabaseTools.js";
import { wireDiscordOpusToOpenAiPcm24k } from "../audio/discordInputToOpenAI.js";
import { makeOpenAiPcm24kToDiscordOpus } from "../audio/openAIOutputToDiscord.js";
import type { VoiceLLMTransport } from "../openai/transport.js";
import { RealtimeWsTransport } from "../openai/realtimeWsTransport.js";

type VoiceSessionOpts = {
  guildId: string;
  channelId: string;
  adapterCreator: DiscordGatewayAdapterCreator;
  communityId: string;
  allowedUserIds?: string[];
};

export class VoiceSession {
  private conn: any;
  private player = createAudioPlayer();
  private transport: VoiceLLMTransport;
  private tools = new ToolRegistry();
  private out = makeOpenAiPcm24kToDiscordOpus();
  private stopPipes: Array<() => void> = [];
  private allowedUserIds: Set<string>;

  // Expose opts for status command
  public readonly opts: VoiceSessionOpts;

  constructor(opts: VoiceSessionOpts) {
    this.opts = opts;
    // Register tools
    registerSupabaseTools(this.tools, opts.communityId);

    this.allowedUserIds = new Set(opts.allowedUserIds ?? []);

    // Create transport (default to WebSocket)
    const transportType = process.env.OPENAI_TRANSPORT || "realtime-ws";
    this.transport = new RealtimeWsTransport();

    // Configure transport
    this.transport.configure({
      instructions: [
        "You are a Discord voice assistant for a Guild-MNKY community.",
        "Be concise and helpful. Ask clarifying questions when needed.",
        "Use tools only when required to answer user questions.",
        "You can help users query Sherpa sessions, get profiles, and more.",
      ].join("\n"),
      tools: this.tools.listForOpenAI(),
      voice: process.env.OPENAI_VOICE || "onyx",
    });

    // Set up audio output handler
    this.transport.onAudioDelta((b64pcm) => {
      this.out.writePcmBase64(b64pcm);
    });

    // Set up tool handler
    this.transport.setToolHandler(async ({ name, callId, argumentsJson }) => {
      botLogger.info({ tool: name, callId }, "Tool call received");

      let args: any = {};
      try {
        args = JSON.parse(argumentsJson || "{}");
      } catch (e) {
        return JSON.stringify({ ok: false, error: "Invalid arguments JSON" });
      }

      try {
        const result = await this.tools.exec(name, args);
        return JSON.stringify(result);
      } catch (e: any) {
        botLogger.error({ error: e, tool: name }, "Tool execution error");
        return JSON.stringify({
          ok: false,
          error: e?.message ?? "Tool execution error",
        });
      }
    });
  }

  async start() {
    try {
      // Join voice channel (only the selected channel)
      this.conn = joinVoiceChannel({
        guildId: this.opts.guildId,
        channelId: this.opts.channelId,
        adapterCreator: this.opts.adapterCreator,
        selfDeaf: false, // Must be false to receive audio
        selfMute: false,
      });

      // Wait for connection to be ready
      await entersState(this.conn, VoiceConnectionStatus.Ready, 20_000);

      botLogger.info(
        {
          guildId: this.opts.guildId,
          channelId: this.opts.channelId,
        },
        "Voice channel connected"
      );

      // Set up audio playback
      const resource = createAudioResource(this.out.opusStream, {
        inputType: StreamType.Opus,
      });
      this.conn.subscribe(this.player);
      this.player.play(resource);

      // Start OpenAI transport
      await this.transport.start();

      // Wire up audio input
      this.wireReceiver();

      botLogger.info({ guildId: this.opts.guildId }, "Voice session started");
    } catch (error: any) {
      botLogger.error({ error, guildId: this.opts.guildId }, "Failed to start voice session");
      throw error;
    }
  }

  stop() {
    botLogger.info({ guildId: this.opts.guildId }, "Stopping voice session");

    // Stop all audio pipelines
    for (const stop of this.stopPipes) {
      try {
        stop();
      } catch {}
    }
    this.stopPipes = [];

    // Stop output stream
    try {
      this.out.end();
    } catch {}

    // Stop transport
    try {
      this.transport.stop();
    } catch {}

    // Destroy connection
    try {
      this.conn?.destroy();
    } catch {}
  }

  private wireReceiver() {
    const receiver = this.conn.receiver;

    receiver.speaking.on("start", (userId: string) => {
      // Check if user is allowed (if restrictions are set)
      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        return;
      }

      const opusStream = receiver.subscribe(userId, {
        end: { behavior: 0 }, // Manual end handling
      });

      const wired = wireDiscordOpusToOpenAiPcm24k(
        opusStream,
        (b64Pcm24k) => {
          this.transport.appendAudioChunk(b64Pcm24k);
        }
      );

      this.stopPipes.push(() => wired.stop());

      opusStream.on("end", () => {
        // Commit audio and request response
        this.transport.commitAudio();
        this.transport.requestResponse();
      });
    });
  }
}
