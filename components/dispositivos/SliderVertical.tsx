"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";

// Perilla estilo "deslizante" (Seteos, brief "PanelDispositivo — usar estilo
// para elegir Knob vs. SliderVertical") — <input type="range"> nativo
// rotado con CSS en vez de orient="vertical" (no estándar, sin soporte
// cross-browser confiable). Mismas props que Knob para poder elegir entre
// ambos sin bifurcar el resto de PanelDispositivo.
//
// Tamaño (brief "Hartke HA3500 — reagrupar cajas..." §6): 30% más largo que
// el original (56px de alto / 54px de input) para que sea más fácil de
// manipular con el dedo — hoy este componente solo se usa para el
// ecualizador gráfico, así que el tamaño default se ajusta acá directo.
const ALTO_CONTENEDOR = Math.round(56 * 1.3);
const LARGO_INPUT = Math.round(54 * 1.3);

// disabled (brief §5, bypass de grupo): el fader queda deshabilitado
// visualmente sin perder su valor guardado — el atributo nativo `disabled`
// del <input type="range"> ya impide arrastrarlo.
export function SliderVertical({
  control,
  valor,
  onChange,
  disabled = false,
}: {
  control: ControlDiseno;
  valor: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const min = control.min ?? 0;
  const max = control.max ?? 10;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ opacity: disabled ? 0.35 : 1 }}>
      <div className="flex w-9 items-center justify-center overflow-hidden" style={{ height: ALTO_CONTENEDOR }}>
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 accent-[oklch(0.64_0.15_34)] disabled:cursor-not-allowed"
          style={{ width: LARGO_INPUT, transform: "rotate(-90deg)" }}
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
