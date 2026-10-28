/**
 * The Booth's frame mouth: a voice rendered back from its own measured frames
 * (frames.ts). Christman-Sound's christman_vocoder.c is the port of this file
 * and is tested against it sample for sample.
 *
 * Why (2026-10-28). synth.ts speaks from a phone table. This renders from the
 * voice's numbers: per frame its pitch, its full spectral envelope and its
 * aperiodicity per band; per voice its measured jitter and shimmer. Nothing
 * here is a default standing in for a measurement: every input is required.
 *
 * How (a source-filter vocoder written from first principles):
 *   Periodic part. One pulse per glottal cycle, placed by accumulating phase
 *   from the frame pitch, at a fractional sample position. Each pulse is the
 *   minimum-phase response whose power spectrum is envelope x (1 - ap) at that
 *   instant, scaled by sqrt(period in samples) so the train has unit power
 *   before the envelope. Each cycle's period is perturbed by `jitter` and its
 *   amplitude by `shimmer` (standard deviations, as fractions), Gaussian.
 *   Aperiodic part. White Gaussian noise in frames of 2 x hop samples under a
 *   square-root Hann window (the squares sum to one at 50% overlap, so the
 *   noise power is constant), each filtered by the minimum-phase response
 *   whose power spectrum is envelope x ap at that frame.
 *   Minimum phase comes from the folded real cepstrum.
 * The output is not normalised: its level is the recording's level.
 * The same seed gives the same samples.
 */

import { fft } from "./frames.ts";

export const VOC_NFFT = 1024;
const HALF = VOC_NFFT / 2 + 1;
/** Clamps on one cycle's perturbation: a period within 20%, an amplitude within 50%. Beyond those a single draw is no longer a perturbation of this voice. */
const PERIOD_CLAMP = 0.2;
const AMP_CLAMP = 0.5;

export type RenderInput = {
  sr: number;
  hop: number;
  f0: ArrayLike<number>; // n
  envDb: ArrayLike<number>; // n * envHz.length
  envHz: ArrayLike<number>;
  ap: ArrayLike<number>; // n * (bandEdges.length - 1)
  bandEdges: ArrayLike<number>;
  jitter: number;
  shimmer: number;
  seed: number;
};

export class RenderRefused extends Error {
  code: number;
  constructor(code: number, reason: string) {
    super(reason);
    this.code = code;
  }
}

/** xorshift32: exact in 32-bit integer arithmetic, so C and JavaScript draw the same numbers. */
class Rng {
  s: number;
  has = false;
  spare = 0;
  constructor(seed: number) {
    this.s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 0x6d2b79f5;
  }
  uniform() {
    let s = this.s;
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    this.s = s;
    return (s + 0.5) / 4294967296;
  }
  gauss() {
    if (this.has) {
      this.has = false;
      return this.spare;
    }
    const u = this.uniform();
    const v = this.uniform();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(2 * Math.PI * v);
    this.has = true;
    return m * Math.cos(2 * Math.PI * v);
  }
}

type Ctx = {
  n: number;
  hop: number;
  sr: number;
  ne: number;
  nb: number;
  in: RenderInput;
  gridJ: Int32Array;
  gridW: Float64Array;
  bandJ: Int32Array;
  bandW: Float64Array;
};

function prepare(c: Ctx) {
  const hz = c.in.envHz;
  const e = c.in.bandEdges;
  for (let k = 0; k < HALF; k++) {
    const f = (k * c.sr) / VOC_NFFT;
    let j = 0;
    while (j < c.ne - 2 && hz[j + 1]! <= f) j++;
    const span = hz[j + 1]! - hz[j]!;
    const w = span > 0 ? (f - hz[j]!) / span : 0;
    c.gridJ[k] = j;
    c.gridW[k] = w < 0 ? 0 : w > 1 ? 1 : w;
    if (c.nb === 1) {
      c.bandJ[k] = 0;
      c.bandW[k] = 0;
      continue;
    }
    const first = 0.5 * (e[0]! + e[1]!);
    const last = 0.5 * (e[c.nb - 1]! + e[c.nb]!);
    if (f <= first) {
      c.bandJ[k] = 0;
      c.bandW[k] = 0;
      continue;
    }
    if (f >= last) {
      c.bandJ[k] = c.nb - 2;
      c.bandW[k] = 1;
      continue;
    }
    let b = 0;
    while (b < c.nb - 2 && 0.5 * (e[b + 1]! + e[b + 2]!) <= f) b++;
    const cb = 0.5 * (e[b]! + e[b + 1]!);
    const cn = 0.5 * (e[b + 1]! + e[b + 2]!);
    c.bandJ[k] = b;
    c.bandW[k] = (f - cb) / (cn - cb);
  }
}

function spectrumAt(c: Ctx, fiIn: number, lnp: Float64Array, apb: Float64Array) {
  let fi = fiIn;
  if (fi < 0) fi = 0;
  if (fi > c.n - 1) fi = c.n - 1;
  const i0 = Math.floor(fi);
  const i1 = i0 + 1 < c.n ? i0 + 1 : i0;
  const t = fi - i0;
  const env = c.in.envDb;
  const ap = c.in.ap;
  const e0 = i0 * c.ne;
  const e1 = i1 * c.ne;
  const a0 = i0 * c.nb;
  const a1 = i1 * c.nb;
  const db2ln = Math.log(10) / 10;
  for (let k = 0; k < HALF; k++) {
    const j = c.gridJ[k]!;
    const w = c.gridW[k]!;
    const d0 = env[e0 + j]! * (1 - w) + env[e0 + j + 1]! * w;
    const d1 = env[e1 + j]! * (1 - w) + env[e1 + j + 1]! * w;
    lnp[k] = (d0 * (1 - t) + d1 * t) * db2ln;
    const b = c.bandJ[k]!;
    const bw = c.bandW[k]!;
    let x0: number;
    let x1: number;
    if (c.nb === 1) {
      x0 = ap[a0]!;
      x1 = ap[a1]!;
    } else {
      x0 = ap[a0 + b]! * (1 - bw) + ap[a0 + b + 1]! * bw;
      x1 = ap[a1 + b]! * (1 - bw) + ap[a1 + b + 1]! * bw;
    }
    apb[k] = x0 * (1 - t) + x1 * t;
  }
}

function minphase(lnmag: Float64Array, delay: number, re: Float64Array, im: Float64Array) {
  for (let k = 0; k < HALF; k++) {
    re[k] = lnmag[k]!;
    im[k] = 0;
  }
  for (let k = HALF; k < VOC_NFFT; k++) {
    re[k] = lnmag[VOC_NFFT - k]!;
    im[k] = 0;
  }
  fft(re, im, true);
  for (let q = 1; q < VOC_NFFT / 2; q++) re[q] = re[q]! * 2;
  for (let q = VOC_NFFT / 2 + 1; q < VOC_NFFT; q++) re[q] = 0;
  for (let q = 0; q < VOC_NFFT; q++) im[q] = 0;
  fft(re, im, false);
  for (let k = 0; k < VOC_NFFT; k++) {
    const kk = k <= VOC_NFFT / 2 ? k : k - VOC_NFFT;
    const mag = Math.exp(re[k]!);
    const ph = im[k]! - (2 * Math.PI * kk * delay) / VOC_NFFT;
    re[k] = mag * Math.cos(ph);
    im[k] = mag * Math.sin(ph);
  }
}

function f0At(c: Ctx, fiIn: number) {
  let fi = fiIn;
  if (fi < 0) fi = 0;
  if (fi > c.n - 1) fi = c.n - 1;
  const i0 = Math.floor(fi);
  const i1 = i0 + 1 < c.n ? i0 + 1 : i0;
  const t = fi - i0;
  const a = c.in.f0[i0]!;
  const b = c.in.f0[i1]!;
  if (a > 0 && b > 0) return a * (1 - t) + b * t;
  return t < 0.5 ? a : b; // at a voicing edge the nearer frame decides
}

/** Check every input; throws RenderRefused with the code christman_vocoder.c returns. */
export function checkInput(inp: RenderInput) {
  const ne = inp.envHz.length;
  const nb = inp.bandEdges.length - 1;
  const n = inp.f0.length;
  if (n <= 0 || inp.hop <= 0 || ne < 2 || nb < 1) throw new RenderRefused(1, "bad arguments");
  if (inp.envDb.length !== n * ne || inp.ap.length !== n * nb) throw new RenderRefused(1, "frame arrays do not match the frame count");
  if (inp.sr < 8000 || inp.sr > 24000) throw new RenderRefused(2, `sample rate ${inp.sr} outside 8000..24000`);
  const ok = (v: number) => Number.isFinite(v);
  if (!ok(inp.jitter) || !ok(inp.shimmer) || inp.jitter < 0 || inp.jitter > 0.2 || inp.shimmer < 0 || inp.shimmer > 0.2)
    throw new RenderRefused(3, "jitter and shimmer must be measured values in [0, 0.2]");
  if (inp.envHz[0] !== 0 || Math.abs(inp.envHz[ne - 1]! - inp.sr / 2) > 1e-6) throw new RenderRefused(3, "envelope grid must run from 0 to sr / 2");
  for (let j = 1; j < ne; j++) if (!(inp.envHz[j]! > inp.envHz[j - 1]!)) throw new RenderRefused(3, "envelope grid must rise");
  if (inp.bandEdges[0] !== 0) throw new RenderRefused(3, "band edges must start at 0");
  for (let b = 1; b <= nb; b++) if (!(inp.bandEdges[b]! > inp.bandEdges[b - 1]!)) throw new RenderRefused(3, "band edges must rise");
  for (let i = 0; i < n; i++) {
    if (!ok(inp.f0[i]!) || inp.f0[i]! < 0) throw new RenderRefused(3, `frame ${i}: pitch not a measured value`);
    for (let j = 0; j < ne; j++) if (!ok(inp.envDb[i * ne + j]!)) throw new RenderRefused(3, `frame ${i}: envelope not finite`);
    for (let b = 0; b < nb; b++) {
      const a = inp.ap[i * nb + b]!;
      if (!ok(a) || a < 0 || a > 1) throw new RenderRefused(3, `frame ${i}: aperiodicity outside [0, 1]`);
    }
  }
}

/** Render n * hop samples from the frames. */
export function renderFrames(inp: RenderInput): Float32Array {
  checkInput(inp);
  const n = inp.f0.length;
  const hop = inp.hop;
  const sr = inp.sr;
  const outLen = n * hop;
  const c: Ctx = {
    n,
    hop,
    sr,
    ne: inp.envHz.length,
    nb: inp.bandEdges.length - 1,
    in: inp,
    gridJ: new Int32Array(HALF),
    gridW: new Float64Array(HALF),
    bandJ: new Int32Array(HALF),
    bandW: new Float64Array(HALF),
  };
  prepare(c);
  const re = new Float64Array(VOC_NFFT);
  const im = new Float64Array(VOC_NFFT);
  const nre = new Float64Array(VOC_NFFT);
  const nim = new Float64Array(VOC_NFFT);
  const lnp = new Float64Array(HALF);
  const apb = new Float64Array(HALF);
  const lnm = new Float64Array(HALF);
  const acc = new Float64Array(outLen + VOC_NFFT);
  const rng = new Rng(inp.seed);
  const floorLn = Math.log(1e-12);

  // Periodic part.
  let phase = 1;
  let pscale = 1;
  let ascale = 1;
  for (let s = 0; s < outLen; s++) {
    const fi = s / hop;
    const f = f0At(c, fi);
    if (f <= 0) {
      phase = 1;
      continue;
    }
    const inc = f / sr / pscale;
    const before = phase;
    phase += inc;
    if (before >= 1 || phase >= 1) {
      const over = before >= 1 ? 0 : (phase - 1) / inc;
      let pos = s - over;
      if (pos < 0) pos = 0;
      phase = before >= 1 ? 0 : phase - 1;
      const period = (sr / f) * pscale;
      spectrumAt(c, pos / hop, lnp, apb);
      for (let k = 0; k < HALF; k++) {
        const per = 1 - apb[k]!;
        const l = per > 1e-12 ? lnp[k]! + Math.log(per) : floorLn + lnp[k]!;
        lnm[k] = 0.5 * l;
      }
      const p0 = Math.floor(pos);
      minphase(lnm, pos - p0, re, im);
      fft(re, im, true);
      const amp = Math.sqrt(period) * ascale;
      for (let m = 0; m < VOC_NFFT; m++) acc[p0 + m] = acc[p0 + m]! + amp * re[m]!;
      const gj = rng.gauss();
      const gs = rng.gauss();
      pscale = 1 + inp.jitter * gj;
      if (pscale < 1 - PERIOD_CLAMP) pscale = 1 - PERIOD_CLAMP;
      if (pscale > 1 + PERIOD_CLAMP) pscale = 1 + PERIOD_CLAMP;
      ascale = 1 + inp.shimmer * gs;
      if (ascale < 1 - AMP_CLAMP) ascale = 1 - AMP_CLAMP;
      if (ascale > 1 + AMP_CLAMP) ascale = 1 + AMP_CLAMP;
    }
  }

  // Aperiodic part.
  let seg = 2 * hop;
  if (seg > VOC_NFFT) seg = VOC_NFFT;
  for (let i = 0; i < n; i++) {
    spectrumAt(c, i, lnp, apb);
    let any = false;
    for (let k = 0; k < HALF; k++) {
      const l = apb[k]! > 1e-12 ? lnp[k]! + Math.log(apb[k]!) : floorLn + lnp[k]!;
      lnm[k] = 0.5 * l;
      if (apb[k]! > 1e-6) any = true;
    }
    if (!any) continue;
    minphase(lnm, 0, re, im);
    nre.fill(0);
    nim.fill(0);
    for (let m = 0; m < seg; m++) {
      const w = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * m) / seg));
      nre[m] = rng.gauss() * w;
    }
    fft(nre, nim, false);
    for (let k = 0; k < VOC_NFFT; k++) {
      const a = nre[k]! * re[k]! - nim[k]! * im[k]!;
      const b = nre[k]! * im[k]! + nim[k]! * re[k]!;
      nre[k] = a;
      nim[k] = b;
    }
    fft(nre, nim, true);
    const start = i * hop - hop;
    for (let m = 0; m < VOC_NFFT; m++) {
      const at = start + m;
      if (at >= 0 && at < outLen + VOC_NFFT) acc[at] = acc[at]! + nre[m]!;
    }
  }

  const out = new Float32Array(outLen);
  for (let s = 0; s < outLen; s++) out[s] = acc[s]!;
  return out;
}
