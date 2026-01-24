/**
 * OpenAI Realtime WebSocket Transport
 * Raw WebSocket implementation for OpenAI Realtime API
 */

import WebSocket from "ws";
import { botLogger } from "../utils/logger.js";
import type { ToolCallHandler, VoiceLLMTransport } from "./transport.js";
import { makeRealtimeRouter } from "./realtimeEventRouter.js";

export class RealtimeWsTransport implements VoiceLLMTransport {
  private ws?: WebSocket;
  private audioCb: (b64: string) => void = () => {};
  private responseDoneCb: () => void = () => {}; // Callback when response.done fires
  private toolHandler?: ToolCallHandler;
  private sessionConfig?: { instructions: string; tools: any[]; voice?: string };

  onAudioDelta(cb: (pcmBase64: string) => void) {
    this.audioCb = cb;
  }

  onResponseDone(cb: () => void) {
    this.responseDoneCb = cb;
  }

  setToolHandler(handler: ToolCallHandler) {
    this.toolHandler = handler;
  }

  configure(opts: { instructions: string; tools: any[]; voice?: string }) {
    this.sessionConfig = opts;
  }

  async start() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
    // Valid voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
    const voice = process.env.OPENAI_VOICE || "alloy";

    const protocols: string[] = [
      "realtime",
      `openai-insecure-api-key.${apiKey}`,
    ];

    if (process.env.OPENAI_ORG_ID) {
      protocols.push(`openai-organization.${process.env.OPENAI_ORG_ID}`);
    }

    if (process.env.OPENAI_PROJECT_ID) {
      protocols.push(`openai-project.${process.env.OPENAI_PROJECT_ID}`);
    }

    // Model is always "gpt-realtime" - voice is configured in session.update
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    
    botLogger.info({ model, voice, url }, "Connecting to OpenAI Realtime API");

    this.ws = new WebSocket(url, protocols);

    const router = makeRealtimeRouter({
      send: (e) => this.send(e),
      onAudioDelta: (b64) => this.audioCb(b64),
      onResponseDone: () => this.responseDoneCb(),
      getToolHandler: () => this.toolHandler,
    });

    this.ws.on("open", () => {
      botLogger.info({ transport: "realtime-ws" }, "OpenAI WebSocket connected");

      const cfg = this.sessionConfig ?? {
        instructions: "You are a Discord voice assistant. Be concise and safe.",
        tools: [],
        voice: voice, // Use the voice from environment/default
      };

      // Reference project pattern (from configureSession method):
      // 1. Instructions are set in session.update (NOT name - name is only in RealtimeAgent constructor)
      // 2. Voice defaults to "alloy" in reference
      //    Priority: cfg.voice (from configure call) > voice (env var) > "alloy"
      // Valid voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
      const sessionVoice = cfg.voice || voice || "alloy"; // Default to "alloy"
      
      console.log(`[RealtimeWS] Configuring session - Voice: ${sessionVoice}, Config voice: ${cfg.voice}, Env voice: ${voice}`);
      botLogger.info({ 
        configVoice: cfg.voice,
        envVoice: voice,
        finalVoice: sessionVoice,
        hasSessionConfig: !!this.sessionConfig,
        instructionsPreview: cfg.instructions.substring(0, 100) + "..."
      }, "Voice and instructions configuration resolved");
      
      // Voice and instructions are configured in session.update
      // Reference project pattern: Match their exact structure
      const sessionUpdate = {
        type: "session.update",
        session: {
          type: "realtime",
          model: "gpt-realtime",
          output_modalities: ["audio"],
          audio: {
            input: {
              turn_detection: {
                type: "server_vad",
                threshold: 0.8,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000,
                create_response: false,
              },
            },
            output: {
              voice: sessionVoice, // Use determined voice (defaults to "onyx")
              speed: 1.0,
            },
          },
          tools: cfg.tools,
          tool_choice: "auto",
          instructions: cfg.instructions, // Instructions include "You are GIRTH..." (agent name/personality)
        },
      };
      
      console.log(`[RealtimeWS] Sending session.update - Voice: ${sessionUpdate.session.audio.output.voice}, Instructions length: ${sessionUpdate.session.instructions.length}`);
      this.send(sessionUpdate);
      
      botLogger.info({ 
        voice: sessionVoice, 
        model, 
        instructionsLength: cfg.instructions.length,
        instructionsStart: cfg.instructions.substring(0, 50) + "..."
      }, "Session configured with voice and instructions (GIRTH personality)");
    });

    this.ws.on("message", async (msg) => {
      try {
        const evt = JSON.parse(msg.toString());
        await router(evt);
      } catch (e) {
        // Ignore parse errors
        console.debug("[Realtime WS] Parse error:", e);
      }
    });

    this.ws.on("close", () => {
      botLogger.warn({ transport: "realtime-ws" }, "OpenAI WebSocket closed");
    });

    this.ws.on("error", (err) => {
      botLogger.error({ err, transport: "realtime-ws" }, "OpenAI WebSocket error");
    });
  }

  async stop() {
    try {
      this.ws?.close();
    } catch {}
  }

  appendAudioChunk(pcmBase64: string) {
    this.send({ type: "input_audio_buffer.append", audio: pcmBase64 });
  }

  commitAudio() {
    this.send({ type: "input_audio_buffer.commit" });
  }

  requestResponse() {
    this.send({ type: "response.create" });
  }

  sendUserText(text: string) {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    this.send({ type: "response.create" });
  }

  private send(evt: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.ws.send(JSON.stringify(evt));
    } catch (e) {
      console.error("[Realtime WS] Send error:", e);
    }
  }
}
