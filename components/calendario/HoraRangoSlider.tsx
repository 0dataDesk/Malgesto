"use client";

import { useRef } from "react";

const MINUTOS_EN_DIA = 24 * 60;
const PASO = 15;

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function aHHMM(minutos: number): string {
  const m = Math.max(0, Math.min(MINUTOS_EN_DIA - PASO, minutos));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function snap(minutos: number): number {
  return Math.round(minutos / PASO) * PASO;
}

// Barra de 24h con dos pines deslizables (Brief 8 §6) — pointer events con
// pointer capture en el track (no en cada pin, a diferencia de Knob.tsx: acá
// hay dos elementos arrastrables independientes, así que la captura vive en
// el contenedor común para que move/up sigan llegando ahí sin importar cuál
// pin se soltó encima).
export function HoraRangoSlider({
  inicio,
  fin,
  onChange,
}: {
  inicio: string;
  fin: string;
  onChange: (inicio: string, fin: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef<"inicio" | "fin" | null>(null);

  const inicioMin = aMinutos(inicio);
  const finMin = aMinutos(fin);

  const minutosDesdeCliente = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const fraccion = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(fraccion * MINUTOS_EN_DIA);
  };

  const mover = (clientX: number) => {
    if (!arrastrando.current) return;
    const minutos = minutosDesdeCliente(clientX);
    if (arrastrando.current === "inicio") {
      onChange(aHHMM(Math.min(minutos, finMin - PASO)), fin);
    } else {
      onChange(inicio, aHHMM(Math.max(minutos, inicioMin + PASO)));
    }
  };

  const onPointerDown = (pin: "inicio" | "fin") => (e: React.PointerEvent) => {
    trackRef.current?.setPointerCapture(e.pointerId);
    arrastrando.current = pin;
    mover(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => mover(e.clientX);
  const onPointerUp = () => {
    arrastrando.current = null;
  };

  const pctInicio = (inicioMin / MINUTOS_EN_DIA) * 100;
  const pctFin = (finMin / MINUTOS_EN_DIA) * 100;

  return (
    <div className="pt-1 pb-1">
      <div
        ref={trackRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-9 touch-none select-none"
      >
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full" style={{ background: "oklch(0.9 0.012 78)" }} />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ background: "oklch(0.64 0.15 34)", left: `${pctInicio}%`, width: `${Math.max(0, pctFin - pctInicio)}%` }}
        />
        {(["inicio", "fin"] as const).map((pin) => (
          <div
            key={pin}
            onPointerDown={onPointerDown(pin)}
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full"
            style={{
              left: `${pin === "inicio" ? pctInicio : pctFin}%`,
              background: "oklch(0.99 0.01 82)",
              border: "2px solid oklch(0.64 0.15 34)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
        <span>{inicio}</span>
        <span>{fin}</span>
      </div>
    </div>
  );
}
