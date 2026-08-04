"use client";

import { useTransition, useState } from "react";
import { eliminarMovimientoAction } from "@/app/finanzas/actions";
import { formatoMoneda } from "@/lib/eventoUI";
import type { Movimiento } from "@/lib/finanzasData";

function formatearFecha(iso: string): string {
  // "fecha" es date puro (YYYY-MM-DD) — parsear como local, no como UTC, para
  // que no se corra un día por la zona horaria del servidor.
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// Brief de corrección §2: fila de movimiento con botón de eliminar
// (ícono discreto, sólo superadmin) — los automáticos no lo muestran, ver
// nota en lib/finanzasData.eliminarMovimiento.
export function MovimientoFila({ movimiento: m, esSuperadmin }: { movimiento: Movimiento; esSuperadmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const eliminar = () => {
    if (!confirm(`¿Eliminar el movimiento "${m.concepto}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarMovimientoAction(m.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el movimiento.");
      }
    });
  };

  return (
    <div
      className="rounded-2xl p-3.5"
      style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            {m.concepto}
          </div>
          <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
            {formatearFecha(m.fecha)}
            {m.eventoTitulo && ` · ${m.eventoTitulo}`}
            {m.automatico && " · Automático"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-bold" style={{ color: m.tipo === "entrada" ? "oklch(0.5 0.13 148)" : "oklch(0.55 0.15 25)" }}>
            {m.tipo === "entrada" ? "+" : "−"}
            {formatoMoneda(m.monto)}
          </span>
          {esSuperadmin && !m.automatico && (
            <button
              type="button"
              onClick={eliminar}
              disabled={pending}
              aria-label="Eliminar movimiento"
              title="Eliminar movimiento"
              className="flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
