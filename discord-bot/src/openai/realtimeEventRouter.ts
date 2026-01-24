/**
 * OpenAI Realtime Event Router
 * Routes events from OpenAI Realtime API to appropriate handlers
 */

import type { ToolCallHandler } from "./transport.js";

export type RealtimeRouterDeps = {
  send: (evt: any) => void;
  onAudioDelta: (b64: string) => void;
  onResponseDone: () => void; // Callback when response.done fires
  getToolHandler: () => ToolCallHandler | undefined;
};

export function makeRealtimeRouter(params: RealtimeRouterDeps) {
  return async (evt: any) => {
    // Audio output deltas
    if (evt?.type === "response.output_audio.delta") {
      // OpenAI sends audio data directly in evt.delta as a base64 string
      // OR as evt.delta.audio (check both)
      let audioData: string | undefined;
      
      if (typeof evt?.delta === 'string') {
        // Delta is directly the base64 audio string
        audioData = evt.delta;
      } else if (evt?.delta?.audio && typeof evt.delta.audio === 'string') {
        // Delta has an audio property with base64 string
        audioData = evt.delta.audio;
      } else if (Buffer.isBuffer(evt?.delta) || evt?.delta instanceof Uint8Array) {
        // Delta is a Buffer/Uint8Array - convert to base64
        audioData = Buffer.from(evt.delta).toString('base64');
      }
      
      if (audioData && audioData.length > 0) {
        const byteLength = audioData.length;
        console.log(`[Realtime Event] Audio output delta received (${byteLength} base64 chars)`);
        params.onAudioDelta(audioData);
      } else {
        console.log(`[Realtime Event] Audio output delta received but empty or missing`);
        console.log(`[Realtime Event] Delta type: ${typeof evt?.delta}, isBuffer: ${Buffer.isBuffer(evt?.delta)}, isUint8Array: ${evt?.delta instanceof Uint8Array}`);
      }
      return;
    }

    // Log important events for debugging
    if (evt?.type === "input_audio_buffer.speech_started") {
      console.log(`[Realtime Event] Speech started - OpenAI detected speech`);
    }
    
    if (evt?.type === "input_audio_buffer.speech_stopped") {
      console.log(`[Realtime Event] Speech stopped - processing audio`);
    }
    
    if (evt?.type === "response.audio_transcript.delta") {
      console.log(`[Realtime Event] Transcript delta: ${evt.delta}`);
    }
    
    if (evt?.type === "response.audio_transcript.done") {
      console.log(`[Realtime Event] Transcript done: ${evt.transcript}`);
    }
    
    if (evt?.type === "response.content.delta") {
      console.log(`[Realtime Event] Response content delta: ${evt.delta}`);
    }
    
    if (evt?.type === "response.content.done") {
      console.log(`[Realtime Event] Response content done - generating audio`);
      console.log(`[Realtime Event] Content:`, evt.content);
    }
    
    if (evt?.type === "response.done") {
      console.log(`[Realtime Event] Response done - audio should be playing`);
      console.log(`[Realtime Event] Response metadata:`, {
        hasOutputItem: !!evt.output_item,
        outputItemType: evt.output_item?.type,
        hasAudio: !!evt.output_item?.audio,
      });
      // Trigger callback to process collected audio chunks
      params.onResponseDone();
    }
    
    if (evt?.type === "error") {
      console.error(`[Realtime Event] Error:`, evt);
    }

    // Tool call lifecycle
    if (evt?.type === "conversation.item.created") {
      const item = evt.item;
      if (item?.type === "function_call") {
        const handler = params.getToolHandler();
        if (!handler) return;

        const name = item.name;
        const callId = item.call_id;
        const argumentsJson = item.arguments ?? "{}";

        let outputJson: string;
        try {
          outputJson = await handler({ name, callId, argumentsJson });
        } catch (e: any) {
          outputJson = JSON.stringify({
            ok: false,
            error: e?.message ?? "Tool execution error",
          });
        }

        // Send function call output back
        params.send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: outputJson,
          },
        });

        // Prompt model to continue
        params.send({ type: "response.create" });
        return;
      }
    }

    // Log other events for debugging (can be removed in production)
    if (evt?.type && !evt.type.includes("response.output_audio")) {
      console.debug("[Realtime Event]", evt.type);
    }
  };
}

function safeJsonParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
