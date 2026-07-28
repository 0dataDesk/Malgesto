"use client";

import { useState } from "react";
import {
  NOTAS,
  CALIDADES,
  simboloAcorde,
  colorRaizAcorde,
  acordesDiatonicos,
  type Nota,
  type Calidad,
  type Tonalidad,
} from "@/lib/cancionTeoria";

const ETIQUETA_CALIDAD: Record<Calidad, string> = {
  mayor: "mayor", menor: "menor", disminuido: "dim", aumentado: "aum",
  "7": "7", maj7: "maj7", m7: "m7", dim7: "dim7", m7b5: "m7b5", sus2: "sus2", sus4: "sus4",
};

const panelStyle = { background: "oklch(0.16 0.008 260)", border: "1px solid oklch(0.32 0.02 260)" };
const etiquetaStyle = { color: "oklch(0.55 0.01 260)" };

// Selector de acordes por botones (brief §6): arriba los 7 diatónicos de la
// tonalidad, abajo construcción manual (nota + calidad) para lo que se sale
// de la tonalidad. No hay dropdowns.
export function AcordeSelector({
  tonalidad,
  notaRaiz,
  calidad,
  onSeleccionar,
}: {
  tonalidad: Tonalidad;
  notaRaiz: Nota;
  calidad: Calidad;
  onSeleccionar: (notaRaiz: Nota, calidad: Calidad) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [notaManual, setNotaManual] = useState<Nota | null>(null);
  const diatonicos = acordesDiatonicos(tonalidad);

  const cerrar = () => {
    setAbierto(false);
    setNotaManual(null);
  };

  const elegir = (n: Nota, c: Calidad) => {
    onSeleccionar(n, c);
    cerrar();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-lg px-3 py-2 text-sm font-bold"
        style={{ background: colorRaizAcorde(notaRaiz, calidad), color: "oklch(0.18 0.01 260)", minWidth: 76 }}
      >
        {simboloAcorde(notaRaiz, calidad)}
      </button>

      {abierto && (
        <div className="absolute z-20 mt-2 w-72 rounded-xl p-3" style={panelStyle}>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>
            Acordes en tono
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {diatonicos.map((d) => (
              <button
                key={d.grado}
                type="button"
                title={d.romano}
                onClick={() => elegir(d.raiz, d.calidad)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                style={{ background: colorRaizAcorde(d.raiz, d.calidad), color: "oklch(0.18 0.01 260)" }}
              >
                {d.simbolo}
              </button>
            ))}
          </div>

          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>
            Manual · nota
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {NOTAS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNotaManual(n)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                style={{
                  background: notaManual === n ? "oklch(0.5 0.13 148)" : "oklch(0.24 0.015 260)",
                  color: notaManual === n ? "white" : "oklch(0.85 0.01 260)",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>
            Manual · calidad
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CALIDADES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!notaManual}
                onClick={() => notaManual && elegir(notaManual, c)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-30"
                style={{ background: "oklch(0.24 0.015 260)", color: "oklch(0.85 0.01 260)" }}
              >
                {ETIQUETA_CALIDAD[c]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
