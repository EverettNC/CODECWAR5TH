import { useEffect, useLayoutEffect, useState } from "react";
import { Square } from "lucide-react";
import { DispersionField } from "@/components/dispersion-field";
import { Panel, Stat } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { formatHz, formatRms } from "@/lib/audio/corti";
import { engine } from "@/lib/audio/engine";
import { fusedClaim, sourcesKept, sourcesLost } from "@/lib/audio/war";
import { cn } from "@/lib/utils";

function inkDot(ink: "linen" | "signal" | "warn") {
  return ink === "linen" ? "bg-linen" : ink === "warn" ? "bg-warn" : "bg-signal";
}

export function WarRoom() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return engine.subscribe(() => setTick((n) => n + 1));
  }, []);

  useLayoutEffect(() => {
    engine.wantFused = true;
    if (engine.snap.scene !== "crisis" || engine.snap.canals.length < 2) {
      void engine.openScene("crisis", { play: false });
    }
    return () => {
      engine.wantFused = false;
      engine.lastStop();
    };
  }, []);

  const snap = engine.snap;
  const n = snap.canals.length;
  const ghost = snap.fused ?? (n > 1 ? engine.computeFused() : null);
  const claim = fusedClaim(snap.canals.map((c) => c.line));
  const mode = snap.playing ? snap.playMode : "canals";
  const kept = sourcesKept(n, mode);
  const lost = sourcesLost(n, mode);
  const mixLive = snap.playing && snap.playMode === "fused";
  const houseLive = snap.playing && snap.playMode === "canals";

  return (
    <div className="grid min-w-0 gap-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Filament in. Codec. Booth out. Dispersion keeps canals. The war is what
        happens when the mix is allowed. Three mouths. One measurement. The
        house keeps three. The mix keeps one.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {snap.playing ? (
          <Button variant="quiet" onClick={() => engine.stop()}>
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        ) : null}
        <Button
          variant={houseLive ? "signal" : "primary"}
          onClick={() => {
            if (!n) void engine.openScene("crisis");
            else void engine.play();
          }}
        >
          Play the house
        </Button>
        <Button
          variant={mixLive ? "danger" : "outline"}
          disabled={n < 2}
          onClick={() => void engine.playFused()}
        >
          Play the mix
        </Button>
      </div>

      {snap.lastError ? (
        <p className="text-sm text-warn" role="status">
          {snap.lastError}
        </p>
      ) : null}

      <p className="font-mono text-xs tracking-widest text-subtle uppercase">
        {n} canals · {kept} kept · {lost} lost · mix analysis sealed
      </p>

      <Panel kicker="field" title="Crisis overlap">
        <DispersionField showFused={mixLive || Boolean(ghost)} />
        <p className="mt-3 text-sm text-muted">
          Output is a singleton. Input is not. Three canals. Fusion is the danger.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          kicker="house"
          title="Three canals"
          action={
            houseLive ? (
              <span className="font-mono text-xs tracking-widest text-signal uppercase">
                live
              </span>
            ) : null
          }
        >
          {n === 0 ? (
            <p className="text-sm text-muted">Nothing is on the field yet.</p>
          ) : (
            <ul className="space-y-3">
              {snap.canals.map((c) => (
                <li key={c.id} className="rounded-md bg-elevated p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", inkDot(c.ink))} />
                    <p className="text-sm font-medium text-fg">{c.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{c.line ?? "Empty ear."}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Stat
                      label="F0"
                      value={formatHz(houseLive ? c.live.f0 : c.card.medianF0)}
                      hot={houseLive ? c.live.voiced : c.card.voiced}
                    />
                    <Stat
                      label="peak RMS"
                      value={formatRms(houseLive ? c.live.rms : c.card.peakRms)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          kicker="mix"
          title="One mouth"
          action={
            mixLive ? (
              <span className="font-mono text-xs tracking-widest text-danger uppercase">
                live
              </span>
            ) : null
          }
        >
          {!ghost ? (
            <p className="text-sm text-muted">Need two or more canals to show the lie.</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-md">
                <Waveform pcm={ghost.pcm} height={72} ink="warn" playhead={mixLive ? snap.playhead : 0} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-danger">
                {claim ?? "Empty ear. No invented speech."}
              </p>
              <p className="mt-1 text-sm text-muted">
                One string. None of them said this as a mouth.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat
                  label="F0"
                  value={formatHz(mixLive ? ghost.live.f0 : ghost.card.medianF0)}
                />
                <Stat
                  label="peak RMS"
                  value={formatRms(mixLive ? ghost.live.rms : ghost.card.peakRms)}
                />
                <Stat label="voiced" value={ghost.card.voiced ? "muddied" : "no"} />
                <Stat label="canals lost" value={String(sourcesLost(n, "fused"))} />
              </div>
            </>
          )}
        </Panel>
      </div>

      <Panel kicker="verdict" title="The mix loses sources">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="on the field" value={String(n)} />
          <Stat label="house keeps" value={String(sourcesKept(n, "canals"))} hot={houseLive} />
          <Stat label="mix keeps" value={n > 1 ? "1" : "—"} />
          <Stat label="lost to fusion" value={n > 1 ? String(sourcesLost(n, "fused")) : "—"} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Mixing the PCM and measuring the mix is how three people become one
          mouth. Sierra already forbids two voices on the way out. This layer
          forbids one measurement on the way in.
        </p>
      </Panel>
    </div>
  );
}
