/**
 * The Booth's voice bank: a voice's recordings measured into frames
 * (frames.ts), every word the Filament heard in them cut into its phones
 * (align.ts), each phone kept as a unit with its neighbours.
 *
 * Why (2026-10-28). To speak words a voice never recorded in that order, in
 * that voice, the Booth stitches stretches of the voice's own frames
 * (stitch.ts): whole words and runs of words where the recordings hold them,
 * syllables and phone runs where they do not.
 *
 * Words and their times come from the Filament (Vosk); the phones of each
 * word come from the lexicon (the caller passes them as Booth phone ids).
 */

import type { FrameTrack } from "./frames.ts";
import { STATES, alignWords, features, type Span } from "./align.ts";

/** A pause of 150 ms or more between two words ends a phrase: shorter gaps are stop closures and breaths inside one. */
export const PHRASE_GAP_S = 0.15;

export type WordToken = {
  rec: number; // which recording
  word: string;
  start: number; // seconds
  end: number;
  conf: number;
  phones: string[]; // Booth phone ids, from the lexicon
};

export type Unit = {
  rec: number;
  phone: string;
  start: number; // frame, inclusive
  end: number; // frame, exclusive
  word: string;
  token: number; // index into the bank's tokens
  pos: number; // position of the phone in its word
  wordLen: number; // phones in the word
  prev: string; // phone before it in the recording ("SIL" after a pause)
  next: string;
  phraseStart: boolean; // its word opens a phrase
  phraseEnd: boolean; // its word closes a phrase
  succ: number; // index of the unit that follows it in the recording without a pause, or -1
};

export type Bank = {
  tracks: FrameTrack[];
  tokens: WordToken[];
  units: Unit[];
  /** Word tokens left out of the units, and why. */
  skipped: { token: number; reason: string }[];
};

function frameOf(sec: number, hop: number, sr: number) {
  return Math.round((sec * sr) / hop);
}

/**
 * Build the bank: forced-align every confidently heard word into its phones.
 * minConf: the lowest Filament confidence a word may have to be cut into units.
 */
export function buildBank(tracks: FrameTrack[], tokens: WordToken[], minConf: number): Bank {
  const feats = tracks.map(features);
  const skipped: { token: number; reason: string }[] = [];
  const spans: (Span & { token: number })[] = [];
  tokens.forEach((tk, i) => {
    const tr = tracks[tk.rec]!;
    const a = frameOf(tk.start, tr.hop, tr.sr);
    const b = Math.min(tr.n, frameOf(tk.end, tr.hop, tr.sr));
    if (tk.conf < minConf) skipped.push({ token: i, reason: `heard with confidence ${tk.conf} < ${minConf}` });
    else if (!tk.phones.length) skipped.push({ token: i, reason: "no phones" });
    else if (b - a < STATES * tk.phones.length) skipped.push({ token: i, reason: `${b - a} frames for ${tk.phones.length} phones` });
    else spans.push({ token: i, seq: tk.rec, a, b, phones: tk.phones });
  });
  // Inside a phrase the words run into each other: a gap shorter than a
  // pause belongs to the word before it, so the two words join frame to frame.
  for (let s = 0; s + 1 < spans.length; s++) {
    const cur = spans[s]!;
    const nxt = spans[s + 1]!;
    if (nxt.token !== cur.token + 1) continue;
    const a = tokens[cur.token]!;
    const b = tokens[nxt.token]!;
    if (a.rec === b.rec && b.start - a.end < PHRASE_GAP_S && nxt.a >= cur.b) cur.b = nxt.a;
  }
  const bounds = alignWords(feats, spans);

  const units: Unit[] = [];
  const aligned = new Set(spans.map((s) => s.token));
  const gap = (x: WordToken | undefined, y: WordToken | undefined) => (!x || !y || x.rec !== y.rec ? Infinity : y.start - x.end);
  const firstUnitOf = new Map<number, number>();
  spans.forEach((sp, i) => {
    const tk = tokens[sp.token]!;
    const bd = bounds[i]!;
    const prevTok = tokens[sp.token - 1];
    const nextTok = tokens[sp.token + 1];
    const opens = gap(prevTok, tk) >= PHRASE_GAP_S;
    const closes = gap(tk, nextTok) >= PHRASE_GAP_S;
    firstUnitOf.set(sp.token, units.length);
    tk.phones.forEach((ph, p) => {
      const prev = p > 0 ? tk.phones[p - 1]! : opens || !prevTok ? "SIL" : (prevTok.phones[prevTok.phones.length - 1] ?? "SIL");
      const next = p < tk.phones.length - 1 ? tk.phones[p + 1]! : closes || !nextTok ? "SIL" : (nextTok.phones[0] ?? "SIL");
      units.push({
        rec: tk.rec,
        phone: ph,
        start: bd[p]!,
        end: bd[p + 1]!,
        word: tk.word,
        token: sp.token,
        pos: p,
        wordLen: tk.phones.length,
        prev,
        next,
        phraseStart: opens,
        phraseEnd: closes,
        succ: -1,
      });
    });
  });
  // A unit's successor: the next phone of its word, or the first phone of the
  // next word when the two words run frame to frame.
  for (let u = 0; u < units.length; u++) {
    const cur = units[u]!;
    if (cur.pos < cur.wordLen - 1) {
      cur.succ = u + 1;
      continue;
    }
    if (cur.phraseEnd || !aligned.has(cur.token + 1)) continue;
    const nf = firstUnitOf.get(cur.token + 1)!;
    const nu = units[nf]!;
    if (nu.rec === cur.rec && nu.start === cur.end) cur.succ = nf;
  }
  return { tracks, tokens, units, skipped };
}
