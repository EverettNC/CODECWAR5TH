/**
 * Corti card + tape from one canal's frames.
 * The ear measures. It does not classify.
 * A null f0 is a hole, not a zero. Never interpolate across it.
 * Tape cap 360 drops the TAIL — the ending is gone, not the onset.
 */

import { FRAME_SEC, type Frame } from "./dsp.ts";

export const TAPE_CAP = 360;

export type CortiCard = {
  duration: number;
  attack: number;
  decay: number | null;
  peakRms: number;
  medianF0: number | null;
  lastF1: number | null;
  lastF2: number | null;
  meanZcr: number;
  voiced: boolean;
  truncated: boolean;
};

export type TapeFrame = {
  t: number;
  rms: number;
  zcr: number;
  f0: number | null;
};

export type CanalLive = {
  rms: number;
  zcr: number;
  f0: number | null;
  f1: number | null;
  f2: number | null;
  centroid: number;
  voiced: boolean;
};

export const EMPTY_LIVE: CanalLive = {
  rms: 0,
  zcr: 0,
  f0: null,
  f1: null,
  f2: null,
  centroid: 0,
  voiced: false,
};

export const EMPTY_CARD: CortiCard = {
  duration: 0,
  attack: 0,
  decay: null,
  peakRms: 0,
  medianF0: null,
  lastF1: null,
  lastF2: null,
  meanZcr: 0,
  voiced: false,
  truncated: false,
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function liveFromFrame(frame: Frame | undefined): CanalLive {
  if (!frame) return { ...EMPTY_LIVE };
  const voiced = frame.f0 > 0 && frame.voiced > 0.2;
  return {
    rms: frame.power,
    zcr: frame.zcr,
    f0: voiced ? frame.f0 : null,
    f1: frame.f1 > 0 ? frame.f1 : null,
    f2: frame.f2 > 0 ? frame.f2 : null,
    centroid: frame.centroid,
    voiced,
  };
}

export function cardFromFrames(frames: Frame[]): CortiCard {
  if (!frames.length) return { ...EMPTY_CARD };
  const truncated = frames.length > TAPE_CAP;
  const used = truncated ? frames.slice(0, TAPE_CAP) : frames;
  const duration = used.length * FRAME_SEC;
  let peakRms = 0;
  let peakAt = 0;
  let zcrSum = 0;
  const f0s: number[] = [];
  let lastF1: number | null = null;
  let lastF2: number | null = null;
  for (let i = 0; i < used.length; i++) {
    const f = used[i]!;
    zcrSum += f.zcr;
    if (f.power > peakRms) {
      peakRms = f.power;
      peakAt = i;
    }
    if (f.f0 > 0 && f.voiced > 0.2) f0s.push(f.f0);
    if (f.f1 > 0) lastF1 = f.f1;
    if (f.f2 > 0) lastF2 = f.f2;
  }
  let decay: number | null = null;
  const half = peakRms * 0.5;
  for (let i = peakAt + 1; i < used.length; i++) {
    if (used[i]!.power <= half) {
      decay = (i - peakAt) * FRAME_SEC;
      break;
    }
  }
  if (truncated && decay === null) decay = null;
  const medianF0 = median(f0s);
  return {
    duration,
    attack: peakAt * FRAME_SEC,
    decay,
    peakRms,
    medianF0,
    lastF1,
    lastF2,
    meanZcr: zcrSum / used.length,
    voiced: medianF0 !== null,
    truncated,
  };
}

export function tapeFromFrames(frames: Frame[]): TapeFrame[] {
  const used = frames.length > TAPE_CAP ? frames.slice(0, TAPE_CAP) : frames;
  return used.map((f, i) => ({
    t: Math.round(i * FRAME_SEC * 1000),
    rms: f.power,
    zcr: f.zcr,
    f0: f.f0 > 0 && f.voiced > 0.2 ? f.f0 : null,
  }));
}

/** Sum independent canals in JS. Analysis of this mix is the refused path. */
export function fusePcm(canals: Float32Array[]): Float32Array {
  if (!canals.length) return new Float32Array(0);
  const n = Math.max(...canals.map((c) => c.length));
  const out = new Float32Array(n);
  for (const pcm of canals) {
    if (!pcm.length) continue;
    for (let i = 0; i < n; i++) out[i]! += pcm[i % pcm.length]!;
  }
  const g = 1 / Math.max(1, canals.length);
  for (let i = 0; i < n; i++) out[i]! *= g;
  return out;
}

export function formatHz(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return "—";
  return `${Math.round(v)} Hz`;
}

export function formatRms(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toFixed(3);
}
