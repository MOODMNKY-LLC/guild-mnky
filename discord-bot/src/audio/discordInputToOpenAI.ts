/**
 * Discord Opus to OpenAI PCM Pipeline
 * Converts Discord Opus audio (48kHz) to OpenAI PCM (24kHz) format
 */

import prism from "prism-media";
import { pipeline } from "node:stream";
import { makePcmResampler } from "./ffmpegResample.js";
import { makePcmChunker } from "./pcmChunker.js";

export type InboundAudioOpts = {
  discordRate?: number; // Default: 48000
  openaiRate?: number; // Default: 24000
  channels?: number; // Default: 1
  chunkMs?: number; // Default: 20
};

export function wireDiscordOpusToOpenAiPcm24k(
  opusStream: NodeJS.ReadableStream,
  onChunkBase64: (b64pcm: string) => void,
  opts: InboundAudioOpts = {}
): { stop: () => void } {
  const discordRate = opts.discordRate ?? 48000;
  const openaiRate = opts.openaiRate ?? 24000;
  const channels = opts.channels ?? 1;
  const chunkMs = opts.chunkMs ?? 20;

  // Calculate bytes per chunk: (rate * chunkMs / 1000) * 2 bytes/sample * channels
  // For 24kHz mono 20ms: (24000 * 20 / 1000) * 2 * 1 = 960 bytes
  const bytesPerChunk = Math.floor((openaiRate * chunkMs) / 1000) * 2 * channels;

  const decoder = new prism.opus.Decoder({
    rate: discordRate,
    channels,
    frameSize: 960, // Common frame size, decoder is tolerant
  });

  const ffmpeg = makePcmResampler({
    inRate: discordRate,
    outRate: openaiRate,
    channels,
  });

  const chunker = makePcmChunker(bytesPerChunk);

  chunker.on("data", (pcm: Buffer) => {
    onChunkBase64(pcm.toString("base64"));
  });

  // Pipeline: Opus stream → Decoder → FFmpeg stdin
  if (ffmpeg.stdin) {
    pipeline(opusStream, decoder, ffmpeg.stdin, (err: Error | null) => {
      if (err) {
        console.error("[Audio Pipeline] Decoder error:", err);
      }
    });
  }

  // Pipeline: FFmpeg stdout → Chunker → Base64 callback
  if (ffmpeg.stdout) {
    pipeline(ffmpeg.stdout, chunker, (err: Error | null) => {
      if (err) {
        console.error("[Audio Pipeline] Chunker error:", err);
      }
    });
  }

  return {
    stop() {
      try {
        ffmpeg.kill("SIGKILL");
      } catch {}
      try {
        decoder.destroy();
      } catch {}
      try {
        (opusStream as any).destroy?.();
      } catch {}
    },
  };
}
