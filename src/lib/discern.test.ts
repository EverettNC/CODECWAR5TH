import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { discernCanals, type CanalCardIn } from "./discern.ts";

function card(
  partial: Partial<CanalCardIn> & Pick<CanalCardIn, "id" | "name">,
): CanalCardIn {
  return {
    kind: "voice",
    line: null,
    duration: 1.2,
    attack: 0.08,
    decay: 0.4,
    peakRms: 0.21,
    medianF0: 148,
    lastF1: 500,
    lastF2: 1500,
    meanZcr: 0.12,
    voiced: true,
    truncated: false,
    ...partial,
  };
}

describe("discernCanals", () => {
  it("names each canal and never fuses them", () => {
    const result = discernCanals([
      card({ id: "a", name: "Voice A", line: "Stay with me.", medianF0: 110 }),
      card({
        id: "b",
        name: "Voice B",
        line: "Get out of the house.",
        medianF0: 190,
      }),
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /Canal 1 · Voice A/);
    assert.match(result.text, /Canal 2 · Voice B/);
    assert.match(result.text, /Stay with me/);
    assert.match(result.text, /Get out of the house/);
    assert.equal(result.text.includes("one mouth"), false);
  });

  it("keeps an empty ear empty and treats null F0 as a hole", () => {
    const result = discernCanals([
      card({
        id: "c",
        name: "Kettle",
        kind: "noise",
        line: null,
        medianF0: null,
        lastF1: null,
        lastF2: null,
        voiced: false,
      }),
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /Empty ear\. No invented speech\./);
    assert.match(result.text, /hole, not zero/);
    assert.equal(result.text.includes("whistle"), false);
  });

  it("does not call out and does not ask for a key", () => {
    const src = readFileSync(new URL("./discern.ts", import.meta.url), "utf8");
    assert.equal(src.includes("XAI_API_KEY"), false);
    assert.equal(src.includes("api.x.ai"), false);
    assert.equal(src.includes("createServerFn"), false);
  });
});
