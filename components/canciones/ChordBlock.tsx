import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorExtension, colorConAlphaHSL, requiereQuintaExplicita } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

// Bloque de acorde de la vista final (Brief 4 §7, retocado en Brief 12 §7):
// tónica (1ª) + 3ª + 5ª (solo si la calidad la requiere explícita) + 7ª +
// 9ª (si está activada) — SIEMPRE en ese orden, nunca arbitrario, cada nota
// con su número arábigo de función (1/3/5/7/9). Nunca números romanos: esos
// ya se usan para el grado del acorde dentro de la tonalidad en
// AcordeSelector, un concepto distinto que no hay que mezclar acá.
export function ChordBlock({ acorde }: { acorde: AcordeGuardado }) {
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
    <div className="rounded-2xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="flex items-baseline justify-between">
        <span
          className="text-2xl font-extrabold"
          style={{ color: colorRaiz, fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
          {acorde.duracionCompases}c
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {notas.map((n, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
            style={{ background: colorConAlphaHSL(n.color, 0.14), color: "oklch(0.3 0.02 55)" }}
          >
            <span style={{ color: n.color }}>{n.numero}</span>
            {n.nota}
          </span>
        ))}
      </div>
    </div>
  );
}
