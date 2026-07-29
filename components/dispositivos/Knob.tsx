"use client";

import { useRef } from "react";
import type { Control } from "@/lib/dispositivosData";

// Perilla arrastrable (pantalla 13, dispositivos tipo "perillas") — drag
// vertical con pointer events (no solo mouse-wheel) para que funcione igual
// en mobile que en desktop, más soporte de scroll-wheel como atajo en
// desktop.
export function Knob({ control, valor, onChange }: { control: Control; valor: number; onChange: (v: number) => void }) {
  const arrastrando = useRef<{ startY: number; startValor: number } | null>(null);
  const rango = control.max - control.min || 1;
  const fraccion = (valor - control.min) / rango;
  const angulo = -135 + fraccion * 270;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastrando.current = { startY: e.clientY, startValor: valor };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando.current) return;
    const deltaY = arrastrando.current.startY - e.clientY;
    const deltaValor = (deltaY / 150) * rango;
    const nuevo = Math.min(control.max, Math.max(control.min, arrastrando.current.startValor + deltaValor));
    onChange(Math.round(nuevo * 10) / 10);
  };

  const onPointerUp = () => {
    arrastrando.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paso = rango / 100;
    const direccion = e.deltaY > 0 ? -1 : 1;
    const nuevo = Math.min(control.max, Math.max(control.min, valor + direccion * paso));
    onChange(Math.round(nuevo * 10) / 10);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="flex h-16 w-16 cursor-ns-resize touch-none items-center justify-center rounded-full select-none"
        style={{ background: "oklch(0.3 0.025 55)", border: "1px solid oklch(0.4 0.03 55)" }}
      >
        <div
          className="h-6 w-1 rounded-full"
          style={{ background: "oklch(0.64 0.15 34)", transform: `rotate(${angulo}deg) translateY(-8px)`, transformOrigin: "center 16px" }}
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
