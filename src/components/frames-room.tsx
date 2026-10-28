import { useRef, useState } from "react";
import { FileAudio, Play, Square } from "lucide-react";
import { Panel, Stat } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { AP_BANDS, AP_EDGES, FRAME_SR, analyze, envGridHz, type FrameTrack } from "@/lib/audio/frames";
import { renderFrames } from "@/lib/audio/vocoder";

/** Longest recording the room measures at once: 12 s, about 2,400 frames, under a few seconds of work in the tab. */
const MAX_SECONDS = 12;

type Measured = { name: string; source: Float32Array; track: FrameTrack; rendered: Float32Array; ms: number };

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[s.length >> 1]! : NaN;
}

/**
 * Frames: the room between the ear and the mouth. A recording goes in, is
 * measured every 5 ms into its pitch, its full spectral envelope and its
 * aperiodicity per band (frames.ts), and comes back out rendered from those
 * numbers alone (vocoder.ts), so the two can be heard side by side. Nothing
 * leaves the tab.
 */
export function FramesRoom() {
  const fileRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const [m, setM] = useState<Measured | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext({ sampleRate: FRAME_SR });
    return ctxRef.current;
  };

  const load = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const buf = await ctx().decodeAudioData(await file.arrayBuffer());
      const ch = buf.getChannelData(0).subarray(0, MAX_SECONDS * FRAME_SR);
      const t0 = performance.now();
      const track = analyze(ch, FRAME_SR);
      const rendered = renderFrames({
        sr: FRAME_SR,
        hop: track.hop,
        f0: track.f0,
        envDb: track.envDb,
        envHz: envGridHz(FRAME_SR),
        ap: track.ap,
        bandEdges: AP_EDGES,
        jitter: 0,
        shimmer: 0,
        seed: 1,
      });
      setM({ name: file.name, source: Float32Array.from(ch), track, rendered, ms: performance.now() - t0 });
    } catch (e) {
      setM(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const play = (pcm: Float32Array) => {
    stop();
    const c = ctx();
    const b = c.createBuffer(1, pcm.length, FRAME_SR);
    b.copyToChannel(Float32Array.from(pcm, (v) => Math.max(-1, Math.min(1, v))), 0);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start();
    srcRef.current = s;
  };
  const stop = () => {
    srcRef.current?.stop();
    srcRef.current = null;
  };

  const voiced = m ? Array.from(m.track.f0).filter((f) => f > 0) : [];
  let apMean = NaN;
  if (m && voiced.length) {
    let s = 0;
    let n = 0;
    for (let i = 0; i < m.track.n; i++)
      if (m.track.f0[i]! > 0)
        for (let b = 0; b < AP_BANDS; b++) {
          s += m.track.ap[i * AP_BANDS + b]!;
          n++;
        }
    apMean = s / n;
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-12">
      <Panel kicker="frames" title="Measure a recording" className="lg:col-span-7">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            <FileAudio />
            Audio file
          </Button>
          <Button onClick={() => m && play(m.source)} disabled={!m}>
            <Play />
            Recording
          </Button>
          <Button onClick={() => m && play(m.rendered)} disabled={!m}>
            <Play />
            From its frames
          </Button>
          <Button variant="quiet" onClick={stop}>
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-warn">Not measured: {error}</p> : null}
        <div className="mt-4 space-y-2">
          <div className="overflow-hidden rounded-md bg-elevated">
            <Waveform pcm={m?.source} height={72} ink="linen" />
          </div>
          <div className="overflow-hidden rounded-md bg-elevated">
            <Waveform pcm={m?.rendered} height={72} />
          </div>
        </div>
      </Panel>

      <Panel kicker="numbers" title="What was measured" className="lg:col-span-5">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="file" value={m ? m.name : "none"} />
          <Stat label="frames" value={m ? String(m.track.n) : "-"} />
          <Stat label="voiced" value={m ? `${Math.round((100 * voiced.length) / m.track.n)}%` : "-"} />
          <Stat label="pitch median" value={voiced.length ? `${median(voiced).toFixed(1)} Hz` : "-"} />
          <Stat label="voiced aperiodicity" value={Number.isFinite(apMean) ? apMean.toFixed(3) : "-"} />
          <Stat label="measured in" value={m ? `${Math.round(m.ms)} ms` : "-"} />
        </div>
        <p className="mt-4 text-sm text-muted">
          Every 5 ms: pitch, 96 envelope points, aperiodicity in {AP_BANDS} bands. The second
          tape is made from those numbers and nothing else.
        </p>
      </Panel>
    </div>
  );
}
