import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AP_BANDS, ENV_POINTS, FRAME_SR, analyze, envGridHz, fft, trackPitch } from "./frames.ts";

/** A seeded uniform generator for test signals (xorshift32). */
function rng(seed: number) {
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
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}
/** A pulse train at f0 through a two-pole resonator at fr Hz: a steady vowel-like sound. */
function vowel(f0: number, seconds: number, fr = 600, bw = 100, amp = 0.3) {
  const n = Math.round(seconds * FRAME_SR);
  const x = new Float64Array(n);
  const r = Math.exp((-Math.PI * bw) / FRAME_SR);
  const a1 = 2 * r * Math.cos((2 * Math.PI * fr) / FRAME_SR);
  const a2 = -r * r;
  let y1 = 0;
  let y2 = 0;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += f0 / FRAME_SR;
    let e = 0;
    if (phase >= 1) {
      phase -= 1;
      e = amp;
    }
    const y = e + a1 * y1 + a2 * y2;
    y2 = y1;
    y1 = y;
    x[i] = y * (1 - r);
  }
  return x;
}
function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1]!;
}

describe("fft", () => {
  it("inverse returns the input", () => {
    const r = rng(3);
    const re = Float64Array.from({ length: 1024 }, () => r() - 0.5);
    const im = new Float64Array(1024);
    const keep = re.slice();
    fft(re, im, false);
    fft(re, im, true);
    for (let i = 0; i < 1024; i++) assert.ok(Math.abs(re[i]! - keep[i]!) < 1e-12 && Math.abs(im[i]!) < 1e-12);
  });
});

describe("envelope grid", () => {
  it("runs from 0 to Nyquist, rising, ENV_POINTS long", () => {
    const g = envGridHz();
    assert.equal(g.length, ENV_POINTS);
    assert.equal(g[0], 0);
    assert.equal(g[ENV_POINTS - 1], FRAME_SR / 2);
    for (let j = 1; j < ENV_POINTS; j++) assert.ok(g[j]! > g[j - 1]!);
  });
});

describe("pitch", () => {
  it("finds a steady 150 Hz voice and calls it voiced", () => {
    const { f0 } = trackPitch(vowel(150, 1));
    const inner = Array.from(f0).slice(10, -10);
    const voiced = inner.filter((f) => f > 0);
    assert.ok(voiced.length / inner.length > 0.9, `voiced ${voiced.length}/${inner.length}`);
    assert.ok(Math.abs(median(voiced) - 150) / 150 < 0.01, `median ${median(voiced)}`);
  });
  it("follows 110 Hz and 220 Hz without octave errors", () => {
    for (const f of [110, 220]) {
      const { f0 } = trackPitch(vowel(f, 0.6));
      const v = Array.from(f0).filter((x) => x > 0);
      assert.ok(v.every((x) => Math.abs(x - f) / f < 0.05), `${f}: ${Math.min(...v)}..${Math.max(...v)}`);
    }
  });
  it("calls white noise and silence unvoiced", () => {
    const r = rng(9);
    const noise = Float64Array.from({ length: FRAME_SR }, () => 0.1 * gauss(r));
    const fn = trackPitch(noise).f0;
    assert.ok(Array.from(fn).filter((x) => x > 0).length / fn.length < 0.1);
    const fs = trackPitch(new Float64Array(FRAME_SR)).f0;
    assert.ok(Array.from(fs).every((x) => x === 0));
  });
});

describe("analyze", () => {
  it("reads white noise of variance v as v in every band of the envelope (power per sample)", () => {
    const r = rng(11);
    const x = Float64Array.from({ length: 2 * FRAME_SR }, () => 0.1 * gauss(r));
    const t = analyze(x);
    const g = envGridHz();
    const vals: number[] = [];
    for (let i = 20; i < t.n - 20; i++) for (let j = 0; j < ENV_POINTS; j++) if (g[j]! > 200 && g[j]! < 8000) vals.push(t.envDb[i * ENV_POINTS + j]!);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    // 10 log10(0.01) = -20 dB; the log of a noisy estimate reads low by up to 2.5 dB
    assert.ok(mean < -18 && mean > -23, `mean ${mean.toFixed(2)} dB`);
    for (let i = 20; i < t.n - 20; i++) for (let b = 0; b < AP_BANDS; b++) if (t.f0[i] === 0) assert.equal(t.ap[i * AP_BANDS + b], 1);
  });
  it("puts the resonance where it is and finds a periodic voice periodic", () => {
    const t = analyze(vowel(130, 1, 700, 80));
    const g = envGridHz();
    const peaks: number[] = [];
    const lows: number[] = [];
    for (let i = 20; i < t.n - 20; i++) {
      if (!(t.f0[i]! > 0)) continue;
      let best = 0;
      for (let j = 0; j < ENV_POINTS; j++) if (g[j]! > 200 && g[j]! < 3000 && t.envDb[i * ENV_POINTS + j]! > t.envDb[i * ENV_POINTS + best]!) best = j;
      peaks.push(g[best]!);
      lows.push(t.ap[i * AP_BANDS]!);
    }
    assert.ok(Math.abs(median(peaks) - 700) < 80, `peak ${median(peaks)}`);
    assert.ok(median(lows) < 0.1, `aperiodicity ${median(lows)}`);
  });
  it("refuses a sample rate it does not measure at", () => {
    assert.throws(() => analyze(new Float64Array(100), 16000), /22050/);
  });
});
