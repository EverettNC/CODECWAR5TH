import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { extractFrames, FRAME_SEC } from "./dsp.ts";
import * as encoder from "./encoder.ts";
import { synthesize } from "./synth.ts";

const frames = extractFrames(synthesize("filament in codec booth out", { f0: 142, rate: 1 }).pcm);

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...srcFiles(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe("encoder stack rates", () => {
  it("each label states the rate its frames really run at", () => {
    const frameHz = 1 / FRAME_SEC;
    for (const s of encoder.STACKS) {
      const m = s.name.match(/(\d+(?:\.\d+)?) Hz/);
      assert.ok(m, `${s.name} names its rate`);
      assert.equal(Number(m[1]), frameHz / s.rate, s.name);
    }
  });

  it("the stack outputs have the frame counts their rates say", () => {
    const st = encoder.zipformerStacks(frames);
    const T = frames.length;
    assert.equal(st.stacks.length, encoder.STACKS.length);
    st.stacks.forEach((s, i) => {
      assert.equal(s.frames.length, Math.ceil(T / encoder.STACKS[i]!.rate), s.name);
    });
  });
});

describe("encode runs only what the app reads", () => {
  it("returns phones and posteriors, and no stack output", () => {
    const r = encoder.encode(frames);
    const keys = Object.keys(r).sort();
    assert.deepEqual(keys, [
      "framePath",
      "framePhones",
      "framePosteriors",
      "phonePath",
      "phones",
      "posteriors",
    ]);
    assert.equal(r.phonePath.length, frames.length);
    assert.ok(r.phones.length > 0);
  });

  it("no field or export is named for Kaldi", () => {
    const r = encoder.encode(frames);
    for (const k of [...Object.keys(r), ...Object.keys(encoder)]) {
      assert.doesNotMatch(k, /kaldi/i, k);
    }
  });

  it("the stack is not wired: nothing in src runs it", () => {
    // encoder.ts says so in its header and in zipformerStacks' doc. If the
    // stack is ever wired in, this test and those words change together.
    const SRC = join(import.meta.dirname, "..", "..");
    const callers = srcFiles(SRC).filter(
      (f) => !f.endsWith("encoder.ts") && readFileSync(f, "utf8").includes("zipformerStacks"),
    );
    assert.deepEqual(callers, []);
    const header = readFileSync(join(import.meta.dirname, "encoder.ts"), "utf8").slice(0, 1200);
    assert.match(header, /NOT WIRED/);
  });
});
