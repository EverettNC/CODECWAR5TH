/**
 * The Booth's dense frames: a voice measured every 5 ms from its own recordings.
 *
 * Why (2026-10-28). The Booth's synth.ts speaks from a 40-row phone table: a
 * dozen numbers per vowel. Everett's ruling: "if you add the mathematical
 * numbers precisely to the matching voice pattern, there shouldn't be any
 * difference." So a voice is measured here at every hop (110 samples at
 * 22050 Hz, 4.99 ms) into:
 *   f0     pitch in Hz, 0 when the frame is unvoiced
 *   envDb  the full spectral envelope: ENV_POINTS values in dB on a
 *          mel-spaced grid from 0 Hz to Nyquist (not a few formants)
 *   ap     aperiodicity in AP_EDGES bands: the fraction of the band's power
 *          that is noise (1 in an unvoiced frame), so the noise of S, SH, F,
 *          H, the stop bursts and the breath in the vowels is measured, not
 *          made up
 *   rmsDb  the frame's level, and periodicity (1 - the YIN dip) for the record
 * vocoder.ts renders a voice back from exactly these numbers.
 *
 * Methods, each written here from its published description:
 *   pitch          YIN (de Cheveigne and Kawahara 2002): cumulative mean
 *                  normalised difference, every dip a candidate, then one
 *                  path through all frames (Viterbi) that pays for octave
 *                  jumps and for switching voicing.
 *   envelope       CheapTrick (Morise 2015): a Hann window three periods
 *                  long, power spectrum, smoothing over one harmonic spacing,
 *                  then cepstral liftering that removes the harmonic ripple.
 *                  Power is per sample: white noise of variance v reads v in
 *                  every bin, and a pulse train of the same power reads the
 *                  same, so the vocoder's two sources add to the envelope.
 *   aperiodicity   per band, the normalised autocorrelation of the band at
 *                  the pitch period (searched within two samples of it). A
 *                  periodic band gives 1, noise gives 0; the noise fraction
 *                  of the power is 1 - r.
 * Every number below that is a choice is a chosen starting value; its reason
 * is written beside it. They stay until measurements on the voice replace them.
 */

export const FRAME_SR = 22_050;
/** 110 samples = 4.99 ms at 22050 Hz: "every 5 ms or so", a whole number of samples. */
export const HOP = 110;
/** Holds three periods at the pitch floor: 3 x 22050 / 70 = 945 < 1024. */
export const NFFT = 1024;
export const HALF = NFFT / 2 + 1;
/** 96 envelope points: about 23 Hz apart at the bottom of the mel grid, where formants and the first harmonics sit. */
export const ENV_POINTS = 96;
/** Band edges in Hz. Narrow below 2 kHz (voicing and breath), wider above (frication). */
export const AP_EDGES = [0, 600, 1200, 2000, 3000, 4000, 5500, 7500, 11025] as const;
export const AP_BANDS = AP_EDGES.length - 1;
/** Pitch search range. 70 Hz floor: below any speaking voice the family has; 400 Hz ceiling: above a raised voice. */
export const F0_FLOOR = 70;
export const F0_CEIL = 400;
/** YIN integration window: 512 samples, 23 ms, about three periods at 130 Hz. */
const YIN_W = 512;
/** The window CheapTrick uses for an unvoiced frame stands for a 300 Hz voice (10 ms), short enough to follow a burst. */
const UNVOICED_F0 = 300;
/** CheapTrick's compensation lifter coefficient, as published. */
const CHEAPTRICK_Q1 = -0.15;
/** A frame more than 45 dB under the loud frames of its recording is silence, not voice. */
const SILENCE_DB = -45;
/** Viterbi costs: an octave jump costs 1.5 (more than any single dip), switching voicing 0.3, staying unvoiced 0.45 (a dip above 0.45 is not a period). */
const COST_OCTAVE = 1.5;
const COST_SWITCH = 0.3;
const COST_UNVOICED = 0.45;
/** A dip above 0.6 is not offered as a candidate at all. */
const DIP_MAX = 0.6;
/** Voiced runs shorter than 4 frames (20 ms) cannot hold one 70 Hz period and a half; they are made unvoiced. */
const MIN_VOICED_RUN = 4;

export type FrameTrack = {
  sr: number;
  hop: number;
  n: number;
  f0: Float64Array;
  envDb: Float64Array; // n * ENV_POINTS
  ap: Float64Array; // n * AP_BANDS
  rmsDb: Float64Array;
  periodicity: Float64Array;
};

export function hzToMel(hz: number) {
  return 1127 * Math.log(1 + hz / 700);
}
export function melToHz(mel: number) {
  return 700 * (Math.exp(mel / 1127) - 1);
}

/** The envelope grid: ENV_POINTS mel-spaced frequencies from 0 to sr / 2, ends exact. */
export function envGridHz(sr: number = FRAME_SR): Float64Array {
  const g = new Float64Array(ENV_POINTS);
  const top = hzToMel(sr / 2);
  for (let j = 0; j < ENV_POINTS; j++) g[j] = melToHz((top * j) / (ENV_POINTS - 1));
  g[0] = 0;
  g[ENV_POINTS - 1] = sr / 2;
  return g;
}

/** In-place radix-2 FFT of any power-of-two length. inverse divides by n. Same steps as christman_vocoder.c. */
export function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]!;
      re[i] = re[j]!;
      re[j] = t;
      t = im[i]!;
      im[i] = im[j]!;
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const xr = re[b]! * cr - im[b]! * ci;
        const xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n;
      im[i] = im[i]! / n;
    }
  }
}

function sampleAt(x: ArrayLike<number>, i: number) {
  return i >= 0 && i < x.length ? x[i]! : 0;
}

type Cand = { f0: number; cost: number };

/** YIN candidates for every frame, plus each frame's level and best dip. */
function pitchCandidates(x: ArrayLike<number>, sr: number, n: number) {
  const tauMin = Math.floor(sr / F0_CEIL);
  const tauMax = Math.ceil(sr / F0_FLOOR);
  const span = YIN_W + tauMax;
  let N = 1;
  while (N < span) N <<= 1;
  const are = new Float64Array(N);
  const aim = new Float64Array(N);
  const bre = new Float64Array(N);
  const bim = new Float64Array(N);
  const cands: Cand[][] = [];
  const best = new Float64Array(n);
  const d = new Float64Array(tauMax + 2);
  const cum = new Float64Array(span + 1);
  for (let i = 0; i < n; i++) {
    const s0 = i * HOP - (span >> 1);
    are.fill(0);
    aim.fill(0);
    bre.fill(0);
    bim.fill(0);
    cum[0] = 0;
    for (let j = 0; j < span; j++) {
      const v = sampleAt(x, s0 + j);
      bre[j] = v;
      if (j < YIN_W) are[j] = v;
      cum[j + 1] = cum[j]! + v * v;
    }
    fft(are, aim, false);
    fft(bre, bim, false);
    for (let k = 0; k < N; k++) {
      // conj(A) * B
      const r = are[k]! * bre[k]! + aim[k]! * bim[k]!;
      const m = are[k]! * bim[k]! - aim[k]! * bre[k]!;
      are[k] = r;
      aim[k] = m;
    }
    fft(are, aim, true);
    const e0 = cum[YIN_W]!;
    d[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax + 1 && tau + YIN_W <= span; tau++) {
      const et = cum[tau + YIN_W]! - cum[tau]!;
      const diff = Math.max(0, e0 + et - 2 * are[tau]!);
      running += diff;
      d[tau] = running > 0 ? (diff * tau) / running : 1;
    }
    const list: Cand[] = [];
    let bestDip = 1;
    for (let tau = Math.max(tauMin, 2); tau <= tauMax && tau + 1 + YIN_W <= span; tau++) {
      const v = d[tau]!;
      if (v < d[tau - 1]! && v <= d[tau + 1]! && v < DIP_MAX) {
        const a = d[tau - 1]!;
        const c = d[tau + 1]!;
        const den = a - 2 * v + c;
        const shift = den > 0 ? (0.5 * (a - c)) / den : 0;
        const val = v - 0.25 * (a - c) * shift;
        list.push({ f0: sr / (tau + shift), cost: Math.max(0, val) });
        if (val < bestDip) bestDip = val;
      }
    }
    // An octave below a good dip is the same period counted twice: it pays 0.15 more.
    for (const c of list) {
      for (const o of list) {
        if (o !== c && o.cost < 0.3 && Math.abs(o.f0 / c.f0 - 2) < 0.1) c.cost += 0.15;
        if (o !== c && o.cost < 0.3 && Math.abs(o.f0 / c.f0 - 3) < 0.15) c.cost += 0.15;
      }
    }
    list.sort((p, q) => p.cost - q.cost);
    cands.push(list.slice(0, 5));
    best[i] = Math.max(0, bestDip);
  }
  return { cands, best };
}

/** RMS level of each frame (20 ms window) in dB. */
function frameLevels(x: ArrayLike<number>, n: number) {
  const out = new Float64Array(n);
  const half = 220;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = -half; j < half; j++) {
      const v = sampleAt(x, i * HOP + j);
      s += v * v;
    }
    out[i] = 10 * Math.log10(s / (2 * half) + 1e-20);
  }
  return out;
}

function percentile(values: number[], p: number) {
  if (!values.length) return -Infinity;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.min(s.length - 1, lo + 1);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** One pitch path through every frame: Viterbi over the YIN candidates and "unvoiced". */
export function trackPitch(x: ArrayLike<number>, sr: number = FRAME_SR) {
  const n = Math.max(1, Math.ceil(x.length / HOP));
  const { cands, best } = pitchCandidates(x, sr, n);
  const rms = frameLevels(x, n);
  const loud = percentile(Array.from(rms), 0.95);
  const states: { f0: number; local: number }[][] = [];
  for (let i = 0; i < n; i++) {
    const silent = rms[i]! < loud + SILENCE_DB;
    const s = cands[i]!.map((c) => ({ f0: c.f0, local: c.cost + (silent ? 1 : 0) }));
    s.push({ f0: 0, local: silent ? 0 : COST_UNVOICED });
    states.push(s);
  }
  const score: Float64Array[] = [];
  const back: Int32Array[] = [];
  score.push(Float64Array.from(states[0]!.map((s) => s.local)));
  back.push(new Int32Array(states[0]!.length).fill(-1));
  for (let i = 1; i < n; i++) {
    const cur = states[i]!;
    const prev = states[i - 1]!;
    const sc = new Float64Array(cur.length);
    const bk = new Int32Array(cur.length);
    for (let a = 0; a < cur.length; a++) {
      let bestV = Infinity;
      let bestK = 0;
      for (let b = 0; b < prev.length; b++) {
        let t = 0;
        const fa = cur[a]!.f0;
        const fb = prev[b]!.f0;
        if (fa > 0 && fb > 0) t = COST_OCTAVE * Math.abs(Math.log2(fa / fb));
        else if (fa > 0 !== fb > 0) t = COST_SWITCH;
        const v = score[i - 1]![b]! + t;
        if (v < bestV) {
          bestV = v;
          bestK = b;
        }
      }
      sc[a] = bestV + cur[a]!.local;
      bk[a] = bestK;
    }
    score.push(sc);
    back.push(bk);
  }
  const f0 = new Float64Array(n);
  let k = 0;
  let bv = Infinity;
  score[n - 1]!.forEach((v, idx) => {
    if (v < bv) {
      bv = v;
      k = idx;
    }
  });
  for (let i = n - 1; i >= 0; i--) {
    f0[i] = states[i]![k]!.f0;
    k = back[i]![k]!;
  }
  // Too-short voiced runs are made unvoiced.
  let i = 0;
  while (i < n) {
    if (f0[i]! > 0) {
      let j = i;
      while (j < n && f0[j]! > 0) j++;
      if (j - i < MIN_VOICED_RUN) for (let q = i; q < j; q++) f0[q] = 0;
      i = j;
    } else i++;
  }
  const periodicity = new Float64Array(n);
  for (let q = 0; q < n; q++) periodicity[q] = 1 - Math.min(1, best[q]!);
  return { f0, rmsDb: rms, periodicity };
}

/** CheapTrick envelope of one frame, in dB, over HALF bins. */
function envelopeFrame(x: ArrayLike<number>, centre: number, f0: number, sr: number, re: Float64Array, im: Float64Array, out: Float64Array) {
  const fv = f0 > 0 ? f0 : UNVOICED_F0;
  const halfLen = Math.floor((1.5 * sr) / fv);
  const len = 2 * halfLen + 1;
  re.fill(0);
  im.fill(0);
  let sw = 0;
  let sw2 = 0;
  let sxw = 0;
  const w = new Float64Array(len);
  for (let m = 0; m < len; m++) {
    w[m] = 0.5 - 0.5 * Math.cos((2 * Math.PI * (m + 1)) / (len + 1));
    sw += w[m]!;
    sw2 += w[m]! * w[m]!;
    sxw += sampleAt(x, centre - halfLen + m) * w[m]!;
  }
  const mean = sxw / sw;
  const norm = 1 / Math.sqrt(sw2);
  for (let m = 0; m < len; m++) re[m] = (sampleAt(x, centre - halfLen + m) - mean) * w[m]! * norm;
  fft(re, im, false);
  // Power per bin over bins -HALF .. 2 HALF - 1 (the spectrum of a real
  // signal is periodic and mirrored, so the smoothing sees past both ends),
  // then a running integral.
  const pw = new Float64Array(3 * HALF);
  for (let e = 0; e < 3 * HALF; e++) {
    const k = (((e - HALF) % NFFT) + NFFT) % NFFT;
    pw[e] = re[k]! * re[k]! + im[k]! * im[k]!;
  }
  const cum = new Float64Array(3 * HALF + 1);
  for (let k = 0; k < 3 * HALF; k++) cum[k + 1] = cum[k]! + pw[k]!;
  const integ = (pos: number) => {
    // integral of pw from bin 0 of the extended array to fractional position pos
    const p = Math.max(0, Math.min(3 * HALF, pos));
    const i0 = Math.floor(p);
    const frac = p - i0;
    return cum[i0]! + (i0 < 3 * HALF ? pw[i0]! * frac : 0);
  };
  const width = (fv * NFFT) / sr;
  const logs = new Float64Array(NFFT);
  for (let k = 0; k < HALF; k++) {
    const c = HALF + k + 0.5;
    const v = (integ(c + width / 2) - integ(c - width / 2)) / width;
    logs[k] = Math.log(Math.max(v, 1e-20));
  }
  for (let k = HALF; k < NFFT; k++) logs[k] = logs[NFFT - k]!;
  re.set(logs);
  im.fill(0);
  fft(re, im, true);
  for (let q = 1; q <= NFFT / 2; q++) {
    const t = (q / sr) * fv;
    const smooth = Math.sin(Math.PI * t) / (Math.PI * t);
    const comp = 1 - 2 * CHEAPTRICK_Q1 + 2 * CHEAPTRICK_Q1 * Math.cos(2 * Math.PI * t);
    re[q] = re[q]! * smooth * comp;
    if (q < NFFT / 2) re[NFFT - q] = re[q]!;
  }
  im.fill(0);
  fft(re, im, false);
  const toDb = 10 / Math.LN10;
  for (let k = 0; k < HALF; k++) out[k] = re[k]! * toDb;
}

/** HALF-bin dB spectrum onto the envelope grid (linear in Hz between bins). */
export function binsToGrid(binsDb: ArrayLike<number>, grid: Float64Array, sr: number, out: Float64Array, offset = 0) {
  for (let j = 0; j < grid.length; j++) {
    const pos = (grid[j]! * NFFT) / sr;
    const k0 = Math.min(HALF - 1, Math.floor(pos));
    const k1 = Math.min(HALF - 1, k0 + 1);
    const t = pos - k0;
    out[offset + j] = binsDb[k0]! * (1 - t) + binsDb[k1]! * t;
  }
}

/** The signal limited to [lo, hi) Hz: windowed-sinc FIR (Blackman, 257 taps), zero phase, by FFT blocks. */
export function bandLimit(x: ArrayLike<number>, lo: number, hi: number, sr: number = FRAME_SR): Float64Array {
  const taps = 257;
  const mid = (taps - 1) / 2;
  const h = new Float64Array(taps);
  const fl = lo / sr;
  const fh = Math.min(hi, sr / 2 - 1) / sr;
  for (let m = 0; m < taps; m++) {
    const t = m - mid;
    const sinc = (f: number) => (t === 0 ? 2 * f : Math.sin(2 * Math.PI * f * t) / (Math.PI * t));
    const win = 0.42 - 0.5 * Math.cos((2 * Math.PI * m) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * m) / (taps - 1));
    h[m] = (sinc(fh) - (lo > 0 ? sinc(fl) : 0)) * win;
  }
  const B = 4096;
  const N = 8192;
  const hre = new Float64Array(N);
  const him = new Float64Array(N);
  hre.set(h);
  fft(hre, him, false);
  const y = new Float64Array(x.length + taps);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let s = 0; s < x.length; s += B) {
    re.fill(0);
    im.fill(0);
    for (let j = 0; j < B && s + j < x.length; j++) re[j] = x[s + j]!;
    fft(re, im, false);
    for (let k = 0; k < N; k++) {
      const a = re[k]! * hre[k]! - im[k]! * him[k]!;
      const b = re[k]! * him[k]! + im[k]! * hre[k]!;
      re[k] = a;
      im[k] = b;
    }
    fft(re, im, true);
    for (let j = 0; j < B + taps && s + j < y.length; j++) y[s + j] = y[s + j]! + re[j]!;
  }
  return y.subarray(mid, mid + x.length);
}

/** Noise fraction of each band's power in each voiced frame (1 when unvoiced). */
export function aperiodicity(x: ArrayLike<number>, f0: Float64Array, sr: number = FRAME_SR): Float64Array {
  const n = f0.length;
  const ap = new Float64Array(n * AP_BANDS).fill(1);
  for (let b = 0; b < AP_BANDS; b++) {
    const lo = AP_EDGES[b]!;
    const hi = Math.min(AP_EDGES[b + 1]!, sr / 2);
    if (lo >= sr / 2) continue;
    const y = bandLimit(x, lo, hi, sr);
    for (let i = 0; i < n; i++) {
      const f = f0[i]!;
      if (!(f > 0)) continue;
      const T = sr / f;
      const L = Math.round(3 * T);
      const centre = i * HOP;
      const start = Math.round(centre - L / 2 - T / 2);
      const base = Math.round(T);
      const rs: number[] = [];
      for (let lag = base - 2; lag <= base + 2; lag++) {
        let xy = 0;
        let xx = 0;
        let yy = 0;
        for (let m = 0; m < L; m++) {
          const a = sampleAt(y, start + m);
          const c = sampleAt(y, start + m + lag);
          xy += a * c;
          xx += a * a;
          yy += c * c;
        }
        rs.push(xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : 0);
      }
      let k = 0;
      for (let q = 1; q < rs.length; q++) if (rs[q]! > rs[k]!) k = q;
      let r = rs[k]!;
      if (k > 0 && k < rs.length - 1) {
        const a = rs[k - 1]!;
        const c = rs[k + 1]!;
        const den = a - 2 * r + c;
        if (den < 0) r = r - (0.125 * (a - c) * (a - c)) / den;
      }
      ap[i * AP_BANDS + b] = Math.min(1, Math.max(0, 1 - Math.min(1, r)));
    }
  }
  return ap;
}

/** Measure a recording into frames. x: samples in [-1, 1] at sr (22050 expected). */
export function analyze(x: ArrayLike<number>, sr: number = FRAME_SR): FrameTrack {
  if (sr !== FRAME_SR) throw new Error(`frames are measured at ${FRAME_SR} Hz, not ${sr}`);
  const { f0, rmsDb, periodicity } = trackPitch(x, sr);
  const n = f0.length;
  const grid = envGridHz(sr);
  const envDb = new Float64Array(n * ENV_POINTS);
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const bins = new Float64Array(HALF);
  for (let i = 0; i < n; i++) {
    envelopeFrame(x, i * HOP, f0[i]!, sr, re, im, bins);
    binsToGrid(bins, grid, sr, envDb, i * ENV_POINTS);
  }
  const ap = aperiodicity(x, f0, sr);
  return { sr, hop: HOP, n, f0, envDb, ap, rmsDb, periodicity };
}
