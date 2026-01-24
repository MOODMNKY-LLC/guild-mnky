/**
 * FFmpeg PCM Resampling Utility
 * Resamples PCM audio between different sample rates using ffmpeg-static
 */

import { spawn, ChildProcess } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export type ResampleOpts = {
  inRate: number;
  outRate: number;
  channels?: number;
};

export function makePcmResampler(params: ResampleOpts): ChildProcess {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary not available on this platform");
  }

  const { inRate, outRate, channels = 1 } = params;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-flush_packets",
    "1", // Force immediate output flushing for real-time streaming
    "-f",
    "s16le",
    "-ar",
    String(inRate),
    "-ac",
    String(channels),
    "-i",
    "pipe:0",
    "-f",
    "s16le",
    "-ar",
    String(outRate),
    "-ac",
    String(channels),
    "-flush_packets",
    "1", // Also flush output packets immediately
    "pipe:1",
  ];

  return spawn(ffmpegPath, args, { stdio: ["pipe", "pipe", "pipe"] });
}
