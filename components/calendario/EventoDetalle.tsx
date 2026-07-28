"use client";

import { useState, useTransition } from "react";
import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";
import { asignarGiraAction, eliminarEventoAction } from "@/app/inicio/actions";

// Detalle de evento (pantalla 07). El peek de mapa de Design es decorativo
// (no hay integración de mapas ni datos de ubicación geográfica todavía) —
// se omite en vez de simularlo con datos falsos.
export function EventoDetalle({
  evento,
  giras,
  onCerrar,
  onEditar,
  onEliminado,
}: {
  evento: Evento;
  giras: Evento[];
  onCerrar: () => void;
  onEditar: (evento: Evento) => void;
  onEliminado: () => void;
}) {
  const [pendienteGira, startGira] = useTransition();
  const [pendienteEliminar, startEliminar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inicio = new Date(evento.fechaInicio);
  const fin = evento.fechaFin ? new Date(evento.fechaFin) : null;

  const fechaTexto = fin
    ? `${inicio.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${fin.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
    : inicio.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) +
      (evento.tipo !== "cumpleanos"
        ? ` · ${inicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}`
        : "");

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

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCerrar}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEditar(evento)}
              className="text-sm font-bold"
              style={{ color: "oklch(0.64 0.15 34)" }}
            >
              Editar
            </button>
            <button type="button" onClick={onCerrar} className="text-xl" style={{ color: "oklch(0.5 0.02 55)" }}>
              ×
            </button>
          </div>
        </div>

        <h2
          className="mt-3 text-2xl font-extrabold tracking-tight"
          style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
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
            <div className="mt-1 text-[15px]" style={{ color: "oklch(0.5 0.02 55)" }}>
              {evento.setlistId ?? "Sin Set List asignado"}
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

        {error && (
          <p className="mt-3 text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={eliminar}
          disabled={pendienteEliminar}
          className="mt-5 w-full text-center text-sm font-semibold disabled:opacity-50"
          style={{ color: "oklch(0.6 0.15 25)" }}
        >
          {pendienteEliminar ? "Eliminando…" : "Eliminar evento"}
        </button>
      </div>
    </div>
  );
}
