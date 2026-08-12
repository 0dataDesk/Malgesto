"use client";

import { useRef } from "react";
import type { ControlDiseno } from "@/lib/dispositivosData";
import type { TemaDispositivo } from "./PanelDispositivo";

// Perilla rotable (Seteos, brief "Seteos — catálogo") — drag vertical con
// pointer events (funciona igual en mobile que en desktop) más scroll-wheel
// como atajo en desktop. El indicador rota dentro de un arco de 270° como una
// perilla real (izquierda mín, derecha máx).
//
// coloresInvertidos (brief "Hartke HA3500 — reagrupar cajas..."): normal es
// cuerpo "superficie" (derivado de tema.fondo) con indicador tema.acento;
// invertido es cuerpo tema.texto (claro) con indicador tema.fondo (oscuro) —
// mismos 3 tokens de marca, sin agregar colores nuevos.
//
// disabled (brief §5, bypass de grupo): la perilla queda deshabilitada
// visualmente sin perder su valor guardado — ni el drag ni el scroll-wheel
// disparan onChange.
//
// El valor mostrado se redondea al entero más cercano (brief "Seteos — fix
// de navegación..." §2) — el valor interno (onChange) sigue siendo el que
// sea, esto es solo de presentación. Si el control tiene `unidad` (ej. "Hz"
// en el Mid Freq del Tone Mallet), se agrega como sufijo.
export function Knob({
  control,
  valor,
  onChange,
  disabled = false,
  tema,
}: {
  control: ControlDiseno;
  valor: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  tema: TemaDispositivo;
}) {
  const min = control.min ?? 0;
  const max = control.max ?? 10;
  const arrastrando = useRef<{ startY: number; startValor: number } | null>(null);
  const rango = max - min || 1;
  const fraccion = (valor - min) / rango;
  const angulo = -135 + fraccion * 270;

  const bgCuerpo = control.coloresInvertidos ? tema.texto : tema.superficie;
  const borderCuerpo = control.coloresInvertidos ? tema.fondo : tema.acento;
  const colorIndicador = control.coloresInvertidos ? tema.fondo : tema.acento;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrastrando.current = { startY: e.clientY, startValor: valor };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !arrastrando.current) return;
    const deltaY = arrastrando.current.startY - e.clientY;
    const deltaValor = (deltaY / 150) * rango;
    const nuevo = Math.min(max, Math.max(min, arrastrando.current.startValor + deltaValor));
    onChange(Math.round(nuevo * 10) / 10);
  };

  const onPointerUp = () => {
    arrastrando.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    const paso = rango / 100;
    const direccion = e.deltaY > 0 ? -1 : 1;
    const nuevo = Math.min(max, Math.max(min, valor + direccion * paso));
    onChange(Math.round(nuevo * 10) / 10);
  };

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ opacity: disabled ? 0.35 : 1 }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="flex h-14 w-14 items-center justify-center rounded-full select-none"
        style={{
          background: bgCuerpo,
          border: `1px solid ${borderCuerpo}`,
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
          cursor: disabled ? "not-allowed" : "ns-resize",
          touchAction: "none",
        }}
      >
        <div
          className="h-5 w-1 rounded-full"
          style={{ background: colorIndicador, transform: `rotate(${angulo}deg) translateY(-7px)`, transformOrigin: "center 14px" }}
        />
      </div>
      <div className="text-center">
        <div className="font-mono text-[11px] font-bold" style={{ color: tema.texto }}>
          {Math.round(valor)}
          {control.unidad ? ` ${control.unidad}` : ""}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: tema.textoSecundario }}>
          {control.nombre}
        </div>
      </div>
    </div>
  );
}
