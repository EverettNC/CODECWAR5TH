import { extractFrames, resampleLinear, rms, SAMPLE_RATE, type Frame } from "./dsp.ts";
import { encode, type EncoderResult } from "./encoder.ts";
import { recognizeFrames, type AlignedWord } from "./recognize.ts";
import { filamentHealth, filamentLive } from "./filament.ts";
import { FilamentStream } from "./filament-stream.ts";
import { RAW_MIC } from "./mic-tape.ts";
import { DEMO_LINE, synthesize } from "./synth.ts";


export type EngineSnapshot = {
  pcm: Float32Array;
  frames: Frame[];
  result: EncoderResult | null;
  playhead: number;
  duration: number;
  energy: number;
  f0: number;
  vad: boolean;
  source: "idle" | "mic" | "demo" | "file" | "booth";
  transcript: string;
  aligned: AlignedWord[];
};

const MAX_SEC = 8;
const MAX_SAMPLES = SAMPLE_RATE * MAX_SEC;

function emptySnap(): EngineSnapshot {
  return {
    pcm: new Float32Array(0),
    frames: [],
    result: null,
    playhead: 0,
    duration: 0,
    energy: 0,
    f0: 0,
    vad: false,
    source: "idle",
    transcript: "",
    aligned: [],
  };
}

type Listener = () => void;

class AudioEngine {
  snap: EngineSnapshot = emptySnap();
  private listeners = new Set<Listener>();
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mute: GainNode | null = null;
  private sourceNode: AudioNode | null = null;
  private playing: AudioBufferSourceNode | null = null;
  private raf = 0;
  private rec: Float32Array = new Float32Array(MAX_SAMPLES);
  private recWrite = 0;
  private recoding = false;
  private lastRecAt = 0;
  listening = false;
  lastError: string | null = null;
  // Real Filament streaming state (127:4850). When useFilament is false we fall
  // back to the in-tab recognizer so the mic never depends on the door.
  private useFilament = false;
  private fil: FilamentStream | null = null;
  private filPump: Promise<void> | null = null;

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
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  private commit(pcm: Float32Array, extra: Partial<EngineSnapshot>) {
    const frames = extractFrames(pcm);
    const result = frames.length ? encode(frames) : null;
    let energy = rms(pcm);
    let f0 = 0;
    let voiced = 0;
    if (frames.length) {
      const tail = frames.slice(-20);
      energy = tail.reduce((s, f) => s + f.power, 0) / tail.length;
      const voicedFrames = tail.filter((f) => f.f0 > 0);
      f0 = voicedFrames.length
        ? voicedFrames.reduce((s, f) => s + f.f0, 0) / voicedFrames.length
        : 0;
      voiced = voicedFrames.length / tail.length;
    }
    let rec: { transcript: string; aligned: AlignedWord[]; phones: string[] };
    if (extra.transcript !== undefined) {
      rec = {
        transcript: extra.transcript,
        aligned: extra.aligned ?? [],
        phones: result?.phones ?? [],
      };
    } else {
      const isMic =
        extra.source === "mic" ||
        (extra.source === undefined && this.snap.source === "mic");
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (!isMic || now - this.lastRecAt > 280) {
        this.lastRecAt = now;
        rec = recognizeFrames(frames, result ?? undefined);
      } else {
        rec = {
          transcript: this.snap.transcript,
          aligned: this.snap.aligned,
          phones: result?.phones ?? this.snap.result?.phones ?? [],
        };
      }
    }
    this.snap = {
      ...this.snap,
      pcm,
      frames,
      result,
      duration: pcm.length / SAMPLE_RATE,
      energy,
      f0,
      vad: energy > 0.02 && voiced > 0.15,
      transcript: rec.transcript,
      aligned: rec.aligned,
      ...extra,
    };
    this.emit();
  }

  async runDemo(line = DEMO_LINE) {
    await this.stopMic();
    this.stopPlayback();
    const { pcm, phones } = synthesize(line, { f0: 142, rate: 1.02 });
    const aligned: { word: string; start: number; end: number }[] = [];
    for (const p of phones) {
      if (!p.word) continue;
      const last = aligned[aligned.length - 1];
      if (last && last.word === p.word) last.end = p.start + p.dur;
      else aligned.push({ word: p.word, start: p.start, end: p.start + p.dur });
    }
    this.commit(pcm, {
      source: "demo",
      transcript: line,
      aligned,
      playhead: 0,
    });
    await this.playPcm(pcm);
  }

  async speakBooth(text: string, voice: { f0: number; rate: number }) {
    this.stopPlayback();
    const { pcm, phones } = synthesize(text, voice);
    const aligned: { word: string; start: number; end: number }[] = [];
    for (const p of phones) {
      if (!p.word) continue;
      const last = aligned[aligned.length - 1];
      if (last && last.word === p.word) last.end = p.start + p.dur;
      else aligned.push({ word: p.word, start: p.start, end: p.start + p.dur });
    }
    this.commit(pcm, {
      source: "booth",
      transcript: text,
      aligned,
      playhead: 0,
    });
    await this.playPcm(pcm);
  }

  async loadFile(file: File) {
    await this.stopMic();
    this.stopPlayback();
    const ctx = await this.ensureCtx();
    const buf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    const ch = decoded.getChannelData(0);
    const pcm = resampleLinear(new Float32Array(ch), decoded.sampleRate, SAMPLE_RATE).slice(
      0,
      MAX_SAMPLES,
    );
    this.commit(pcm, {
      source: "file",
      playhead: 0,
    });
    await this.playPcm(pcm);
  }

  private async playPcm(pcm: Float32Array) {
    const ctx = await this.ensureCtx();
    this.stopPlayback();
    const audioBuf = ctx.createBuffer(1, pcm.length, SAMPLE_RATE);
    audioBuf.copyToChannel(new Float32Array(pcm), 0);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    const startAt = ctx.currentTime;
    src.onended = () => {
      if (this.playing === src) {
        this.snap = { ...this.snap, playhead: 1 };
        this.emit();
      }
    };
    src.start();
    this.playing = src;
    const tick = () => {
      if (this.playing !== src) return;
      const t = (ctx.currentTime - startAt) / audioBuf.duration;
      this.snap = { ...this.snap, playhead: Math.min(1, t) };
      this.emit();
      if (t < 1) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopPlayback() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    try {
      this.playing?.stop();
    } catch {
      /* already stopped */
    }
    this.playing = null;
  }

  async startMic() {
    this.lastError = null;
    try {
      await this.stopMic();
      this.stopPlayback();
      const ctx = await this.ensureCtx();
      this.useFilament = await filamentHealth();
      this.fil = this.useFilament ? new FilamentStream() : null;
      // Raw capture: the browser's echo cancellation, noise suppression and
      // gain would reshape the voice before it is measured.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_MIC });
      this.stream = stream;
      const src = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(2048, 1, 1);
      const mute = ctx.createGain();
      mute.gain.value = 0;
      this.rec = new Float32Array(MAX_SAMPLES);
      this.recWrite = 0;
      this.recoding = true;
      this.listening = true;
      proc.onaudioprocess = (ev) => {
        if (!this.recoding) return;
        const input = ev.inputBuffer.getChannelData(0);
        const rate = ev.inputBuffer.sampleRate;
        const srcSamples = new Float32Array(input);
        const chunk =
          rate === SAMPLE_RATE
            ? srcSamples
            : resampleLinear(srcSamples, rate, SAMPLE_RATE);
        const room = MAX_SAMPLES - this.recWrite;
        if (room <= 0) {
          this.rec.copyWithin(0, chunk.length);
          this.rec.set(chunk, MAX_SAMPLES - chunk.length);
        } else if (chunk.length >= room) {
          this.rec.set(chunk.subarray(0, room), this.recWrite);
          const rest = chunk.subarray(room);
          this.rec.copyWithin(0, rest.length);
          this.rec.set(rest, MAX_SAMPLES - rest.length);
          this.recWrite = MAX_SAMPLES;
        } else {
          this.rec.set(chunk, this.recWrite);
          this.recWrite += chunk.length;
        }
        if (this.fil) {
          this.fil.push(chunk);
          void this.pumpFilament();
        } else {
          const used = Math.min(this.recWrite, MAX_SAMPLES);
          const pcm = this.rec.subarray(Math.max(0, used - SAMPLE_RATE * 4), used);
          this.commit(new Float32Array(pcm), {
            source: "mic",
            playhead: 1,
          });
        }
      };
      src.connect(proc);
      proc.connect(mute);
      mute.connect(ctx.destination);
      this.sourceNode = src;
      this.processor = proc;
      this.mute = mute;
      this.snap = { ...this.snap, source: "mic" };
      this.emit();
    } catch (err) {
      this.listening = false;
      this.lastError =
        err instanceof Error ? err.message : "Microphone is not available.";
      this.emit();
    }
  }

  /**
   * Send what the Filament stream has ready, one request at a time, until it
   * has nothing more to send now. Returns the running pump if there is one.
   */
  private pumpFilament(): Promise<void> {
    if (this.filPump) return this.filPump;
    const fil = this.fil;
    if (!fil) return Promise.resolve();
    let req = fil.next();
    if (!req) return Promise.resolve();
    this.filPump = (async () => {
      try {
        while (req) {
          const reply = await filamentLive(req.samples, { reset: req.reset, end: req.end });
          fil.done(reply);
          if (reply?.ok) {
            this.snap = { ...this.snap, source: "mic", transcript: fil.text };
            this.emit();
          }
          req = fil.next();
        }
      } finally {
        this.filPump = null;
      }
    })();
    return this.filPump;
  }

  async stopMic() {
    // Stop taking audio first, then send everything held with the end flag,
    // after any request still in flight, so the last words are not dropped.
    this.recoding = false;
    this.listening = false;
    const fil = this.fil;
    if (fil) {
      fil.finish();
      try {
        await this.pumpFilament();
        // A pump that was mid-request when finish() came picks up the end
        // request itself; one more pass covers a pump that had just stopped.
        await this.pumpFilament();
      } catch {
        /* door closed; keep what we have */
      }
      if (this.fil === fil) this.fil = null;
    }
    try {
      this.processor?.disconnect();
      this.mute?.disconnect();
      this.sourceNode?.disconnect();
    } catch {
      /* noop */
    }
    this.processor = null;
    this.mute = null;
    this.sourceNode = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

export const engine = new AudioEngine();
