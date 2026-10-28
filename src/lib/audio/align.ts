/**
 * Phone timings inside known words: forced alignment over dense frames.
 *
 * Why (2026-10-28). The Filament hears words and when they start and end;
 * its own forceAlign (recognize.ts) loses phone boundaries. To cut a voice's
 * recordings into phones (bank.ts), every phone needs a start and an end.
 *
 * How. One three-state left-to-right model per phone (onset, middle,
 * offset), a diagonal Gaussian per state over each frame's features (13
 * cepstra of the frame's envelope, its level, its voicing, its low and high
 * aperiodicity, and the cepstra's change over +-2 frames). The models start
 * flat (each phone an equal share of its word, each state a third of the
 * phone) and are re-estimated over every word given, ALIGN_ITERATIONS times
 * (Viterbi training): estimate the models from the segmentation, then find
 * each word's best path through its phones' states, every state at least one
 * frame. Nothing is assumed about how long any phone is.
 */

import { AP_BANDS, ENV_POINTS, type FrameTrack } from "./frames.ts";

/** Viterbi training passes. Five: on AlphaVox's recordings the boundaries stopped moving by the fourth (2026-10-28). */
export const ALIGN_ITERATIONS = 5;
/** States per phone: onset, middle, offset. */
export const STATES = 3;
/** Cepstra per frame from the envelope: 13, as Codec War's own front end keeps (dsp.ts N_MFCC). */
const N_CEP = 13;
/** Variance floor: 1% of the data's own variance of each feature, so one quiet state cannot claim certainty. */
const VAR_FLOOR = 0.01;

/** Per-frame features of a track. */
export function features(t: FrameTrack): Float64Array[] {
  const cos: Float64Array[] = [];
  for (let q = 0; q < N_CEP; q++) {
    const row = new Float64Array(ENV_POINTS);
    for (let j = 0; j < ENV_POINTS; j++) row[j] = Math.cos((Math.PI * q * (j + 0.5)) / ENV_POINTS) / ENV_POINTS;
    cos.push(row);
  }
  let top = -Infinity;
  for (let i = 0; i < t.n; i++) top = Math.max(top, t.rmsDb[i]!);
  const base: Float64Array[] = [];
  for (let i = 0; i < t.n; i++) {
    const v = new Float64Array(N_CEP + 4);
    for (let q = 0; q < N_CEP; q++) {
      let s = 0;
      for (let j = 0; j < ENV_POINTS; j++) s += t.envDb[i * ENV_POINTS + j]! * cos[q]![j]!;
      v[q] = s / 10;
    }
    v[N_CEP] = (t.rmsDb[i]! - top) / 10;
    v[N_CEP + 1] = t.f0[i]! > 0 ? 1 : 0;
    let lo = 0;
    let hi = 0;
    const half = Math.floor(AP_BANDS / 2);
    for (let b = 0; b < AP_BANDS; b++) {
      if (b < half) lo += t.ap[i * AP_BANDS + b]!;
      else hi += t.ap[i * AP_BANDS + b]!;
    }
    v[N_CEP + 2] = lo / half;
    v[N_CEP + 3] = hi / (AP_BANDS - half);
    base.push(v);
  }
  const out: Float64Array[] = [];
  for (let i = 0; i < t.n; i++) {
    const a = base[Math.max(0, i - 2)]!;
    const b = base[Math.min(t.n - 1, i + 2)]!;
    const v = new Float64Array(2 * N_CEP + 4);
    v.set(base[i]!);
    for (let q = 0; q < N_CEP; q++) v[N_CEP + 4 + q] = (b[q]! - a[q]!) / 4;
    out.push(v);
  }
  return out;
}

type Model = { mean: Float64Array; ivar: Float64Array; logdet: number };

/** A word to align: which feature sequence, its frames [a, b), and its phones. */
export type Span = { seq: number; a: number; b: number; phones: string[] };

/** Best path of one word through its phones' states; returns the phone boundaries (phones + 1 frame indices). */
function alignOne(feat: Float64Array[], a: number, b: number, models: Model[]): number[] {
  const S = models.length;
  const T = b - a;
  const NEG = -Infinity;
  const score = new Float64Array(T * S).fill(NEG);
  const from = new Int8Array(T * S);
  const ll = (t: number, s: number) => {
    const m = models[s]!;
    const x = feat[a + t]!;
    let d = 0;
    for (let k = 0; k < x.length; k++) {
      const e = x[k]! - m.mean[k]!;
      d += e * e * m.ivar[k]!;
    }
    return -0.5 * (d + m.logdet);
  };
  score[0] = ll(0, 0);
  for (let t = 1; t < T; t++) {
    const lo = Math.max(0, S - (T - t));
    const hi = Math.min(S - 1, t);
    for (let s = lo; s <= hi; s++) {
      const stay = score[(t - 1) * S + s]!;
      const adv = s > 0 ? score[(t - 1) * S + s - 1]! : NEG;
      const best = adv > stay ? adv : stay;
      if (best === NEG) continue;
      score[t * S + s] = best + ll(t, s);
      from[t * S + s] = adv > stay ? 1 : 0;
    }
  }
  const stateAt = new Int32Array(T);
  let s = S - 1;
  for (let t = T - 1; t >= 0; t--) {
    stateAt[t] = s;
    if (t > 0 && from[t * S + s] === 1) s--;
  }
  const nPh = S / STATES;
  const bounds: number[] = new Array(nPh + 1).fill(-1);
  for (let t = 0; t < T; t++) {
    const p = Math.floor(stateAt[t]! / STATES);
    if (bounds[p] === -1) bounds[p] = a + t;
  }
  bounds[nPh] = b;
  return bounds;
}

/**
 * Align every word into its phones. feats[seq] are the frame features of
 * sequence seq. Every span must hold at least STATES frames per phone.
 * Returns, for each span, its phone boundaries.
 */
export function alignWords(feats: Float64Array[][], spans: Span[], iterations = ALIGN_ITERATIONS): number[][] {
  for (const sp of spans) {
    if (!sp.phones.length) throw new Error("a word to align has no phones");
    if (sp.b - sp.a < STATES * sp.phones.length) throw new Error(`${sp.b - sp.a} frames cannot hold ${sp.phones.length} phones`);
  }
  const dim = feats[spans[0]?.seq ?? 0]?.[0]?.length ?? 0;
  const gm = new Float64Array(dim);
  const gv = new Float64Array(dim);
  let gn = 0;
  for (const sp of spans)
    for (let t = sp.a; t < sp.b; t++) {
      const x = feats[sp.seq]![t]!;
      for (let k = 0; k < dim; k++) gm[k] = gm[k]! + x[k]!;
      gn++;
    }
  for (let k = 0; k < dim; k++) gm[k] = gm[k]! / Math.max(1, gn);
  for (const sp of spans)
    for (let t = sp.a; t < sp.b; t++) {
      const x = feats[sp.seq]![t]!;
      for (let k = 0; k < dim; k++) gv[k] = gv[k]! + (x[k]! - gm[k]!) ** 2;
    }
  for (let k = 0; k < dim; k++) gv[k] = gv[k]! / Math.max(1, gn);

  let bounds = spans.map((sp) => {
    const n = sp.phones.length;
    return Array.from({ length: n + 1 }, (_, p) => Math.round(sp.a + ((sp.b - sp.a) * p) / n));
  });
  const ids = [...new Set(spans.flatMap((s) => s.phones))].sort();
  for (let it = 0; it < iterations; it++) {
    const acc = new Map<string, { s: Float64Array; q: Float64Array; n: number }>();
    for (const id of ids) for (let s = 0; s < STATES; s++) acc.set(`${id}/${s}`, { s: new Float64Array(dim), q: new Float64Array(dim), n: 0 });
    spans.forEach((sp, i) => {
      const f = feats[sp.seq]!;
      const bd = bounds[i]!;
      sp.phones.forEach((ph, p) => {
        const a = bd[p]!;
        const b = bd[p + 1]!;
        for (let t = a; t < b; t++) {
          const s = Math.min(STATES - 1, Math.floor(((t - a) * STATES) / Math.max(1, b - a)));
          const e = acc.get(`${ph}/${s}`)!;
          for (let k = 0; k < dim; k++) {
            e.s[k] = e.s[k]! + f[t]![k]!;
            e.q[k] = e.q[k]! + f[t]![k]! ** 2;
          }
          e.n++;
        }
      });
    });
    const models = new Map<string, Model>();
    for (const [key, e] of acc) {
      const mean = new Float64Array(dim);
      const ivar = new Float64Array(dim);
      let logdet = 0;
      for (let k = 0; k < dim; k++) {
        const m = e.n ? e.s[k]! / e.n : gm[k]!;
        const v = Math.max(e.n ? e.q[k]! / e.n - m * m : gv[k]!, VAR_FLOOR * gv[k]! + 1e-12);
        mean[k] = m;
        ivar[k] = 1 / v;
        logdet += Math.log(v);
      }
      models.set(key, { mean, ivar, logdet });
    }
    bounds = spans.map((sp) => {
      const ms: Model[] = [];
      for (const ph of sp.phones) for (let s = 0; s < STATES; s++) ms.push(models.get(`${ph}/${s}`)!);
      return alignOne(feats[sp.seq]!, sp.a, sp.b, ms);
    });
  }
  return bounds;
}
