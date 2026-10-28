import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Everett's ruling, 2026-10-28: "Why would we hand over our speech to the
 * browser, which then again is going to throw it over the internet... We want
 * offline. That's why we build our shit." The Booth's "Host voice" handed
 * text to window.speechSynthesis; it is gone. This test fails if any browser
 * or outside speech path comes back anywhere in src.
 */

const SRC = join(import.meta.dirname, "..");
const THIS = import.meta.filename;

// Built from pieces so this file does not match itself.
const FORBIDDEN = [
  ["speech", "Synthesis"],
  ["SpeechSynthesis", "Utterance"],
  ["SpeechSynthesis", "Voice"],
  ["Speech", "Recognition"],
  ["webkit", "Speech"],
  ["get", "Voices("],
  ["responsive", "Voice"],
  ["g", "tts"],
  ["eleven", "labs"],
  ["texttospeech.", "googleapis"],
  ["polly.", "amazonaws"],
  ["api.", "openai.com"],
].map(([a, b]) => new RegExp((a + b).replace(/[.(]/g, (c) => "\\" + c), "i"));

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(ts|tsx|js|jsx|mjs|css|html)$/.test(name)) out.push(p);
  }
  return out;
}

describe("offline", () => {
  it("no browser or outside speech path anywhere in src", () => {
    const hits: string[] = [];
    for (const f of files(SRC)) {
      if (f === THIS) continue;
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const re of FORBIDDEN) if (re.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(hits, []);
  });

  it("the only network address in src is the local Filament", () => {
    const hits: string[] = [];
    for (const f of files(SRC)) {
      if (f === THIS) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/https?:\/\/[^\s"'`)]+/g)) {
        if (!m[0].startsWith("http://127.0.0.1:4850")) hits.push(`${f}: ${m[0]}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
