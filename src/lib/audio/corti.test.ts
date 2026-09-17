import assert from "node:assert/strict";
import { test } from "node:test";
import { cardFromFrames, fusePcm, tapeFromFrames, TAPE_CAP, type TapeFrame } from "./corti.ts";
import type { Frame } from "./dsp.ts";

function frame(partial: Partial<Frame>): Frame {
  return {
    mel: new Float32Array(80),
    mfcc: new Float32Array(13),
    power: 0.1,
    centroid: 800,
    zcr: 0.04,
    f0: 0,
    voiced: 0,
    f1: 0,
    f2: 0,
    ...partial,
  };
}

test("null f0 is a hole, not zero", () => {
  const frames = [frame({ f0: 0, voiced: 0 }), frame({ f0: 0, voiced: 0.1 })];
  const card = cardFromFrames(frames);
  assert.equal(card.medianF0, null);
  assert.equal(card.voiced, false);
  const tape = tapeFromFrames(frames);
  assert.equal(tape[0]!.f0, null);
});

test("voiced frames keep their f0", () => {
  const frames = [
    frame({ f0: 110, voiced: 0.8, power: 0.2 }),
    frame({ f0: 114, voiced: 0.9, power: 0.3 }),
    frame({ f0: 118, voiced: 0.7, power: 0.15 }),
  ];
  const card = cardFromFrames(frames);
  assert.ok(card.medianF0 !== null);
  assert.ok(Math.abs(card.medianF0! - 114) < 1);
  assert.equal(card.voiced, true);
});

test("tape cap drops the tail, not the onset", () => {
  const frames = Array.from({ length: TAPE_CAP + 40 }, (_, i) =>
    frame({ f0: i < 10 ? 120 : 0, voiced: i < 10 ? 0.8 : 0, power: 0.05 + i * 0.001 }),
  );
  const card = cardFromFrames(frames);
  assert.equal(card.truncated, true);
  const tape = tapeFromFrames(frames);
  assert.equal(tape.length, TAPE_CAP);
  assert.equal(tape[0]!.t, 0);
});

test("fuse is a separate function — two pcms stay two pcms", () => {
  const a = new Float32Array([0.5, -0.5, 0.25]);
  const b = new Float32Array([0.25, 0.25, 0.25]);
  const fused = fusePcm([a, b]);
  assert.equal(a[0], 0.5);
  assert.equal(b[0], 0.25);
  assert.notEqual(fused[0], a[0]);
  assert.notEqual(fused[0], b[0]);
});

test("empty frames stay empty", () => {
  const card = cardFromFrames([]);
  assert.equal(card.duration, 0);
  assert.equal(card.medianF0, null);
  const tape: TapeFrame[] = tapeFromFrames([]);
  assert.equal(tape.length, 0);
});
