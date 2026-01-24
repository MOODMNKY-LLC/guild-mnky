/**
 * OpenAI PCM to Discord Opus Pipeline
 * Converts OpenAI PCM audio (24kHz) to Discord Opus (48kHz) format
 */

import { PassThrough, Readable } from "node:stream";
import prism from "prism-media";
import { makePcmResampler } from "./ffmpegResample.js";

export type OutboundAudioOpts = {
  openaiRate?: number; // Default: 24000
  discordRate?: number; // Default: 48000
  channels?: number; // Default: 1
};

export function makeOpenAiPcm24kToDiscordOpus(
  opts: OutboundAudioOpts = {}
): {
  opusStream: Readable;
  writePcmBase64: (b64: string) => void;
  end: () => void;
} {
  const openaiRate = opts.openaiRate ?? 24000;
  const discordRate = opts.discordRate ?? 48000;
  const channels = opts.channels ?? 1;

  const pcmIn = new PassThrough({ objectMode: false });
  const opusOut = new PassThrough({ objectMode: false });
  
  // CRITICAL: Keep stream in flowing mode and prevent premature ending
  // When createAudioResource reads from the stream, if it's in paused mode or ends,
  // the resource will end prematurely. We need to ensure it stays readable.
  opusOut.on("end", () => {
    console.log("[AudioPipeline] Opus stream ended - this should not happen during active playback");
  });
  
  // Ensure stream is readable and doesn't end prematurely
  // Keep the stream in flowing mode by resuming if paused
  opusOut.on("readable", () => {
    // Stream is readable - ensure it stays flowing
    if (opusOut.isPaused()) {
      console.log("[AudioPipeline] Opus stream was paused - resuming");
      opusOut.resume();
    }
  });
  
  // Log when data flows through the final Opus output stream
  opusOut.on("data", (chunk: Buffer) => {
    console.log(`[AudioPipeline] Opus stream output: ${chunk.length} bytes`);
  });
  
  // Ensure stream starts in flowing mode (not paused)
  opusOut.resume();

  const ffmpeg = makePcmResampler({
    inRate: openaiRate,
    outRate: discordRate,
    channels,
  });

  const encoder = new prism.opus.Encoder({
    rate: discordRate,
    channels,
    frameSize: 960, // 20ms @ 48kHz mono
  });

  // Pipeline: PCM 24k → FFmpeg → PCM 48k → Opus Encoder → Opus Stream
  // Log when data flows into FFmpeg (before piping, so we can see it)
  pcmIn.on("data", (chunk: Buffer) => {
    console.log(`[AudioPipeline] PCM data flowing into FFmpeg: ${chunk.length} bytes`);
  });
  
  if (ffmpeg.stdin) {
    pcmIn.pipe(ffmpeg.stdin);
  }
  
  // Monitor FFmpeg process
  ffmpeg.on("error", (error: any) => {
    console.error("[AudioPipeline] FFmpeg process error:", error);
  });
  
  ffmpeg.on("exit", (code: number, signal: string) => {
    console.log(`[AudioPipeline] FFmpeg exited with code ${code}, signal ${signal}`);
  });
  
  if (ffmpeg.stdout) {
    // Log when FFmpeg produces output
    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      console.log(`[AudioPipeline] FFmpeg output: ${chunk.length} bytes PCM48k`);
    });
    
    ffmpeg.stdout.on("error", (error: any) => {
      console.error("[AudioPipeline] FFmpeg stdout error:", error);
    });
    
    ffmpeg.stdout.pipe(encoder);
  }
  
  // Log when encoder produces Opus frames
  encoder.on("data", (chunk: Buffer) => {
    console.log(`[AudioPipeline] Opus encoder output: ${chunk.length} bytes`);
  });
  
  encoder.pipe(opusOut);

  // Add error handlers to pipeline
  pcmIn.on("error", (error: any) => {
    console.error("[AudioPipeline] PCM input stream error:", error);
  });
  
  if (ffmpeg.stderr) {
    // Log ALL FFmpeg stderr output for debugging
    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString();
      console.log(`[FFmpeg stderr] ${message.trim()}`);
      if (message.includes("error") || message.includes("Error") || message.includes("Invalid")) {
        console.error("[FFmpeg] Error detected:", message);
      }
    });
    
    ffmpeg.stderr.on("error", (error: any) => {
      console.error("[AudioPipeline] FFmpeg stderr stream error:", error);
    });
  }
  
  encoder.on("error", (error: any) => {
    console.error("[AudioPipeline] Opus encoder error:", error);
  });
  
  opusOut.on("error", (error: any) => {
    console.error("[AudioPipeline] Opus output stream error:", error);
  });

  return {
    opusStream: opusOut,
    writePcmBase64(b64: string) {
      try {
        const buf = Buffer.from(b64, "base64");
        console.log(`[AudioPipeline] Writing ${buf.length} bytes PCM to pipeline`);
        const written = pcmIn.write(buf);
        if (!written) {
          console.warn("[AudioPipeline] Backpressure detected - stream buffer full");
        }
      } catch (error: any) {
        console.error("[AudioPipeline] Error writing PCM:", error);
        throw error;
      }
    },
    end() {
      try {
        pcmIn.end();
      } catch {}
      try {
        ffmpeg.kill("SIGTERM");
      } catch {}
    },
  };
}
