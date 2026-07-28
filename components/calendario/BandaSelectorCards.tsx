"use client";

import type { Membresia } from "@/lib/malgestoEventos";

// Selector de banda (pantalla 01 de Design) — solo aparece cuando el usuario
// tiene más de una banda. Clicar una tarjeta filtra el calendario a esa
// banda; "Todas" vuelve a la vista mezclada, que es el estado por defecto.
//
// Sin poder probarse con datos reales todavía: hoy Jorge solo tiene ODR.
export function BandaSelectorCards({
  membresias,
  filtro,
  onFiltro,
}: {
  membresias: Membresia[];
  filtro: string | "todas";
  onFiltro: (bandaId: string | "todas") => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={() => onFiltro("todas")}
        className="rounded-2xl px-4 py-3 text-left text-sm font-bold"
        style={{
          background: filtro === "todas" ? "oklch(0.24 0.02 55)" : "oklch(0.93 0.016 78)",
          color: filtro === "todas" ? "oklch(0.96 0.012 82)" : "oklch(0.4 0.02 55)",
        }}
      >
        Todas tus bandas
      </button>
      {membresias.map((m) => {
        const activa = filtro === m.bandaId;
        return (
          <button
            key={m.bandaId}
            type="button"
            onClick={() => onFiltro(m.bandaId)}
            className="rounded-2xl px-4 py-3 text-left"
            style={
              activa
                ? {
                    background: "linear-gradient(135deg, oklch(0.64 0.15 34) 0%, oklch(0.6 0.14 22) 100%)",
                    color: "oklch(0.99 0.01 82)",
                  }
                : { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }
            }
          >
            <div className="text-sm font-bold">{m.bandaNombre}</div>
            <div className="text-xs opacity-80">{m.rol}</div>
          </button>
        );
      })}
    </div>
  );
}
