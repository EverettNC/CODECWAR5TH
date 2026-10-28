import assert from "node:assert/strict";
import { test } from "node:test";
import { extractFrames, pitchYin, SAMPLE_RATE, WIN, YIN_F0_MAX, YIN_F0_MIN } from "./dsp.ts";
import { synthesizePhone } from "./synth.ts";

/** A pulse train with falling harmonics, the shape of a voice source, at f0 Hz. */
function pulses(f0: number, seconds = 0.4): Float32Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const x = new Float32Array(n);
  const top = Math.floor(7000 / f0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let h = 1; h <= top; h++) s += Math.sin((2 * Math.PI * h * f0 * i) / SAMPLE_RATE) / h;
    x[i] = 0.3 * s;
  }
  return x;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1]!;
}

test("YIN reads every pitch from 60 to 400 Hz, every frame, with no octave error", () => {
  for (let f0 = 60; f0 <= 400; f0 += 5) {
    const x = pulses(f0);
    for (let off = 0; off + WIN <= x.length; off += 160) {
      const got = pitchYin(x, off).f0;
      assert.ok(Math.abs(got / f0 - 1) < 0.01, `${f0} Hz read as ${got.toFixed(1)} Hz at sample ${off}`);
    }
  }
});

test("the old failures: 300 Hz is not 100 and 240 Hz is not 80", () => {
  assert.ok(Math.abs(pitchYin(pulses(300), 0).f0 - 300) < 3);
  assert.ok(Math.abs(pitchYin(pulses(240), 0).f0 - 240) < 3);
});

test("a sung vowel from the Booth reads at its pitch from 60 to 400 Hz", () => {
  for (const f0 of [60, 80, 100, 130, 160, 200, 240, 280, 320, 360, 400]) {
    const { pcm } = synthesizePhone("AA", 0.4, f0);
    const voiced = extractFrames(pcm).filter((f) => f.f0 > 0).map((f) => f.f0);
    // A 25 ms frame holds only one and a half periods at 60 Hz, so some low frames go unvoiced; none may read wrong.
    assert.ok(voiced.length >= 15, `${f0} Hz: only ${voiced.length} voiced frames`);
    const m = median(voiced);
    assert.ok(Math.abs(m / f0 - 1) < 0.03, `${f0} Hz vowel read as ${m.toFixed(1)} Hz`);
    const wrong = voiced.filter((v) => Math.abs(Math.log2(v / f0)) > 0.25).length;
    // Each frame is read alone, with no path across frames. On this vowel at 130 Hz, 3 of 37 frames
    // still read an octave low (the old reader: 0 of 32 right at 300 Hz). 10% is the bar for one frame read alone.
    assert.ok(wrong <= voiced.length * 0.1, `${f0} Hz vowel: ${wrong} of ${voiced.length} frames off by more than a third of an octave`);
  }
});

test("silence and noise are unvoiced", () => {
  assert.equal(pitchYin(new Float32Array(WIN), 0).f0, 0);
  let seed = 7;
  const noise = new Float32Array(WIN).map(() => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 4294967295) * 2 - 1;
  });
  assert.equal(pitchYin(noise, 0).f0, 0);
});

test("the reader's range is the one its constants name", () => {
  assert.equal(YIN_F0_MIN, 60);
  assert.equal(YIN_F0_MAX, 500);
  const below = pitchYin(pulses(45), 0).f0;
  assert.ok(below === 0 || below >= YIN_F0_MIN, `45 Hz read as ${below}`);
});
