/**
 * What goes to the Filament door, and when. The mic hands over chunks; this
 * decides each request: half a second at a time while listening, one request
 * in flight at a time, and when listening stops, everything left with the end
 * flag, sent after the request in flight comes back. Nothing heard is dropped:
 * not the last words, and not an utterance shorter than half a second.
 *
 * The network call itself is filamentLive (filament.ts); the engine sends
 * each request this hands it and passes the door's reply back to done().
 */

import { SAMPLE_RATE } from "./dsp.ts";
import type { FilamentReply } from "./filament.ts";

export type FilamentRequest = { samples: Float32Array; reset: boolean; end: boolean };

export class FilamentStream {
  readonly minSamples: number;
  private chunks: Float32Array[] = [];
  private held = 0;
  private started = false;
  private inFlight = false;
  private ending = false;
  private ended = false;
  private finals: string[] = [];
  private partial = "";

  constructor(minSamples = SAMPLE_RATE / 2) {
    this.minSamples = minSamples;
  }

  /** Mic audio, 16 kHz mono. Ignored once finish() has been called. */
  push(chunk: Float32Array) {
    if (this.ending || !chunk.length) return;
    this.chunks.push(Float32Array.from(chunk));
    this.held += chunk.length;
  }

  /** Listening has stopped: what is held goes with the end flag. */
  finish() {
    this.ending = true;
  }

  /** The next request to send now, or null: one is in flight, too little audio, or done. */
  next(): FilamentRequest | null {
    if (this.inFlight || this.ended) return null;
    if (this.ending) {
      this.ended = true;
      // Never opened and nothing heard: there is no session to end.
      if (!this.started && this.held === 0) return null;
      return this.take(true);
    }
    if (this.held < this.minSamples) return null;
    return this.take(false);
  }

  private take(end: boolean): FilamentRequest {
    const samples = new Float32Array(this.held);
    let at = 0;
    for (const c of this.chunks) {
      samples.set(c, at);
      at += c.length;
    }
    this.chunks = [];
    this.held = 0;
    const reset = !this.started;
    this.started = true;
    this.inFlight = true;
    return { samples, reset, end };
  }

  /** The door's reply to the request in flight; null when the door did not answer. */
  done(reply: FilamentReply | null) {
    this.inFlight = false;
    if (!reply || !reply.ok) return;
    const words = (reply.text || "").trim();
    if (reply.final && words) this.finals.push(words);
    this.partial = (reply.partial || "").trim();
  }

  /** Final words so far, then the words still being heard. */
  get text(): string {
    return [...this.finals, this.partial].filter(Boolean).join(" ");
  }

  /** True once the end request has gone and come back. */
  get finished(): boolean {
    return this.ended && !this.inFlight;
  }
}
