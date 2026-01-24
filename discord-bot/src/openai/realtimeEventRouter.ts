/**
 * OpenAI Realtime Event Router
 * Routes events from OpenAI Realtime API to appropriate handlers
 */

import type { ToolCallHandler } from "./transport.js";

export type RealtimeRouterDeps = {
  send: (evt: any) => void;
  onAudioDelta: (b64: string) => void;
  getToolHandler: () => ToolCallHandler | undefined;
};

export function makeRealtimeRouter(params: RealtimeRouterDeps) {
  return async (evt: any) => {
    // Audio output deltas
    if (evt?.type === "response.output_audio.delta" && evt?.delta?.audio) {
      params.onAudioDelta(evt.delta.audio);
      return;
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
