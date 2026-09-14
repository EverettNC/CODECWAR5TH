import {
  EMPTY_CARD,
  EMPTY_LIVE,
  cardFromFrames,
  fusePcm,
  liveFromFrame,
  tapeFromFrames,
  type CanalLive,
  type CortiCard,
  type TapeFrame,
} from "./corti.ts";
import { extractFrame, extractFrames, resampleLinear, SAMPLE_RATE, type Frame } from "./dsp.ts";
import { hvacPcm, kettlePcm } from "./noise.ts";
import { sceneById, type CanalSpec, type SceneId } from "./scenes.ts";
import { synthesize } from "./synth.ts";

export type PlayMode = "canals" | "fused";

export type CanalInk = "linen" | "signal" | "warn";

export type CanalState = {
  id: string;
  name: string;
  kind: "voice" | "noise" | "mic" | "file";
  line: string | null;
  ink: CanalInk;
  pcm: Float32Array;
  frames: Frame[];
  card: CortiCard;
  tape: TapeFrame[];
  live: CanalLive;
  muted: boolean;
  solo: boolean;
  duration: number;
};

export type FusedGhost = {
  card: CortiCard;
  live: CanalLive;
  pcm: Float32Array;
};

export type EngineSnap = {
  canals: CanalState[];
  selected: string | null;
  playing: boolean;
  scene: SceneId | null;
  fused: FusedGhost | null;
  lastError: string | null;
  playhead: number;
  playMode: PlayMode;
};

type Listener = () => void;

const MAX_CANALS = 4;
const FILAMENT_CAP = 90;
const FUSED_ID = "__fused__";

export type FilamentPoint = {
  id: string;
  ink: CanalInk;
  x: number;
  y: number;
  voiced: boolean;
};

function emptySnap(): EngineSnap {
  return {
    canals: [],
    selected: null,
    playing: false,
    scene: null,
    fused: null,
    lastError: null,
    playhead: 0,
    playMode: "canals",
  };
}

function specToPcm(spec: CanalSpec): Float32Array {
  if (spec.noise === "kettle") return kettlePcm(6.4);
  if (spec.noise === "hvac") return hvacPcm(6.4);
  const line = spec.line ?? "";
  const { pcm } = synthesize(line, { f0: spec.f0 ?? 148, rate: spec.rate ?? 1 });
  return pcm;
}

function canalFromPcm(
  spec: Pick<CanalState, "id" | "name" | "kind" | "line" | "ink">,
  pcm: Float32Array,
): CanalState {
  const frames = extractFrames(pcm);
  return {
    ...spec,
    pcm,
    frames,
    card: cardFromFrames(frames),
    tape: tapeFromFrames(frames),
    live: liveFromFrame(frames[0]),
    muted: false,
    solo: false,
    duration: pcm.length / SAMPLE_RATE,
  };
}

class DispersionEngine {
  snap: EngineSnap = emptySnap();
  filaments: Record<string, FilamentPoint[]> = {};
  private listeners = new Set<Listener>();
  private ctx: AudioContext | null = null;
  private nodes: {
    id: string;
    source: AudioBufferSourceNode;
    gain: GainNode;
  }[] = [];
  private mic: {
    stream: MediaStream;
    source: MediaStreamAudioSourceNode;
  } | null = null;
  private raf = 0;
  private startedAt = 0;
  private loopDur = 1;
  wantFused = false;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private async ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  select(id: string | null) {
    this.snap = { ...this.snap, selected: id };
    this.emit();
  }

  setMuted(id: string, muted: boolean) {
    this.snap = {
      ...this.snap,
      canals: this.snap.canals.map((c) => (c.id === id ? { ...c, muted } : c)),
    };
    this.applyGains();
    this.emit();
  }

  setSolo(id: string, solo: boolean) {
    this.snap = {
      ...this.snap,
      canals: this.snap.canals.map((c) => (c.id === id ? { ...c, solo } : c)),
    };
    this.applyGains();
    this.emit();
  }

  private audible(c: CanalState) {
    const anySolo = this.snap.canals.some((x) => x.solo);
    if (anySolo) return c.solo && !c.muted;
    return !c.muted;
  }

  private applyGains() {
    for (const n of this.nodes) {
      if (n.id === FUSED_ID) {
        n.gain.gain.value = this.snap.playing && this.snap.playMode === "fused" ? 1 : 0;
        continue;
      }
      const canal = this.snap.canals.find((c) => c.id === n.id);
      n.gain.gain.value = canal && this.audible(canal) && this.snap.playing ? 1 : 0;
    }
  }

  async openScene(id: SceneId, opts?: { play?: boolean }) {
    this.lastStop();
    this.snap.lastError = null;
    const scene = sceneById(id);
    const canals = scene.canals.map((spec) =>
      canalFromPcm(
        {
          id: spec.id,
          name: spec.name,
          kind: spec.kind,
          line: spec.line,
          ink: spec.ink,
        },
        specToPcm(spec),
      ),
    );
    this.filaments = {};
    for (const c of canals) this.filaments[c.id] = [];
    this.snap = {
      canals,
      selected: canals[0]?.id ?? null,
      playing: false,
      scene: id,
      fused: null,
      lastError: null,
      playhead: 0,
      playMode: "canals",
    };
    this.emit();
    if (opts?.play === false) return;
    await this.play();
  }

  async addMic() {
    if (this.snap.canals.length >= MAX_CANALS) {
      this.snap = { ...this.snap, lastError: "Four canals. That's the cap. Fusion is not the overflow." };
      this.emit();
      return;
    }
    try {
      const ctx = await this.ensureCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const source = ctx.createMediaStreamSource(stream);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      source.connect(silent);
      silent.connect(ctx.destination);
      this.mic = { stream, source };
      const id = `mic-${Date.now().toString(36)}`;
      const canal = canalFromPcm(
        { id, name: "Mic", kind: "mic", line: null, ink: "linen" },
        new Float32Array(SAMPLE_RATE),
      );
      this.filaments[id] = [];
      this.snap = {
        ...this.snap,
        canals: [...this.snap.canals, canal],
        selected: id,
        lastError: null,
      };
      this.emit();
    } catch (err) {
      this.snap = {
        ...this.snap,
        lastError: err instanceof Error ? err.message : "Microphone is not available.",
      };
      this.emit();
    }
  }

  async addFile(file: File) {
    if (this.snap.canals.length >= MAX_CANALS) {
      this.snap = { ...this.snap, lastError: "Four canals. That's the cap. Fusion is not the overflow." };
      this.emit();
      return;
    }
    try {
      const ctx = await this.ensureCtx();
      const buf = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf.slice(0));
      const ch = decoded.getChannelData(0);
      const pcm = resampleLinear(new Float32Array(ch), decoded.sampleRate, SAMPLE_RATE).slice(
        0,
        SAMPLE_RATE * 8,
      );
      const id = `file-${Date.now().toString(36)}`;
      const canal = canalFromPcm(
        {
          id,
          name: file.name.replace(/\.[^.]+$/, "") || "File",
          kind: "file",
          line: null,
          ink: this.snap.canals.length === 0 ? "linen" : this.snap.canals.length === 1 ? "signal" : "warn",
        },
        pcm,
      );
      this.filaments[id] = [];
      const canals = [...this.snap.canals, canal];
      this.snap = { ...this.snap, canals, selected: id, lastError: null };
      this.emit();
      if (this.snap.playing) {
        await this.play();
      }
    } catch (err) {
      this.snap = {
        ...this.snap,
        lastError: err instanceof Error ? err.message : "That file did not decode.",
      };
      this.emit();
    }
  }

  removeCanal(id: string) {
    const canals = this.snap.canals.filter((c) => c.id !== id);
    delete this.filaments[id];
    this.snap = {
      ...this.snap,
      canals,
      selected: this.snap.selected === id ? (canals[0]?.id ?? null) : this.snap.selected,
    };
    this.emit();
    if (this.snap.playing) void this.play();
  }

  async play() {
    this.stopNodes();
    const ctx = await this.ensureCtx();
    this.loopDur = Math.max(1, ...this.snap.canals.map((c) => c.duration || 1));
    this.startedAt = ctx.currentTime;
    this.nodes = [];
    for (const canal of this.snap.canals) {
      if (canal.kind === "mic" || canal.pcm.length < 32) continue;
      const audioBuf = ctx.createBuffer(1, canal.pcm.length, SAMPLE_RATE);
      audioBuf.copyToChannel(new Float32Array(canal.pcm), 0);
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.nodes.push({ id: canal.id, source, gain });
    }
    this.snap = { ...this.snap, playing: true, playMode: "canals" };
    this.applyGains();
    this.tick();
    this.emit();
  }

  async playFused() {
    const ghost = this.computeFused();
    if (!ghost || ghost.pcm.length < 32) {
      this.snap = {
        ...this.snap,
        lastError: "Need two canals to mix. Fusion is the danger, not the overflow.",
      };
      this.emit();
      return;
    }
    this.stopNodes();
    const ctx = await this.ensureCtx();
    this.loopDur = Math.max(1, ghost.pcm.length / SAMPLE_RATE);
    this.startedAt = ctx.currentTime;
    const audioBuf = ctx.createBuffer(1, ghost.pcm.length, SAMPLE_RATE);
    audioBuf.copyToChannel(new Float32Array(ghost.pcm), 0);
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    this.nodes = [{ id: FUSED_ID, source, gain }];
    this.wantFused = true;
    this.snap = { ...this.snap, playing: true, playMode: "fused", fused: ghost, lastError: null };
    this.applyGains();
    this.tick();
    this.emit();
  }

  stop() {
    this.snap = { ...this.snap, playing: false, playhead: 0 };
    this.applyGains();
    cancelAnimationFrame(this.raf);
    this.emit();
  }

  lastStop() {
    this.stop();
    this.stopNodes();
    this.mic?.stream.getTracks().forEach((t) => t.stop());
    this.mic = null;
  }

  private stopNodes() {
    cancelAnimationFrame(this.raf);
    for (const n of this.nodes) {
      try {
        n.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        n.source.disconnect();
        n.gain.disconnect();
      } catch {
        /* noop */
      }
    }
    this.nodes = [];
  }

  computeFused(): FusedGhost | null {
    const pcms = this.snap.canals.filter((c) => c.pcm.length > 32).map((c) => c.pcm);
    if (pcms.length < 2) return null;
    const pcm = fusePcm(pcms);
    const frames = extractFrames(pcm);
    const ctx = this.ctx;
    const t = ctx && this.snap.playing ? (ctx.currentTime - this.startedAt) % this.loopDur : 0;
    const off = Math.min(Math.max(0, Math.floor(t * SAMPLE_RATE)), Math.max(0, pcm.length - 400));
    const live = liveFromFrame(extractFrame(pcm, off));
    return { card: cardFromFrames(frames), live, pcm };
  }

  private tick = () => {
    if (!this.snap.playing) return;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = (ctx.currentTime - this.startedAt) % this.loopDur;
    const canals = this.snap.canals.map((canal) => {
      if (canal.pcm.length < 400) return canal;
      const off = Math.min(
        Math.max(0, Math.floor((t % Math.max(0.01, canal.duration)) * SAMPLE_RATE)),
        canal.pcm.length - 400,
      );
      const live = liveFromFrame(extractFrame(canal.pcm, off));
      const trail = this.filaments[canal.id] ?? [];
      const x = Math.min(1, Math.max(0, live.centroid / 3600));
      const y = live.f0 == null ? 0.08 : Math.min(1, Math.max(0, (live.f0 - 70) / 230));
      trail.push({ id: canal.id, ink: canal.ink, x, y, voiced: live.voiced });
      if (trail.length > FILAMENT_CAP) trail.splice(0, trail.length - FILAMENT_CAP);
      this.filaments[canal.id] = trail;
      return { ...canal, live };
    });
    this.snap = { ...this.snap, canals, playhead: t / this.loopDur };
    if (this.wantFused && canals.length > 1) {
      this.snap.fused = this.computeFused();
    } else {
      this.snap.fused = null;
    }
    this.raf = requestAnimationFrame(this.tick);
    this.emit();
  };
}

export const engine = new DispersionEngine();
