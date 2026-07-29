"use client";

import type { Control } from "@/lib/dispositivosData";

// Fader vertical (pantalla 13, dispositivos tipo "eq_grafico") — <input
// type="range"> nativo rotado con CSS en vez de orient="vertical" (no
// estándar, sin soporte cross-browser confiable).
export function SliderVertical({ control, valor, onChange }: { control: Control; valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-36 w-9 items-center justify-center overflow-hidden">
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={0.1}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 accent-[oklch(0.64_0.15_34)]"
          style={{ width: 136, transform: "rotate(-90deg)" }}
        />
      </div>
      <div className="text-center">
        <div className="font-mono text-xs font-bold" style={{ color: "oklch(0.95 0.012 82)" }}>
          {valor}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
          {control.nombre}
        </div>
      </div>
    </div>
  );
}
