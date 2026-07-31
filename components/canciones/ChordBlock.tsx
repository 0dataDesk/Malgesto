import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorExtension, colorConAlphaHSL, requiereQuintaExplicita } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

// Bloque de acorde de la vista final (Brief 4 §7, retocado en Brief 12 §7,
// Brief 20 §2/§3, corregido en Brief 21): tónica (1ª) + 3ª + 5ª (solo si la
// calidad la requiere explícita) + 7ª + 9ª — SIEMPRE en ese orden, nunca
// arbitrario, cada nota con su número arábigo de función (1/3/5/7/9). Nunca
// números romanos: esos ya se usan para el grado del acorde dentro de la
// tonalidad en AcordeSelector, un concepto distinto que no hay que mezclar
// acá.
//
// Brief 21: con `mostrarEtiquetas` en false (default) el bloque renderiza
// ÚNICAMENTE el símbolo — ni las notas, ni sus círculos de color, ni la
// etiqueta de compases se montan en el DOM; toda la fila de detalle vive
// atrás de un solo `{mostrarEtiquetas && (...)}`, no un ocultamiento por
// nota individual (ese era el bug del brief anterior: se escondía el
// número dentro de cada chip pero el chip con la letra de la nota se
// seguía montando igual).
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
      <div
        className="text-sm font-extrabold leading-tight break-words"
        style={{ color: colorRaiz, fontFamily: "var(--font-bricolage), sans-serif" }}
      >
        {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
      </div>
      {mostrarEtiquetas && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {notas.map((n, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{ background: colorConAlphaHSL(n.color, 0.14), color: "oklch(0.3 0.02 55)" }}
            >
              <span style={{ color: n.color }}>{n.numero}</span>
              {n.nota}
            </span>
          ))}
          <span className="ml-auto shrink-0 font-mono text-[9px]" style={{ color: "oklch(0.6 0.02 55)" }}>
            {acorde.duracionCompases}c
          </span>
        </div>
      )}
    </div>
  );
}
