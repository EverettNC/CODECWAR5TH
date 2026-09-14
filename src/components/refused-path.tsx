import { Panel, Stat } from "@/components/panel";
import { Waveform } from "@/components/waveform";
import { formatHz, formatRms } from "@/lib/audio/corti";
import { engine } from "@/lib/audio/engine";

export function RefusedPath() {
  const canals = engine.snap.canals;
  const ghost = engine.snap.fused ?? (canals.length > 1 ? engine.computeFused() : null);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel kicker="law" title="This path is sealed" className="lg:col-span-12">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Filament in. Codec in the middle. Booth out. That pipeline is one canal.
          Dispersion is what happens when the room has more than one. Mixing the
          PCM and measuring the mix is how three people become one mouth. Sierra
          already forbids two voices on the way out. This layer forbids one
          measurement on the way in.
        </p>
      </Panel>

      <Panel kicker="dispersed" title="Each canal" className="lg:col-span-6">
        {canals.length === 0 ? (
          <p className="text-sm text-muted">Nothing is picked yet.</p>
        ) : (
          <ul className="space-y-3">
            {canals.map((c) => (
              <li key={c.id} className="rounded-md bg-elevated p-3">
                <p className="text-sm font-medium text-fg">{c.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {c.line ?? "Empty ear."}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Stat label="F0" value={formatHz(c.card.medianF0)} hot={c.card.voiced} />
                  <Stat label="peak RMS" value={formatRms(c.card.peakRms)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel kicker="refused" title="If we fused" className="lg:col-span-6">
        {!ghost ? (
          <p className="text-sm text-muted">
            Need two or more canals to show the lie.
          </p>
        ) : (
          <>
            <div className="overflow-hidden rounded-md">
              <Waveform pcm={ghost.pcm} height={72} ink="warn" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="F0" value={formatHz(ghost.card.medianF0)} />
              <Stat label="peak RMS" value={formatRms(ghost.card.peakRms)} />
              <Stat label="voiced" value={ghost.card.voiced ? "muddied" : "no"} />
              <Stat label="canals lost" value={String(canals.length - 1)} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-danger">
              One F0. One RMS. One card. {canals.length} sources became a mouth
              that none of them spoke. This is the measurement we do not take.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
