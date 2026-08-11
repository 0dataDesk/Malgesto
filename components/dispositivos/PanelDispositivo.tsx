"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";
import { Knob } from "./Knob";
import { Boton } from "./Boton";
import { ControlDecorativo } from "./ControlDecorativo";

// Dibuja el panel del dispositivo usando pos_x/pos_y (0-100) de cada control
// del diseño, para que se vea parecido al real (brief §3) — perilla/boton
// interactivos, luz/entrada/salida decorativos.
export function PanelDispositivo({
  controles,
  valores,
  onChange,
}: {
  controles: ControlDiseno[];
  valores: Record<string, number>;
  onChange: (controlId: string, valor: number) => void;
}) {
  return (
    <div
      className="relative w-full overflow-visible rounded-2xl"
      style={{
        aspectRatio: "16 / 10",
        background: "linear-gradient(160deg, oklch(0.32 0.02 55), oklch(0.24 0.02 52))",
        border: "1px solid oklch(0.4 0.03 55)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px -14px rgba(0,0,0,0.6)",
      }}
    >
      {controles.map((c) => (
        <div key={c.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.posX}%`, top: `${c.posY}%` }}>
          {c.tipo === "perilla" && (
            <Knob control={c} valor={valores[c.id] ?? c.valorDefault ?? 0} onChange={(v) => onChange(c.id, v)} />
          )}
          {c.tipo === "boton" && (
            <Boton control={c} valor={valores[c.id] ?? c.valorDefault ?? 0} onChange={(v) => onChange(c.id, v)} />
          )}
          {(c.tipo === "luz" || c.tipo === "entrada" || c.tipo === "salida") && <ControlDecorativo control={c} />}
        </div>
      ))}
    </div>
  );
}
