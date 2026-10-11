/**
 * The real Filament, not the in-tab recognizer.
 *
 * Streams 16k mono PCM to the sovereign Vosk ear on 127.0.0.1:4850 (/live),
 * reset on the first chunk, end on the last, and returns its partial/final
 * words. 127-to-127 only. If the ear is down, the caller falls back to the
 * in-tab path — the mic never goes silent because the door is closed.
 */
const EAR = "http://127.0.0.1:4850";

export type FilamentReply = {
  ok: boolean;
  final: boolean;
  text: string;
  partial: string;
  seated?: boolean;
  error?: string | null;
};

function floatToPcm16(f: Float32Array): ArrayBuffer {
  const ab = new ArrayBuffer(f.length * 2);
  const view = new DataView(ab);
  for (let i = 0; i < f.length; i++) {
    let s = f[i]!;
    s = s < -1 ? -1 : s > 1 ? 1 : s;
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return ab;
}

export async function filamentHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${EAR}/health`, { method: "GET" });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean; seated?: boolean };
    return Boolean(j.ok && j.seated);
  } catch {
    return false;
  }
}

/** Send one chunk of mono-16k float samples. reset on first, end on last. */
export async function filamentLive(
  samples: Float32Array,
  opts: { reset?: boolean; end?: boolean } = {},
): Promise<FilamentReply | null> {
  const q: string[] = [];
  if (opts.reset) q.push("reset=1");
  if (opts.end) q.push("end=1");
  const url = `${EAR}/live${q.length ? "?" + q.join("&") : ""}`;
  try {
    const body = floatToPcm16(samples);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as FilamentReply;
    return j;
  } catch {
    return null;
  }
}
