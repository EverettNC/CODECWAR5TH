import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBank } from "./bank.ts";
import { record } from "./synthetic.test-helpers.ts";

describe("buildBank", () => {
  it("cuts heard words into phone units that know their neighbours and what follows them", () => {
    const { track, tokens } = record([
      { word: "mass", phones: ["M", "AA", "S"] },
      { word: "tea", phones: ["T", "IY"], pauseAfter: true },
      { word: "loom", phones: ["L", "UW", "M"] },
    ]);
    const bank = buildBank([track], tokens, 0.9);
    assert.equal(bank.units.length, 8);
    assert.deepEqual(bank.units.map((u) => u.phone), ["M", "AA", "S", "T", "IY", "L", "UW", "M"]);
    const [m, aa, s, t, iy, l] = bank.units;
    assert.equal(m!.prev, "SIL");
    assert.equal(s!.next, "T"); // "mass" runs into "tea"
    assert.equal(s!.succ, 3);
    assert.equal(iy!.next, "SIL"); // a pause follows "tea"
    assert.equal(iy!.succ, -1);
    assert.ok(m!.phraseStart && !aa!.phraseEnd && iy!.phraseEnd && l!.phraseStart);
    assert.equal(t!.word, "tea");
    for (const u of bank.units) assert.ok(u.end > u.start);
  });

  it("leaves out words heard with low confidence, and says why", () => {
    const { track, tokens } = record([
      { word: "mass", phones: ["M", "AA", "S"] },
      { word: "tea", phones: ["T", "IY"] },
    ]);
    tokens[1]!.conf = 0.5;
    const bank = buildBank([track], tokens, 0.9);
    assert.equal(bank.units.length, 3);
    assert.equal(bank.skipped.length, 1);
    assert.match(bank.skipped[0]!.reason, /confidence 0.5/);
    assert.equal(bank.units[2]!.succ, -1);
  });
});
