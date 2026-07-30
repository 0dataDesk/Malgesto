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

const panelStyle = { background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" };
const etiquetaStyle = { color: "oklch(0.55 0.02 55)" };
const inactivoStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const activoStyle = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };

// Selector de acordes por botones (Brief 4 §6, tema claro desde Brief 12
// §6): arriba los 7 diatónicos de la tonalidad, abajo construcción manual
// (nota + calidad) para lo que se sale de la tonalidad. No hay dropdowns.
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
        style={{ background: colorRaizAcorde(notaRaiz, calidad), color: "oklch(0.99 0.01 82)", minWidth: 76 }}
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
                style={{ background: colorRaizAcorde(d.raiz, d.calidad), color: "oklch(0.99 0.01 82)" }}
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
                style={notaManual === n ? activoStyle : inactivoStyle}
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
                style={inactivoStyle}
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
