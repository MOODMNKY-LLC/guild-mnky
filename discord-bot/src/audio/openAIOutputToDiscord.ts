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

  const pcmIn = new PassThrough();
  const opusOut = new PassThrough();

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
  if (ffmpeg.stdin) {
    pcmIn.pipe(ffmpeg.stdin);
  }
  if (ffmpeg.stdout) {
    ffmpeg.stdout.pipe(encoder).pipe(opusOut);
  }

  return {
    opusStream: opusOut,
    writePcmBase64(b64: string) {
      const buf = Buffer.from(b64, "base64");
      pcmIn.write(buf);
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
