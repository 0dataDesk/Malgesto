"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";

// Botón/interruptor (Seteos, brief "Seteos — catálogo") — a diferencia de la
// perilla, es discreto: min..max (enteros) se dibujan como posiciones de un
// interruptor. Con solo 2 posiciones (ej. 0/1) se ve como un toggle on/off;
// con más, como un selector de varias posiciones.
export function Boton({ control, valor, onChange }: { control: ControlDiseno; valor: number; onChange: (v: number) => void }) {
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const pasos = Math.max(2, Math.round(max - min) + 1);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid oklch(0.4 0.03 55)" }}>
        {Array.from({ length: pasos }, (_, i) => min + i).map((posicion) => {
          const activo = Math.round(valor) === posicion;
          return (
            <button
              key={posicion}
              type="button"
              onClick={() => onChange(posicion)}
              className="flex h-9 w-7 items-center justify-center text-[10px] font-bold"
              style={{
                background: activo ? "oklch(0.64 0.15 34)" : "oklch(0.3 0.025 55)",
                color: activo ? "oklch(0.99 0.01 82)" : "oklch(0.65 0.03 60)",
              }}
              aria-label={`${control.nombre}: posición ${posicion}`}
            >
              {pasos <= 2 ? (activo ? "●" : "○") : posicion}
            </button>
          );
        })}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
        {control.nombre}
      </div>
    </div>
  );
}
