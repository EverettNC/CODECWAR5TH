import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { Panel, Stat } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { engine } from "@/lib/audio/codec-engine";
import { useStudio } from "@/lib/store";

export function BoothRoom() {
  const text = useStudio((s) => s.boothText);
  const setText = useStudio((s) => s.setBoothText);
  const f0 = useStudio((s) => s.boothF0);
  const rate = useStudio((s) => s.boothRate);
  const setVoice = useStudio((s) => s.setBoothVoice);
  const encoderText = useStudio((s) => s.encoderText);
  const [, setTick] = useState(0);

  useEffect(() => {
    return engine.subscribe(() => setTick((n) => n + 1));
  }, []);

  const speak = async () => {
    const line = text.trim();
    if (!line) return;
    await engine.speakBooth(line, { f0, rate });
  };

  const stop = () => {
    engine.stopPlayback();
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-12">
      <Panel kicker="booth" title="Speak" className="lg:col-span-7">
        <label htmlFor="booth-text" className="sr-only">
          Text for Booth to speak
        </label>
        <textarea
          id="booth-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="min-h-36 w-full resize-y rounded-md bg-elevated px-3 py-3 text-base leading-relaxed text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-[var(--motion-quick)] focus:shadow-[var(--shadow-border-hover)]"
          placeholder="Booth reads this."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void speak()} disabled={!text.trim()}>
            <Volume2 />
            Speak
          </Button>
          <Button variant="quiet" onClick={stop}>
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
          <Button variant="ghost" onClick={() => setText(encoderText)} disabled={!encoderText}>
            Take encoder text
          </Button>
        </div>
      </Panel>

      <Panel kicker="voice" title="Source" className="lg:col-span-5">
        <label className="mt-5 block" htmlFor="booth-pitch">
          <span className="font-mono text-xs tracking-widest text-subtle uppercase">
            Pitch {f0} Hz
          </span>
          <input
            id="booth-pitch"
            type="range"
            min={90}
            max={240}
            value={f0}
            onChange={(e) => setVoice(Number(e.target.value), rate)}
            className="mt-1 h-11 w-full accent-signal"
          />
        </label>
        <label className="mt-2 block" htmlFor="booth-rate">
          <span className="font-mono text-xs tracking-widest text-subtle uppercase">
            Rate {rate.toFixed(2)}×
          </span>
          <input
            id="booth-rate"
            type="range"
            min={70}
            max={140}
            value={Math.round(rate * 100)}
            onChange={(e) => setVoice(f0, Number(e.target.value) / 100)}
            className="mt-1 h-11 w-full accent-signal"
          />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Stat label="engine" value="formant" />
          <Stat label="source" value={engine.snap.source} />
        </div>
      </Panel>

      <Panel kicker="out" title="Tape" className="lg:col-span-12">
        <div className="overflow-hidden rounded-md bg-elevated">
          <Waveform height={100} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Booth is the mouth — the out. Codec sits in the middle and hands it a
          string. Every sound here is made on this machine by the Booth; text is
          never handed to the browser's or the system's speech engine.
        </p>
      </Panel>
    </div>
  );
}
