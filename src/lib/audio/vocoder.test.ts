import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AP_BANDS, AP_EDGES, ENV_POINTS, FRAME_SR, HOP, analyze, envGridHz } from "./frames.ts";
import { RenderRefused, renderFrames, type RenderInput } from "./vocoder.ts";

/** n frames of one steady sound: pitch f0 (0 = unvoiced), flat envelope at db, aperiodicity ap in every band. */
function steady(n: number, f0: number, db: number, ap: number, extra: Partial<RenderInput> = {}): RenderInput {
  return {
    sr: FRAME_SR,
    hop: HOP,
    f0: new Float64Array(n).fill(f0),
    envDb: new Float64Array(n * ENV_POINTS).fill(db),
    envHz: envGridHz(),
    ap: new Float64Array(n * AP_BANDS).fill(ap),
    bandEdges: AP_EDGES,
    jitter: 0,
    shimmer: 0,
    seed: 1,
    ...extra,
  };
}
function vowel(f0: number, seconds: number) {
  const n = Math.round(seconds * FRAME_SR);
  const x = new Float64Array(n);
  const r = Math.exp((-Math.PI * 90) / FRAME_SR);
  const a1 = 2 * r * Math.cos((2 * Math.PI * 650) / FRAME_SR);
  let y1 = 0;
  let y2 = 0;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += f0 / FRAME_SR;
    let e = 0;
    if (phase >= 1) {
      phase -= 1;
      e = 0.3;
    }
    const y = e + a1 * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    x[i] = y * (1 - r);
  }
  return x;
}
/**
 * Positions (sub-sample) and sizes of the pulses of a flat-envelope, fully
 * periodic render. Each pulse is one spike, spread a little by its fractional
 * delay: the position is the peak refined by a parabola, the size the energy
 * within 6 samples of it (a delay moves energy between samples, never changes it).
 */
function pulses(y: Float32Array) {
  const at: number[] = [];
  const amp: number[] = [];
  let top = 0;
  for (const v of y) top = Math.max(top, Math.abs(v));
  for (let i = 40; i < y.length - 40; i++) {
    if (y[i]! < 0.3 * top) continue;
    let isMax = true;
    for (let k = -40; k <= 40 && isMax; k++) if (k !== 0 && y[i + k]! > y[i]!) isMax = false;
    if (!isMax) continue;
    const a = y[i - 1]!;
    const b = y[i]!;
    const c = y[i + 1]!;
    const den = a - 2 * b + c;
    at.push(i + (den < 0 ? (0.5 * (a - c)) / den : 0));
    let e = 0;
    for (let k = -6; k <= 6; k++) e += y[i + k]! ** 2;
    amp.push(Math.sqrt(e));
  }
  return { at, amp };
}
function local(xs: number[]) {
  let d = 0;
  for (let i = 1; i < xs.length; i++) d += Math.abs(xs[i]! - xs[i - 1]!);
  return d / (xs.length - 1) / (xs.reduce((a, b) => a + b, 0) / xs.length);
}

describe("renderFrames", () => {
  it("gives the same samples for the same seed, and noise that differs for another seed", () => {
    const inp = steady(100, 140, -30, 0.3);
    const a = renderFrames(inp);
    const b = renderFrames(inp);
    assert.deepEqual(a, b);
    const c = renderFrames({ ...inp, seed: 2 });
    assert.notDeepEqual(a, c);
    assert.equal(a.length, 100 * HOP);
  });

  it("renders noise frames at the envelope's power (power per sample)", () => {
    const y = renderFrames(steady(400, 0, -20, 1));
    let s = 0;
    for (let i = 4000; i < 40000; i++) s += y[i]! ** 2;
    const db = 10 * Math.log10(s / 36000);
    assert.ok(Math.abs(db + 20) < 0.5, `noise at ${db.toFixed(2)} dB`);
  });

  it("renders a voiced frame's power at the envelope's power", () => {
    const y = renderFrames(steady(400, 150, -20, 0));
    let s = 0;
    for (let i = 4000; i < 40000; i++) s += y[i]! ** 2;
    const db = 10 * Math.log10(s / 36000);
    assert.ok(Math.abs(db + 20) < 0.5, `pulses at ${db.toFixed(2)} dB`);
  });

  it("adds the jitter and shimmer it is given, cycle by cycle", () => {
    const plain = pulses(renderFrames(steady(600, 150, -20, 0)));
    const periods = plain.at.slice(1).map((p, i) => p - plain.at[i]!);
    assert.ok(local(periods) < 0.01, `plain jitter ${local(periods)}`);
    const shaken = pulses(renderFrames(steady(600, 150, -20, 0, { jitter: 0.02, shimmer: 0.08 })));
    const p2 = shaken.at.slice(1).map((p, i) => p - shaken.at[i]!);
    // local jitter of Gaussian draws is 1.128 x sd; about 100 cycles are drawn, so allow 30%
    assert.ok(Math.abs(local(p2) - 1.128 * 0.02) / (1.128 * 0.02) < 0.3, `jitter ${local(p2)}`);
    assert.ok(Math.abs(local(shaken.amp) - 1.128 * 0.08) / (1.128 * 0.08) < 0.3, `shimmer ${local(shaken.amp)}`);
  });

  it("brings a voice back from its own frames: same pitch, same level, same resonance", () => {
    const x = vowel(140, 1);
    const t = analyze(x);
    const y = renderFrames({ sr: FRAME_SR, hop: HOP, f0: t.f0, envDb: t.envDb, envHz: envGridHz(), ap: t.ap, bandEdges: AP_EDGES, jitter: 0, shimmer: 0, seed: 1 });
    const t2 = analyze(y);
    const v = Array.from(t2.f0).slice(20, -20).filter((f) => f > 0).sort((a, b) => a - b);
    assert.ok(Math.abs(v[v.length >> 1]! - 140) / 140 < 0.01);
    let ex = 0;
    let ey = 0;
    for (let i = 2000; i < x.length - 2000; i++) {
      ex += x[i]! ** 2;
      ey += y[i]! ** 2;
    }
    assert.ok(Math.abs(10 * Math.log10(ey / ex)) < 1, `level ${10 * Math.log10(ey / ex)} dB`);
    let d = 0;
    let n = 0;
    for (let i = 20; i < t.n - 20; i++)
      for (let j = 0; j < ENV_POINTS; j++) {
        d += (t.envDb[i * ENV_POINTS + j]! - t2.envDb[i * ENV_POINTS + j]!) ** 2;
        n++;
      }
    assert.ok(Math.sqrt(d / n) < 2.5, `envelope distance ${Math.sqrt(d / n).toFixed(2)} dB`);
  });

  it("refuses what it cannot render, with a code, and writes nothing", () => {
    const code = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        assert.ok(e instanceof RenderRefused);
        return e.code;
      }
      return 0;
    };
    assert.equal(code(() => renderFrames(steady(10, 140, -30, 1.5))), 3);
    assert.equal(code(() => renderFrames(steady(10, -1, -30, 0.2))), 3);
    assert.equal(code(() => renderFrames(steady(10, 140, -30, 0.2, { jitter: 0.3 }))), 3);
    assert.equal(code(() => renderFrames(steady(10, 140, -30, 0.2, { sr: 44100 }))), 2);
    assert.equal(code(() => renderFrames({ ...steady(10, 140, -30, 0.2), envDb: new Float64Array(5) })), 1);
    assert.equal(code(() => renderFrames(steady(10, 140, Number.NaN, 0.2))), 3);
  });
});
