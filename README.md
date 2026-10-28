# Codec War

The architecture Kaldi was retired for — in a browser tab, end to end, on this
machine only. No Kaldi. No Whisper. No checkpoint. Truly offline.

Codec War exists to get away from Kaldi: the heavy, checkpoint-bound decoder
speech recognition has leaned on for years. This repo is the working answer. It
carries a **Zipformer-shaped acoustic encoder** — U-Net stacks, multi-band
self-attention over 80-dimension fbank, depthwise temporal convolution, residual
bypass — the modern architecture that replaced Kaldi, run live and local, not
shipped as a 65-million-parameter file nobody can open.

## One canal

The pipeline is one straight line, and the studio names it on screen:

**Filament in. Codec. Booth out. — that is one canal.**

Keys: `1` Filament · `2` Codec · `3` Booth · `4` Dispersion · `5` War.

### 1 · Filament — the ear
Live voice enters here. The real, sovereign **Vosk Filament** runs as its own
process on `127.0.0.1:4850`; the mic streams to it and the words come back. If
that door is ever down, an in-tab recognizer (energy islands → DTW against Klatt
word templates) picks up, so the room is never dead. Typed lines and uploaded
audio also enter here.

### 2 · Codec — the middle
Two things share the name, and both are real.

- **Acoustic codec:** the Zipformer-shaped encoder above, turning sound into the
  representation everything downstream reads.
- **Text codec:** a full streaming encoder/decoder with an **encoder face** and a
  **decoder face**, built on the DBCS write/end architecture with lead/trail
  surrogate handling and state carried across chunks. Nine encodings:
  **UTF-8** (1–4 bytes), **UTF-16LE** and **UTF-16BE** (surrogate pairs, both
  endiannesses), **UTF-32LE** and **UTF-32BE** (one code point, four bytes),
  **ASCII**, **Latin-1**, **Windows-1252** (with the full CP1252 0x80–0x9F
  override table), and **GB18030** (4-byte Unicode, pending bytes carried across
  chunks). Every character is dissected into a unit card: code point, glyph,
  UTF-16 code units, the raw bytes in the chosen encoding, and — for astral code
  points above U+FFFF — the surrogate pair spelled out (lead 0xD800-range,
  trail 0xDC00-range). Replacement on what cannot map; nothing invented.

### 3 · Booth — out
The mouth. Klatt synthesis — the same templates the in-tab recognizer matches
against — closing the loop from text back to sound.

### 4 · Dispersion — many canals
One canal is Filament → Codec → Booth. This room keeps many, because speakers do
not join. Three views: **Field** (see them all), **Canals** (each one named),
**Refused** (the law). Fed by a **Mic canal** or a **File canal**. Three built
scenes: **Kitchen table** (Voice A, Voice B, Kettle), **Two booths** (Booth A,
Booth B), and **Crisis overlap** (three voices at once). Press **Discern canals**
to pull them apart; show or hide the **refused ghost** — the overlap it will not
merge. The counter reads canals, fused, and sealed mix analysis.

### 5 · War — the mix is allowed
The end of the line, and the room the whole thing is named for. Crisis overlap
taken to its decision: **three mouths, one measurement.**

- **Play the house** — all three canals stay alive, each with its own F0. The
  house keeps three.
- **Play the mix** — the three fuse into one. The mix keeps one, loses two.
  Fusion is the danger.

Its law, in the room's own words: *Output is a singleton. Input is not. Three
canals. Fusion is the danger.* The fuse is honest — only the words actually said
are joined. No invented speech.

## Sovereignty

- Everything runs on `127.0.0.1` — the dev server and the Filament ear both.
  Nothing binds the wildcard. The app's only network call is to the local
  Filament on 4850.
- Speech is made only by the Booth, on this machine. Text is never handed to
  the browser's or the system's speech engine: the Booth's old "Host voice"
  (`window.speechSynthesis`) was removed on Everett's ruling of 2026-10-28.
  `src/lib/offline.test.ts` fails if any browser or outside speech path, or
  any network address other than the local Filament, appears anywhere in `src`.
- No checkpoint ships in the repo. No Kaldi. No Whisper.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:9597
npm test           # the pipeline's own suite
```

The sovereign Filament ear is a separate process (THEFILAMENT, port 4850). Start
it for live mic transcription; without it, the Filament room falls back to the
in-tab recognizer.

Built for The Christman AI Project.
