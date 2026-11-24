import type { Tecnica } from "@/lib/liricoModelo";

// Biblioteca de técnicas (catálogo único en la base) con cuánto se ha visto cada una.
export function Tecnicas({ tecnicas, resumen }: { tecnicas: Tecnica[]; resumen: Record<string, { total: number; dominadas: number; porReforzar: number }> }) {
  return (
    <details className="mt-6 rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.005 85)", border: "1px solid oklch(0.89 0.008 85)" }}>
      <summary className="cursor-pointer text-sm font-bold" style={{ color: "oklch(0.24 0.044 262)" }}>Técnicas y lo que llevas visto</summary>
      <div className="mt-3 flex flex-col gap-3">
        {tecnicas.map((t) => {
          const r = resumen[t.clave];
          return (
            <details key={t.clave}>
              <summary className="cursor-pointer text-sm" style={{ color: "oklch(0.24 0.044 262)" }}>
                <b>{t.nombre}</b>
                <span className="block font-mono text-[10px]" style={{ color: "oklch(0.5 0.044 262)" }}>
                  {r ? `${r.total} lección${r.total === 1 ? "" : "es"}${r.dominadas ? ` · ${r.dominadas} dominada${r.dominadas === 1 ? "" : "s"}` : ""}${r.porReforzar ? ` · ${r.porReforzar} por reforzar` : ""}` : "sin ver"}
                </span>
              </summary>
              <p className="mt-1 text-sm" style={{ color: "oklch(0.5 0.044 262)" }}>{t.resumen}</p>
              <p className="mt-1 whitespace-pre-line text-sm" style={{ color: "oklch(0.24 0.044 262)" }}>{t.cuerpo}</p>
            </details>
          );
        })}
      </div>
    </details>
  );
}
