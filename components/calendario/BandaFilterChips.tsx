"use client";

import type { Membresia } from "@/lib/malgestoEventos";
import { colorPorIndiceBanda, colorConAlpha } from "@/lib/eventoUI";

// Chips de banda de la vista de Mes (Design líneas 449-452) — ahora el
// filtro real del Calendario (Brief 8 §3, reemplaza a BandaSelectorCards):
// tocar un chip lo prende/apaga. Con todas apagadas o todas prendidas se ve
// todo (equivalente a "todas las bandas"); con solo algunas prendidas,
// filtra a esas.
export function BandaFilterChips({
  membresias,
  seleccionadas,
  onToggle,
}: {
  membresias: Membresia[];
  seleccionadas: Set<string>;
  onToggle: (bandaId: string) => void;
}) {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2">
      {membresias.map((m, i) => {
        const color = colorPorIndiceBanda(i);
        const activo = seleccionadas.size === 0 || seleccionadas.has(m.bandaId);
        return (
          <button
            key={m.bandaId}
            type="button"
            onClick={() => onToggle(m.bandaId)}
            className="flex items-center gap-1.5 rounded-[20px] py-[5px]"
            style={{
              paddingLeft: 11,
              paddingRight: 11,
              background: activo ? colorConAlpha(color, 0.14) : "oklch(0.93 0.016 78)",
              border: `1px solid ${activo ? color : "oklch(0.87 0.013 78)"}`,
              opacity: activo ? 1 : 0.65,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: activo ? color : "oklch(0.7 0.02 60)" }} />
            <span className="text-xs font-semibold" style={{ color: "oklch(0.3 0.02 55)" }}>
              {m.bandaNombre}
            </span>
          </button>
        );
      })}
    </div>
  );
}
