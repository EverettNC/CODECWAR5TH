import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Upload } from "lucide-react";
import { Panel, Stat } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { engine } from "@/lib/audio/codec-engine";
import { DEMO_LINE, useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FilamentRoom() {
  const listening = useStudio((s) => s.listening);
  const setListening = useStudio((s) => s.setListening);
  const text = useStudio((s) => s.filamentText);
  const partial = useStudio((s) => s.filamentPartial);
  const setFilament = useStudio((s) => s.setFilament);
  const setEncoderText = useStudio((s) => s.setEncoderText);
  const setRoom = useStudio((s) => s.setRoom);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return engine.subscribe(() => setTick((n) => n + 1));
  }, []);

  useEffect(() => {
    return () => {
      void engine.stopMic();
    };
  }, []);

  const snap = engine.snap;
  void tick;

  const captions = snap.aligned;

  const start = async () => {
    setError(null);
    await engine.startMic();
    if (engine.lastError) {
      setError(engine.lastError);
      setListening(false);
      return;
    }
    setListening(true);
  };

  const stop = async () => {
    setListening(false);
    await engine.stopMic();
  };

  useEffect(() => {
    if (snap.source === "mic" && listening && snap.transcript) {
      setFilament(snap.transcript, "");
    }
  }, [snap.transcript, snap.source, listening, setFilament]);

  const sendToCodec = () => {
    const line = text || snap.transcript;
    if (!line) return;
    setEncoderText(line);
    setRoom("codec");
  };

  const tPlay = snap.playhead * snap.duration;
  const display = text || snap.transcript;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-12">
      <Panel kicker="filament" title="Listen" className="lg:col-span-8">
        <div className="overflow-hidden rounded-md bg-elevated">
          <Waveform height={120} />
        </div>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {captions.length === 0 ? (
            <p className="px-1 text-sm text-muted">No captions yet.</p>
          ) : (
            captions.map((w, i) => {
              const on = tPlay >= w.start && tPlay < w.end;
              return (
                <span
                  key={`${w.word}-${i}`}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center rounded-sm px-3 text-sm",
                    on ? "bg-linen text-bg" : "bg-elevated text-muted",
                  )}
                  title={`${w.start.toFixed(2)}–${w.end.toFixed(2)}s`}
                >
                  {w.word}
                </span>
              );
            })
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {listening ? (
            <Button variant="signal" onClick={stop}>
              <MicOff />
              Stop
            </Button>
          ) : (
            <Button onClick={start}>
              <Mic />
              Listen
            </Button>
          )}
          <Button
            variant="quiet"
            onClick={() => {
              const line = DEMO_LINE;
              setFilament(line, "");
              void engine.runDemo(line);
            }}
          >
            Test line
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload />
            Audio file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.m4a"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void engine.loadFile(f).then(() => {
                setFilament(engine.snap.transcript, "");
              });
              e.target.value = "";
            }}
          />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-warn" role="status">
            {error}
          </p>
        ) : null}
      </Panel>

      <Panel kicker="meter" title="Ear" className="lg:col-span-4">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="source" value={snap.source} />
          <Stat label="voicing" value={snap.vad ? "live" : "idle"} hot={snap.vad} />
          <Stat label="F0" value={snap.vad && snap.f0 ? `${Math.round(snap.f0)} Hz` : "—"} />
          <Stat label="captions" value={String(captions.length)} />
        </div>
        <p className="mt-4 font-mono text-xs leading-relaxed text-signal">
          {snap.result?.phones.slice(0, 24).join(" ") || "∅"}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Unknown audio is decoded in this tab against the Klatt lexicon —
          the same mouth as Booth. Times come from the encoder. Nothing
          leaves the box.
        </p>
      </Panel>

      <Panel kicker="transcript" title="Taken down" className="lg:col-span-12">
        <p
          className="min-h-24 text-xl leading-snug tracking-tight text-fg"
          aria-live="polite"
        >
          {display || <span className="text-subtle">Waiting on Filament.</span>}
          {partial ? <span className="text-muted"> {partial}</span> : null}
        </p>
        <div className="mt-4">
          <Button onClick={sendToCodec} disabled={!display}>
            Send to codec
          </Button>
        </div>
      </Panel>
    </div>
  );
}
