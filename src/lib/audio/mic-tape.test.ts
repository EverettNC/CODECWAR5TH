import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardFromFrames } from "./corti.ts";
import { extractFrames, SAMPLE_RATE } from "./dsp.ts";
import { canalFromMicTape } from "./engine.ts";
import { MicTape } from "./mic-tape.ts";

/**
 * The Mic canal is tested with synthetic microphone signals, fed the way the
 * browser feeds them: 48 kHz, in chunks. No microphone is opened here.
 * Pitches stay under 160 Hz, where dsp.ts pitchYin reads the period itself
 * (above that its global-minimum choice can land on a multiple of the period).
 */

const MIC_RATE = 48000;

/** A voiced synthetic tone at the mic's rate; f0 may change at `switchAt` seconds. */
function micSignal(seconds: number, f0: number, f0After = f0, switchAt = Infinity) {
  const out = new Float32Array(Math.round(seconds * MIC_RATE));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const f = i / MIC_RATE < switchAt ? f0 : f0After;
    phase += (2 * Math.PI * f) / MIC_RATE;
    out[i] = 0.3 * Math.sin(phase) + 0.12 * Math.sin(2 * phase) + 0.05 * Math.sin(3 * phase);
  }
  return out;
}

function feed(tape: MicTape, signal: Float32Array, chunk: number, rate = MIC_RATE) {
  for (let i = 0; i < signal.length; i += chunk) tape.push(signal.subarray(i, i + chunk), rate);
}

function medianF0(frames: { f0: number; voiced: number }[]) {
  const f = frames.filter((x) => x.f0 > 0 && x.voiced > 0.2).map((x) => x.f0);
  f.sort((a, b) => a - b);
  return f[Math.floor(f.length / 2)] ?? 0;
}

function rmsOf(x: Float32Array) {
  let s = 0;
  for (const v of x) s += v * v;
  return Math.sqrt(s / Math.max(1, x.length));
}

describe("mic tape", () => {
  it("starts empty: no invented second of zeros", () => {
    const tape = new MicTape(6.4);
    assert.equal(tape.pcm().length, 0);
    assert.deepEqual(tape.frames(), []);
  });

  it("carries the microphone's audio at 16 kHz", () => {
    const tape = new MicTape(6.4);
    const sig = micSignal(2, 130);
    feed(tape, sig, 2048);
    const pcm = tape.pcm();
    assert.ok(Math.abs(pcm.length - 2 * SAMPLE_RATE) <= 2, `length ${pcm.length}`);
    assert.ok(Math.abs(rmsOf(pcm) - rmsOf(sig)) < 0.01, `rms ${rmsOf(pcm)} vs ${rmsOf(sig)}`);
    const f0 = medianF0(tape.frames());
    assert.ok(Math.abs(f0 - 130) < 130 * 0.03, `f0 ${f0}`);
  });

  it("its frames are exactly the frames of its audio", () => {
    const tape = new MicTape(6.4);
    feed(tape, micSignal(1.3, 180), 2048);
    assert.deepEqual(tape.frames(), extractFrames(tape.pcm()));
  });

  it("chunk size does not change the audio", () => {
    const sig = micSignal(1, 200);
    const a = new MicTape(6.4);
    const b = new MicTape(6.4);
    feed(a, sig, 128);
    feed(b, sig, 4096);
    const pa = a.pcm();
    const pb = b.pcm();
    assert.equal(pa.length, pb.length);
    let worst = 0;
    for (let i = 0; i < pa.length; i++) worst = Math.max(worst, Math.abs(pa[i]! - pb[i]!));
    assert.ok(worst < 1e-6, `worst ${worst}`);
  });

  it("keeps the latest seconds, still on the frame grid", () => {
    const tape = new MicTape(6.4);
    // 110 Hz for ten seconds, then 150 Hz for two.
    feed(tape, micSignal(12, 110, 150, 10), 2048);
    const pcm = tape.pcm();
    assert.ok(pcm.length <= tape.capSamples);
    assert.ok(pcm.length >= tape.capSamples * 0.75);
    const frames = tape.frames();
    assert.deepEqual(frames, extractFrames(pcm));
    assert.ok(Math.abs(medianF0(frames.slice(-100)) - 150) < 5, "the newest audio is the newest voice");
    assert.ok(Math.abs(medianF0(frames.slice(0, 100)) - 110) < 4, "the oldest kept audio is older voice");
    assert.ok(Math.abs(tape.secondsHeard - 12) < 0.01);
  });

  it("16 kHz input passes through untouched", () => {
    const tape = new MicTape(6.4);
    const sig = new Float32Array(4000).map((_, i) => Math.sin(i / 7) * 0.2);
    feed(tape, sig, 1000, SAMPLE_RATE);
    assert.deepEqual(tape.pcm(), sig);
  });
});

describe("the Dispersion Mic canal", () => {
  it("is built from the tape: its audio, its frames, its latest frame live", () => {
    const tape = new MicTape(6.4);
    feed(tape, micSignal(1.5, 140), 2048);
    const canal = canalFromMicTape("mic-1", tape);
    assert.equal(canal.kind, "mic");
    assert.deepEqual(canal.pcm, tape.pcm());
    assert.deepEqual(canal.card, cardFromFrames(tape.frames()));
    assert.ok(canal.card.peakRms > 0.1);
    assert.ok(canal.live.f0 !== null && Math.abs(canal.live.f0 - 140) < 140 * 0.03);
    assert.ok(Math.abs(canal.duration - 1.5) < 0.01);
  });

  it("before any sound arrives it is empty, not silent audio", () => {
    const canal = canalFromMicTape("mic-2", new MicTape(6.4));
    assert.equal(canal.pcm.length, 0);
    assert.equal(canal.duration, 0);
  });
});
