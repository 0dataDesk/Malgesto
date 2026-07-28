import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorExtension, requiereQuintaExplicita } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

// Bloque de acorde de la vista final (brief §7): tónica + 3ª + 7ª + 9ª (si
// aplica) + 5ª solo si la calidad la requiere explícita, coloreados según
// el brief §5.
export function ChordBlock({ acorde }: { acorde: AcordeGuardado }) {
  const tonos = tonosDelAcorde(acorde.notaRaiz, acorde.calidad, acorde.incluirNovena);
  const acompanantes = tonos.acompanantes.filter(
    (t) => t.intervalo !== "5ª" || requiereQuintaExplicita(acorde.calidad)
  );

  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "oklch(0.28 0.025 55)", border: "1px solid oklch(0.34 0.03 55)" }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="text-2xl font-extrabold"
          style={{ color: colorRaizAcorde(acorde.notaRaiz, acorde.calidad), fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "oklch(0.74 0.12 78)" }}>
          {acorde.duracionCompases}c
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
        {acompanantes.map((t, i) => (
          <span key={i} style={{ color: colorExtension(t.nota) }}>
            {t.nota}
          </span>
        ))}
      </div>
    </div>
  );
}
