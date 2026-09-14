import { create } from "zustand";
import { isEncodingId, type EncodingId } from "@/lib/encoder/stream";
import type { SceneId } from "@/lib/audio/scenes";

export type Room = "filament" | "codec" | "booth" | "dispersion" | "war";
export type CodecFace = "encoder" | "decoder";
export type View = "field" | "canals" | "refused";

export const DEMO_LINE = "Filament in. Codec. Booth out.";

type StudioState = {
  room: Room;
  setRoom: (room: Room) => void;
  face: CodecFace;
  setFace: (face: CodecFace) => void;
  encoderText: string;
  setEncoderText: (v: string) => void;
  hexIn: string;
  setHexIn: (v: string) => void;
  encoding: EncodingId;
  setEncoding: (v: EncodingId) => void;
  listening: boolean;
  setListening: (v: boolean) => void;
  filamentText: string;
  filamentPartial: string;
  setFilament: (full: string, partial: string) => void;
  boothText: string;
  setBoothText: (v: string) => void;
  boothF0: number;
  boothRate: number;
  setBoothVoice: (f0: number, rate: number) => void;
  useHostVoice: boolean;
  setUseHostVoice: (v: boolean) => void;
  view: View;
  setView: (view: View) => void;
  scene: SceneId;
  setScene: (scene: SceneId) => void;
  showFused: boolean;
  setShowFused: (v: boolean) => void;
  discerning: boolean;
  setDiscerning: (v: boolean) => void;
  discernment: string | null;
  discernError: string | null;
  setDiscernment: (text: string | null, error: string | null) => void;
};

const PERSIST_KEY = "codec.studio";

type Persisted = {
  encoding: EncodingId;
  face: CodecFace;
  boothF0: number;
  boothRate: number;
  useHostVoice: boolean;
  room: Room;
  view: View;
  scene: SceneId;
};

export const useStudio = create<StudioState>((set) => ({
  room: "war",
  setRoom: (room) => set({ room }),
  face: "encoder",
  setFace: (face) => set({ face }),
  encoderText: DEMO_LINE,
  setEncoderText: (encoderText) => set({ encoderText }),
  hexIn: "",
  setHexIn: (hexIn) => set({ hexIn }),
  encoding: "utf-8",
  setEncoding: (encoding) => set({ encoding }),
  listening: false,
  setListening: (listening) => set({ listening }),
  filamentText: "",
  filamentPartial: "",
  setFilament: (filamentText, filamentPartial) =>
    set({ filamentText, filamentPartial }),
  boothText: DEMO_LINE,
  setBoothText: (boothText) => set({ boothText }),
  boothF0: 148,
  boothRate: 1,
  setBoothVoice: (boothF0, boothRate) => set({ boothF0, boothRate }),
  useHostVoice: false,
  setUseHostVoice: (useHostVoice) => set({ useHostVoice }),
  view: "field",
  setView: (view) => set({ view }),
  scene: "kitchen",
  setScene: (scene) => set({ scene }),
  showFused: false,
  setShowFused: (showFused) => set({ showFused }),
  discerning: false,
  setDiscerning: (discerning) => set({ discerning }),
  discernment: null,
  discernError: null,
  setDiscernment: (discernment, discernError) => set({ discernment, discernError }),
}));

function isRoom(v: unknown): v is Room {
  return (
    v === "filament" || v === "codec" || v === "booth" || v === "dispersion" || v === "war"
  );
}

export function hydrateStudio() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const d = JSON.parse(raw) as Partial<Persisted>;
    useStudio.setState({
      encoding: isEncodingId(d.encoding) ? d.encoding : "utf-8",
      face: d.face === "decoder" ? "decoder" : "encoder",
      boothF0:
        typeof d.boothF0 === "number" && d.boothF0 >= 90 && d.boothF0 <= 240
          ? d.boothF0
          : 148,
      boothRate:
        typeof d.boothRate === "number" && d.boothRate >= 0.7 && d.boothRate <= 1.4
          ? d.boothRate
          : 1,
      useHostVoice: d.useHostVoice === true,
      room: isRoom(d.room) ? d.room : "war",
      view: d.view === "canals" || d.view === "refused" ? d.view : "field",
      scene: d.scene === "two-booths" || d.scene === "crisis" ? d.scene : "kitchen",
    });
  } catch {
    /* ignore bad local state */
  }
}

export function persistStudio(s: StudioState) {
  if (typeof window === "undefined") return;
  const payload: Persisted = {
    encoding: s.encoding,
    face: s.face,
    boothF0: s.boothF0,
    boothRate: s.boothRate,
    useHostVoice: s.useHostVoice,
    room: s.room,
    view: s.view,
    scene: s.scene,
  };
  localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
}
