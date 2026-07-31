import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorExtension, colorConAlphaHSL, requiereQuintaExplicita } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

// Bloque de acorde de la vista final (Brief 4 §7, retocado en Brief 12 §7,
// Brief 20 §2/§3): tónica (1ª) + 3ª + 5ª (solo si la calidad la requiere
// explícita) + 7ª + 9ª — SIEMPRE en ese orden, nunca arbitrario, cada nota
// con su número arábigo de función (1/3/5/7/9) — pero ese número ahora es
// opcional (mostrarEtiquetas, brief 20 §2): apagado por defecto para ganar
// espacio, un músico que ya lee la nota no lo necesita encima. Nunca números
// romanos: esos ya se usan para el grado del acorde dentro de la tonalidad
// en AcordeSelector, un concepto distinto que no hay que mezclar acá.
export function ChordBlock({ acorde, mostrarEtiquetas = false }: { acorde: AcordeGuardado; mostrarEtiquetas?: boolean }) {
  const tonos = tonosDelAcorde(acorde.notaRaiz, acorde.calidad);
  const acompanantes = tonos.acompanantes.filter(
    (t) => t.intervalo !== "5ª" || requiereQuintaExplicita(acorde.calidad)
  );
  const colorRaiz = colorRaizAcorde(acorde.notaRaiz, acorde.calidad);
  const notas = [
    { numero: "1", nota: tonos.raiz, color: colorRaiz },
    ...acompanantes.map((t) => ({ numero: t.intervalo.replace("ª", ""), nota: t.nota, color: colorExtension(t.nota) })),
  ];

  return (
    <div className="rounded-xl p-2" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      {/* Brief 20 §3: el símbolo va en su propia fila, sin competir por
          ancho con la etiqueta de compases (antes, en la misma fila con
          justify-between, símbolos largos como "F#m7b5" se truncaban en
          columnas angostas de 4 por fila en mobile real) — la etiqueta baja
          a la fila de notas, donde ya hay flex-wrap para absorberla. */}
      <div
        className="text-sm font-extrabold leading-tight break-words"
        style={{ color: colorRaiz, fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {notas.map((n, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold"
            style={{ background: colorConAlphaHSL(n.color, 0.14), color: "oklch(0.3 0.02 55)" }}
          >
            {mostrarEtiquetas && <span style={{ color: n.color }}>{n.numero}</span>}
            {n.nota}
          </span>
        ))}
        <span className="ml-auto shrink-0 font-mono text-[9px]" style={{ color: "oklch(0.6 0.02 55)" }}>
          {acorde.duracionCompases}c
        </span>
      </div>
    </div>
  );
}
