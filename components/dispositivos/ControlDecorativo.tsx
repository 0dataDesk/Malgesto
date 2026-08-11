import type { ControlDiseno } from "@/lib/dispositivosData";

// Luces/entradas/salidas (Seteos, brief "Seteos — catálogo") — puramente
// visuales, no interactivos: solo ayudan a que el panel se vea parecido al
// dispositivo real.
export function ControlDecorativo({ control }: { control: ControlDiseno }) {
  if (control.tipo === "luz") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: "oklch(0.72 0.19 25)", boxShadow: "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)" }}
        />
        <div className="font-mono text-[8px] uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
          {control.nombre}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="h-5 w-5 rounded-full"
        style={{ background: "oklch(0.18 0.01 55)", border: "2px solid oklch(0.45 0.03 55)" }}
      />
      <div className="font-mono text-[8px] uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
        {control.nombre}
      </div>
    </div>
  );
}
