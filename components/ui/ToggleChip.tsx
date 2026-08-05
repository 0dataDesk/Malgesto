"use client";

import { colorConAlpha } from "@/lib/eventoUI";

const ACENTO = "oklch(0.64 0.15 34)";

// Chip seleccionable genérico (Brief 9 §5) — mismo patrón visual que ya
// usaban los chips de banda del Calendario, extraído acá para reusarse en
// cualquier fila de toggles con nombre (bloques de una banda, tipo de
// evento, etc.) en vez de checkboxes o switches con look distinto.
export function ToggleChip({
  label,
  active,
  onClick,
  color = ACENTO,
  dot = true,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  dot?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-[20px] py-[5px]"
      style={{
        paddingLeft: 11,
        paddingRight: 11,
        background: active ? colorConAlpha(color, 0.14) : "oklch(0.93 0.016 78)",
        border: `1px solid ${active ? color : "oklch(0.87 0.013 78)"}`,
        opacity: disabled ? 0.4 : active ? 1 : 0.65,
      }}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: active ? color : "oklch(0.7 0.02 60)" }} />}
      <span className="text-xs font-semibold" style={{ color: "oklch(0.3 0.02 55)" }}>
        {label}
      </span>
    </button>
  );
}
