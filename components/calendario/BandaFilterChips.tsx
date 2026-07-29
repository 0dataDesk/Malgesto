"use client";

import type { Membresia } from "@/lib/malgestoEventos";
import { colorPorIndiceBanda } from "@/lib/eventoUI";
import { ToggleChip } from "@/components/ui/ToggleChip";

// Chips de banda de la vista de Mes — el filtro real del Calendario
// (Brief 8 §3). `activas` empieza con TODAS las bandas prendidas (Brief 9
// §2: tocar un chip prende/apaga SOLO ese chip, sin afectar a los demás —
// antes el set arrancaba vacío y "todo prendido" era solo un caso especial
// del render, lo que hacía que tocar un chip apagara visualmente a los
// otros aunque el toggle en sí fuera independiente).
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
    <div className="mt-3.5 flex flex-wrap gap-2">
      {membresias.map((m, i) => (
        <ToggleChip
          key={m.bandaId}
          label={m.bandaNombre}
          active={activas.has(m.bandaId)}
          onClick={() => onToggle(m.bandaId)}
          color={colorPorIndiceBanda(i)}
        />
      ))}
    </div>
  );
}
