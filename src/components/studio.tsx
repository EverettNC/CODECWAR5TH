import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { BoothRoom } from "@/components/booth-room";
import { DispersionRoom } from "@/components/dispersion-room";
import { EncoderRoom } from "@/components/encoder-room";
import { FilamentRoom } from "@/components/filament-room";
import { WarRoom } from "@/components/war-room";
import { engine as codecEngine } from "@/lib/audio/codec-engine";
import { engine as dispersionEngine } from "@/lib/audio/engine";
import { hydrateStudio, persistStudio, useStudio, type Room } from "@/lib/store";
import { cn } from "@/lib/utils";

const ROOMS: { id: Room; label: string }[] = [
  { id: "filament", label: "Filament" },
  { id: "codec", label: "Codec" },
  { id: "booth", label: "Booth" },
  { id: "dispersion", label: "Dispersion" },
  { id: "war", label: "War" },
];

export function Studio() {
  const room = useStudio((s) => s.room);
  const setRoom = useStudio((s) => s.setRoom);
  const listening = useStudio((s) => s.listening);

  useEffect(() => {
    hydrateStudio();
    return useStudio.subscribe((s) => persistStudio(s));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "1") setRoom("filament");
      if (e.key === "2") setRoom("codec");
      if (e.key === "3") setRoom("booth");
      if (e.key === "4") setRoom("dispersion");
      if (e.key === "5") setRoom("war");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setRoom]);

  const go = (next: Room) => {
    if (next !== "filament" && next !== "booth") {
      void codecEngine.stopMic();
      codecEngine.stopPlayback();
      useStudio.getState().setListening(false);
    }
    if (next !== "dispersion" && next !== "war") dispersionEngine.lastStop();
    setRoom(next);
  };

  const current = ROOMS.find((r) => r.id === room);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-fg">
      <header className="border-b border-border px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-subtle">workbench</p>
            <h1 className="text-base font-semibold text-fg">Codec War</h1>
          </div>
          <nav className="hidden items-center lg:flex" aria-label="Stations">
            {ROOMS.map((r, i) => (
              <div key={r.id} className="flex items-center">
                {r.id === "war" ? (
                  <span className="mx-2 h-5 w-px bg-border" aria-hidden />
                ) : i > 0 ? (
                  <ArrowRight className="mx-1 size-4 text-subtle" aria-hidden strokeWidth={1.5} />
                ) : null}
                <button
                  type="button"
                  onClick={() => go(r.id)}
                  aria-current={room === r.id ? "page" : undefined}
                  className={cn(
                    "h-11 rounded-sm px-3 text-sm transition-colors duration-[var(--motion-quick)]",
                    room === r.id ? "bg-linen text-bg" : "text-muted hover:bg-elevated hover:text-fg",
                  )}
                >
                  {r.label}
                </button>
              </div>
            ))}
          </nav>
          <p className="hidden font-mono text-xs text-subtle sm:block">
            {listening ? (
              <span className="text-signal">filament open</span>
            ) : (
              current?.label ?? "Codec War"
            )}
          </p>
        </div>
        <nav className="mx-auto mt-2 hidden max-w-6xl min-w-0 items-center overflow-x-auto sm:flex lg:hidden" aria-label="Stations">
          {ROOMS.map((r, i) => (
            <div key={r.id} className="flex items-center">
              {r.id === "war" ? (
                <span className="mx-1.5 h-4 w-px bg-border" aria-hidden />
              ) : i > 0 ? (
                <ArrowRight className="mx-0.5 size-3.5 text-subtle" aria-hidden strokeWidth={1.5} />
              ) : null}
              <button
                type="button"
                onClick={() => go(r.id)}
                aria-current={room === r.id ? "page" : undefined}
                className={cn(
                  "h-11 rounded-sm px-2.5 text-sm transition-colors duration-[var(--motion-quick)]",
                  room === r.id ? "bg-linen text-bg" : "text-muted hover:bg-elevated hover:text-fg",
                )}
              >
                {r.label}
              </button>
            </div>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-8">
        {room !== "dispersion" && room !== "war" ? (
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
            Filament in. Codec in the middle. Booth out. That is one canal.
            Dispersion is the room that keeps many. War is the proof.
          </p>
        ) : null}
        {room === "filament" ? <FilamentRoom /> : null}
        {room === "codec" ? <EncoderRoom /> : null}
        {room === "booth" ? <BoothRoom /> : null}
        {room === "dispersion" ? <DispersionRoom /> : null}
        {room === "war" ? <WarRoom /> : null}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-1.5 pt-1.5 pb-[max(2.75rem,calc(0.5rem+env(safe-area-inset-bottom)))] sm:hidden"
        aria-label="Stations"
      >
        <div className="grid grid-cols-5 gap-0.5">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => go(r.id)}
              aria-current={room === r.id ? "page" : undefined}
              className={cn(
                "flex h-12 min-w-0 items-center justify-center rounded-sm px-0.5 text-xs font-medium",
                room === r.id ? "bg-linen text-bg" : "text-muted",
              )}
            >
              <span className="w-full truncate text-center leading-tight">{r.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
