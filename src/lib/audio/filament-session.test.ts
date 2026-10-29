import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FILAMENT_SESSION, filamentLive, filamentLiveUrl, newFilamentSession } from "./filament.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FilamentStream } from "./filament-stream.ts";

const DOOR_NAME = /^[A-Za-z0-9_.:-]{1,64}$/;

/** A 16 kHz mono 16-bit WAV from testdata, as float samples. */
function wav16k(name: string): Float32Array {
  const b = readFileSync(join(import.meta.dirname, "testdata", name));
  let at = 12;
  while (at + 8 <= b.length) {
    const id = b.toString("latin1", at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (id === "fmt ") {
      assert.equal(b.readUInt16LE(at + 10), 1, "mono");
      assert.equal(b.readUInt32LE(at + 12), 16000, "16 kHz");
      assert.equal(b.readUInt16LE(at + 22), 16, "16-bit");
    }
    if (id === "data") {
      const out = new Float32Array(size / 2);
      for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(at + 8 + 2 * i) / 32768;
      return out;
    }
    at += 8 + size + (size % 2);
  }
  throw new Error(`no data in ${name}`);
}

describe("one Filament stream per open page", () => {
  it("this page has one name, sent on every /live post", () => {
    assert.match(FILAMENT_SESSION, DOOR_NAME);
    assert.ok(FILAMENT_SESSION.startsWith("codec-war:"));
    const first = filamentLiveUrl({ reset: true });
    const mid = filamentLiveUrl();
    const last = filamentLiveUrl({ end: true });
    for (const u of [first, mid, last]) assert.ok(u.endsWith(`session=${FILAMENT_SESSION}`), u);
    assert.ok(first.includes("reset=1"));
    assert.ok(last.includes("end=1"));
  });

  it("every page gets its own name", () => {
    const names = new Set(Array.from({ length: 200 }, () => newFilamentSession()));
    assert.equal(names.size, 200);
    for (const n of names) assert.match(n, DOOR_NAME);
  });

  it("a name with characters the door refuses is cleaned, not dropped", () => {
    assert.ok(filamentLiveUrl({ session: "tab 1/../x" }).endsWith("session=tab1..x"));
  });
});

/**
 * The real door on a spare port, never 4850. NOT RUN unless
 * CODECWAR_FILAMENT_DOOR names a Filament started for the test.
 */
describe("two pages talking at once through a real Filament", () => {
  const door = process.env.CODECWAR_FILAMENT_DOOR;
  it(
    "each page hears only its own line",
    { skip: door ? false : "NOT RUN: set CODECWAR_FILAMENT_DOOR to a Filament on a spare port" },
    async () => {
      // AlphaVox's own recorded phrases (EverettNC/AlphaVox data/phrases/alphavox_verified, 16 kHz).
      const tapes = ["alphavox_i_want_to_go_home.wav", "alphavox_i_need_help_please.wav"].map(wav16k);
      const run = async (which: number[], sessions: string[]) => {
        const streams = which.map(() => new FilamentStream());
        const pcms = which.map((w) => tapes[w]!);
        const longest = Math.max(...pcms.map((p) => p.length));
        for (let i = 0; i < longest; i += 2048) {
          for (let k = 0; k < streams.length; k++) {
            const s = streams[k]!;
            if (i < pcms[k]!.length) s.push(pcms[k]!.subarray(i, i + 2048));
            const r = s.next();
            if (r) s.done(await filamentLive(r.samples, { reset: r.reset, end: r.end, session: sessions[k], door }));
          }
        }
        for (let k = 0; k < streams.length; k++) {
          const s = streams[k]!;
          s.finish();
          for (let r = s.next(); r; r = s.next()) {
            s.done(await filamentLive(r.samples, { reset: r.reset, end: r.end, session: sessions[k], door }));
          }
        }
        return streams.map((s) => s.text);
      };
      const [aloneA] = await run([0], [newFilamentSession()]);
      const [aloneB] = await run([1], [newFilamentSession()]);
      assert.notEqual(aloneA, "", "the door returned words");
      assert.notEqual(aloneB, "", "the door returned words");
      assert.equal(aloneA, "i want to go home");
      assert.equal(aloneB, "i need help please");
      const [togetherA, togetherB] = await run([0, 1], [newFilamentSession(), newFilamentSession()]);
      assert.equal(togetherA, aloneA);
      assert.equal(togetherB, aloneB);
    },
  );
});
