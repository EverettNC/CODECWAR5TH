/**
 * The Dispersion Mic canal's tape: real microphone audio, taken in as the
 * browser hands it over (any rate, any chunk size), brought to 16 kHz, kept
 * for the last few seconds, and measured frame by frame as it arrives.
 *
 * Frames are measured once, when their 25 ms window is complete, so a live
 * canal costs one frame of analysis per 10 ms of audio, not a re-analysis of
 * the whole tape. The kept audio always starts on the 10 ms frame grid, so
 * the frames held here are exactly extractFrames(pcm()).
 */

import { extractFrame, HOP, SAMPLE_RATE, WIN, type Frame } from "./dsp.ts";

/**
 * Microphone capture for measurement: the raw voice. The browser's echo
 * cancellation, noise suppression and automatic gain all reshape the signal
 * before any code sees it, so every one of them is off.
 */
export const RAW_MIC = {
  channelCount: 1,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
} as const satisfies MediaTrackConstraints;

export class MicTape {
  readonly capSamples: number;
  private buf: Float32Array;
  private len = 0;
  /** Samples ever written at 16 kHz; the tape holds [total - len, total). */
  private total = 0;
  /** Absolute 16 kHz offset of the next frame to measure. */
  private nextFrame = 0;
  private held: Frame[] = [];
  /** Streaming linear resampler state. */
  private rate = 0;
  private step = 1;
  private t = 0;
  private last = 0;
  private scratch: number[] = [];

  constructor(seconds: number) {
    // Whole frames' worth of hops, so dropping old audio keeps the grid.
    this.capSamples = Math.max(WIN, Math.ceil((seconds * SAMPLE_RATE) / HOP) * HOP);
    this.buf = new Float32Array(this.capSamples);
  }

  /** Append one chunk of microphone samples recorded at `rate` Hz. */
  push(chunk: Float32Array, rate: number) {
    if (!chunk.length || !(rate > 0)) return;
    if (rate !== this.rate) {
      this.rate = rate;
      this.step = rate / SAMPLE_RATE;
      this.t = 0;
      this.last = chunk[0]!;
    }
    const out = this.scratch;
    out.length = 0;
    if (rate === SAMPLE_RATE) {
      for (let i = 0; i < chunk.length; i++) out.push(chunk[i]!);
    } else {
      let t = this.t;
      const n = chunk.length;
      while (t < n - 1) {
        if (t < 0) {
          const f = t + 1;
          out.push(this.last * (1 - f) + chunk[0]! * f);
        } else {
          const i = Math.floor(t);
          const f = t - i;
          out.push(chunk[i]! * (1 - f) + chunk[i + 1]! * f);
        }
        t += this.step;
      }
      this.t = t - n;
      this.last = chunk[n - 1]!;
    }
    this.append(out);
  }

  private append(samples: number[]) {
    for (let k = 0; k < samples.length; ) {
      if (this.len === this.capSamples) this.dropOldest();
      const room = this.capSamples - this.len;
      const take = Math.min(room, samples.length - k);
      for (let j = 0; j < take; j++) this.buf[this.len + j] = samples[k + j]!;
      this.len += take;
      this.total += take;
      k += take;
      this.measure();
    }
  }

  /** Drop the oldest quarter of the tape, a whole number of hops. */
  private dropOldest() {
    const drop = Math.max(HOP, Math.floor(this.capSamples / 4 / HOP) * HOP);
    this.buf.copyWithin(0, drop, this.len);
    this.len -= drop;
    const start = this.total - this.len;
    while (this.held.length && this.frameStart(0) < start) this.held.shift();
    if (this.nextFrame < start) this.nextFrame = start;
  }

  private frameStart(i: number) {
    return this.nextFrame - (this.held.length - i) * HOP;
  }

  private measure() {
    const start = this.total - this.len;
    while (this.nextFrame + WIN <= this.total) {
      this.held.push(extractFrame(this.buf, this.nextFrame - start));
      this.nextFrame += HOP;
    }
  }

  /** The kept audio, 16 kHz, oldest first. A copy. */
  pcm(): Float32Array {
    return this.buf.slice(0, this.len);
  }

  /** The kept audio's frames, oldest first: equal to extractFrames(pcm()). */
  frames(): Frame[] {
    return this.held.slice();
  }

  /** Seconds of microphone audio taken in since the canal opened. */
  get secondsHeard() {
    return this.total / SAMPLE_RATE;
  }
}
