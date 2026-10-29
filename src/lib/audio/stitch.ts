/**
 * The Booth's stitcher: new sentences spoken from stretches of a voice's own
 * frames (bank.ts), then shaped by the voice's measured profile and the
 * Voice Creation Center's controls, every one of which is applied and
 * reported, or the sentence is refused.
 *
 * Why (2026-10-28). Everett heard the table voice as "super robotic and
 * nothing like the files I gave". Here every frame that is spoken was measured
 * from the voice's recordings: whole words and runs of words where the
 * recordings hold them, syllables and phone runs where they do not. Pitch
 * movement comes with the frames. Nothing is synthesised from rules.
 *
 * Selection (unit selection over phones, Viterbi):
 *   target cost  a unit from the same word at the same place costs nothing;
 *                one from another word pays WORD; a different phone before
 *                or after it pays CONTEXT each; a word that opens or closes
 *                a phrase in the recording put where the sentence does not
 *                open or close pays EDGE; a length far from the phone's own
 *                median pays DURATION per natural-log unit.
 *   join cost    a unit followed by the unit that followed it in the
 *                recording joins for nothing, so whole words and runs of
 *                words come out whole; any other join pays BREAK plus how
 *                far the two sides are from the frames that really followed
 *                them (envelope dB / 10, pitch in semitones / 6, voicing).
 * Joins that are not in the recordings are smoothed over JOIN_SMOOTH frames
 * each side (envelope, aperiodicity, and pitch when both sides are voiced).
 * A phone the bank has never heard is not made up: the sentence is refused
 * and the phone is named.
 */

import { AP_BANDS, ENV_POINTS, envGridHz, type FrameTrack } from "./frames.ts";
import { PHONES } from "./phonemes.ts";
import { PHRASE_GAP_S, type Bank, type Unit } from "./bank.ts";

/** Costs. Chosen starting values, reasons beside each; to be replaced by listening and measurement. */
export const COST = {
  /** A unit from another word: two context mismatches' worth, so a whole word wins over two well-fitting pieces. */
  WORD: 2.0,
  /** Each side whose neighbouring phone differs: coarticulation is carried by the neighbours. */
  CONTEXT: 1.0,
  /** A phrase edge in the wrong place carries the wrong pitch reset or final fall. */
  EDGE: 0.5,
  /** Per natural-log unit of length away from the phone's median: twice or half as long costs 0.35. */
  DURATION: 0.5,
  /** Any join not in the recordings: one and a half context mismatches. */
  BREAK: 1.5,
  /** Envelope distance is divided by this many dB. */
  ENV_DB: 10,
  /** Pitch distance is divided by this many semitones. */
  PITCH_ST: 6,
  /** A voiced side joined to an unvoiced one. */
  VOICING: 0.3,
} as const;
/** Candidates kept per target phone (best target cost), plus the recording successors of the last list. */
export const CANDIDATES = 40;
/** Frames smoothed on each side of a join the recordings do not hold: 3 frames, 15 ms. */
export const JOIN_SMOOTH = 3;
/** Silence before and after a sentence, frames: 20 (100 ms) taken from the recording around the first and last units. */
export const EDGE_FRAMES = 20;

/** A word to speak. pauseAfter: the text pauses after it (a comma, a full stop): a recorded pause follows, and the words either side open and close a phrase. */
export type TargetWord = { word: string; phones: string[]; pauseAfter?: boolean };

export type Selection = {
  units: number[];
  /** Indices into units after which the text pauses. */
  pausesAfter: number[];
  joins: number; // joins not in the recordings (a pause is not a join)
  wholeWords: number; // target words spoken by one recorded word, start to end
  cost: number;
};

export class StitchRefused extends Error {
  missing: string[];
  constructor(reason: string, missing: string[] = []) {
    super(reason);
    this.missing = missing;
  }
}

type Target = { phone: string; word: string; pos: number; wordLen: number; prev: string; next: string; first: boolean; last: boolean };

function targets(words: TargetWord[]): Target[] {
  const out: Target[] = [];
  words.forEach((w, wi) => {
    w.phones.forEach((p, pi) => {
      const prevWord = words[wi - 1];
      const nextWord = words[wi + 1];
      out.push({
        phone: p,
        word: w.word,
        pos: pi,
        wordLen: w.phones.length,
        prev: pi > 0 ? w.phones[pi - 1]! : prevWord && !prevWord.pauseAfter ? prevWord.phones[prevWord.phones.length - 1]! : "SIL",
        next: pi < w.phones.length - 1 ? w.phones[pi + 1]! : nextWord && !w.pauseAfter ? nextWord.phones[0]! : "SIL",
        first: wi === 0 || !!prevWord?.pauseAfter,
        last: wi === words.length - 1 || !!w.pauseAfter,
      });
    });
  });
  return out;
}

/** Median length in frames of each phone in the bank. */
export function phoneMedians(bank: Bank): Map<string, number> {
  const by = new Map<string, number[]>();
  for (const u of bank.units) {
    const l = by.get(u.phone) ?? [];
    l.push(u.end - u.start);
    by.set(u.phone, l);
  }
  const out = new Map<string, number>();
  for (const [k, l] of by) {
    l.sort((a, b) => a - b);
    out.set(k, l[l.length >> 1]!);
  }
  return out;
}

function targetCost(u: Unit, t: Target, med: Map<string, number>) {
  let c = 0;
  if (u.word !== t.word || u.pos !== t.pos || u.wordLen !== t.wordLen) c += COST.WORD;
  if (u.prev !== t.prev) c += COST.CONTEXT;
  if (u.next !== t.next) c += COST.CONTEXT;
  if (t.first !== u.phraseStart) c += COST.EDGE;
  if (t.last !== u.phraseEnd) c += COST.EDGE;
  const m = med.get(u.phone) ?? 1;
  c += COST.DURATION * Math.abs(Math.log((u.end - u.start) / m));
  return c;
}

function frameDist(a: FrameTrack, i: number, b: FrameTrack, j: number) {
  let s = 0;
  for (let k = 0; k < ENV_POINTS; k++) s += (a.envDb[i * ENV_POINTS + k]! - b.envDb[j * ENV_POINTS + k]!) ** 2;
  let c = Math.sqrt(s / ENV_POINTS) / COST.ENV_DB;
  const fa = a.f0[i]!;
  const fb = b.f0[j]!;
  if (fa > 0 && fb > 0) c += Math.abs(12 * Math.log2(fa / fb)) / COST.PITCH_ST;
  else if (fa > 0 !== fb > 0) c += COST.VOICING;
  return c;
}

function joinCost(bank: Bank, ui: number, vi: number) {
  const u = bank.units[ui]!;
  if (u.succ === vi) return 0;
  const v = bank.units[vi]!;
  const tu = bank.tracks[u.rec]!;
  const tv = bank.tracks[v.rec]!;
  // How far v's first frame is from the frame that really followed u, and
  // u's last frame from the frame that really came before v.
  const after = Math.min(u.end, tu.n - 1);
  const before = Math.max(v.start - 1, 0);
  return COST.BREAK + 0.5 * (frameDist(tu, after, tv, v.start) + frameDist(tu, u.end - 1, tv, before));
}

/** Choose one recorded unit for every phone of the sentence. */
export function selectUnits(bank: Bank, words: TargetWord[], med: Map<string, number> = phoneMedians(bank)): Selection {
  const tg = targets(words);
  if (!tg.length) throw new StitchRefused("nothing to say");
  // Where the text pauses: after the last phone of a word with pauseAfter (not the sentence's last).
  const pauseAt = new Set<number>();
  let p = 0;
  words.forEach((w, wi) => {
    p += w.phones.length;
    if (w.pauseAfter && wi < words.length - 1) pauseAt.add(p - 1);
  });
  const byPhone = new Map<string, number[]>();
  bank.units.forEach((u, i) => {
    const l = byPhone.get(u.phone) ?? [];
    l.push(i);
    byPhone.set(u.phone, l);
  });
  const missing = [...new Set(tg.map((t) => t.phone).filter((p) => !byPhone.has(p)))];
  if (missing.length) throw new StitchRefused(`the voice's recordings hold no ${missing.join(", ")}`, missing);
  const lists: number[][] = [];
  const tcost: Map<number, number>[] = [];
  tg.forEach((t, i) => {
    const all = byPhone.get(t.phone)!;
    const scored = all.map((u) => ({ u, c: targetCost(bank.units[u]!, t, med) }));
    scored.sort((a, b) => a.c - b.c || a.u - b.u);
    const keep = new Map<number, number>();
    for (const s of scored.slice(0, CANDIDATES)) keep.set(s.u, s.c);
    if (i > 0) {
      for (const p of lists[i - 1]!) {
        const s = bank.units[p]!.succ;
        if (s >= 0 && bank.units[s]!.phone === t.phone && !keep.has(s)) keep.set(s, targetCost(bank.units[s]!, t, med));
      }
    }
    const list = [...keep.keys()].sort((a, b) => a - b);
    lists.push(list);
    tcost.push(keep);
  });
  // Viterbi.
  let score = lists[0]!.map((u) => tcost[0]!.get(u)!);
  const back: Int32Array[] = [new Int32Array(lists[0]!.length).fill(-1)];
  for (let i = 1; i < lists.length; i++) {
    const cur = lists[i]!;
    const prev = lists[i - 1]!;
    const sc: number[] = [];
    const bk = new Int32Array(cur.length);
    cur.forEach((v, a) => {
      let best = Infinity;
      let arg = 0;
      prev.forEach((u, b) => {
        // Across a pause the two sides need not meet: silence lies between them.
        const s = score[b]! + (pauseAt.has(i - 1) ? 0 : joinCost(bank, u, v));
        if (s < best) {
          best = s;
          arg = b;
        }
      });
      sc.push(best + tcost[i]!.get(v)!);
      bk[a] = arg;
    });
    score = sc;
    back.push(bk);
  }
  let k = 0;
  score.forEach((v, i) => {
    if (v < score[k]!) k = i;
  });
  const cost = score[k]!;
  const chosen: number[] = new Array(lists.length);
  for (let i = lists.length - 1; i >= 0; i--) {
    chosen[i] = lists[i]![k]!;
    k = back[i]![k]!;
  }
  let joins = 0;
  for (let i = 1; i < chosen.length; i++) if (!pauseAt.has(i - 1) && bank.units[chosen[i - 1]!]!.succ !== chosen[i]) joins++;
  let wholeWords = 0;
  let at = 0;
  for (const w of words) {
    const seg = chosen.slice(at, at + w.phones.length);
    const first = bank.units[seg[0]!]!;
    let whole = first.pos === 0 && first.word === w.word && first.wordLen === w.phones.length;
    for (let i = 1; i < seg.length && whole; i++) if (bank.units[seg[i - 1]!]!.succ !== seg[i]) whole = false;
    if (whole) wholeWords++;
    at += w.phones.length;
  }
  return { units: chosen, pausesAfter: [...pauseAt].sort((a, b) => a - b), joins, wholeWords, cost };
}

export type Stitched = {
  track: FrameTrack;
  /** For each frame: the phone it belongs to ("SIL" for the edges). */
  phones: string[];
  /** Frame index of every join the recordings do not hold. */
  joinsAt: number[];
  /** For each frame: the recording it came from. */
  recOf: number[];
};

/** Long-term average envelope of a track's voiced frames (each frame's mean level removed), ENV_POINTS dB. */
export function trackLtas(t: FrameTrack, from = 0, to = t.n): Float64Array {
  const out = new Float64Array(ENV_POINTS);
  let nv = 0;
  for (let i = from; i < to; i++) {
    if (!(t.f0[i]! > 0)) continue;
    let mean = 0;
    for (let k = 0; k < ENV_POINTS; k++) mean += t.envDb[i * ENV_POINTS + k]!;
    mean /= ENV_POINTS;
    for (let k = 0; k < ENV_POINTS; k++) out[k] = out[k]! + t.envDb[i * ENV_POINTS + k]! - mean;
    nv++;
  }
  for (let k = 0; k < ENV_POINTS; k++) out[k] = nv ? out[k]! / nv : NaN;
  return out;
}

/** Lay the chosen units' frames end to end, with the recording's own silence at both edges. */
export function joinUnits(bank: Bank, sel: Selection): Stitched {
  const f0: number[] = [];
  const env: number[] = [];
  const ap: number[] = [];
  const rms: number[] = [];
  const per: number[] = [];
  const phones: string[] = [];
  const joinsAt: number[] = [];
  const recOf: number[] = [];
  let rec = 0;
  const push = (t: FrameTrack, i: number, ph: string) => {
    recOf.push(rec);
    f0.push(t.f0[i]!);
    for (let k = 0; k < ENV_POINTS; k++) env.push(t.envDb[i * ENV_POINTS + k]!);
    for (let k = 0; k < AP_BANDS; k++) ap.push(t.ap[i * AP_BANDS + k]!);
    rms.push(t.rmsDb[i]!);
    per.push(t.periodicity[i]!);
    phones.push(ph);
  };
  const first = bank.units[sel.units[0]!]!;
  const last = bank.units[sel.units[sel.units.length - 1]!]!;
  const ft = bank.tracks[first.rec]!;
  rec = first.rec;
  // The edges are the recording's own silence: the pause before the first
  // unit when its word opened a phrase, else the middle of a pause elsewhere
  // in the same recording. Never the end of another word.
  const lead = first.phraseStart ? [Math.max(0, first.start - EDGE_FRAMES), first.start] : pauseFrames(bank, first.rec);
  for (let i = lead[0]!; i < lead[1]!; i++) push(ft, i, "SIL");
  const pauses = new Set(sel.pausesAfter);
  sel.units.forEach((ui, n) => {
    const u = bank.units[ui]!;
    if (n > 0 && !pauses.has(n - 1) && bank.units[sel.units[n - 1]!]!.succ !== ui) joinsAt.push(f0.length);
    const t = bank.tracks[u.rec]!;
    rec = u.rec;
    for (let i = u.start; i < u.end; i++) push(t, i, u.phone);
    if (pauses.has(n)) {
      // The text pauses here: the recording's own pause, not a made-up silence.
      const [a, b] = pauseFrames(bank, u.rec);
      for (let i = a; i < b; i++) push(t, i, "SIL");
    }
  });
  const lt = bank.tracks[last.rec]!;
  rec = last.rec;
  const trail = last.phraseEnd ? [last.end, Math.min(lt.n, last.end + EDGE_FRAMES)] : pauseFrames(bank, last.rec);
  for (let i = trail[0]!; i < trail[1]!; i++) push(lt, i, "SIL");
  const n = f0.length;
  const track: FrameTrack = {
    sr: ft.sr,
    hop: ft.hop,
    n,
    f0: Float64Array.from(f0),
    envDb: Float64Array.from(env),
    ap: Float64Array.from(ap),
    rmsDb: Float64Array.from(rms),
    periodicity: Float64Array.from(per),
  };
  for (const j of joinsAt) smoothJoin(track, j);
  return { track, phones, joinsAt, recOf };
}

/**
 * EDGE_FRAMES frames from the middle of the quietest pause between two
 * phrases of a recording (a gap of at least PHRASE_GAP_S between heard words,
 * long enough to hold them), or from the recording's start when it has none.
 */
export function pauseFrames(bank: Bank, rec: number): [number, number] {
  const t = bank.tracks[rec]!;
  let best: [number, number] | null = null;
  let bestLevel = Infinity;
  const toks = bank.tokens.filter((k) => k.rec === rec);
  for (let i = 0; i + 1 < toks.length; i++) {
    const a = Math.round((toks[i]!.end * t.sr) / t.hop);
    const b = Math.round((toks[i + 1]!.start * t.sr) / t.hop);
    if ((b - a) * t.hop < PHRASE_GAP_S * t.sr || b - a < EDGE_FRAMES) continue;
    const s = Math.floor((a + b - EDGE_FRAMES) / 2);
    let lv = 0;
    for (let f = s; f < s + EDGE_FRAMES; f++) lv += t.rmsDb[f]!;
    if (lv < bestLevel) {
      bestLevel = lv;
      best = [s, s + EDGE_FRAMES];
    }
  }
  if (best) return best;
  const firstStart = toks.length ? Math.round((toks[0]!.start * t.sr) / t.hop) : 0;
  return [Math.max(0, firstStart - EDGE_FRAMES), Math.max(0, firstStart)];
}

/** Median level (dB) of a track's voiced frames. */
export function trackLevel(t: FrameTrack, from = 0, to = t.n): number {
  const v: number[] = [];
  for (let i = from; i < to; i++) if (t.f0[i]! > 0) v.push(t.rmsDb[i]!);
  return v.length ? quantile(v, 0.5) : NaN;
}

/** Meet in the middle across a join: each side moves toward the midpoint, fully at the join, fading over JOIN_SMOOTH frames. */
function blendJoin(arr: Float64Array, j: number, width: number, n: number) {
  const L = j - 1;
  const R = j;
  if (L < 0 || R >= n) return;
  for (let k = 0; k < width; k++) {
    const mid = 0.5 * (arr[L * width + k]! + arr[R * width + k]!);
    const dl = mid - arr[L * width + k]!;
    const dr = mid - arr[R * width + k]!;
    for (let s = 0; s < JOIN_SMOOTH; s++) {
      const w = (JOIN_SMOOTH - s) / JOIN_SMOOTH;
      if (L - s >= 0) arr[(L - s) * width + k] = arr[(L - s) * width + k]! + dl * w;
      if (R + s < n) arr[(R + s) * width + k] = arr[(R + s) * width + k]! + dr * w;
    }
  }
}

function smoothJoin(t: FrameTrack, j: number) {
  const L = j - 1;
  const R = j;
  if (L < 0 || R >= t.n) return;
  blendJoin(t.envDb, j, ENV_POINTS, t.n);
  blendJoin(t.ap, j, AP_BANDS, t.n);
  // Pitch, in semitones, only across a voiced-to-voiced join and only over voiced frames.
  if (t.f0[L]! > 0 && t.f0[R]! > 0) {
    const sl = Math.log2(t.f0[L]!);
    const sr = Math.log2(t.f0[R]!);
    const mid = 0.5 * (sl + sr);
    for (let s = 0; s < JOIN_SMOOTH; s++) {
      const w = (JOIN_SMOOTH - s) / JOIN_SMOOTH;
      if (L - s >= 0 && t.f0[L - s]! > 0) t.f0[L - s] = 2 ** (Math.log2(t.f0[L - s]!) + (mid - sl) * w);
      if (R + s < t.n && t.f0[R + s]! > 0) t.f0[R + s] = 2 ** (Math.log2(t.f0[R + s]!) + (mid - sr) * w);
    }
  }
  for (let k = 0; k < t.ap.length; k++) t.ap[k] = Math.min(1, Math.max(0, t.ap[k]!));
}

// ---------------------------------------------------------------------------
// The voice's measured profile and the controls.
// ---------------------------------------------------------------------------

/** What the voice measures as, from its recordings (Christman Voice SDK). Every field is required. */
export type VoiceMeasures = {
  f0_median_hz: number;
  /** Median over the voice's phrases of each phrase's pitch range, 5th to 95th percentile, in semitones. */
  phrase_range_st: number;
  /** Vowel nuclei per second of speech (pauses excluded). */
  syllable_rate: number;
  /** Mean aperiodicity of voiced frames below 4 kHz: the frames' measure of breath. */
  voiced_aperiodicity: number;
  /** Long-term average envelope of voiced frames, ENV_POINTS dB, each frame's mean level removed. */
  ltas_db: number[];
  /** Median level of voiced frames, dB (the frames' rmsDb scale). */
  level_db: number;
  /** Local jitter and shimmer of the recordings, and what the renderer's frames already carry (a calibration render at zero). */
  jitter: number;
  shimmer: number;
  jitter_carried: number;
  shimmer_carried: number;
  /**
   * What a STITCHED sentence is rendered with. Joins, time scaling and range
   * scaling change a sentence's periodicity, so a new sentence rendered with
   * the recordings' own aperiodicity and carried values came out noisier and
   * rougher than the recordings (AlphaVox, 2026-10-28: HNR 7.5 against 10.1
   * dB). The build renders held-out calibration sentences (never the test
   * sentences) at a range of aperiodicities, measures what the stitched
   * frames carry, and keeps the aperiodicity whose renderings measure
   * closest to the recordings. applyVoice uses these three.
   */
  stitched_aperiodicity: number;
  stitched_jitter_carried: number;
  stitched_shimmer_carried: number;
  /** For the report: harmonics-to-noise ratio and cepstral peak prominence of the recordings, dB. */
  hnr_db: number;
  cpp_db: number;
};

/**
 * The controls, by the names the Voice Creation Center sends. Every number
 * control runs 0 to 1 and 0.5 is the voice as measured. rate multiplies the
 * voice's measured speaking rate (1 = as measured). f0, when given, is the
 * median pitch in Hz the sentence is spoken at, in place of the measured
 * median; the recordings' pitch movement is kept around it. null = measured.
 */
export type Controls = {
  cadence: number;
  breath: number;
  jitter: number;
  shimmer: number;
  timbre: number;
  articulation: number;
  intonation: number;
  prosody: number;
  resonance: "chest" | "mid" | "head";
  affect: string;
  rate: number;
  f0: number | null;
};

export const NEUTRAL_CONTROLS: Controls = {
  cadence: 0.5,
  breath: 0.5,
  jitter: 0.5,
  shimmer: 0.5,
  timbre: 0.5,
  articulation: 0.5,
  intonation: 0.5,
  prosody: 0.5,
  resonance: "mid",
  affect: "neutral",
  rate: 1,
  f0: null,
};

/** One parameter as applied: what it was measured as, the control, and exactly what was done. */
export type Applied = { name: string; measured: number | string; control: number | string | null; applied: string; value: number };

/** A control at 0 or 1 moves the measured quantity by `octaves` octaves each way (2^-octaves to 2^octaves). */
const span = (c: number, octaves: number) => 2 ** ((c - 0.5) * 2 * octaves);
/** How far each control reaches: breath, intonation, jitter and shimmer halve or double; prosody 0.71x to 1.41x; articulation 0.76x to 1.32x; cadence 0.84x to 1.19x on the speaking rate, the inverse on pauses. */
const REACH = { breath: 1, intonation: 1, jitter: 1, shimmer: 1, prosody: 0.5, articulation: 0.4, cadence: 0.25 } as const;
/** Corrections are clamped so a short sentence cannot be pushed past what the voice does. */
const CLAMP = {
  /** pitch range factor */ range: [0.5, 2] as const,
  /** time factor */ time: [0.6, 1.6] as const,
  /**
   * aperiodicity factor. 0.01 at the low end: AlphaVox's stitched frames carry
   * voiced aperiodicity 0.37 to 0.56, and the calibrated stitched_aperiodicity
   * needs about x0.02 to x0.04 of that; the old 0.25 held every sentence of
   * the 24 at x0.25, four to ten times the breath the voice has.
   */ ap: [0.01, 4] as const,
  /** envelope correction toward the voice's long-term average, dB each way */ ltas_db: 6,
  /** a session's level brought to the voice's level, dB each way */ level_db: 12,
};
/** Resonance moves the whole envelope along frequency by 4%: about the difference between a chest and a head placement of one voice. */
const RESONANCE_WARP = { chest: 0.96, mid: 1.0, head: 1.04 } as const;
/** Timbre tilts the envelope above 500 Hz by up to 3 dB per octave each way (0 thin: brighter; 1 rich: darker). */
const TIMBRE_DB_PER_OCT = 6;
/** Rate and pitch the caller may ask for: christman_synth's own rate range; 60 to 400 Hz, a speaking voice. */
const RATE_RANGE = [0.6, 1.6] as const;
const F0_RANGE = [60, 400] as const;
/**
 * Local jitter (mean |T_i - T_i+1| / mean T) of independent Gaussian period
 * draws with standard deviation sd is 2 sd / sqrt(pi) = 1.128 sd; the same
 * holds for shimmer. So a local value v is rendered as sd = v / 1.128.
 */
const LOCAL_PER_SD = 2 / Math.sqrt(Math.PI);
/**
 * Intonation scales the pitch contour smoothed over +-4 frames (+-20 ms) and
 * keeps each frame's movement around it as it was. Movement faster than that
 * is the cycle-to-cycle wobble Praat reads as jitter, not intonation; scaled
 * with the range (up to x2) it raised the 24 sentences' jitter from 3.3% to
 * 3.6% against the recordings' 2.9%.
 */
const CONTOUR_HALF = 4;
const VOWELS = new Set(PHONES.filter((p) => p.kind === "vowel").map((p) => p.id));

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function quantile(xs: number[], q: number) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(s.length - 1, lo + 1);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** Refuse when any measure is missing or not a finite number. */
export function checkMeasures(m: Partial<VoiceMeasures>): VoiceMeasures {
  const need: (keyof VoiceMeasures)[] = [
    "f0_median_hz", "phrase_range_st", "syllable_rate", "voiced_aperiodicity", "ltas_db", "level_db",
    "jitter", "shimmer", "jitter_carried", "shimmer_carried", "hnr_db", "cpp_db",
    "stitched_aperiodicity", "stitched_jitter_carried", "stitched_shimmer_carried",
  ];
  const bad = need.filter((k) => {
    const v = m[k];
    if (k === "ltas_db") return !Array.isArray(v) || v.length !== ENV_POINTS || !v.every(Number.isFinite);
    return typeof v !== "number" || !Number.isFinite(v);
  });
  if (bad.length) throw new StitchRefused(`the voice profile does not measure: ${bad.join(", ")}`, bad);
  return m as VoiceMeasures;
}

/** Refuse a control that is missing, out of range, or one this mouth cannot apply. */
export function checkControls(c: Partial<Controls>): Controls {
  const nums: (keyof Controls)[] = ["cadence", "breath", "jitter", "shimmer", "timbre", "articulation", "intonation", "prosody"];
  const bad: string[] = nums.filter((k) => typeof c[k] !== "number" || !((c[k] as number) >= 0 && (c[k] as number) <= 1));
  if (typeof c.resonance !== "string" || !(c.resonance in RESONANCE_WARP)) bad.push("resonance (chest, mid or head)");
  if (typeof c.rate !== "number" || !(c.rate >= RATE_RANGE[0] && c.rate <= RATE_RANGE[1])) bad.push(`rate (${RATE_RANGE[0]} to ${RATE_RANGE[1]})`);
  if (c.f0 !== null && (typeof c.f0 !== "number" || !(c.f0 >= F0_RANGE[0] && c.f0 <= F0_RANGE[1]))) bad.push(`f0 (null or ${F0_RANGE[0]} to ${F0_RANGE[1]} Hz)`);
  if (typeof c.affect !== "string") bad.push("affect");
  if (bad.length) throw new StitchRefused(`controls not given or out of range: ${bad.join(", ")}`, bad);
  if (c.affect !== "neutral")
    throw new StitchRefused(
      `affect "${c.affect}" is not applied: this mouth has no affect input of its own, and mapping an emotion onto ` +
        `pitch or rate here would be an invented mapping (the project's ruling). Set the named controls the affect stands ` +
        `for and pass affect "neutral".`,
      ["affect"],
    );
  return c as Controls;
}

export type RecordingStats = { ltas: ArrayLike<number>; level: number };

/**
 * Each recording's session statistics, for applyVoice: the long-term average
 * envelope and median voiced level of all the recordings in its session
 * (session[i] names recording i's session; recordings made together, such
 * as a folder of short phrases, share one, so one short phrase's own vowels
 * are never taken for the session's sound).
 */
export function recordingStats(bank: Bank, session: string[]): RecordingStats[] {
  const bySession = new Map<string, RecordingStats>();
  for (const name of new Set(session)) {
    const idx = session.map((s, i) => (s === name ? i : -1)).filter((i) => i >= 0);
    const ltas = new Float64Array(ENV_POINTS);
    let w = 0;
    const levels: number[] = [];
    for (const i of idx) {
      const t = bank.tracks[i]!;
      let nv = 0;
      for (let f = 0; f < t.n; f++)
        if (t.f0[f]! > 0) {
          nv++;
          levels.push(t.rmsDb[f]!);
        }
      if (!nv) continue;
      const l = trackLtas(t);
      for (let k = 0; k < ENV_POINTS; k++) ltas[k] = ltas[k]! + l[k]! * nv;
      w += nv;
    }
    for (let k = 0; k < ENV_POINTS; k++) ltas[k] = w ? ltas[k]! / w : NaN;
    bySession.set(name, { ltas, level: levels.length ? quantile(levels, 0.5) : NaN });
  }
  return session.map((s) => bySession.get(s)!);
}

export type Voiced = { track: FrameTrack; phones: string[]; jitter: number; shimmer: number; applied: Applied[] };

/**
 * Apply the voice's measures and the controls to a stitched sentence. Every
 * parameter is applied and listed in `applied` with its value, or the
 * sentence is refused (StitchRefused) with the reason.
 */
export function applyVoice(st: Stitched, measuresIn: Partial<VoiceMeasures>, controlsIn: Partial<Controls>, recStats: RecordingStats[]): Voiced {
  const m = checkMeasures(measuresIn);
  const c = checkControls(controlsIn);
  const applied: Applied[] = [];
  let t: FrameTrack = { ...st.track, f0: st.track.f0.slice(), envDb: st.track.envDb.slice(), ap: st.track.ap.slice() };
  let phones = st.phones;
  let recOf = st.recOf;

  // Each session's envelope and level to the voice's (smoothed over 9 grid
  // points, clamped), so units from different sessions sound like one voice;
  // the sentence's own vowels are never averaged away. Applied first, to the
  // stitched frames, and smoothed across each join exactly as joinUnits
  // smoothed the frames there. (Until 2026-10-29 it was added after the joins
  // were smoothed, frame by frame by session, so a join between two sessions
  // became a step the size of the difference between their corrections: two
  // sessions 7 dB apart gave a 7 dB step in one frame.)
  const corrs = recStats.map((rs) => {
    const gain = Number.isFinite(rs.level) ? clamp(m.level_db - rs.level, -CLAMP.level_db, CLAMP.level_db) : 0;
    const raw = new Float64Array(ENV_POINTS);
    for (let k = 0; k < ENV_POINTS; k++) raw[k] = Number.isFinite(rs.ltas[k]!) ? m.ltas_db[k]! - rs.ltas[k]! : 0;
    const out = new Float64Array(ENV_POINTS);
    for (let k = 0; k < ENV_POINTS; k++) {
      let s = 0;
      let q = 0;
      for (let d = -4; d <= 4; d++) {
        const j = k + d;
        if (j >= 0 && j < ENV_POINTS) {
          s += raw[j]!;
          q++;
        }
      }
      out[k] = clamp(s / q, -CLAMP.ltas_db, CLAMP.ltas_db) + gain;
    }
    return out;
  });
  const corrTrack = new Float64Array(t.n * ENV_POINTS);
  for (let i = 0; i < t.n; i++) corrTrack.set(corrs[recOf[i]!]!, i * ENV_POINTS);
  for (const j of st.joinsAt) blendJoin(corrTrack, j, ENV_POINTS, t.n);
  for (let k = 0; k < t.envDb.length; k++) t.envDb[k] = t.envDb[k]! + corrTrack[k]!;

  // Cadence (rate) and articulation: time, by resampling the frame sequence.
  const speech = phones.filter((p) => p !== "SIL").length;
  let nuclei = 0;
  for (let i = 0; i < phones.length; i++) if (VOWELS.has(phones[i]!) && (i === 0 || phones[i - 1] !== phones[i])) nuclei++;
  const rate = speech > 0 ? nuclei / ((speech * t.hop) / t.sr) : m.syllable_rate;
  const cad = span(c.cadence, REACH.cadence);
  const wantRate = m.syllable_rate * c.rate * cad;
  const timeFactor = clamp(rate / wantRate, CLAMP.time[0], CLAMP.time[1]);
  const consonant = span(c.articulation, REACH.articulation);
  const stretch = phones.map((p) => (p === "SIL" ? 1 / cad : VOWELS.has(p) ? timeFactor : timeFactor * consonant));
  ({ t, phones, recOf } = resample(t, phones, recOf, stretch));
  applied.push({ name: "rate", measured: m.syllable_rate, control: c.rate, applied: `syllable rate ${rate.toFixed(2)}/s -> ${(rate / timeFactor).toFixed(2)}/s (time x${timeFactor.toFixed(3)})`, value: timeFactor });
  applied.push({ name: "cadence", measured: m.syllable_rate, control: c.cadence, applied: `speaking rate x${cad.toFixed(3)} (in the rate above), pauses and edges x${(1 / cad).toFixed(3)}`, value: cad });
  applied.push({ name: "articulation", measured: "consonant and vowel timing of the recordings", control: c.articulation, applied: `consonant frames x${consonant.toFixed(3)} against vowels`, value: consonant });

  // Intonation and pitch: the sentence's range to the voice's phrase range, around the measured (or asked) median.
  const st0: number[] = [];
  for (let i = 0; i < t.n; i++) if (t.f0[i]! > 0) st0.push(12 * Math.log2(t.f0[i]!));
  const med = quantile(st0, 0.5);
  const rng = quantile(st0, 0.95) - quantile(st0, 0.05);
  const wantRange = m.phrase_range_st * span(c.intonation, REACH.intonation);
  const rangeFactor = st0.length > 1 && rng > 0 ? clamp(wantRange / rng, CLAMP.range[0], CLAMP.range[1]) : 1;
  const centreHz = c.f0 ?? m.f0_median_hz;
  const centre = 12 * Math.log2(centreHz);
  const smooth = smoothContour(t.f0, CONTOUR_HALF);
  for (let i = 0; i < t.n; i++)
    if (t.f0[i]! > 0) t.f0[i] = 2 ** ((centre + (smooth[i]! - med) * rangeFactor + (12 * Math.log2(t.f0[i]!) - smooth[i]!)) / 12);
  applied.push({ name: "intonation", measured: m.phrase_range_st, control: c.intonation, applied: `pitch range ${rng.toFixed(2)} st x${rangeFactor.toFixed(3)} (the recordings' own movement, scaled; movement within +-${CONTOUR_HALF} frames kept)`, value: rangeFactor });
  applied.push({ name: "f0", measured: m.f0_median_hz, control: c.f0, applied: `median ${(2 ** (med / 12)).toFixed(1)} -> ${centreHz.toFixed(1)} Hz`, value: centreHz });

  // Breath: the noise in the voiced frames, to the voice's measured aperiodicity.
  const lowBands = AP_LOW_BANDS;
  let apSum = 0;
  let apN = 0;
  for (let i = 0; i < t.n; i++)
    if (t.f0[i]! > 0)
      for (let b = 0; b < lowBands; b++) {
        apSum += t.ap[i * AP_BANDS + b]!;
        apN++;
      }
  const apNow = apN ? apSum / apN : m.stitched_aperiodicity;
  const apWant = m.stitched_aperiodicity * span(c.breath, REACH.breath);
  const apFactor = apNow > 0 ? clamp(apWant / apNow, CLAMP.ap[0], CLAMP.ap[1]) : 1;
  for (let i = 0; i < t.n; i++) if (t.f0[i]! > 0) for (let b = 0; b < AP_BANDS; b++) t.ap[i * AP_BANDS + b] = Math.min(1, t.ap[i * AP_BANDS + b]! * apFactor);
  applied.push({ name: "breath", measured: m.stitched_aperiodicity, control: c.breath, applied: `voiced aperiodicity ${apNow.toFixed(3)} x${apFactor.toFixed(3)} to ${apWant.toFixed(4)} (calibrated for stitched speech; recordings: HNR ${m.hnr_db.toFixed(1)} dB, CPP ${m.cpp_db.toFixed(1)} dB)`, value: apFactor });

  // Resonance and timbre: the controls' warp and tilt (each session's
  // correction went in first, above).
  let maxCorr = 0;
  for (const r of new Set(recOf)) for (let k = 0; k < ENV_POINTS; k++) maxCorr = Math.max(maxCorr, Math.abs(corrs[r]![k]!));
  const grid = envGridHz(t.sr);
  const warp = RESONANCE_WARP[c.resonance];
  const tilt = -(c.timbre - 0.5) * TIMBRE_DB_PER_OCT;
  const row = new Float64Array(ENV_POINTS);
  for (let i = 0; i < t.n; i++) {
    for (let k = 0; k < ENV_POINTS; k++) row[k] = t.envDb[i * ENV_POINTS + k]!;
    for (let k = 0; k < ENV_POINTS; k++) {
      const f = grid[k]!;
      const src = f / warp;
      let j = 0;
      while (j < ENV_POINTS - 2 && grid[j + 1]! <= src) j++;
      const w = clamp((src - grid[j]!) / (grid[j + 1]! - grid[j]!), 0, 1);
      let v = row[j]! * (1 - w) + row[j + 1]! * w;
      if (f > 500) v += tilt * Math.log2(f / 500);
      t.envDb[i * ENV_POINTS + k] = v;
    }
  }
  applied.push({ name: "resonance", measured: "long-term average envelope and level of the recordings", control: c.resonance, applied: `each session to the voice's envelope and level (largest correction ${maxCorr.toFixed(2)} dB); frequency x${warp}`, value: warp });
  applied.push({ name: "timbre", measured: "spectral tilt of the recordings (in their average envelope)", control: c.timbre, applied: `tilt ${tilt.toFixed(2)} dB per octave above 500 Hz`, value: tilt });

  // Prosody: the frames' level contrast around the sentence's mean level.
  const ps = span(c.prosody, REACH.prosody);
  let lsum = 0;
  let ln = 0;
  for (let i = 0; i < t.n; i++)
    if (phones[i] !== "SIL") {
      lsum += t.rmsDb[i]!;
      ln++;
    }
  const lmean = ln ? lsum / ln : 0;
  for (let i = 0; i < t.n; i++) {
    if (phones[i] === "SIL") continue;
    const d = (ps - 1) * (t.rmsDb[i]! - lmean);
    for (let k = 0; k < ENV_POINTS; k++) t.envDb[i * ENV_POINTS + k] = t.envDb[i * ENV_POINTS + k]! + d;
  }
  applied.push({ name: "prosody", measured: "level contrast of the recorded units", control: c.prosody, applied: `level contrast x${ps.toFixed(3)}`, value: ps });

  // Jitter and shimmer: the measured value (scaled by the control), less what
  // stitched frames already carry, added per glottal cycle by the renderer.
  // Stitched frames may already carry more than the voice measures (AlphaVox's
  // shimmer, 2026-10-28: 10.2% carried, 9.65% measured). The renderer cannot
  // take it away. At the neutral control or above, nothing is added and the
  // entry says so; the fidelity gate holds the result to the recordings'
  // spread. A control below neutral asks for steadier than the frames are,
  // and is refused.
  const perturb = (name: "jitter" | "shimmer", measured: number, carried: number, control: number) => {
    const want = measured * span(control, REACH[name]);
    if (want < carried && control < 0.5)
      throw new StitchRefused(`${name} ${want.toFixed(4)} is below the ${carried.toFixed(4)} the voice's own frames carry; it cannot be rendered lower`, [name]);
    if (want <= carried) {
      applied.push({ name, measured, control, applied: `${carried.toFixed(4)} carried by the frames, at or above the ${want.toFixed(4)} wanted: nothing added (the frames cannot be made steadier)`, value: 0 });
      return 0;
    }
    const sd = Math.sqrt(want ** 2 - carried ** 2) / LOCAL_PER_SD;
    if (sd > 0.2) throw new StitchRefused(`${name} ${want.toFixed(4)} is beyond what the renderer takes (per-cycle sd 0.2)`, [name]);
    applied.push({ name, measured, control, applied: `${carried.toFixed(4)} carried by the frames; per-cycle sd ${sd.toFixed(4)} added for ${want.toFixed(4)}`, value: sd });
    return sd;
  };
  const jit = perturb("jitter", m.jitter, m.stitched_jitter_carried, c.jitter);
  const shim = perturb("shimmer", m.shimmer, m.stitched_shimmer_carried, c.shimmer);
  applied.push({ name: "affect", measured: "none: affect is carried by the named controls", control: c.affect, applied: "neutral: the voice as measured", value: 0 });
  return { track: t, phones, jitter: jit, shimmer: shim, applied };
}

/** Bands of the aperiodicity below 4 kHz (edges 0, 600, 1200, 2000, 3000, 4000). */
const AP_LOW_BANDS = 5;

/**
 * Each voiced frame's pitch in semitones, averaged over +-half frames of its
 * own voiced run (never across unvoiced frames). Unvoiced frames read 0.
 * Summed left to right from 0, the order christman_sound/stitch.py sums in.
 */
export function smoothContour(f0: ArrayLike<number>, half: number): Float64Array {
  const n = f0.length;
  const st = new Float64Array(n);
  for (let i = 0; i < n; i++) st[i] = f0[i]! > 0 ? 12 * Math.log2(f0[i]!) : 0;
  const out = new Float64Array(n);
  let i = 0;
  while (i < n) {
    if (!(f0[i]! > 0)) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && f0[j]! > 0) j++;
    for (let k = i; k < j; k++) {
      const a = Math.max(i, k - half);
      const b = Math.min(j, k + half + 1);
      let s = 0;
      for (let q = a; q < b; q++) s += st[q]!;
      out[k] = s / (b - a);
    }
    i = j;
  }
  return out;
}

/** Resample the frame sequence in time: frame i lasts stretch[i] frames. Pitch moves with the frames; voicing is never invented. */
function resample(t: FrameTrack, phones: string[], recOf: number[], stretch: number[]) {
  const pos: number[] = [0];
  for (let i = 0; i < t.n; i++) pos.push(pos[i]! + stretch[i]!);
  const total = Math.max(1, Math.round(pos[t.n]!));
  const f0 = new Float64Array(total);
  const env = new Float64Array(total * ENV_POINTS);
  const ap = new Float64Array(total * AP_BANDS);
  const rms = new Float64Array(total);
  const per = new Float64Array(total);
  const ph: string[] = [];
  const rc: number[] = [];
  let i = 0;
  for (let o = 0; o < total; o++) {
    const at = o + 0.5;
    while (i < t.n - 1 && pos[i + 1]! <= at) i++;
    const frac = clamp((at - pos[i]!) / stretch[i]! - 0.5, -0.5, 0.5);
    const j = frac >= 0 ? Math.min(t.n - 1, i + 1) : Math.max(0, i - 1);
    const w = Math.abs(frac);
    const mix = (a: number, b: number) => a * (1 - w) + b * w;
    const fa = t.f0[i]!;
    const fb = t.f0[j]!;
    f0[o] = fa > 0 && fb > 0 ? 2 ** mix(Math.log2(fa), Math.log2(fb)) : fa;
    for (let k = 0; k < ENV_POINTS; k++) env[o * ENV_POINTS + k] = mix(t.envDb[i * ENV_POINTS + k]!, t.envDb[j * ENV_POINTS + k]!);
    for (let k = 0; k < AP_BANDS; k++) ap[o * AP_BANDS + k] = mix(t.ap[i * AP_BANDS + k]!, t.ap[j * AP_BANDS + k]!);
    rms[o] = mix(t.rmsDb[i]!, t.rmsDb[j]!);
    per[o] = mix(t.periodicity[i]!, t.periodicity[j]!);
    ph.push(phones[i]!);
    rc.push(recOf[i]!);
  }
  return { t: { sr: t.sr, hop: t.hop, n: total, f0, envDb: env, ap, rmsDb: rms, periodicity: per }, phones: ph, recOf: rc };
}
