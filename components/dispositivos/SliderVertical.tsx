"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";

// Perilla estilo "deslizante" (Seteos, brief "PanelDispositivo — usar estilo
// para elegir Knob vs. SliderVertical") — <input type="range"> nativo
// rotado con CSS en vez de orient="vertical" (no estándar, sin soporte
// cross-browser confiable). Mismas props que Knob para poder elegir entre
// ambos sin bifurcar el resto de PanelDispositivo.
export function SliderVertical({ control, valor, onChange }: { control: ControlDiseno; valor: number; onChange: (v: number) => void }) {
  const min = control.min ?? 0;
  const max = control.max ?? 10;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-14 w-9 items-center justify-center overflow-hidden">
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 accent-[oklch(0.64_0.15_34)]"
          style={{ width: 54, transform: "rotate(-90deg)" }}
        />
      </div>
      <div className="text-center">
        <div className="font-mono text-[11px] font-bold" style={{ color: "oklch(0.95 0.012 82)" }}>
          {valor}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
          {control.nombre}
        </div>
      </div>
    </div>
  );
}
