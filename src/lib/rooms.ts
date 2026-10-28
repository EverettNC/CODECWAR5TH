import { engine as codecEngine } from "./audio/codec-engine.ts";
import { engine as dispersionEngine } from "./audio/engine.ts";
import { useStudio, type Room } from "./store.ts";

/** Number keys to rooms, in the order the studio shows them. */
export const ROOM_KEYS: Readonly<Record<string, Room>> = {
  "1": "filament",
  "2": "codec",
  "3": "booth",
  "4": "frames",
  "5": "dispersion",
  "6": "war",
};

/**
 * The one way to change rooms, for the nav buttons and the number keys alike.
 * Leaving the Filament and Booth closes the Filament's microphone and stops
 * playback, and says so in the store; leaving Dispersion and War closes the
 * Dispersion engine, its playback and its Mic canal.
 */
export function switchRoom(next: Room) {
  if (next !== "filament" && next !== "booth") {
    void codecEngine.stopMic();
    codecEngine.stopPlayback();
    useStudio.getState().setListening(false);
  }
  if (next !== "dispersion" && next !== "war") dispersionEngine.lastStop();
  useStudio.getState().setRoom(next);
}

/** Keyboard handler for the studio. Returns true when it switched rooms. */
export function onRoomKey(e: { key: string; target: EventTarget | null }): boolean {
  const t = e.target as { tagName?: string; isContentEditable?: boolean } | null;
  if (
    t &&
    (t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable)
  ) {
    return false;
  }
  const next = ROOM_KEYS[e.key];
  if (!next) return false;
  switchRoom(next);
  return true;
}
