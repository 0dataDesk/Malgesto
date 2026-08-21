"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO, COLOR_TENTATIVO, formatoMoneda, colorConAlpha, eventoYaPaso } from "@/lib/eventoUI";
import { enZonaApp } from "@/lib/zonaHoraria";
import { eliminarEventoAction, asignarEstadoAction, crearSetlistDesdeEventoAction } from "@/app/inicio/actions";

type SetlistOpcion = { id: string; nombre: string };

function IconoPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-7.05-7-12a7 7 0 0 1 14 0c0 4.95-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconoLista() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function IconoLogistica() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

// Brief "EventoDetalle — ubicación y Set List como botones" §2: fila
// compacta y clickeable en un solo patrón para Ubicación/Set List, en vez de
// la tarjeta label-arriba-texto-abajo (+ un botón "Abrir en Maps" aparte)
// que ocupaba mucho más alto. Sin `href`, la fila sigue mostrando lo que
// haya pero no es clickeable (ej. lugar sin link de Maps todavía cargado).
function FilaAccion({ href, externo, children }: { href?: string | null; externo?: boolean; children: React.ReactNode }) {
  const className = "mt-2.5 flex items-center gap-2.5 rounded-2xl px-3 py-2.5 no-underline";
  const style = { background: "oklch(0.93 0.016 78)", color: "oklch(0.55 0.02 55)" };

  if (!href) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

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
  onEstadoActualizado,
  onSetlistCreado,
}: {
  evento: Evento;
  giras: Evento[];
  setlists: SetlistOpcion[];
  inline?: boolean;
  puedeEditar: boolean;
  onCerrar: () => void;
  onEditar: (evento: Evento) => void;
  onEliminado: () => void;
  onEstadoActualizado: () => void;
  onSetlistCreado: () => void;
}) {
  const [pendienteEliminar, startEliminar] = useTransition();
  const [pendienteEstado, startEstado] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Brief "Crear Set List desde un evento": atajo de creación + asignación en
  // un solo paso, sin pasar por "Editar" — nombre sugerido a partir del
  // evento (su título ya cubre "nombre del evento o fecha": en Ensayo es el
  // auto-generado "Ensayo {banda} — {fecha}"), pero editable.
  const [creandoSetlist, setCreandoSetlist] = useState(false);
  const [nombreSetlist, setNombreSetlist] = useState(evento.titulo);
  const [pendienteSetlist, startSetlist] = useTransition();

  const crearSetlist = () => {
    setError(null);
    startSetlist(async () => {
      try {
        await crearSetlistDesdeEventoAction(evento.id, evento.bandaId, nombreSetlist);
        setCreandoSetlist(false);
        onSetlistCreado();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el Set List.");
      }
    });
  };

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

  // Brief de refinamiento §1: mismo criterio que ya usa CalendarioShell para
  // sacar eventos de "Próximos eventos" (lib/eventoUI.eventoYaPaso).
  const yaPaso = eventoYaPaso(evento);

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

  // Brief "Estado Tentativo...": solo show/gira tienen este concepto —
  // confirmar una fecha tentativa (o volverla a tentativa) directo desde acá,
  // sin pasar por el form completo de edición.
  const puedeSerTentativo = evento.tipo === "show" || evento.tipo === "gira";
  const toggleEstado = () => {
    setError(null);
    const nuevoEstado = evento.estado === "tentativo" ? "confirmado" : "tentativo";
    startEstado(async () => {
      try {
        await asignarEstadoAction(evento.id, evento.bandaId, nuevoEstado);
        onEstadoActualizado();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
      }
    });
  };

  // Brief "...ciudad en shows": una sola tarjeta de ubicación en vez de dos
  // -- se muestra si hay lugar y/o ciudad, no solo si hay lugar.
  const hayUbicacion = !!nombreUbicacion || !!evento.ciudad;

  const contenido = (
    <div
      className={inline ? "rounded-3xl p-4" : "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-4 sm:rounded-3xl"}
      style={{ background: "oklch(0.99 0.008 82)", border: inline ? "1px solid oklch(0.89 0.013 78)" : undefined }}
      onClick={inline ? undefined : (e) => e.stopPropagation()}
    >
      {/* Brief "...calendario más compacto...": el badge de tipo comparte
          fila con Editar/×, sin fila propia arriba -- así como el resto del
          layout de acá abajo, con menos aire entre bloques. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
            style={{ background: COLOR_TIPO[evento.tipo], color: "oklch(0.99 0.01 82)" }}
          >
            {ETIQUETA_TIPO[evento.tipo]}
          </span>
          {puedeSerTentativo && evento.estado === "tentativo" && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
              style={{ background: colorConAlpha(COLOR_TENTATIVO, 0.18), color: "oklch(0.42 0.13 82)" }}
            >
              Tentativo
            </span>
          )}
          {yaPaso && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide uppercase"
              style={{ background: "oklch(0.9 0.013 78)", color: "oklch(0.5 0.02 55)" }}
            >
              Ya pasó
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
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

      <h2 className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}>
        {evento.titulo}
      </h2>
      <div className="mt-1 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
        {fechaTexto} · {evento.bandaNombre}
      </div>

      {hayUbicacion && (
        <FilaAccion href={linkMaps} externo>
          <IconoPin />
          <div className="min-w-0 flex-1">
            {nombreUbicacion && (
              <div className="truncate text-[15px] font-semibold" style={{ color: "oklch(0.24 0.02 55)" }}>
                {nombreUbicacion}
              </div>
            )}
            {evento.ciudad && (
              <div className="truncate text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                {evento.ciudad}
              </div>
            )}
          </div>
          {linkMaps && <span className="shrink-0 text-xs">↗</span>}
        </FilaAccion>
      )}

      {/* Brief "Logística: línea de tiempo del evento" §1: entrada a la
          pantalla nueva, mismo patrón FilaAccion que Ubicación/Set List --
          oculta para Cumpleaños porque ese evento es virtual (nunca es una
          fila real de `eventos`, ver lib/cumpleanosVirtual.ts) y no puede
          tener logística propia. */}
      {evento.tipo !== "cumpleanos" && (
        <FilaAccion href={`/logistica/${evento.id}`}>
          <IconoLogistica />
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Logística
          </div>
          <span className="shrink-0 text-xs">›</span>
        </FilaAccion>
      )}

      {giraAsignada && (
        <div className="mt-2.5 rounded-2xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Gira
          </div>
          <div className="mt-1 text-[15px]" style={{ color: "oklch(0.24 0.02 55)" }}>
            {giraAsignada.titulo}
          </div>
        </div>
      )}

      {setlistAsignado && (
        <FilaAccion href={`/set-list/${setlistAsignado.id}`}>
          <IconoLista />
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: "oklch(0.24 0.02 55)" }}>
            {setlistAsignado.nombre}
          </div>
          <span className="shrink-0 text-xs">›</span>
        </FilaAccion>
      )}

      {!setlistAsignado && puedeEditar && (evento.tipo === "show" || evento.tipo === "ensayo") && (
        <div className="mt-2.5">
          {creandoSetlist ? (
            <div className="rounded-2xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
              <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                Nuevo Set List
              </div>
              <input
                className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
                value={nombreSetlist}
                onChange={(e) => setNombreSetlist(e.target.value)}
                placeholder="Nombre del Set List"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={crearSetlist}
                  disabled={pendienteSetlist}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60"
                  style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
                >
                  {pendienteSetlist ? "Creando…" : "Crear y asignar"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreandoSetlist(false)}
                  className="rounded-lg px-3 py-2 text-sm font-bold"
                  style={{ background: "oklch(0.99 0.008 82)", color: "oklch(0.4 0.02 55)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNombreSetlist(evento.titulo);
                setCreandoSetlist(true);
              }}
              className="text-sm font-bold"
              style={{ color: "oklch(0.64 0.15 34)" }}
            >
              + Crear Set List
            </button>
          )}
        </div>
      )}

      {evento.ingresoEsperado !== null && (
        <div className="mt-2.5 rounded-2xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            Ingreso esperado
          </div>
          <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "oklch(0.64 0.15 34)" }}>
            {formatoMoneda(evento.ingresoEsperado)}
          </div>
        </div>
      )}

      {/* Brief "...ajustar botones de tentativo/confirmar...": "Confirmar
          fecha" sigue siendo una acción rápida acá; volver una fecha
          confirmada a tentativa ya no -- eso requiere entrar a Editar. */}
      {puedeSerTentativo && puedeEditar && evento.estado === "tentativo" && (
        <button
          type="button"
          onClick={toggleEstado}
          disabled={pendienteEstado}
          className="mt-2.5 w-full rounded-xl py-2 text-center text-sm font-bold disabled:opacity-60"
          style={{ background: colorConAlpha(COLOR_TENTATIVO, 0.16), color: "oklch(0.42 0.13 82)" }}
        >
          {pendienteEstado ? "Confirmando…" : "Confirmar fecha"}
        </button>
      )}

      {error && (
        <p className="mt-2 text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}

      {evento.tipo !== "cumpleanos" && puedeEditar && (
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
