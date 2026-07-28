"use client";

import type { Membresia } from "@/lib/malgestoEventos";
import { colorPorIndiceBanda, colorConAlpha } from "@/lib/eventoUI";

// Chips de banda de la vista de Mes (Design líneas 449-452) — a diferencia
// de BandaSelectorCards (pantalla 01, filtro real para >1 banda), esto es
// el badge informativo que Design muestra siempre, incluso con una sola
// banda: solo confirma de qué bandas son los eventos que se están viendo,
// no es un control de filtro independiente todavía.
export function BandaFilterChips({ membresias }: { membresias: Membresia[] }) {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2">
      {membresias.map((m, i) => {
        const color = colorPorIndiceBanda(i);
        return (
          <div
            key={m.bandaId}
            className="flex items-center gap-1.5 rounded-[20px] py-[5px]"
            style={{ paddingLeft: 11, paddingRight: 11, background: colorConAlpha(color, 0.14), border: `1px solid ${color}` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-xs font-semibold" style={{ color: "oklch(0.3 0.02 55)" }}>
              {m.bandaNombre}
            </span>
          </div>
        );
      })}
    </div>
  );
}
