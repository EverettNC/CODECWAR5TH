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
