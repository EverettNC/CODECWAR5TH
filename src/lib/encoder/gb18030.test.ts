import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeBytes, encodeText, inspectText, roundTripVerdict, StreamDecoder } from "./stream.ts";

/**
 * GB18030 against two references: byte values written in the standard, and
 * the platform's own gb18030 decoder (Node's ICU, offline) as an independent
 * reader of the bytes this codec writes. The platform is used here, in the
 * test, only to check; the codec itself carries its own table.
 */

function hexOf(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

const platform = new TextDecoder("gb18030", { fatal: true });

function fourByte(pointer: number): Uint8Array {
  let n = pointer;
  const b1 = 0x81 + Math.floor(n / 12600);
  n %= 12600;
  const b2 = 0x30 + Math.floor(n / 1260);
  n %= 1260;
  return Uint8Array.from([b1, b2, 0x81 + Math.floor(n / 10), 0x30 + (n % 10)]);
}

describe("gb18030 known byte values", () => {
  const cases: [string, string][] = [
    ["中", "d6 d0"],
    ["文", "ce c4"],
    ["€", "a2 e3"],
    ["é", "a8 a6"],
    ["¥", "81 30 84 36"],
    ["\u0080", "81 30 81 30"],
    ["￿", "84 31 a4 39"],
    ["😀", "94 39 fc 36"],
    ["A", "41"],
  ];
  for (const [ch, hex] of cases) {
    it(`${JSON.stringify(ch)} is ${hex}`, () => {
      const { bytes, state } = encodeText(ch, "gb18030");
      assert.equal(hexOf(bytes), hex);
      assert.equal(state.replacements, 0);
      const back = decodeBytes(bytes, "gb18030");
      assert.equal(back.text, ch);
      assert.equal(back.replacements, 0);
    });
  }
});

describe("gb18030 round trip over real text", () => {
  const lines = [
    "中文编码，声音留在这台机器上。",
    "你好，世界。今天的天气很好。",
    "繁體字與简体字並存",
    "ひらがな カタカナ 日本語",
    "한국어 문장입니다",
    "Привет, мир. Ελληνικά.",
    "naïve café déjà vu — “quoted” ‘text’ … ¥ £ € ©",
    "ภาษาไทย עברית العربية हिन्दी",
    "𝄞 😀 𠀀 𪚥 — astral code points",
    "Filament in. Codec. Booth out.",
  ];
  for (const line of lines) {
    it(line, () => {
      const { bytes, state } = encodeText(line, "gb18030");
      assert.equal(state.replacements, 0);
      assert.equal(platform.decode(bytes), line, "platform decoder reads what was written");
      const back = decodeBytes(bytes, "gb18030");
      assert.equal(back.text, line);
      assert.equal(back.replacements, 0);
    });
  }
});

describe("gb18030 against the platform decoder, every code point", () => {
  it("every BMP code point the platform can read back is written so it reads back", () => {
    // What the platform decoder can ever produce, from every valid sequence.
    const readable = new Set<number>();
    for (let lead = 0x81; lead <= 0xfe; lead++) {
      for (let trail = 0x40; trail <= 0xfe; trail++) {
        if (trail === 0x7f) continue;
        readable.add(platform.decode(Uint8Array.from([lead, trail])).codePointAt(0)!);
      }
    }
    for (let p = 0; p <= 39419; p++) readable.add(platform.decode(fourByte(p)).codePointAt(0)!);

    const wrong: string[] = [];
    let unmapped = 0;
    for (let cp = 0x80; cp <= 0xffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const ch = String.fromCodePoint(cp);
      const { bytes, state } = encodeText(ch, "gb18030");
      if (readable.has(cp)) {
        let via = "";
        try {
          via = platform.decode(bytes);
        } catch {
          via = "(error)";
        }
        if (state.replacements !== 0 || via !== ch || decodeBytes(bytes, "gb18030").text !== ch) {
          wrong.push(`U+${cp.toString(16)} -> ${hexOf(bytes)} -> ${JSON.stringify(via)}`);
        }
      } else {
        unmapped++;
        if (state.replacements !== 1 || hexOf(bytes) !== "3f") {
          wrong.push(`U+${cp.toString(16)} has no GB18030 bytes but wrote ${hexOf(bytes)}`);
        }
      }
      if (wrong.length > 10) break;
    }
    assert.deepEqual(wrong, []);
    // The code points with no bytes are counted, not hidden.
    assert.ok(unmapped < 64, `unmapped ${unmapped}`);
  });

  it("astral code points use the linear four-byte range", () => {
    for (const cp of [0x10000, 0x1f600, 0x20000, 0x2a6a5, 0x10ffff]) {
      const ch = String.fromCodePoint(cp);
      const { bytes } = encodeText(ch, "gb18030");
      assert.equal(platform.decode(bytes), ch);
      assert.equal(decodeBytes(bytes, "gb18030").text, ch);
    }
  });

  it("the codec's own decoder agrees with the platform on every valid sequence", () => {
    const wrong: string[] = [];
    for (let lead = 0x81; lead <= 0xfe; lead++) {
      for (let trail = 0x40; trail <= 0xfe; trail++) {
        if (trail === 0x7f) continue;
        const b = Uint8Array.from([lead, trail]);
        if (decodeBytes(b, "gb18030").text !== platform.decode(b)) wrong.push(hexOf(b));
      }
    }
    for (let p = 0; p <= 39419; p++) {
      const b = fourByte(p);
      if (decodeBytes(b, "gb18030").text !== platform.decode(b)) wrong.push(hexOf(b));
    }
    assert.deepEqual(wrong.slice(0, 10), []);
  });
});

describe("gb18030 streaming", () => {
  it("holds a four-byte sequence split across writes", () => {
    const dec = new StreamDecoder("gb18030");
    assert.equal(dec.write(Uint8Array.from([0x81, 0x30])), "");
    assert.equal(dec.write(Uint8Array.from([0x84])), "");
    assert.equal(dec.write(Uint8Array.from([0x36, 0xd6])), "¥");
    assert.equal(dec.write(Uint8Array.from([0xd0])), "中");
    assert.equal(dec.end(), "");
    assert.equal(dec.state().replacements, 0);
  });

  it("an unfinished sequence at the end is one replacement", () => {
    const dec = new StreamDecoder("gb18030");
    dec.write(Uint8Array.from([0x81, 0x30, 0x84]));
    assert.equal(dec.end(), "�");
    assert.equal(dec.state().replacements, 1);
  });

  it("a bad trail byte that is ASCII is read again as ASCII", () => {
    const bytes = Uint8Array.from([0xd6, 0x20, 0x41]);
    const { text, replacements } = decodeBytes(bytes, "gb18030");
    assert.equal(text, "� A");
    assert.equal(new TextDecoder("gb18030").decode(bytes), "� A");
    assert.equal(replacements, 1);
  });
});

describe("the Codec room's round-trip label", () => {
  it("a different character with no replacement is not clean", () => {
    // The old encoder wrote 中 as 82 35 e3 35, which reads back as ꋰ.
    assert.equal(roundTripVerdict("中", 0, { text: "ꋰ", replacements: 0 }), "changed");
  });

  it("clean only when the text comes back as it went in", () => {
    const line = "中文编码";
    const { bytes, state } = encodeText(line, "gb18030");
    assert.equal(
      roundTripVerdict(line, state.replacements, decodeBytes(bytes, "gb18030")),
      "clean",
    );
  });

  it("a replacement on the encoder side is reported", () => {
    const { bytes, state } = encodeText("你", "ascii");
    const verdict = roundTripVerdict("你", state.replacements, decodeBytes(bytes, "ascii"));
    assert.equal(verdict, "with replacements");
  });

  it("a code-point card shows the replacement byte the encoder wrote", () => {
    assert.deepEqual(inspectText("你", "ascii")[0]?.bytes, [0x3f]);
    assert.deepEqual(inspectText("中", "gb18030")[0]?.bytes, [0xd6, 0xd0]);
  });
});
