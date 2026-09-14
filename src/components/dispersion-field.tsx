import { useEffect, useRef } from "react";
import { engine, type CanalInk } from "@/lib/audio/engine";

const INK: Record<CanalInk, string> = {
  linen: "--color-linen",
  signal: "--color-signal",
  warn: "--color-warn",
};

export function DispersionField({ showFused }: { showFused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 8 || h < 8) {
        raf = requestAnimationFrame(paint);
        return;
      }
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--color-elevated").trim() || "#1d1d19";
      const grid = styles.getPropertyValue("--color-border").trim() || "#2a2a26";
      const subtle = styles.getPropertyValue("--color-subtle").trim() || "#5c5a54";
      const danger = styles.getPropertyValue("--color-danger").trim() || "#c45c4a";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      for (let i = 1; i < 4; i++) {
        const x = (w * i) / 4;
        const y = (h * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = subtle;
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.fillText("centroid →", 10, h - 10);
      ctx.save();
      ctx.translate(12, h - 28);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("F0", 0, 0);
      ctx.restore();

      const pad = 18;
      const innerW = w - pad * 2;
      const innerH = h - pad * 2;

      if (showFused && engine.snap.fused) {
        const ghost = engine.snap.fused;
        if (ghost) {
          const x = pad + Math.min(1, ghost.live.centroid / 3600) * innerW;
          const y =
            pad +
            innerH -
            (ghost.live.f0 == null ? 0.08 : Math.min(1, Math.max(0, (ghost.live.f0 - 70) / 230))) *
              innerH;
          ctx.fillStyle = danger;
          ctx.globalAlpha = 0.12;
          ctx.beginPath();
          ctx.arc(x, y, 28, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = danger;
          ctx.font = "10px 'IBM Plex Mono', monospace";
          const label = "FUSED";
          const tw = ctx.measureText(label).width;
          const labelX = Math.min(w - tw - 8, Math.max(8, x + 8));
          const labelY = Math.max(14, Math.min(h - 6, y - 8));
          ctx.fillText(label, labelX, labelY);
        }
      }

      for (const canal of engine.snap.canals) {
        const trail = engine.filaments[canal.id] ?? [];
        const color = styles.getPropertyValue(INK[canal.ink]).trim();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = canal.muted ? 0.25 : 0.9;
        if (trail.length > 1) {
          ctx.beginPath();
          trail.forEach((p, i) => {
            const x = pad + p.x * innerW;
            const y = pad + innerH - p.y * innerH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        const last = trail[trail.length - 1];
        if (last) {
          const x = pad + last.x * innerW;
          const y = pad + innerH - last.y * innerH;
          ctx.beginPath();
          ctx.arc(x, y, last.voiced ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [showFused]);

  const empty = engine.snap.canals.length === 0;

  return (
    <div className="relative overflow-hidden rounded-md bg-elevated">
      <canvas
        ref={ref}
        className="block h-[280px] w-full sm:h-[380px]"
        aria-label="Dispersion field. Each canal is its own filament. They do not merge."
      />
      {empty ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">
          Nothing is picked yet. Open a room. Canals stay canals.
        </p>
      ) : null}
    </div>
  );
}
