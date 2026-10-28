import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { SAMPLE_RATE } from "./dsp.ts";
import { filamentHealth, filamentLive } from "./filament.ts";
import { FilamentStream } from "./filament-stream.ts";
import { RAW_MIC } from "./mic-tape.ts";
import { synthesize } from "./synth.ts";

const HALF = SAMPLE_RATE / 2;

/** Synthetic mic audio: a ramp, so every sample says where it came from. */
function audio(n: number, start = 0) {
  return Float32Array.from({ length: n }, (_, i) => ((start + i) % 1000) / 1000);
}

function reply(text: string, final: boolean, partial = "") {
  return { ok: true, final, text, partial };
}

describe("what goes to the Filament door", () => {
  it("sends half a second at a time, one request in flight", () => {
    const s = new FilamentStream();
    s.push(audio(HALF - 1));
    assert.equal(s.next(), null, "under half a second waits");
    s.push(audio(1, HALF - 1));
    const a = s.next();
    assert.ok(a);
    assert.equal(a.samples.length, HALF);
    assert.equal(a.reset, true);
    assert.equal(a.end, false);
    s.push(audio(HALF, HALF));
    assert.equal(s.next(), null, "nothing else while one is in flight");
    s.done(reply("", false, "filament"));
    const b = s.next();
    assert.ok(b);
    assert.equal(b.reset, false);
    assert.deepEqual(b.samples, audio(HALF, HALF));
  });

  it("stopping while a request is in flight still sends the rest with end", () => {
    // The old engine returned at once when a send was in flight, so the
    // final end-flag request was never made and the last words were lost.
    const s = new FilamentStream();
    s.push(audio(HALF));
    const first = s.next();
    assert.ok(first);
    s.push(audio(3000, HALF));
    s.finish();
    s.push(audio(500, HALF + 3000));
    assert.equal(s.next(), null, "waits for the request in flight");
    s.done(reply("filament in", true));
    const last = s.next();
    assert.ok(last, "the end request is made after the reply");
    assert.equal(last.end, true);
    assert.equal(last.reset, false);
    assert.deepEqual(last.samples, audio(3000, HALF), "every sample held before stop goes");
    s.done(reply("booth out", true));
    assert.equal(s.text, "filament in booth out");
    assert.equal(s.finished, true);
    assert.equal(s.next(), null);
  });

  it("an utterance shorter than half a second is still sent", () => {
    const s = new FilamentStream();
    s.push(audio(2400));
    assert.equal(s.next(), null);
    s.finish();
    const only = s.next();
    assert.ok(only);
    assert.equal(only.reset, true);
    assert.equal(only.end, true);
    assert.equal(only.samples.length, 2400);
  });

  it("nothing heard, nothing sent", () => {
    const s = new FilamentStream();
    s.finish();
    assert.equal(s.next(), null);
    assert.equal(s.finished, true);
  });

  it("a door that does not answer loses no later audio", () => {
    const s = new FilamentStream();
    s.push(audio(HALF));
    assert.ok(s.next());
    s.push(audio(HALF, HALF));
    s.done(null);
    const again = s.next();
    assert.ok(again);
    assert.deepEqual(again.samples, audio(HALF, HALF));
  });

  it("shows final words, then the partial", () => {
    const s = new FilamentStream();
    s.push(audio(HALF));
    s.next();
    s.done(reply("codec war", true, "booth"));
    assert.equal(s.text, "codec war booth");
  });
});

describe("the mic is measured raw", () => {
  it("echo cancellation, noise suppression and auto gain are off", () => {
    assert.equal(RAW_MIC.echoCancellation, false);
    assert.equal(RAW_MIC.noiseSuppression, false);
    assert.equal(RAW_MIC.autoGainControl, false);
    assert.equal(RAW_MIC.channelCount, 1);
  });

  it("every microphone request in src asks for RAW_MIC", () => {
    const SRC = join(import.meta.dirname, "..", "..");
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) return files(p);
        return /\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n) ? [p] : [];
      });
    const wrong: string[] = [];
    for (const f of files(SRC)) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/getUserMedia\(([^)]*)\)/g)) {
        if (!/audio:\s*RAW_MIC\b/.test(m[1]!)) wrong.push(`${f}: ${m[0]}`);
      }
    }
    assert.deepEqual(wrong, []);
  });
});

/**
 * The real door. NOT RUN unless CODECWAR_LIVE_FILAMENT=1: the Filament's
 * /live is one shared session, and a test's reset would cut into anyone
 * dictating through it at that moment.
 */
describe("the real Filament door", () => {
  const allowed = process.env.CODECWAR_LIVE_FILAMENT === "1";
  it(
    "hears the Booth's line through to the end flag",
    {
      skip: allowed
        ? false
        : "NOT RUN: set CODECWAR_LIVE_FILAMENT=1 when no one is dictating through the Filament",
    },
    async () => {
      assert.equal(await filamentHealth(), true, "the Filament door is up and seated");
      const { pcm } = synthesize("filament in codec booth out", { f0: 142, rate: 1 });
      const s = new FilamentStream();
      for (let i = 0; i < pcm.length; i += 2048) {
        s.push(pcm.subarray(i, i + 2048));
        const r = s.next();
        if (r) s.done(await filamentLive(r.samples, { reset: r.reset, end: r.end }));
      }
      s.finish();
      for (let r = s.next(); r; r = s.next()) {
        s.done(await filamentLive(r.samples, { reset: r.reset, end: r.end }));
      }
      assert.equal(s.finished, true);
      assert.notEqual(s.text, "", "the door returned words");
    },
  );
});
