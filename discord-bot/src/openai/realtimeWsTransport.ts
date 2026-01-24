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
  private toolHandler?: ToolCallHandler;
  private sessionConfig?: { instructions: string; tools: any[]; voice?: string };

  onAudioDelta(cb: (pcmBase64: string) => void) {
    this.audioCb = cb;
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
    const voice = process.env.OPENAI_VOICE || "onyx";

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

    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;

    this.ws = new WebSocket(url, protocols);

    const router = makeRealtimeRouter({
      send: (e) => this.send(e),
      onAudioDelta: (b64) => this.audioCb(b64),
      getToolHandler: () => this.toolHandler,
    });

    this.ws.on("open", () => {
      botLogger.info({ transport: "realtime-ws" }, "OpenAI WebSocket connected");

      const cfg = this.sessionConfig ?? {
        instructions: "You are a Discord voice assistant. Be concise and safe.",
        tools: [],
        voice,
      };

      this.send({
        type: "session.update",
        session: {
          type: "realtime",
          modalities: ["audio", "text"],
          instructions: cfg.instructions,
          voice: cfg.voice,
          audio: {
            input: { format: { type: "audio/pcm", rate: 24000 } },
            output: { format: { type: "audio/pcm", rate: 24000 } },
          },
          tools: cfg.tools,
          tool_choice: "auto",
          // Optional: Enable server VAD once stable
          // turn_detection: { type: "server_vad" },
        },
      });
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
