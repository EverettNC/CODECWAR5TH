import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { engine as codecEngine } from "./audio/codec-engine.ts";
import { engine as dispersionEngine } from "./audio/engine.ts";
import { onRoomKey } from "./rooms.ts";
import { useStudio } from "./store.ts";

/**
 * The real store and the real engines. No microphone is opened: the engines
 * are put in the listening and playing state they hold while one is open, and
 * the number key must take them out of it, as the nav buttons do.
 */

function key(k: string, target: EventTarget | null = null) {
  return onRoomKey({ key: k, target });
}

describe("number keys switch rooms the same way the nav does", () => {
  it("leaving the Filament by key stops listening", () => {
    useStudio.setState({ room: "filament", listening: true });
    codecEngine.listening = true;
    assert.equal(key("2"), true);
    assert.equal(useStudio.getState().room, "codec");
    assert.equal(useStudio.getState().listening, false);
    assert.equal(codecEngine.listening, false);
  });

  it("leaving Dispersion by key stops the Dispersion engine", () => {
    useStudio.setState({ room: "dispersion" });
    dispersionEngine.snap = { ...dispersionEngine.snap, playing: true };
    assert.equal(key("1"), true);
    assert.equal(useStudio.getState().room, "filament");
    assert.equal(dispersionEngine.snap.playing, false);
    assert.equal(dispersionEngine.micOpen, false);
  });

  it("every room has its key", () => {
    const seen: string[] = [];
    for (const k of ["1", "2", "3", "4", "5", "6"]) {
      key(k);
      seen.push(useStudio.getState().room);
    }
    assert.deepEqual(seen, ["filament", "codec", "booth", "frames", "dispersion", "war"]);
  });

  it("typing in a field does not switch rooms", () => {
    useStudio.setState({ room: "codec" });
    const input = { tagName: "TEXTAREA" } as unknown as EventTarget;
    assert.equal(key("3", input), false);
    assert.equal(useStudio.getState().room, "codec");
  });

  it("other keys do nothing", () => {
    useStudio.setState({ room: "codec" });
    assert.equal(key("7"), false);
    assert.equal(key("a"), false);
    assert.equal(useStudio.getState().room, "codec");
  });
});
