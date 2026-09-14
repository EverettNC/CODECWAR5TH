import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { CanalRack, SelectedCard } from "@/components/canal-rack";
import { DispersionField } from "@/components/dispersion-field";
import { Panel } from "@/components/panel";
import { RefusedPath } from "@/components/refused-path";
import { Button } from "@/components/ui/button";
import { engine } from "@/lib/audio/engine";
import { discernCanals } from "@/lib/discern";
import { SCENES, type SceneId } from "@/lib/audio/scenes";
import { useStudio, type View } from "@/lib/store";
import { cn } from "@/lib/utils";

const VIEWS: { id: View; label: string; role: string }[] = [
  { id: "field", label: "Field", role: "see" },
  { id: "canals", label: "Canals", role: "each" },
  { id: "refused", label: "Refused", role: "law" },
];

export function DispersionRoom() {
  const view = useStudio((s) => s.view);
  const setView = useStudio((s) => s.setView);
  const scene = useStudio((s) => s.scene);
  const setScene = useStudio((s) => s.setScene);
  const showFused = useStudio((s) => s.showFused);
  const setShowFused = useStudio((s) => s.setShowFused);
  const discerning = useStudio((s) => s.discerning);
  const setDiscerning = useStudio((s) => s.setDiscerning);
  const discernment = useStudio((s) => s.discernment);
  const discernError = useStudio((s) => s.discernError);
  const setDiscernment = useStudio((s) => s.setDiscernment);
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return engine.subscribe(() => setTick((n) => n + 1));
  }, []);

  useEffect(() => {
    return () => engine.lastStop();
  }, []);

  useEffect(() => {
    engine.wantFused = showFused || view === "refused";
  }, [showFused, view]);

  const snap = engine.snap;
  const n = snap.canals.length;

  const open = async (id: SceneId) => {
    setScene(id);
    setDiscernment(null, null);
    await engine.openScene(id);
  };

  const onDiscern = async () => {
    if (!snap.canals.length || discerning) return;
    setDiscerning(true);
    setDiscernment(null, null);
    try {
      const result = await discernCanals({
        data: {
          canals: snap.canals.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
            line: c.line,
            duration: c.card.duration,
            attack: c.card.attack,
            decay: c.card.decay,
            peakRms: c.card.peakRms,
            medianF0: c.card.medianF0,
            lastF1: c.card.lastF1,
            lastF2: c.card.lastF2,
            meanZcr: c.card.meanZcr,
            voiced: c.card.voiced,
            truncated: c.card.truncated,
          })),
        },
      });
      if (result.ok) setDiscernment(result.text, null);
      else setDiscernment(null, result.error);
    } catch (err) {
      setDiscernment(null, err instanceof Error ? err.message : "Discernment failed.");
    } finally {
      setDiscerning(false);
    }
  };

  return (
    <div className="grid min-w-0 gap-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        One canal is Filament → Codec → Booth. This room keeps many. Speakers
        may mix. Analysis never shares a bus.
      </p>

      <div
        role="tablist"
        aria-label="Dispersion face"
        className="inline-flex h-11 w-fit rounded-md bg-elevated p-1"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "h-9 rounded-sm px-4 text-sm transition-colors duration-[var(--motion-quick)]",
              view === v.id ? "bg-linen text-bg" : "text-muted hover:text-fg",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => void open(s.id)}
            className={cn(
              "h-11 shrink-0 rounded-md px-4 text-sm transition-colors duration-[var(--motion-quick)]",
              snap.scene === s.id && snap.canals.length
                ? "bg-linen text-bg"
                : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {snap.playing ? (
          <Button variant="quiet" onClick={() => engine.stop()}>
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (snap.canals.length) void engine.play();
              else void open(scene);
            }}
          >
            Open the room
          </Button>
        )}
        <Button variant="ghost" onClick={() => void engine.addMic()}>
          <Mic />
          Mic canal
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload />
          File canal
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.m4a"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void engine.addFile(f);
            e.target.value = "";
          }}
        />
        <Button
          variant={showFused ? "quiet" : "ghost"}
          onClick={() => setShowFused(!showFused)}
          disabled={n < 2}
        >
          {showFused ? "Hide refused ghost" : "Show refused ghost"}
        </Button>
        <Button variant="outline" onClick={() => void onDiscern()} disabled={!n || discerning}>
          {discerning ? "Discerning…" : "Discern canals"}
        </Button>
      </div>

      {snap.lastError ? (
        <p className="text-sm text-warn" role="status">
          {snap.lastError}
        </p>
      ) : null}

      <p className="font-mono text-xs tracking-widest text-subtle uppercase">
        {n} canal{n === 1 ? "" : "s"} · 0 fused · mix analysis sealed
      </p>

      {view === "field" ? (
        <div className="grid gap-4">
          <Panel kicker="dispersion" title="Field">
            <DispersionField showFused={showFused} />
            <p className="mt-3 text-sm text-muted">
              {SCENES.find((s) => s.id === (snap.scene ?? scene))?.blurb ??
                "Each filament is one canal. They do not join."}
            </p>
          </Panel>
          <SelectedCard />
          {n > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {snap.canals.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => engine.select(c.id)}
                  className={cn(
                    "h-11 shrink-0 rounded-md px-3 text-sm",
                    snap.selected === c.id ? "bg-linen text-bg" : "bg-elevated text-muted",
                  )}
                >
                  {c.name}
                  {c.live.voiced ? " · live" : ""}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {view === "canals" ? (
        <div className="grid gap-4">
          <CanalRack playhead={snap.playhead} />
          <SelectedCard />
        </div>
      ) : null}

      {view === "refused" ? <RefusedPath /> : null}

      {discernment || discernError ? (
        <Panel kicker="discernment" title="Each canal, named">
          {discernError ? (
            <p className="text-sm text-warn">{discernError}</p>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">
              {discernment}
            </pre>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
