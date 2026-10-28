/**
 * Synthetic frame recordings for the align, bank and stitch tests: phones are
 * made-up envelope shapes with known boundaries, so a test can say exactly
 * where every phone is. Test data only; nothing here is a voice.
 */
import { AP_BANDS, ENV_POINTS, FRAME_SR, HOP, envGridHz, type FrameTrack } from "./frames.ts";
import type { WordToken } from "./bank.ts";

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Each test phone: a resonance at hz, voiced or not, and a noise fraction. */
export const PROTOS: Record<string, { hz: number; voiced: boolean; ap: number }> = {
  AA: { hz: 700, voiced: true, ap: 0.1 },
  IY: { hz: 2300, voiced: true, ap: 0.1 },
  UW: { hz: 350, voiced: true, ap: 0.1 },
  S: { hz: 6000, voiced: false, ap: 1 },
  M: { hz: 250, voiced: true, ap: 0.2 },
  T: { hz: 4000, voiced: false, ap: 1 },
  L: { hz: 1100, voiced: true, ap: 0.15 },
};

export type Truth = { word: string; phones: string[]; bounds: number[] };

/** A recording of words (lists of phones), optionally a pause after each; returns the track, its tokens and the true phone boundaries. */
export function record(words: { word: string; phones: string[]; pauseAfter?: boolean }[], seed = 1, rec = 0) {
  const r = rng(seed);
  const g = envGridHz();
  const f0: number[] = [];
  const env: number[] = [];
  const ap: number[] = [];
  const rms: number[] = [];
  const silence = (n: number) => {
    for (let i = 0; i < n; i++) {
      f0.push(0);
      for (let j = 0; j < ENV_POINTS; j++) env.push(-80 + r());
      for (let b = 0; b < AP_BANDS; b++) ap.push(1);
      rms.push(-80);
    }
  };
  silence(30);
  const truth: Truth[] = [];
  const tokens: WordToken[] = [];
  for (const w of words) {
    const bounds = [f0.length];
    for (const p of w.phones) {
      const pr = PROTOS[p]!;
      const len = 6 + Math.floor(r() * 8);
      for (let i = 0; i < len; i++) {
        f0.push(pr.voiced ? 130 + 10 * r() : 0);
        for (let j = 0; j < ENV_POINTS; j++) env.push(-40 + 30 * Math.exp(-(((g[j]! - pr.hz) / 300) ** 2)) + (r() - 0.5) * 2);
        for (let b = 0; b < AP_BANDS; b++) ap.push(pr.ap);
        rms.push(pr.voiced ? -20 : -32);
      }
      bounds.push(f0.length);
    }
    truth.push({ word: w.word, phones: w.phones, bounds });
    tokens.push({ rec, word: w.word, start: (bounds[0]! * HOP) / FRAME_SR, end: (bounds[bounds.length - 1]! * HOP) / FRAME_SR, conf: 1, phones: w.phones });
    if (w.pauseAfter) silence(50);
  }
  silence(30);
  const n = f0.length;
  const track: FrameTrack = {
    sr: FRAME_SR,
    hop: HOP,
    n,
    f0: Float64Array.from(f0),
    envDb: Float64Array.from(env),
    ap: Float64Array.from(ap),
    rmsDb: Float64Array.from(rms),
    periodicity: Float64Array.from(f0, (f) => (f > 0 ? 0.9 : 0)),
  };
  return { track, tokens, truth };
}
