import { simboloAcorde, colorRaizAcorde } from "@/lib/cancionTeoria";
import type { LetraLineaGuardada } from "@/lib/cancionesData";
import type { PrioridadMusico } from "@/lib/cancionesData";

// Brief "Fase 3: nueva vista de Canción" (Fase 1 §5): una línea de letra con
// acordes anclados a un punto exacto del texto, estilo tab de guitarra — el
// acorde va encima del carácter en `posicion`. El tamaño relativo de letra
// vs. acordes lo decide `prioridad` (perfil del músico).
const TAMANOS: Record<PrioridadMusico, { letra: string; acorde: string }> = {
  ambos: { letra: "text-[15px]", acorde: "text-[11px]" },
  armonia: { letra: "text-[13px]", acorde: "text-xs" },
  voz: { letra: "text-lg", acorde: "text-[10px]" },
  ritmo: { letra: "text-[12px]", acorde: "text-[10px]" },
};

export function LetraLinea({ linea, prioridad }: { linea: LetraLineaGuardada; prioridad: PrioridadMusico }) {
  const tam = TAMANOS[prioridad];
  const texto = linea.texto.length > 0 ? linea.texto : " ";

  // Trozos de texto separados por los puntos donde cae un acorde, para poder
  // apilar el acorde justo encima de ese carácter sin depender de fuentes
  // monoespaciadas.
  const puntos = [...linea.acordes].sort((a, b) => a.posicion - b.posicion);
  const cortes = [0, ...puntos.map((p) => Math.min(p.posicion, texto.length)), texto.length];
  const segmentos: { texto: string; acorde: (typeof puntos)[number] | null }[] = [];
  for (let i = 0; i < cortes.length - 1; i++) {
    segmentos.push({
      texto: texto.slice(cortes[i], cortes[i + 1]),
      acorde: i > 0 ? puntos[i - 1] ?? null : null,
    });
  }

  return (
    <div className="flex flex-wrap items-end leading-tight" style={{ rowGap: 2 }}>
      {segmentos.map((seg, i) => (
        <span key={i} className="relative whitespace-pre" style={{ paddingTop: seg.acorde ? 16 : 0 }}>
          {seg.acorde && (
            <span
              className={`absolute left-0 top-0 font-mono font-bold ${tam.acorde}`}
              style={{ color: colorRaizAcorde(seg.acorde.notaRaiz, seg.acorde.calidad) }}
            >
              {simboloAcorde(seg.acorde.notaRaiz, seg.acorde.calidad)}
            </span>
          )}
          <span className={tam.letra} style={{ color: "oklch(0.24 0.02 55)" }}>
            {seg.texto}
          </span>
        </span>
      ))}
    </div>
  );
}
