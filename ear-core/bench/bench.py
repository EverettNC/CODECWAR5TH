"""Measure the ear against the live ear's own answers on the same tapes.

    python bench/bench.py GOLDEN_DIR [--model M] [--only NAME ...]

GOLDEN_DIR holds vosk_golden.json and pcm/*.s16 (16 kHz mono 16-bit), made
once by the live ear as the bar to meet. For every tape this runs our
recognizer two ways, exactly as the Filament feeds it:

  hear  the /stt path: the tape plus 0.5 s of silence in 4000-byte bites, then
        FinalResult only.
  segs  the same bites, Result() taken at every endpoint, then FinalResult.

Word error rate: for AlphaVox's verified phrases the reference is the phrase
the file is named for. The long recordings have no written reference in the
repo, so for them this reports how far our words are from the live ear's
(the same edit distance, against its words), not an error rate.
Speed: seconds of work per second of audio (real-time factor), on this machine.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from earcore.recognizer import Model, Recognizer  # noqa: E402
from earcore.wer import wer  # noqa: E402

TAIL = b"\x00" * 16000
BITE = 4000


def run(model: Model, pcm: bytes, mode: str) -> tuple[list[dict], float]:
    rec = Recognizer(model, 16000)
    rec.SetWords(True)
    segs = []
    feed = pcm + TAIL
    t = time.perf_counter()
    for i in range(0, len(feed), BITE):
        if rec.AcceptWaveform(feed[i : i + BITE]) and mode == "segs":
            segs.append(json.loads(rec.Result()))
    segs.append(json.loads(rec.FinalResult()))
    return segs, time.perf_counter() - t


def text_of(segs: list[dict]) -> str:
    return " ".join(s.get("text", "") for s in segs).strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("golden", type=Path)
    ap.add_argument("--model", default=os.environ.get("VOSK_MODEL_PATH") or os.environ.get("EAR_MODEL"),
                    help="the model folder (default: VOSK_MODEL_PATH, then EAR_MODEL)")
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--out", type=Path, default=None)
    a = ap.parse_args()
    if not a.model:
        ap.error("name the model folder with --model, VOSK_MODEL_PATH or EAR_MODEL")
    rows = json.loads((a.golden / "vosk_golden.json").read_text())
    if a.only:
        rows = [r for r in rows if r["name"] in a.only]
    t0 = time.perf_counter()
    model = Model(a.model)
    print(f"model seated in {time.perf_counter() - t0:.1f} s", flush=True)
    report = []
    tot = {k: [0, 0, 0.0, 0.0] for k in ("ours_hear", "live_hear", "ours_segs", "live_segs")}
    for r in rows:
        pcm = (a.golden / "pcm" / f"{r['name']}.s16").read_bytes()
        phrase = r["name"].startswith("alphavox_") and r["seconds"] <= 10
        line = {"name": r["name"], "seconds": r["seconds"]}
        for mode in ("hear", "segs"):
            ours, secs = run(model, pcm, mode)
            live = text_of(r[mode])
            line[mode] = {"ours": text_of(ours), "live": live, "ours_seconds": secs,
                          "live_seconds": r[mode + "_seconds"], "ours_segments": ours}
            if phrase:
                ref = r["name"][len("alphavox_"):].replace("_", " ")
                e_o, n = wer(ref, text_of(ours))
                e_l, _ = wer(ref, live)
                tot["ours_" + mode][:2] = [tot["ours_" + mode][0] + e_o, tot["ours_" + mode][1] + n]
                tot["live_" + mode][:2] = [tot["live_" + mode][0] + e_l, tot["live_" + mode][1] + n]
                line[mode]["errors"] = {"ours": e_o, "live": e_l, "words": n}
            else:
                d, n = wer(live, text_of(ours))
                line[mode]["distance_from_live"] = {"edits": d, "live_words": n}
            for who, s in (("ours_", secs), ("live_", r[mode + "_seconds"])):
                tot[who + mode][2] += s
                tot[who + mode][3] += r["seconds"]
        report.append(line)
        h = line["hear"]
        extra = h.get("errors") or h.get("distance_from_live")
        print(f"{r['name']}: rtf {h['ours_seconds'] / r['seconds']:.3f} (live {h['live_seconds'] / r['seconds']:.3f}) "
              f"{extra} | {h['ours'][:100]}", flush=True)
    summary = {}
    for k, (e, n, s, aud) in tot.items():
        summary[k] = {"phrase_errors": e, "phrase_words": n,
                      "wer_percent": round(100.0 * e / n, 2) if n else None,
                      "rtf": round(s / aud, 3) if aud else None}
    print(json.dumps(summary, indent=1))
    if a.out:
        a.out.write_text(json.dumps({"summary": summary, "tapes": report}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
