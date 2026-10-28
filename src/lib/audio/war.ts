/** Honest mash of what was said. No invented speech. */
export function fusedClaim(lines: (string | null | undefined)[]): string | null {
  const said = lines
    .map((l) => (typeof l === "string" ? l.trim() : ""))
    .filter((l) => l.length > 0);
  if (!said.length) return null;
  return said.join(" ");
}

export function sourcesKept(n: number, mode: "canals" | "fused"): number {
  if (n <= 0) return 0;
  return mode === "fused" ? 1 : n;
}

export function sourcesLost(n: number, mode: "canals" | "fused"): number {
  return Math.max(0, n - sourcesKept(n, mode));
}

/**
 * What the counter line says about the mix. The engine measures the mix only
 * to show the refused ghost; no canal reads that measurement.
 */
export function mixAnalysisLabel(measured: boolean): string {
  return measured ? "mix measured for the ghost only, no canal reads it" : "mix not measured";
}
