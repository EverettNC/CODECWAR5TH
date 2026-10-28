import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cardFromFrames, EMPTY_CARD, EMPTY_LIVE, fusePcm } from "./corti.ts";
import { extractFrames, SAMPLE_RATE } from "./dsp.ts";
import { engine, type CanalState } from "./engine.ts";
import { kettlePcm } from "./noise.ts";
import { mixAnalysisLabel } from "./war.ts";

/** A steady synthetic tone, seconds long, at f0 Hz. Measured, not played. */
function tone(f0: number, seconds: number, amp = 0.3): Float32Array {
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    out[i] = amp * (Math.sin(2 * Math.PI * f0 * t) + 0.4 * Math.sin(4 * Math.PI * f0 * t));
  }
  return out;
}

function canal(id: string, pcm: Float32Array): CanalState {
  return {
    id,
    name: id,
    kind: "file",
    line: null,
    ink: "linen",
    pcm,
    frames: [],
    card: EMPTY_CARD,
    tape: [],
    live: EMPTY_LIVE,
    muted: false,
    solo: false,
    duration: pcm.length / SAMPLE_RATE,
  };
}

function setCanals(canals: CanalState[]) {
  engine.snap = { ...engine.snap, canals };
}

describe("the refused mix is measured once per set of canals", () => {
  const a = tone(118, 6.4);
  const b = tone(196, 6.4);
  const k = kettlePcm(6.4);

  it("its card is the real analysis of the mixed audio", () => {
    setCanals([canal("a", a), canal("b", b), canal("k", k)]);
    const ghost = engine.computeFused();
    assert.ok(ghost);
    const direct = cardFromFrames(extractFrames(fusePcm([a, b, k])));
    assert.deepEqual(ghost.card, direct);
    assert.equal(ghost.pcm.length, a.length);
  });

  it("a frame-rate loop does not re-analyse the whole mix", () => {
    setCanals([canal("a", a), canal("b", b), canal("k", k)]);
    // Cost of one full analysis of this mix, measured here.
    const t0 = performance.now();
    cardFromFrames(extractFrames(fusePcm([a, b, k])));
    const one = performance.now() - t0;
    // One second of animation frames.
    const t1 = performance.now();
    for (let f = 0; f < 60; f++) engine.computeFused();
    const sixty = performance.now() - t1;
    assert.ok(sixty < one * 5, `60 frames took ${sixty.toFixed(1)} ms, one analysis ${one.toFixed(1)} ms`);
  });

  it("a changed canal is measured again", () => {
    setCanals([canal("a", a), canal("b", b)]);
    const first = engine.computeFused();
    const louder = tone(196, 6.4, 0.9);
    setCanals([canal("a", a), canal("b", louder)]);
    const second = engine.computeFused();
    assert.ok(first && second);
    assert.ok(second.card.peakRms > first.card.peakRms);
    assert.deepEqual(second.card, cardFromFrames(extractFrames(fusePcm([a, louder]))));
  });

  it("fewer than two canals is no mix", () => {
    setCanals([canal("a", a)]);
    assert.equal(engine.computeFused(), null);
    setCanals([]);
  });
});

describe("the mix label says what the code did", () => {
  it("names a measured mix as measured", () => {
    const label = mixAnalysisLabel(true);
    assert.match(label, /measured/);
    assert.doesNotMatch(label, /sealed/);
    assert.doesNotMatch(label, /not measured/);
  });

  it("names an unmeasured mix as not measured", () => {
    assert.match(mixAnalysisLabel(false), /not measured/);
  });
});
