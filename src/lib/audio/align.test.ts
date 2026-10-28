import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignWords, features } from "./align.ts";
import { record } from "./synthetic.test-helpers.ts";

const WORDS = [
  { word: "mass", phones: ["M", "AA", "S"] },
  { word: "tea", phones: ["T", "IY"] },
  { word: "loom", phones: ["L", "UW", "M"] },
  { word: "seat", phones: ["S", "IY", "T"] },
  { word: "malt", phones: ["M", "AA", "L", "T"] },
  { word: "suit", phones: ["S", "UW", "T"] },
];

describe("alignWords", () => {
  it("finds phone boundaries inside words to within one frame", () => {
    const words = Array.from({ length: 8 }, () => WORDS).flat();
    const { track, truth } = record(words, 5);
    const spans = truth.map((t) => ({ seq: 0, a: t.bounds[0]!, b: t.bounds[t.bounds.length - 1]!, phones: t.phones }));
    const got = alignWords([features(track)], spans);
    let inner = 0;
    let close = 0;
    truth.forEach((t, i) => {
      for (let p = 1; p < t.phones.length; p++) {
        inner++;
        if (Math.abs(got[i]![p]! - t.bounds[p]!) <= 1) close++;
      }
      assert.equal(got[i]![0], t.bounds[0]);
      assert.equal(got[i]![t.phones.length], t.bounds[t.phones.length]);
    });
    assert.ok(close / inner >= 0.9, `${close} of ${inner} boundaries within one frame`);
  });

  it("refuses a word too short for its phones, and a word with none", () => {
    const { track } = record([{ word: "mass", phones: ["M", "AA", "S"] }]);
    assert.throws(() => alignWords([features(track)], [{ seq: 0, a: 30, b: 35, phones: ["M", "AA", "S"] }]), /cannot hold/);
    assert.throws(() => alignWords([features(track)], [{ seq: 0, a: 30, b: 45, phones: [] }]), /no phones/);
  });
});
