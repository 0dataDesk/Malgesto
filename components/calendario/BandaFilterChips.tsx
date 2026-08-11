"use client";

import type { Membresia } from "@/lib/malgestoEventos";
import { EmojiOPunto } from "@/components/ui/EmojiOPunto";

// Chips de banda de la vista de Mes — el filtro real del Calendario
// (Brief 8 §3). `activas` empieza con TODAS las bandas prendidas (Brief 9
// §2: tocar un chip prende/apaga SOLO ese chip, sin afectar a los demás —
// antes el set arrancaba vacío y "todo prendido" era solo un caso especial
// del render, lo que hacía que tocar un chip apagara visualmente a los
// otros aunque el toggle en sí fuera independiente).
// Brief "Color de banda configurable...": el chip pasa de nombre+punto a un
// círculo pequeño solo del color de la banda (fijo, no calculado), para
// caber en la misma fila que el título del mes.
// Brief "Rediseño de Ausencias, emoji de banda...": si la banda tiene emoji
// capturado, el chip lo muestra en vez del punto de color -- el fallback en
// sí vive en EmojiOPunto (compartido con la tarjeta de Lugares), acá solo
// se agrega el estado de activo/inactivo (opacidad + escala).
export function BandaFilterChips({
  membresias,
  activas,
  onToggle,
}: {
  membresias: Membresia[];
  activas: Set<string>;
  onToggle: (bandaId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {membresias.map((m) => {
        const activo = activas.has(m.bandaId);
        return (
          <button
            key={m.bandaId}
            type="button"
            onClick={() => onToggle(m.bandaId)}
            aria-label={m.bandaNombre}
            aria-pressed={activo}
            title={m.bandaNombre}
            className="shrink-0 transition-all"
            style={{ opacity: activo ? 1 : 0.32, transform: activo ? "scale(1)" : "scale(0.85)" }}
          >
            <EmojiOPunto emoji={m.emoji} color={m.color} size={20} fontSize={13} />
          </button>
        );
      })}
    </div>
  );
}
