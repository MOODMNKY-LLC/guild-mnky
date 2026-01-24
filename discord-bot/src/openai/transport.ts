/**
 * Voice LLM Transport Interface
 * Abstraction layer for OpenAI Realtime API communication
 * Allows swapping between WebSocket and Agents SDK implementations
 */

export type ToolCallHandler = (call: {
  name: string;
  callId: string;
  argumentsJson: string;
}) => Promise<string>; // Returns JSON string output

export type VoiceLLMTransport = {
  start(): Promise<void>;
  stop(): Promise<void>;

  // Audio input: base64 PCM16 mono @ 24kHz chunks
  appendAudioChunk(pcmBase64: string): void;
  commitAudio(): void;
  requestResponse(): void;

  // Text injection (optional)
  sendUserText(text: string): void;

  // Subscribe to audio output: base64 PCM16 @ 24kHz deltas/chunks
  onAudioDelta(cb: (pcmBase64: string) => void): void;

  // Subscribe to response completion: fires when response.done event occurs
  onResponseDone(cb: () => void): void;

  // Tool handler
  setToolHandler(handler: ToolCallHandler): void;

  // Configure session/tools/instructions
  configure(opts: {
    instructions: string;
    tools: any[];
    voice?: string;
  }): void;
};
