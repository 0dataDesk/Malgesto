"use client";

import { useState, useTransition } from "react";
import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO, formatoMoneda } from "@/lib/eventoUI";
import { enZonaApp } from "@/lib/zonaHoraria";
import { asignarGiraAction, asignarSetlistAction, eliminarEventoAction } from "@/app/inicio/actions";

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
  onCerrar,
  onEditar,
  onEliminado,
  onNuevoEnDia,
}: {
  evento: Evento;
  giras: Evento[];
  setlists: SetlistOpcion[];
  inline?: boolean;
  onCerrar: () => void;
  onEditar: (evento: Evento) => void;
  onEliminado: () => void;
  onNuevoEnDia?: () => void;
}) {
  const [pendienteGira, startGira] = useTransition();
  const [pendienteSetlist, startSetlist] = useTransition();
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

  const cambiarGira = (giraId: string) => {
    setError(null);
    startGira(async () => {
      try {
        await asignarGiraAction(evento.id, evento.bandaId, giraId || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo asignar la gira.");
      }
    });
  };

  const cambiarSetlist = (setlistId: string) => {
    setError(null);
    startSetlist(async () => {
      try {
        await asignarSetlistAction(evento.id, evento.bandaId, setlistId || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo asignar el Set List.");
      }
    });
  };

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
          {evento.tipo !== "cumpleanos" && (
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

      {evento.tipo === "show" && (
        <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Gira
          </div>
          <select
            className="mt-1.5 w-full rounded-lg border px-2.5 py-2 text-sm"
            style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            value={evento.giraId ?? ""}
            disabled={pendienteGira}
            onChange={(e) => cambiarGira(e.target.value)}
          >
            <option value="">Sin gira</option>
            {giras.map((g) => (
              <option key={g.id} value={g.id}>
                {g.titulo}
              </option>
            ))}
          </select>
        </div>
      )}

      {(evento.tipo === "show" || evento.tipo === "ensayo") && (
        <div className="mt-3 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Set List
          </div>
          {setlists.length === 0 ? (
            <div className="mt-1 text-[15px]" style={{ color: "oklch(0.5 0.02 55)" }}>
              Sin Set Lists todavía para esta banda
            </div>
          ) : (
            <select
              className="mt-1.5 w-full rounded-lg border px-2.5 py-2 text-sm"
              style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
              value={evento.setlistId ?? ""}
              disabled={pendienteSetlist}
              onChange={(e) => cambiarSetlist(e.target.value)}
            >
              <option value="">Sin Set List asignado</option>
              {setlists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
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

      {onNuevoEnDia && (
        <button
          type="button"
          onClick={onNuevoEnDia}
          className="mt-5 w-full rounded-xl py-2.5 text-center text-sm font-bold"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          + Nuevo evento este día
        </button>
      )}

      {evento.tipo !== "cumpleanos" && (
        <button
          type="button"
          onClick={eliminar}
          disabled={pendienteEliminar}
          className="mt-3 w-full text-center text-sm font-semibold disabled:opacity-50"
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
