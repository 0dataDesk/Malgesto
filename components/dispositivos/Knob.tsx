"use client";

import { useRef } from "react";
import type { ControlDiseno } from "@/lib/dispositivosData";

// Perilla rotable (Seteos, brief "Seteos — catálogo") — drag vertical con
// pointer events (funciona igual en mobile que en desktop) más scroll-wheel
// como atajo en desktop. El indicador rota dentro de un arco de 270° como una
// perilla real (izquierda mín, derecha máx).
export function Knob({ control, valor, onChange }: { control: ControlDiseno; valor: number; onChange: (v: number) => void }) {
  const min = control.min ?? 0;
  const max = control.max ?? 10;
  const arrastrando = useRef<{ startY: number; startValor: number } | null>(null);
  const rango = max - min || 1;
  const fraccion = (valor - min) / rango;
  const angulo = -135 + fraccion * 270;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastrando.current = { startY: e.clientY, startValor: valor };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando.current) return;
    const deltaY = arrastrando.current.startY - e.clientY;
    const deltaValor = (deltaY / 150) * rango;
    const nuevo = Math.min(max, Math.max(min, arrastrando.current.startValor + deltaValor));
    onChange(Math.round(nuevo * 10) / 10);
  };

  const onPointerUp = () => {
    arrastrando.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paso = rango / 100;
    const direccion = e.deltaY > 0 ? -1 : 1;
    const nuevo = Math.min(max, Math.max(min, valor + direccion * paso));
    onChange(Math.round(nuevo * 10) / 10);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="flex h-14 w-14 cursor-ns-resize touch-none items-center justify-center rounded-full select-none"
        style={{ background: "oklch(0.3 0.025 55)", border: "1px solid oklch(0.4 0.03 55)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)" }}
      >
        <div
          className="h-5 w-1 rounded-full"
          style={{ background: "oklch(0.64 0.15 34)", transform: `rotate(${angulo}deg) translateY(-7px)`, transformOrigin: "center 14px" }}
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
