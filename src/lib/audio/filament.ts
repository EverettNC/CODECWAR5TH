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

/**
 * A stream name for one open page. The door keeps one stream per name, so
 * this tab's words never mix with AlphaVox's, the Filament pages', or
 * another Codec War tab's. Letters, digits, dot, dash, underscore, colon.
 */
export function newFilamentSession(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const id =
    c && typeof c.randomUUID === "function"
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.floor(Math.random() * 2 ** 48).toString(36)}`;
  return `codec-war:${id}`;
}

/** This page's stream, made once when the page loads. */
export const FILAMENT_SESSION = newFilamentSession();

export type FilamentLiveOpts = {
  reset?: boolean;
  end?: boolean;
  /** Defaults to this page's stream. */
  session?: string;
  /** The door. Defaults to the local Filament; tests point it at a spare port. */
  door?: string;
};

export function filamentLiveUrl(opts: FilamentLiveOpts = {}): string {
  const q: string[] = [];
  if (opts.reset) q.push("reset=1");
  if (opts.end) q.push("end=1");
  // The name is sent as is: the door takes only its own safe characters.
  q.push(`session=${(opts.session ?? FILAMENT_SESSION).replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 64)}`);
  return `${opts.door ?? EAR}/live?${q.join("&")}`;
}

/** Send one chunk of mono-16k float samples. reset on first, end on last. */
export async function filamentLive(
  samples: Float32Array,
  opts: FilamentLiveOpts = {},
): Promise<FilamentReply | null> {
  const url = filamentLiveUrl(opts);
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
