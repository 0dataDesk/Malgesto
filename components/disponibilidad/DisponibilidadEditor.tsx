"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Ausencia } from "@/lib/ausenciasData";
import { crearIncidenciaAction, eliminarIncidenciaAction } from "@/app/disponibilidad/actions";

const inputCls = "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

// "YYYY-MM-DD" -> "DD/MM/YYYY" sin pasar por Date/zona horaria (evita el
// típico corrimiento de un día al parsear una fecha sin hora como si fuera
// medianoche UTC y mostrarla en una zona detrás de UTC).
function formatoFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function DisponibilidadEditor({ incidenciasIniciales }: { incidenciasIniciales: Ausencia[] }) {
  const [incidencias, setIncidencias] = useState(incidenciasIniciales);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingEliminar, setPendingEliminar] = useState<string | null>(null);

  const agregar = () => {
    setError(null);
    if (!fechaInicio || !fechaFin) {
      setError("Completá las dos fechas.");
      return;
    }
    startTransition(async () => {
      try {
        const nueva = await crearIncidenciaAction(fechaInicio, fechaFin || fechaInicio);
        setIncidencias((prev) => [...prev, nueva].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)));
        setFechaInicio("");
        setFechaFin("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la fecha.");
      }
    });
  };

  const eliminar = (id: string) => {
    setPendingEliminar(id);
    eliminarIncidenciaAction(id)
      .then(() => setIncidencias((prev) => prev.filter((i) => i.id !== id)))
      .catch(() => setError("No se pudo eliminar."))
      .finally(() => setPendingEliminar(null));
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <Link href="/inicio" className="mb-2 inline-block text-sm no-underline" style={{ color: "oklch(0.6 0.02 55)" }}>
          ‹ Inicio
        </Link>
        <h2
          className="text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Mi disponibilidad
        </h2>
        <p className="mt-2 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Marcá los rangos de fecha en los que no estás disponible — se muestra en el calendario de todas tus bandas, sin necesidad de dar el motivo.
        </p>

        <div className="mt-6 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Agregar fecha
          </h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                Desde
              </label>
              <input type="date" className={inputCls} style={inputStyle} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                Hasta
              </label>
              <input type="date" className={inputCls} style={inputStyle} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            onClick={agregar}
            disabled={pending}
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Guardando…" : "Agregar"}
          </button>
          {error && (
            <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
              {error}
            </p>
          )}
        </div>

        <h3 className="mb-2 mt-6 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Mis fechas marcadas
        </h3>
        {incidencias.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no marcaste ninguna fecha.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {incidencias.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-xl p-3"
                style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
              >
                <span className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                  {i.fechaInicio === i.fechaFin ? formatoFecha(i.fechaInicio) : `${formatoFecha(i.fechaInicio)} – ${formatoFecha(i.fechaFin)}`}
                </span>
                <button
                  type="button"
                  onClick={() => eliminar(i.id)}
                  disabled={pendingEliminar === i.id}
                  className="text-xs font-bold disabled:opacity-50"
                  style={{ color: "oklch(0.6 0.15 25)" }}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
