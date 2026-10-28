import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENV_POINTS } from "./frames.ts";
import { buildBank } from "./bank.ts";
import {
  NEUTRAL_CONTROLS,
  StitchRefused,
  applyVoice,
  joinUnits,
  recordingStats,
  selectUnits,
  trackLtas,
  type Controls,
  type VoiceMeasures,
} from "./stitch.ts";
import { record } from "./synthetic.test-helpers.ts";

const W = {
  mass: { word: "mass", phones: ["M", "AA", "S"] },
  tea: { word: "tea", phones: ["T", "IY"] },
  loom: { word: "loom", phones: ["L", "UW", "M"] },
  seat: { word: "seat", phones: ["S", "IY", "T"] },
};
function bank() {
  const { track, tokens } = record(
    [W.mass, W.tea, { ...W.loom, pauseAfter: true }, W.seat, { ...W.mass, pauseAfter: true }, W.loom, W.tea, W.seat],
    3,
  );
  return buildBank([track], tokens, 0.9);
}
function measures(b: ReturnType<typeof bank>): VoiceMeasures {
  return {
    f0_median_hz: 140,
    phrase_range_st: 1,
    syllable_rate: 4,
    voiced_aperiodicity: 0.2,
    ltas_db: Array.from(trackLtas(b.tracks[0]!)),
    level_db: -20,
    jitter: 0.02,
    shimmer: 0.06,
    jitter_carried: 0.005,
    shimmer_carried: 0.02,
    hnr_db: 10,
    cpp_db: 15,
  };
}
const PARAMS = ["rate", "articulation", "intonation", "f0", "breath", "resonance", "timbre", "prosody", "jitter", "shimmer", "affect"];

describe("selectUnits", () => {
  it("speaks recorded words whole, and a recorded run of words with no join at all", () => {
    const b = bank();
    const sel = selectUnits(b, [W.mass, W.tea]);
    assert.equal(sel.wholeWords, 2);
    assert.equal(sel.joins, 0);
    const sel2 = selectUnits(b, [W.tea, W.mass]);
    assert.equal(sel2.wholeWords, 2);
    assert.equal(sel2.joins, 1);
  });

  it("builds a word it never heard from phone runs of words it did", () => {
    const b = bank();
    const sel = selectUnits(b, [{ word: "seam", phones: ["S", "IY", "M"] }]);
    assert.equal(sel.wholeWords, 0);
    assert.equal(sel.units.length, 3);
    assert.deepEqual(sel.units.map((u) => b.units[u]!.phone), ["S", "IY", "M"]);
    assert.ok(sel.joins >= 1);
  });

  it("refuses a phone the recordings never hold, and names it", () => {
    const b = bank();
    assert.throws(
      () => selectUnits(b, [{ word: "zoo", phones: ["Z", "UW"] }]),
      (e: unknown) => e instanceof StitchRefused && e.missing.join() === "Z",
    );
  });
});

describe("joinUnits", () => {
  it("lays units end to end between the recording's own silences, smoothing only joins the recordings do not hold", () => {
    const b = bank();
    const sel = selectUnits(b, [W.tea, W.mass]);
    const st = joinUnits(b, sel);
    const inner = sel.units.reduce((n, u) => n + b.units[u]!.end - b.units[u]!.start, 0);
    const sil = st.phones.filter((p) => p === "SIL").length;
    assert.equal(st.track.n, inner + sil);
    assert.ok(sil >= 2 && st.phones[0] === "SIL" && st.phones[st.phones.length - 1] === "SIL");
    assert.equal(st.joinsAt.length, 1);
    for (let i = 0; i < st.track.n; i++) assert.ok(st.track.f0[i]! === 0 || st.track.f0[i]! > 100);
  });
});

describe("applyVoice", () => {
  const b = bank();
  const st = joinUnits(b, selectUnits(b, [W.mass, W.tea, W.loom]));
  const stats = recordingStats(b, ["one"]);
  const run = (c: Partial<Controls>) => applyVoice(st, measures(b), { ...NEUTRAL_CONTROLS, ...c }, stats);

  it("applies every parameter and lists each with its value", () => {
    const v = run({});
    assert.deepEqual(v.applied.map((a) => a.name), PARAMS);
    for (const a of v.applied) assert.ok(Number.isFinite(a.value), a.name);
    const med = Array.from(v.track.f0).filter((f) => f > 0).sort((x, y) => x - y);
    assert.ok(Math.abs(med[med.length >> 1]! - 140) < 1);
  });

  it("changes the sound for every control it accepts", () => {
    const base = run({});
    const sum = (a: ArrayLike<number>) => Array.from(a).reduce((x, y) => x + y, 0);
    const voicedRange = (f: Float64Array) => {
      const s = Array.from(f).filter((x) => x > 0).map((x) => 12 * Math.log2(x)).sort((x, y) => x - y);
      return s[Math.floor(s.length * 0.95)]! - s[Math.floor(s.length * 0.05)]!;
    };
    assert.ok(sum(run({ breath: 1 }).track.ap) > sum(base.track.ap));
    assert.ok(voicedRange(run({ intonation: 1 }).track.f0) > voicedRange(base.track.f0));
    assert.ok(run({ rate: 1.5 }).track.n < base.track.n);
    assert.ok(run({ articulation: 1 }).track.n > base.track.n);
    const hi = (t: Float64Array) => {
      let s = 0;
      for (let i = 0; i < t.length / ENV_POINTS; i++) s += t[i * ENV_POINTS + ENV_POINTS - 5]!;
      return s;
    };
    assert.ok(hi(run({ timbre: 1 }).track.envDb) < hi(base.track.envDb));
    assert.notDeepEqual(run({ resonance: "head" }).track.envDb, base.track.envDb);
    assert.notDeepEqual(run({ prosody: 1 }).track.envDb, base.track.envDb);
    assert.ok(run({ jitter: 1 }).jitter > base.jitter);
    assert.ok(run({ shimmer: 1 }).shimmer > base.shimmer);
    const f = Array.from(run({ f0: 200 }).track.f0).filter((x) => x > 0).sort((x, y) => x - y);
    assert.ok(Math.abs(f[f.length >> 1]! - 200) < 1);
  });

  it("refuses what it cannot apply, with the reason", () => {
    const m = measures(b);
    assert.throws(() => applyVoice(st, { ...m, jitter: undefined }, NEUTRAL_CONTROLS, stats), /does not measure: jitter/);
    assert.throws(() => run({ affect: "calm" }), /affect "calm" is not applied/);
    assert.throws(() => run({ breath: 1.5 }), /breath/);
    assert.throws(() => run({ rate: 3 }), /rate/);
    assert.throws(() => run({ resonance: "nasal" as Controls["resonance"] }), /resonance/);
    assert.throws(() => applyVoice(st, { ...m, jitter: 0.004 }, NEUTRAL_CONTROLS, stats), /below/);
  });
});
