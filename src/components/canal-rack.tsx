import { MicOff, Volume2 } from "lucide-react";
import { Panel, Stat } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { formatHz, formatRms } from "@/lib/audio/corti";
import { engine, type CanalState } from "@/lib/audio/engine";
import { cn } from "@/lib/utils";

function inkDot(ink: CanalState["ink"]) {
  return ink === "linen" ? "bg-linen" : ink === "warn" ? "bg-warn" : "bg-signal";
}

export function CanalCard({
  canal,
  selected,
  playhead,
  onSelect,
}: {
  canal: CanalState;
  selected: boolean;
  playhead: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg bg-elevated p-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)]",
        selected ? "shadow-[var(--shadow-border-hover)]" : "",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", inkDot(canal.ink))} />
          <p className="truncate text-sm font-medium text-fg">{canal.name}</p>
        </div>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">{canal.kind}</p>
      </div>
      <div className="overflow-hidden rounded-sm">
        <Waveform pcm={canal.pcm} height={56} ink={canal.ink} playhead={playhead} />
      </div>
      <p className="mt-2 min-h-10 text-sm leading-snug text-muted">
        {canal.line ?? <span className="text-subtle">Empty ear. No invented speech.</span>}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="F0" value={formatHz(canal.live.f0)} hot={canal.live.voiced} />
        <Stat label="RMS" value={formatRms(canal.live.rms)} />
        <Stat label="F1 / F2" value={`${formatHz(canal.live.f1)} · ${formatHz(canal.live.f2)}`} />
        <Stat label="voiced" value={canal.live.voiced ? "yes" : "no"} hot={canal.live.voiced} />
      </div>
      <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant={canal.muted ? "quiet" : "ghost"}
          onClick={() => engine.setMuted(canal.id, !canal.muted)}
        >
          <MicOff />
          {canal.muted ? "Muted" : "Mute"}
        </Button>
        <Button
          size="sm"
          variant={canal.solo ? "signal" : "ghost"}
          onClick={() => engine.setSolo(canal.id, !canal.solo)}
        >
          <Volume2 />
          Solo
        </Button>
      </div>
    </button>
  );
}

export function CanalRack({ playhead }: { playhead: number }) {
  const { canals, selected } = engine.snap;
  if (!canals.length) {
    return (
      <Panel kicker="canals" title="Rack">
        <p className="text-sm text-muted">Nothing is picked yet.</p>
      </Panel>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {canals.map((c) => (
        <CanalCard
          key={c.id}
          canal={c}
          selected={selected === c.id}
          playhead={playhead}
          onSelect={() => engine.select(c.id)}
        />
      ))}
    </div>
  );
}

export function SelectedCard() {
  const { canals, selected } = engine.snap;
  const canal = canals.find((c) => c.id === selected) ?? canals[0];
  if (!canal) return null;
  const card = canal.card;
  return (
    <Panel kicker="corti" title={`Card · ${canal.name}`}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="duration" value={`${card.duration.toFixed(2)} s`} />
        <Stat label="attack" value={`${card.attack.toFixed(2)} s`} />
        <Stat
          label="decay"
          value={card.decay == null ? (card.truncated ? "null (tail gone)" : "—") : `${card.decay.toFixed(2)} s`}
        />
        <Stat label="peak RMS" value={formatRms(card.peakRms)} />
        <Stat label="median F0" value={formatHz(card.medianF0)} hot={card.voiced} />
        <Stat label="last F1" value={formatHz(card.lastF1)} />
        <Stat label="last F2" value={formatHz(card.lastF2)} />
        <Stat label="mean ZCR" value={card.meanZcr.toFixed(3)} />
      </div>
      <p className="mt-4 font-mono text-xs leading-relaxed text-subtle">
        {card.truncated ? "Tape truncated. Cap dropped the tail." : "Tape intact."}{" "}
        {card.medianF0 == null ? "F0 is a hole, not a zero." : null}
      </p>
    </Panel>
  );
}
