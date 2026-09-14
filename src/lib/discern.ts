/**
 * Discernment is local. Cards, not audio. No key. No call out.
 * Each canal is named from its own measurements. They are never fused.
 */

export type CanalCardIn = {
  id: string;
  name: string;
  kind: string;
  line: string | null;
  duration: number;
  attack: number;
  decay: number | null;
  peakRms: number;
  medianF0: number | null;
  lastF1: number | null;
  lastF2: number | null;
  meanZcr: number;
  voiced: boolean;
  truncated: boolean;
};

function hz(n: number | null): string {
  return n == null ? "hole, not a zero" : `${Math.round(n)} Hz`;
}

function nameCanal(c: CanalCardIn, i: number): string {
  const line =
    c.line == null || c.line === ""
      ? "Empty ear. No invented speech."
      : c.line;
  const decay =
    c.decay == null
      ? c.truncated
        ? "null (tail gone)"
        : "—"
      : `${c.decay.toFixed(2)}s`;
  return [
    `Canal ${i + 1} · ${c.name} · ${c.kind}`,
    `  line: ${line}`,
    `  F0 ${hz(c.medianF0)} · F1 ${hz(c.lastF1)} · F2 ${hz(c.lastF2)}`,
    `  peak RMS ${c.peakRms.toFixed(4)} · ZCR ${c.meanZcr.toFixed(3)} · voiced ${c.voiced ? "yes" : "no"}`,
    `  duration ${c.duration.toFixed(2)}s · attack ${c.attack.toFixed(2)}s · decay ${decay}`,
    `  ${c.truncated ? "Tape truncated. Cap dropped the tail." : "Tape intact."}`,
  ].join("\n");
}

export function discernCanals(
  canals: CanalCardIn[],
): { ok: true; text: string } | { ok: false; error: string } {
  if (!canals.length) return { ok: false, error: "Nothing is picked yet." };
  const kept = canals.slice(0, 4);
  return { ok: true, text: kept.map((c, i) => nameCanal(c, i)).join("\n\n") };
}
