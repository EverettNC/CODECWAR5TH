export type CanalSpec = {
  id: string;
  name: string;
  kind: "voice" | "noise";
  line: string | null;
  f0: number | null;
  rate?: number;
  noise: "none" | "kettle" | "hvac";
  ink: "linen" | "signal" | "warn";
};

export type SceneId = "kitchen" | "two-booths" | "crisis";

export type Scene = {
  id: SceneId;
  label: string;
  role: string;
  blurb: string;
  canals: CanalSpec[];
};

export const SCENES: Scene[] = [
  {
    id: "kitchen",
    label: "Kitchen table",
    role: "room",
    blurb: "Two mouths and a kettle. The room is one. The canals are three.",
    canals: [
      {
        id: "a",
        name: "Voice A",
        kind: "voice",
        line: "The kettle is on.",
        f0: 118,
        rate: 0.96,
        noise: "none",
        ink: "linen",
      },
      {
        id: "b",
        name: "Voice B",
        kind: "voice",
        line: "I already heard you.",
        f0: 196,
        rate: 1.04,
        noise: "none",
        ink: "signal",
      },
      {
        id: "c",
        name: "Kettle",
        kind: "noise",
        line: null,
        f0: null,
        noise: "kettle",
        ink: "warn",
      },
    ],
  },
  {
    id: "two-booths",
    label: "Two booths",
    role: "house",
    blurb: "The house line, said twice, by two mouths. Codec does not get one string.",
    canals: [
      {
        id: "a",
        name: "Booth A",
        kind: "voice",
        line: "Filament in.",
        f0: 142,
        rate: 1.0,
        noise: "none",
        ink: "linen",
      },
      {
        id: "b",
        name: "Booth B",
        kind: "voice",
        line: "Booth out.",
        f0: 198,
        rate: 1.06,
        noise: "none",
        ink: "signal",
      },
    ],
  },
  {
    id: "crisis",
    label: "Crisis overlap",
    role: "law",
    blurb: "Output is a singleton. Input is not. Three canals. Fusion is the danger.",
    canals: [
      {
        id: "a",
        name: "Voice A",
        kind: "voice",
        line: "Stay with me.",
        f0: 110,
        rate: 0.92,
        noise: "none",
        ink: "linen",
      },
      {
        id: "b",
        name: "Voice B",
        kind: "voice",
        line: "Get out of the house.",
        f0: 190,
        rate: 1.08,
        noise: "none",
        ink: "signal",
      },
      {
        id: "c",
        name: "Voice C",
        kind: "voice",
        line: "I am here.",
        f0: 155,
        rate: 1.0,
        noise: "none",
        ink: "warn",
      },
    ],
  },
];

export function sceneById(id: SceneId): Scene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
}
