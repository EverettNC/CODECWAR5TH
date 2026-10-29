"""The recognizer end to end: real model, AlphaVox's own recorded phrases.

The phrases are src/lib/audio/testdata (from EverettNC/AlphaVox
data/phrases/alphavox_verified, 16 kHz). The live ear heard them as
"i want to go home" (i 0.00-0.09, want 0.09-0.33, to 0.33-0.39, go 0.39-0.57,
home 0.57-0.93) and "i need help please".
"""

from __future__ import annotations

import json
import os
import unittest
import wave
from pathlib import Path

MODEL = Path(os.environ.get("EAR_MODEL") or Path.home() / "models" / "vosk-model-en-us-0.22")
TESTDATA = Path(__file__).resolve().parents[2] / "src" / "lib" / "audio" / "testdata"
TAIL = b"\x00" * 16000  # the Filament's half second of digital silence
BITE = 4000


def tape(name: str) -> bytes:
    with wave.open(str(TESTDATA / f"alphavox_{name}.wav"), "rb") as w:
        assert (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (16000, 1, 2)
        return w.readframes(w.getnframes())


@unittest.skipUnless((MODEL / "graph" / "HCLG.fst").is_file(), f"model is not on disk at {MODEL}; not run")
class Recognizer(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        from earcore.recognizer import Model

        cls.model = Model(MODEL)

    def hear(self, pcm: bytes, words: bool = True) -> dict:
        from earcore.recognizer import Recognizer

        r = Recognizer(self.model, 16000)
        r.SetWords(words)
        for i in range(0, len(pcm), BITE):
            r.AcceptWaveform(pcm[i : i + BITE])
        return json.loads(r.FinalResult())

    def test_hears_the_phrase_with_times_and_confidence(self) -> None:
        out = self.hear(tape("i_want_to_go_home") + TAIL)
        self.assertEqual(out["text"], "i want to go home")
        live = [("i", 0.0, 0.09), ("want", 0.09, 0.33), ("to", 0.33, 0.39), ("go", 0.39, 0.57), ("home", 0.57, 0.93)]
        self.assertEqual([w["word"] for w in out["result"]], [w for w, _, _ in live])
        for got, (_, start, end) in zip(out["result"], live):
            self.assertEqual(sorted(got), ["conf", "end", "start", "word"])
            self.assertLessEqual(abs(got["start"] - start), 0.061, got)
            self.assertLessEqual(abs(got["end"] - end), 0.061, got)
            self.assertGreater(got["conf"], 0.9, got)
            self.assertLessEqual(got["conf"], 1.0)

    def test_digital_silence_adds_no_word(self) -> None:
        for name, said in (("i_want_to_go_home", "i want to go home"), ("i_need_help_please", "i need help please")):
            for tail in (TAIL, TAIL * 4):
                self.assertEqual(self.hear(tape(name) + tail)["text"], said)
        self.assertEqual(self.hear(b"\x00" * 16000), {"text": ""})
        self.assertEqual(self.hear(b"\x00" * 32000), {"text": ""})
        # Two seconds or more of nothing but digital zeros is heard as "the",
        # 0.27 to 1.98 s, by this ear and by the live ear alike (measured on
        # 2026-10-29). It is the same model; that one is the model's, not ours.
        two = self.hear(b"\x00" * 64000)
        self.assertEqual(two["text"], "the")
        self.assertAlmostEqual(two["result"][0]["start"], 0.27, delta=0.031)

    def test_endpoint_then_result_then_more(self) -> None:
        from earcore.recognizer import Recognizer

        r = Recognizer(self.model, 16000)
        r.SetWords(True)
        pcm = tape("i_need_help_please") + b"\x00" * 48000 + tape("i_want_to_go_home") + TAIL
        segs, partials = [], []
        for i in range(0, len(pcm), BITE):
            if r.AcceptWaveform(pcm[i : i + BITE]):
                segs.append(json.loads(r.Result()))
            else:
                partials.append(json.loads(r.PartialResult()))
        segs.append(json.loads(r.FinalResult()))
        said = [s["text"] for s in segs if s["text"]]
        self.assertEqual(said, ["i need help please", "i want to go home"])
        first, second = [s for s in segs if s["text"]]
        self.assertGreater(second["result"][0]["start"], first["result"][-1]["end"] + 1.0)
        self.assertTrue(all(set(p) == {"partial"} for p in partials))
        self.assertIn("i need", " ".join(p["partial"] for p in partials))

    def test_shapes(self) -> None:
        from earcore.recognizer import Recognizer

        self.assertEqual(self.hear(tape("i_need_help_please") + TAIL, words=False), {"text": "i need help please"})
        r = Recognizer(self.model, 16000)
        self.assertEqual(json.loads(r.PartialResult()), {"partial": ""})
        self.assertEqual(json.loads(r.Result()), {"text": ""})
        with self.assertRaises(ValueError):
            Recognizer(self.model, 8000)

    def test_same_tape_same_answer(self) -> None:
        pcm = tape("i_need_help_please") + TAIL
        self.assertEqual(self.hear(pcm), self.hear(pcm))


if __name__ == "__main__":
    unittest.main()
