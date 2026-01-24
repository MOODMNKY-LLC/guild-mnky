/**
 * Voice Session
 * Manages Discord voice connection and OpenAI Realtime API integration
 */

import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
  AudioPlayerError,
} from "@discordjs/voice";
import { Readable } from "node:stream";
import type { DiscordGatewayAdapterCreator } from "@discordjs/voice";
import { botLogger } from "../utils/logger.js";
import { ToolRegistry } from "../tools/registry.js";
import { registerSupabaseTools } from "../tools/supabaseTools.js";
import { wireDiscordOpusToOpenAiPcm24k } from "../audio/discordInputToOpenAI.js";
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
  private stopPipes: Array<() => void> = [];
  private allowedUserIds: Set<string>;
  private activeSubscriptions: Map<string, any> = new Map(); // userId -> opusStream
  private currentResource: any = null; // Track current audio resource
  private responseAudioChunks: Buffer[] = []; // Collect converted PCM chunks (48kHz stereo) for each response
  private isProcessingResponse: boolean = false; // Prevent duplicate response processing
  private isAiSpeaking: boolean = false; // Track when AI is actively speaking (reference project pattern)

  /**
   * Convert OpenAI audio (24kHz mono PCM) to Discord format (48kHz stereo PCM)
   * Reference: openai-realtime-discordbot/lib/audio-manager.ts
   */
  private convertOpenAIToDiscord(input: Buffer): Buffer {
    try {
      // Input: 24kHz mono 16-bit PCM from OpenAI
      // Output: 48kHz stereo 16-bit PCM for Discord
      const inputSamples = input.length / 2; // 2 bytes per sample
      const outputSamples = inputSamples * 2; // Upsample 24kHz -> 48kHz
      const output = Buffer.allocUnsafe(outputSamples * 4); // 4 bytes per stereo sample

      for (let i = 0; i < inputSamples; i++) {
        // Read mono sample from OpenAI
        const sample = input.readInt16LE(i * 2);

        // Upsample: write each sample twice (24kHz -> 48kHz)
        const outputIndex1 = i * 2 * 4; // First upsampled position
        const outputIndex2 = (i * 2 + 1) * 4; // Second upsampled position

        if (outputIndex2 + 3 < output.length) {
          // Write stereo samples (left and right channels identical)
          output.writeInt16LE(sample, outputIndex1); // Left channel
          output.writeInt16LE(sample, outputIndex1 + 2); // Right channel
          output.writeInt16LE(sample, outputIndex2); // Left channel (duplicate)
          output.writeInt16LE(sample, outputIndex2 + 2); // Right channel (duplicate)
        }
      }

      return output;
    } catch (error: any) {
      console.error("[VoiceSession] OpenAI to Discord audio conversion failed:", error);
      botLogger.error({ error: error.message }, "Audio conversion failed");
      return input; // Return original if conversion fails
    }
  }

  // Expose opts for status command
  public readonly opts: VoiceSessionOpts;

  constructor(opts: VoiceSessionOpts) {
    this.opts = opts;
    // Register tools
    registerSupabaseTools(this.tools, opts.communityId);

    this.allowedUserIds = new Set(opts.allowedUserIds ?? []);

    // Set up AudioPlayer error and state listeners
    this.player.on("error", (error: AudioPlayerError) => {
      botLogger.error(
        {
          error: error.message,
          resource: error.resource?.metadata,
          guildId: this.opts.guildId,
        },
        "AudioPlayer error"
      );
      console.error("[AudioPlayer] Error:", error.message, error.resource?.metadata);
    });

    this.player.on("stateChange", (oldState, newState) => {
      botLogger.info(
        {
          oldStatus: oldState.status,
          newStatus: newState.status,
          guildId: this.opts.guildId,
        },
        "AudioPlayer state changed"
      );
      console.log(`[AudioPlayer] State: ${oldState.status} → ${newState.status}`);
      
      // Log state changes for debugging
      // Note: We do NOT recreate resources when player goes idle
      // The player can go idle temporarily (buffering, pause) even if stream is still active
      // We only recreate if the stream actually ends (handled in stream.on("end"))
      if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
        console.log("[AudioPlayer] Player went idle - stream may still be active, checking...");
        botLogger.info({ guildId: this.opts.guildId }, "Player went idle");
      }
    });

    // Create transport (default to WebSocket)
    const transportType = process.env.OPENAI_TRANSPORT || "realtime-ws";
    this.transport = new RealtimeWsTransport();

    // Configure transport with system prompt
    // Reference project pattern: Simple, concise, natural instructions
    // The language comes naturally from the instruction language itself
    const instructions = `You are GIRTH, a helpful voice assistant for Guild-MNKY, a multi-community Discord ecosystem serving Jupiter's Girth (gaming community) and Sherpa Hub (mentorship community). Be conversational and friendly. Keep responses concise but natural. 

Core values: Be Helpful, Attentive, Observant, Willing to Learn/Teach, and Friendly. You can help with Sherpa Sessions (query active mentorship sessions, find available Sherpas), Sherpa Profiles (look up Sherpa information and Oathkeeper scores), and Community Information (Guild-MNKY features, events, LFG posts).

Use tools proactively when they'll provide better answers. Always explain what you're doing: "Let me check the Sherpa sessions for you..."`;

    // Valid voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
    this.transport.configure({
      instructions: instructions,
      tools: this.tools.listForOpenAI(),
      voice: process.env.OPENAI_VOICE || "alloy",
    });

    // Set up audio output handler - collect chunks instead of writing to stream immediately
    // Reference project pattern: collect chunks, then create resource when response.done fires
    this.transport.onAudioDelta((b64pcm) => {
      console.log(`[VoiceSession] Received audio delta (${b64pcm.length} base64 chars)`);
      try {
        // Decode base64 to get raw PCM (24kHz mono from OpenAI)
        const rawPcm = Buffer.from(b64pcm, "base64");
        
        // Convert immediately to Discord format (48kHz stereo)
        const discordPcm = this.convertOpenAIToDiscord(rawPcm);
        
        // Collect converted PCM chunks
        this.responseAudioChunks.push(discordPcm);
        console.log(`[VoiceSession] Converted and collected: ${rawPcm.length} bytes → ${discordPcm.length} bytes (total chunks: ${this.responseAudioChunks.length})`);
      } catch (error: any) {
        botLogger.error({ error: error.message }, "Failed to process audio chunk");
        console.error("[VoiceSession] Error processing audio chunk:", error);
      }
    });

    // Set up response done handler - process collected chunks and play
    this.transport.onResponseDone(() => {
      this.handleResponseDone();
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
      // Verify adapter creator exists
      if (!this.opts.adapterCreator) {
        throw new Error("Voice adapter creator is missing. Ensure the bot has proper voice permissions.");
      }

      botLogger.info(
        {
          guildId: this.opts.guildId,
          channelId: this.opts.channelId,
          hasAdapterCreator: !!this.opts.adapterCreator,
        },
        "Attempting to join voice channel"
      );

      // Check for existing connection first (prevents unnecessary API calls and rate limits)
      const existingConnection = getVoiceConnection(this.opts.guildId);
      botLogger.info(
        {
          guildId: this.opts.guildId,
          hasExistingConnection: !!existingConnection,
          existingStatus: existingConnection?.state?.status,
        },
        "Checking for existing voice connection"
      );
      if (existingConnection) {
        const existingChannelId = existingConnection.joinConfig.channelId;
        const existingStatus = existingConnection.state.status;
        
        // Don't reuse destroyed or disconnected connections
        if (existingStatus === VoiceConnectionStatus.Destroyed || 
            existingStatus === VoiceConnectionStatus.Disconnected) {
          botLogger.info(
            {
              guildId: this.opts.guildId,
              existingStatus,
            },
            "Existing connection is destroyed/disconnected, creating new one"
          );
          // Join normally - the destroyed connection will be cleaned up by Discord.js
          this.conn = joinVoiceChannel({
            guildId: this.opts.guildId,
            channelId: this.opts.channelId,
            adapterCreator: this.opts.adapterCreator,
            selfDeaf: false, // Must be false to receive audio
            selfMute: false,
          });
        } else if (existingChannelId === this.opts.channelId) {
          // Same channel - check if connection is in a recoverable state
          if (existingStatus === VoiceConnectionStatus.Ready) {
            // Already Ready - reuse it
            botLogger.info(
              {
                guildId: this.opts.guildId,
                channelId: this.opts.channelId,
                currentStatus: existingStatus,
              },
              "Reusing existing ready voice connection to same channel"
            );
            this.conn = existingConnection;
            // Skip entersState wait since we're already Ready
            // Continue to audio setup below
          } else if (existingStatus === VoiceConnectionStatus.Connecting) {
            // Connecting - wait for it to become Ready (don't recreate)
            botLogger.info(
              {
                guildId: this.opts.guildId,
                channelId: this.opts.channelId,
                currentStatus: existingStatus,
              },
              "Reusing existing connecting voice connection - waiting for Ready"
            );
            this.conn = existingConnection;
            // Continue to entersState wait below
          } else {
            // Signalling or other unstable state - destroy and recreate
            // Connections stuck in signalling often need to be recreated
            botLogger.info(
              {
                guildId: this.opts.guildId,
                channelId: this.opts.channelId,
                currentStatus: existingStatus,
              },
              "Existing connection in unstable state - destroying and recreating"
            );
            try {
              existingConnection.destroy();
            } catch (destroyError: any) {
              botLogger.warn({ error: destroyError }, "Error destroying unstable connection");
            }
            
            // Small delay for cleanup
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Create new connection
            this.conn = joinVoiceChannel({
              guildId: this.opts.guildId,
              channelId: this.opts.channelId,
              adapterCreator: this.opts.adapterCreator,
              selfDeaf: false, // Must be false to receive audio
              selfMute: false,
            });
          }
        } else {
          // Different channel - destroy old connection first to avoid conflicts
          botLogger.info(
            {
              guildId: this.opts.guildId,
              oldChannelId: existingChannelId,
              newChannelId: this.opts.channelId,
              oldStatus: existingStatus,
            },
            "Destroying existing connection before joining new channel"
          );
          try {
            existingConnection.destroy();
          } catch (destroyError: any) {
            botLogger.warn({ error: destroyError }, "Error destroying existing connection");
          }
          
          // Delay to ensure cleanup completes (helps avoid rate limits and connection conflicts)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Join new channel
          this.conn = joinVoiceChannel({
            guildId: this.opts.guildId,
            channelId: this.opts.channelId,
            adapterCreator: this.opts.adapterCreator,
            selfDeaf: false, // Must be false to receive audio
            selfMute: false,
          });
        }
      } else {
        // No existing connection - join normally
        this.conn = joinVoiceChannel({
          guildId: this.opts.guildId,
          channelId: this.opts.channelId,
          adapterCreator: this.opts.adapterCreator,
          selfDeaf: false, // Must be false to receive audio
          selfMute: false,
        });
      }

      // Log initial state immediately
      botLogger.info(
        {
          guildId: this.opts.guildId,
          initialStatus: this.conn.state.status,
        },
        "Voice connection created, initial state"
      );

      // Set up connection state monitoring IMMEDIATELY after creation
      // Use once() for initial state to catch immediate transitions
      this.conn.once("stateChange", (oldState: any, newState: any) => {
        botLogger.info(
          {
            guildId: this.opts.guildId,
            oldStatus: oldState.status,
            newStatus: newState.status,
          },
          "Voice connection first state change"
        );
      });

      // Also listen to all state changes
      this.conn.on("stateChange", (oldState: any, newState: any) => {
        botLogger.info(
          {
            guildId: this.opts.guildId,
            oldStatus: oldState.status,
            newStatus: newState.status,
          },
          "Voice connection state changed"
        );
      });

      // Listen for connection errors
      this.conn.on("error", (error: any) => {
        const errorMessage = error?.message || error?.toString() || String(error);
        const isIPDiscoveryError = errorMessage.includes("Cannot perform IP discovery") || 
                                   errorMessage.includes("socket closed");
        
        if (isIPDiscoveryError) {
          // IP discovery errors are often transient - log as warning, connection may recover
          ipDiscoveryErrorOccurred = true;
          botLogger.warn(
            { 
              error: errorMessage,
              errorCode: error?.code,
              guildId: this.opts.guildId,
              channelId: this.opts.channelId,
              currentState: this.conn.state.status,
            },
            "Voice connection IP discovery error (may recover)"
          );
        } else {
          // Other errors are more serious
          botLogger.error(
            { 
              error: errorMessage,
              errorCode: error?.code,
              errorStack: error?.stack,
              guildId: this.opts.guildId,
              channelId: this.opts.channelId,
              currentState: this.conn.state.status,
            },
            "Voice connection error"
          );
        }
      });

      // Listen for debug events (if available)
      if (this.conn.on) {
        // @ts-ignore - debug event may not be in types
        this.conn.on("debug", (message: string) => {
          botLogger.debug(
            { 
              debugMessage: message,
              guildId: this.opts.guildId,
              currentState: this.conn.state.status,
            },
            "Voice connection debug"
          );
        });
      }

      // Track IP discovery errors for recovery logic
      let ipDiscoveryErrorOccurred = false;
      
      // Log state periodically to see if it's changing
      const stateCheckInterval = setInterval(() => {
        botLogger.info(
          {
            guildId: this.opts.guildId,
            currentStatus: this.conn.state.status,
            connectionExists: !!this.conn,
            ipDiscoveryErrorOccurred,
          },
          "Voice connection state check"
        );
      }, 5000); // Check every 5 seconds

      // Clear interval when connection is ready or destroyed
      this.conn.once(VoiceConnectionStatus.Ready, () => {
        clearInterval(stateCheckInterval);
      });
      this.conn.once(VoiceConnectionStatus.Destroyed, () => {
        clearInterval(stateCheckInterval);
      });

      // Wait for connection to be ready with increased timeout and better error handling
      // Skip if we're already reusing a Ready connection
      if (this.conn.state.status !== VoiceConnectionStatus.Ready) {
        try {
          // Increased timeout to 60 seconds to allow for IP discovery retries
          await entersState(this.conn, VoiceConnectionStatus.Ready, 60_000);
        } catch (timeoutError: any) {
          // Check current state for debugging
          const currentState = this.conn.state.status;
          const timeoutErrorMsg = timeoutError?.message || timeoutError?.toString() || String(timeoutError);
          
          // Check if this is a rate limit error (429)
          const isRateLimit = timeoutError?.code === 429 || 
                             timeoutError?.status === 429 ||
                             timeoutErrorMsg.toLowerCase().includes('rate limit') ||
                             timeoutErrorMsg.includes('429');
          
          if (isRateLimit) {
            const retryAfter = timeoutError?.retryAfter || timeoutError?.retry_after || 5;
            botLogger.warn(
              {
                error: timeoutErrorMsg,
                retryAfter,
                errorCode: timeoutError?.code,
                guildId: this.opts.guildId,
                channelId: this.opts.channelId,
              },
              `Rate limited - waiting ${retryAfter}s before retry`
            );
            throw new Error(
              `Discord API rate limit: Please wait ${retryAfter} seconds before trying again.`
            );
          }
          
          // Check if this is an IP discovery error - these are often transient
          const isIPDiscoveryError = timeoutErrorMsg.includes("Cannot perform IP discovery") ||
                                    timeoutErrorMsg.includes("socket closed");
          
          botLogger.warn(
            {
              timeoutError: timeoutErrorMsg,
              currentState,
              isIPDiscoveryError,
              guildId: this.opts.guildId,
              channelId: this.opts.channelId,
            },
            "Voice connection timeout - checking if connection is actually ready"
          );
          
          // Sometimes the connection is actually ready but entersState times out
          // Check the actual state - if it's Ready, proceed anyway
          if (this.conn.state.status === VoiceConnectionStatus.Ready) {
            botLogger.info(
              { guildId: this.opts.guildId },
              "Connection is Ready despite timeout - proceeding"
            );
          } else if (isIPDiscoveryError || ipDiscoveryErrorOccurred) {
            // IP discovery errors are often transient - wait longer for recovery
            // Connection often recovers within seconds
            botLogger.info(
              {
                guildId: this.opts.guildId,
                currentState,
                ipDiscoveryErrorOccurred,
              },
              "IP discovery error detected - waiting additional time for recovery"
            );
            
            // Give it another 15 seconds to recover (connections often recover quickly)
            try {
              await entersState(this.conn, VoiceConnectionStatus.Ready, 15_000);
              botLogger.info(
                { guildId: this.opts.guildId },
                "Connection recovered from IP discovery error"
              );
            } catch (recoveryError: any) {
              // Still not ready after recovery attempt - check actual state
              const finalState = this.conn.state.status;
              if (finalState === VoiceConnectionStatus.Ready) {
                botLogger.info(
                  { guildId: this.opts.guildId },
                  "Connection is Ready after recovery wait - proceeding"
                );
              } else if (finalState === VoiceConnectionStatus.Connecting || 
                         finalState === VoiceConnectionStatus.Signalling) {
                // Still connecting - give it one more chance (5 seconds)
                botLogger.info(
                  {
                    guildId: this.opts.guildId,
                    finalState,
                  },
                  "Connection still connecting after recovery - waiting one more time"
                );
                try {
                  await entersState(this.conn, VoiceConnectionStatus.Ready, 5_000);
                  botLogger.info(
                    { guildId: this.opts.guildId },
                    "Connection recovered on second recovery attempt"
                  );
                } catch (finalError: any) {
                  if (this.conn.state.status === VoiceConnectionStatus.Ready) {
                    botLogger.info(
                      { guildId: this.opts.guildId },
                      "Connection is Ready after final recovery wait - proceeding"
                    );
                  } else {
                    botLogger.error(
                      {
                        currentState: this.conn.state.status,
                        guildId: this.opts.guildId,
                      },
                      "Connection not Ready after all recovery attempts"
                    );
                    throw new Error(
                      `Voice connection timeout: Connection stuck in ${this.conn.state.status} state after IP discovery error. This may indicate network issues or Discord API problems.`
                    );
                  }
                }
              } else {
                botLogger.error(
                  {
                    currentState: finalState,
                    guildId: this.opts.guildId,
                  },
                  "Connection not Ready after recovery attempt"
                );
                throw new Error(
                  `Voice connection timeout: Connection stuck in ${finalState} state after IP discovery error. This may indicate network issues or Discord API problems.`
                );
              }
            }
          } else {
            // If still not ready, check if we can proceed anyway (for debugging)
            botLogger.error(
              {
                currentState,
                guildId: this.opts.guildId,
              },
              "Connection not Ready - cannot proceed with audio setup"
            );
            throw new Error(
              `Voice connection timeout: Connection stuck in ${currentState} state. This may indicate network issues or Discord API problems.`
            );
          }
        }
      } else {
        // Connection is already Ready (reused), skip entersState wait
        botLogger.info(
          { guildId: this.opts.guildId },
          "Connection already Ready (reused), skipping entersState wait"
        );
      }

      botLogger.info(
        {
          guildId: this.opts.guildId,
          channelId: this.opts.channelId,
        },
        "Voice channel connected"
      );

      // Audio playback is now handled by handleResponseDone()
      // Resources are created per-response from collected chunks (reference project pattern)
      botLogger.info({ guildId: this.opts.guildId }, "Audio player ready - waiting for responses");
      console.log("[VoiceSession] Audio player ready - resources will be created per response");
      
      // Track AI speaking state (reference project pattern)
      this.player.on("stateChange", (oldState, newState) => {
        console.log(`[AudioPlayer] State: ${oldState.status} -> ${newState.status}`);
        
        // Track when AI starts speaking
        if (newState.status === AudioPlayerStatus.Playing) {
          this.isAiSpeaking = true;
          console.log("[VoiceSession] AI started speaking - user input blocked");
          botLogger.info({ guildId: this.opts.guildId }, "AI started speaking - user input blocked");
        }
        
        // Track when AI stops speaking
        if (
          newState.status === AudioPlayerStatus.Idle &&
          oldState.status === AudioPlayerStatus.Playing
        ) {
          this.isAiSpeaking = false;
          console.log("[VoiceSession] AI finished speaking - user input enabled");
          botLogger.info({ guildId: this.opts.guildId }, "AI finished speaking - user input enabled");
        }
      });
      
      // Verify connection is Ready before subscribing
      if (this.conn.state.status !== VoiceConnectionStatus.Ready) {
        botLogger.warn(
          {
            currentStatus: this.conn.state.status,
            guildId: this.opts.guildId,
          },
          "Connection not Ready when setting up audio - waiting"
        );
        await entersState(this.conn, VoiceConnectionStatus.Ready, 5_000);
      }
      
      botLogger.info({ guildId: this.opts.guildId }, "Subscribing player to voice connection");
      console.log("[VoiceSession] Subscribing player to voice connection");
      
      // Subscribe connection to player (required for audio to play)
      this.conn.subscribe(this.player);
      
      // Verify subscription was successful
      const subscription = this.conn.state.subscription;
      if (!subscription) {
        botLogger.error({ guildId: this.opts.guildId }, "Failed to subscribe player to connection");
        throw new Error("Failed to subscribe audio player to voice connection");
      }
      botLogger.info(
        {
          guildId: this.opts.guildId,
          hasSubscription: !!subscription,
          playerState: this.player.state.status,
        },
        "Player subscribed to connection successfully"
      );
      
      // Don't play anything yet - resources will be created and played when responses arrive
      botLogger.info({ guildId: this.opts.guildId }, "Audio player subscribed - ready for responses");
      console.log("[VoiceSession] Audio player subscribed - waiting for responses");
      
      // Log player state after play
      setTimeout(() => {
        const state = this.player.state.status;
        const connectionState = this.conn.state.status;
        const hasSubscription = !!this.conn.state.subscription;
        botLogger.info(
          {
            state,
            connectionState,
            hasSubscription,
            guildId: this.opts.guildId,
          },
          "AudioPlayer state after play"
        );
        console.log(`[AudioPlayer] State after play: ${state}, Connection: ${connectionState}, Has Subscription: ${hasSubscription}`);
      }, 100);

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

  /**
   * Handle response completion - process collected audio chunks and play
   * Reference project pattern: collect converted PCM chunks during response, then create resource when done
   */
  private handleResponseDone() {
    if (this.responseAudioChunks.length === 0) {
      console.log("[VoiceSession] Response done but no audio chunks collected");
      return;
    }

    console.log(`[VoiceSession] Processing ${this.responseAudioChunks.length} PCM chunks for playback`);
    botLogger.info(
      { guildId: this.opts.guildId, chunkCount: this.responseAudioChunks.length },
      "Processing collected PCM chunks"
    );

    try {
      // Combine all converted PCM chunks (already 48kHz stereo)
      const totalLength = this.responseAudioChunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const combinedPcm = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (const chunk of this.responseAudioChunks) {
        combinedPcm.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }

      console.log(`[VoiceSession] Combined ${totalLength} bytes PCM (48kHz stereo), creating audio resource`);

      // Create a Readable stream from the combined PCM (reference project pattern)
      const audioStream = new Readable({
        read() {}, // No-op - we'll push all data at once
      });

      // Push all PCM data to stream
      audioStream.push(combinedPcm);
      audioStream.push(null); // End the stream

      // Create resource using StreamType.Raw - Discord.js will encode to Opus internally
      const resource = createAudioResource(audioStream, {
        inputType: StreamType.Raw,
        inlineVolume: true,
        metadata: {
          guildId: this.opts.guildId,
          createdAt: Date.now(),
          pcmChunkCount: this.responseAudioChunks.length,
        },
      });

      // Set volume (optional, but reference project does this)
      resource.volume?.setVolume(1.0);

      this.currentResource = resource;

      // Play the resource
      this.player.play(resource);
      console.log(`[VoiceSession] Playing audio resource with ${this.responseAudioChunks.length} PCM chunks (${totalLength} bytes)`);
      botLogger.info(
        { guildId: this.opts.guildId, pcmChunkCount: this.responseAudioChunks.length, totalBytes: totalLength },
        "Playing audio resource"
      );

      // Clear chunks for next response (reference project pattern)
      this.responseAudioChunks = [];
      // Reset processing flag
      this.isProcessingResponse = false;
    } catch (error: any) {
      console.error("[VoiceSession] Error processing response audio:", error);
      botLogger.error({ error: error.message, guildId: this.opts.guildId }, "Failed to process response audio");
      // Clear chunks on error and reset flag
      this.responseAudioChunks = [];
      this.isProcessingResponse = false;
    }
  }

  /**
   * Create audio resource from Opus chunks and play it
   */
  private createAndPlayResource(opusChunks: Buffer[]) {
    if (opusChunks.length === 0) {
      console.error("[VoiceSession] No Opus chunks to create resource from");
      botLogger.error({ guildId: this.opts.guildId }, "No Opus chunks available");
      return;
    }

    try {
      // Combine all Opus chunks
      const totalOpusLength = opusChunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const combinedOpus = Buffer.allocUnsafe(totalOpusLength);
      let offset = 0;
      for (const chunk of opusChunks) {
        combinedOpus.set(new Uint8Array(chunk), offset);
        offset += chunk.length;
      }

      console.log(`[VoiceSession] Created ${totalOpusLength} bytes Opus data, creating resource`);

      // Create a fresh Readable stream (reference project pattern)
      const audioStream = new Readable({
        read() {}, // No-op
      });

      // Push all Opus data to stream
      audioStream.push(combinedOpus);
      audioStream.push(null); // End the stream

      // Create resource from the complete stream
      const resource = createAudioResource(audioStream, {
        inputType: StreamType.Opus,
        metadata: {
          guildId: this.opts.guildId,
          createdAt: Date.now(),
          opusChunkCount: opusChunks.length,
        },
      });

      this.currentResource = resource;

      // Play the resource
      this.player.play(resource);
      console.log(`[VoiceSession] Playing audio resource with ${opusChunks.length} Opus chunks`);
      botLogger.info(
        { guildId: this.opts.guildId, opusChunkCount: opusChunks.length },
        "Playing audio resource"
      );
    } catch (error: any) {
      console.error("[VoiceSession] Error creating/playing resource:", error);
      botLogger.error({ error: error.message, guildId: this.opts.guildId }, "Failed to create/play resource");
    }
  }


  stop() {
    botLogger.info({ guildId: this.opts.guildId }, "Stopping voice session");

    // Stop audio player first (reference project pattern)
    try {
      this.player.stop();
      console.log("[VoiceSession] Audio player stopped");
    } catch (error: any) {
      console.warn("[VoiceSession] Error stopping audio player:", error);
    }

    // Clear current resource if any
    if (this.currentResource) {
      try {
        // End any current audio streams
        if (this.currentResource.playbackDuration) {
          // Resource is playing - let it finish or stop it
        }
        this.currentResource = undefined;
      } catch {}
    }

    // Clear audio buffers (reference project pattern)
    this.responseAudioChunks = [];
    this.isProcessingResponse = false;
    this.isAiSpeaking = false; // Reset speaking state

    // Clean up all active subscriptions
    for (const [userId, stream] of this.activeSubscriptions.entries()) {
      try {
        stream.destroy();
      } catch {}
    }
    this.activeSubscriptions.clear();

    // Stop all audio pipelines
    for (const stop of this.stopPipes) {
      try {
        stop();
      } catch {}
    }
    this.stopPipes = [];

    // Stop transport and remove listeners (reference project pattern)
    try {
      // Remove all event listeners to prevent memory leaks
      if (this.transport && typeof (this.transport as any).removeAllListeners === 'function') {
        (this.transport as any).removeAllListeners();
        console.log("[VoiceSession] Removed transport event listeners");
      }
      this.transport.stop();
      console.log("[VoiceSession] Transport stopped");
    } catch (error: any) {
      console.warn("[VoiceSession] Error stopping transport:", error);
    }

    // Destroy connection
    try {
      this.conn?.destroy();
      console.log("[VoiceSession] Voice connection destroyed");
    } catch (error: any) {
      console.warn("[VoiceSession] Error destroying connection:", error);
    }
  }

  private wireReceiver() {
    const receiver = this.conn.receiver;

    console.log("[VoiceSession] Setting up audio receiver - waiting for users to speak");

    receiver.speaking.on("start", (userId: string) => {
      console.log(`[VoiceSession] User ${userId} started speaking`);
      botLogger.info({ userId, guildId: this.opts.guildId }, "User started speaking");

      // Check if user is allowed (if restrictions are set)
      if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
        console.log(`[VoiceSession] User ${userId} not in allowed list, ignoring`);
        botLogger.debug({ userId, allowedUsers: Array.from(this.allowedUserIds) }, "User not in allowed list, ignoring");
        return;
      }

      // Clean up existing subscription for this user if any
      const existingStream = this.activeSubscriptions.get(userId);
      if (existingStream) {
        try {
          existingStream.destroy();
        } catch {}
        this.activeSubscriptions.delete(userId);
      }

      console.log(`[VoiceSession] Subscribing to audio stream for user ${userId}`);
      botLogger.info({ userId }, "Subscribing to user audio stream");

      const opusStream = receiver.subscribe(userId, {
        end: { behavior: 0 }, // Manual end handling
      });

      // Set max listeners to avoid warnings
      opusStream.setMaxListeners(20);

      // Track this subscription
      this.activeSubscriptions.set(userId, opusStream);

      console.log(`[VoiceSession] Audio stream subscribed, wiring to OpenAI`);

      const wired = wireDiscordOpusToOpenAiPcm24k(
        opusStream,
        (b64Pcm24k) => {
          // Log periodically to show audio is flowing
          this.transport.appendAudioChunk(b64Pcm24k);
        }
      );

      this.stopPipes.push(() => {
        wired.stop();
        try {
          opusStream.destroy();
        } catch {}
        this.activeSubscriptions.delete(userId);
      });

      opusStream.on("end", () => {
        console.log(`[VoiceSession] User ${userId} stopped speaking - committing audio and requesting response`);
        botLogger.info({ userId }, "User stopped speaking, committing audio and requesting response");
        // Commit audio and request response
        this.transport.commitAudio();
        this.transport.requestResponse();
        // Clean up subscription
        this.activeSubscriptions.delete(userId);
      });

      opusStream.on("error", (error: any) => {
        console.error(`[VoiceSession] Error in audio stream for user ${userId}:`, error);
        botLogger.error({ error, userId }, "Error in audio stream");
        // Clean up subscription on error
        this.activeSubscriptions.delete(userId);
      });

      opusStream.on("close", () => {
        // Clean up subscription when stream closes
        this.activeSubscriptions.delete(userId);
      });

      opusStream.on("data", () => {
        // Log periodically that audio data is flowing
        console.log(`[VoiceSession] Audio data received from user ${userId}`);
      });
    });

    receiver.speaking.on("end", (userId: string) => {
      console.log(`[VoiceSession] User ${userId} stopped speaking (end event)`);
      botLogger.info({ userId }, "User stopped speaking (end event)");
      
      // With manual end handling (behavior: 0), we need to manually commit audio
      // when the user stops speaking, as the opusStream won't auto-end
      const opusStream = this.activeSubscriptions.get(userId);
      if (opusStream) {
        // Add a small delay to ensure all audio chunks have been appended to the buffer
        // OpenAI requires at least 100ms of audio before committing
        setTimeout(() => {
          console.log(`[VoiceSession] Manually committing audio for user ${userId} after speaking ended`);
          botLogger.info({ userId }, "Manually committing audio and requesting response");
          // Commit audio and request response
          this.transport.commitAudio();
          this.transport.requestResponse();
        }, 200); // 200ms delay to ensure buffer has enough audio
      }
    });
  }
}
