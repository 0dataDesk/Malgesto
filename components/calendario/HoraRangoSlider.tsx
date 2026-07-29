"use client";

import { useRef } from "react";

const MINUTOS_EN_DIA = 24 * 60;
const PASO = 15;
// Brief 9 §13: la vida de las bandas es más nocturna que matutina — el
// borde izquierdo del track ya no es medianoche, es las 10:00, y el track
// entero envuelve hasta volver a las 10:00 del día siguiente. Nada deja de
// ser alcanzable (los pines igual se pueden arrastrar a cualquier hora),
// pero el tramo "cómodo" (10:00→02:00, 16 de las 24h) ocupa la mayor parte
// visual de la barra; el resto (02:00→10:00) se pinta más apagado.
const INICIO_BARRA = 10 * 60;
const FIN_COMODO_POS = 16 * 60;

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function aHHMM(minutos: number): string {
  const m = ((minutos % MINUTOS_EN_DIA) + MINUTOS_EN_DIA) % MINUTOS_EN_DIA;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function snap(minutos: number): number {
  return Math.round(minutos / PASO) * PASO;
}

function aPosicionBarra(minutosReales: number): number {
  return (((minutosReales - INICIO_BARRA) % MINUTOS_EN_DIA) + MINUTOS_EN_DIA) % MINUTOS_EN_DIA;
}

function aMinutosReales(posicionBarra: number): number {
  return (posicionBarra + INICIO_BARRA) % MINUTOS_EN_DIA;
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

  const inicioPos = aPosicionBarra(aMinutos(inicio));
  const finPos = aPosicionBarra(aMinutos(fin));

  const posicionDesdeCliente = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const fraccion = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(fraccion * MINUTOS_EN_DIA);
  };

  const mover = (clientX: number) => {
    if (!arrastrando.current) return;
    const pos = posicionDesdeCliente(clientX);
    if (arrastrando.current === "inicio") {
      const nuevaPos = Math.max(0, Math.min(pos, finPos - PASO));
      onChange(aHHMM(aMinutosReales(nuevaPos)), fin);
    } else {
      const nuevaPos = Math.min(MINUTOS_EN_DIA - PASO, Math.max(pos, inicioPos + PASO));
      onChange(inicio, aHHMM(aMinutosReales(nuevaPos)));
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

  const pctInicio = (inicioPos / MINUTOS_EN_DIA) * 100;
  const pctFin = (finPos / MINUTOS_EN_DIA) * 100;
  const pctFinComodo = (FIN_COMODO_POS / MINUTOS_EN_DIA) * 100;

  return (
    <div className="pt-1 pb-1">
      <div
        ref={trackRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-9 touch-none select-none"
      >
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-l-full"
          style={{ background: "oklch(0.9 0.012 78)", left: 0, width: `${pctFinComodo}%` }}
        />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-r-full"
          style={{ background: "oklch(0.94 0.008 78)", left: `${pctFinComodo}%`, width: `${100 - pctFinComodo}%` }}
        />
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
