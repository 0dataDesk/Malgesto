"use client";

import { useState, useTransition } from "react";
import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO, formatoMoneda } from "@/lib/eventoUI";
import { enZonaApp } from "@/lib/zonaHoraria";
import { eliminarEventoAction } from "@/app/inicio/actions";

type SetlistOpcion = { id: string; nombre: string };

// Detalle de evento (pantalla 07). `inline` (Brief 8 §5) lo renderiza sin el
// overlay fijo — usado cuando el día seleccionado en el Calendario tiene un
// solo evento y la lista de abajo "cambia directo al detalle" en vez de
// abrir un modal encima.
export function EventoDetalle({
  evento,
  giras,
  setlists,
  inline = false,
  puedeEditar,
  onCerrar,
  onEditar,
  onEliminado,
}: {
  evento: Evento;
  giras: Evento[];
  setlists: SetlistOpcion[];
  inline?: boolean;
  puedeEditar: boolean;
  onCerrar: () => void;
  onEditar: (evento: Evento) => void;
  onEliminado: () => void;
}) {
  const [pendienteEliminar, startEliminar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inicio = enZonaApp(evento.fechaInicio);
  const fin = evento.fechaFin ? enZonaApp(evento.fechaFin) : null;

  const fechaTexto =
    evento.tipo === "gira" && fin
      ? `${inicio.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
      : inicio.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) +
        (evento.tipo !== "cumpleanos"
          ? ` · ${inicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}${
              fin ? `–${fin.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""
            }`
          : "");

  const linkMaps = evento.lugarLinkMaps;
  const nombreUbicacion = evento.lugarNombre;

  // Brief 18 §1: acá es solo lectura — asignar/cambiar gira o Set List se
  // hace desde el modo de edición del evento (NuevoEventoForm).
  const giraAsignada = evento.giraId ? giras.find((g) => g.id === evento.giraId) : null;
  const setlistAsignado = evento.setlistId ? setlists.find((s) => s.id === evento.setlistId) : null;

  const eliminar = () => {
    if (!confirm(`¿Eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startEliminar(async () => {
      try {
        await eliminarEventoAction(evento.id, evento.bandaId);
        onEliminado();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el evento.");
      }
    });
  };

  const contenido = (
    <div
      className={inline ? "rounded-3xl p-5" : "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"}
      style={{ background: inline ? "oklch(0.99 0.008 82)" : "oklch(0.99 0.008 82)", border: inline ? "1px solid oklch(0.89 0.013 78)" : undefined }}
      onClick={inline ? undefined : (e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
          style={{ background: COLOR_TIPO[evento.tipo], color: "oklch(0.99 0.01 82)" }}
        >
          {ETIQUETA_TIPO[evento.tipo]}
        </span>
        <div className="flex items-center gap-3">
          {evento.tipo !== "cumpleanos" && puedeEditar && (
            <button type="button" onClick={() => onEditar(evento)} className="text-sm font-bold" style={{ color: "oklch(0.64 0.15 34)" }}>
              Editar
            </button>
          )}
          <button type="button" onClick={onCerrar} className="text-xl" style={{ color: "oklch(0.5 0.02 55)" }} aria-label="Cerrar">
            ×
          </button>
        </div>
      </div>

      <h2 className="mt-3 text-2xl font-extrabold tracking-tight" style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}>
        {evento.titulo}
      </h2>
      <div className="mt-1 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
        {fechaTexto} · {evento.bandaNombre}
      </div>

      {nombreUbicacion && (
        <div className="mt-4 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Ubicación
          </div>
          <div className="mt-1 text-[15px]" style={{ color: "oklch(0.24 0.02 55)" }}>
            {nombreUbicacion}
          </div>
          {linkMaps && (
            <a
              href={linkMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold no-underline"
              style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
            >
              Abrir en Maps ↗
            </a>
          )}
        </div>
      )}

      {giraAsignada && (
        <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Gira
          </div>
          <div className="mt-1 text-[15px]" style={{ color: "oklch(0.24 0.02 55)" }}>
            {giraAsignada.titulo}
          </div>
        </div>
      )}

      {setlistAsignado && (
        <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Set List
          </div>
          <div className="mt-1 text-[15px]" style={{ color: "oklch(0.24 0.02 55)" }}>
            {setlistAsignado.nombre}
          </div>
        </div>
      )}

      {evento.ingresoEsperado !== null && (
        <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.24 0.02 55)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.74 0.12 78)" }}>
            Ingreso esperado
          </div>
          <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "oklch(0.96 0.012 82)" }}>
            {formatoMoneda(evento.ingresoEsperado)}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}

      {evento.tipo !== "cumpleanos" && puedeEditar && (
        <button
          type="button"
          onClick={eliminar}
          disabled={pendienteEliminar}
          className="mt-5 w-full text-center text-sm font-semibold disabled:opacity-50"
          style={{ color: "oklch(0.6 0.15 25)" }}
        >
          {pendienteEliminar ? "Eliminando…" : "Eliminar evento"}
        </button>
      )}
    </div>
  );

  if (inline) return contenido;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCerrar}>
      {contenido}
    </div>
  );
}
