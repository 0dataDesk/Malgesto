"use client";

import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";

// Detalle mínimo — solo los datos que ya existen en el modelo. El detalle
// completo (mapa, set list asignado, anticipos...) es del Brief 3.
export function EventoDetalle({ evento, onCerrar }: { evento: Evento; onCerrar: () => void }) {
  const inicio = new Date(evento.fechaInicio);
  const fin = evento.fechaFin ? new Date(evento.fechaFin) : null;

  const fechaTexto = fin
    ? `${inicio.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
    : inicio.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) +
      (evento.tipo !== "cumpleanos"
        ? ` · ${inicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}`
        : "");

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl"
        style={{ background: "oklch(0.99 0.008 82)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
            style={{ background: COLOR_TIPO[evento.tipo], color: "oklch(0.99 0.01 82)" }}
          >
            {ETIQUETA_TIPO[evento.tipo]}
          </span>
          <button type="button" onClick={onCerrar} className="text-xl" style={{ color: "oklch(0.5 0.02 55)" }}>
            ×
          </button>
        </div>

        <h2 className="mt-3 text-2xl font-extrabold tracking-tight" style={{ color: "oklch(0.24 0.02 55)" }}>
          {evento.titulo}
        </h2>
        <div className="mt-1 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
          {fechaTexto} · {evento.bandaNombre}
        </div>

        {evento.ubicacion && (
          <div className="mt-4 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
            <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Ubicación
            </div>
            <div className="mt-1 text-[15px]" style={{ color: "oklch(0.24 0.02 55)" }}>
              {evento.ubicacion}
            </div>
          </div>
        )}

        {evento.ingresoEsperado !== null && (
          <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.24 0.02 55)" }}>
            <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.74 0.12 78)" }}>
              Ingreso esperado
            </div>
            <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "oklch(0.96 0.012 82)" }}>
              ${evento.ingresoEsperado.toLocaleString("es-MX")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
