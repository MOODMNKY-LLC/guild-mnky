/**
 * PCM Audio Chunker
 * Chunks PCM audio streams into fixed-size frames for transmission
 */

import { Transform } from "node:stream";

export function makePcmChunker(bytesPerChunk: number): Transform {
  let buffer = Buffer.alloc(0);

  return new Transform({
    transform(chunk, _enc, cb) {
      buffer = Buffer.concat([buffer, chunk as Buffer]);

      while (buffer.length >= bytesPerChunk) {
        this.push(buffer.subarray(0, bytesPerChunk));
        buffer = buffer.subarray(bytesPerChunk);
      }
      cb();
    },
    flush(cb) {
      // Drop remainder for real-time streaming
      buffer = Buffer.alloc(0);
      cb();
    },
  });
}
