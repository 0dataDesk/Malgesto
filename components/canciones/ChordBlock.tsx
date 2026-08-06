import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorExtension, colorContrasteTexto } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

export type Densidad = "grande" | "media" | "compacta";

const TAMANOS: Record<Densidad, { padding: string; simbolo: string; nota: string; badge: string }> = {
  grande: { padding: "p-3.5", simbolo: "text-2xl", nota: "text-xs", badge: "text-[11px]" },
  media: { padding: "p-2.5", simbolo: "text-lg", nota: "text-[11px]", badge: "text-[10px]" },
  compacta: { padding: "p-2", simbolo: "text-sm", nota: "text-[10px]", badge: "text-[9px]" },
};

// Brief "Ajustes ChordBlock/ChordCard §1": el nombre del acorde ya no
// recalcula negro/blanco por tarjeta -- queda fijo en blanco.
const COLOR_SIMBOLO = "oklch(0.97 0.003 260)";

// Brief §1, auditoría de contraste: el problema de "fondo muy claro para
// texto blanco" no está confinado a la categoría "tenue" como suponía el
// brief -- el hue domina más que la categoría (verde/amarillo, ~30-120°,
// da contrastes de 2.3-4.2:1 contra blanco en LAS CUATRO categorías, no
// solo tenue). Por eso el oscurecimiento se aplica parejo a toda tarjeta
// vía overlay, en vez de tratar "tenue" como caso especial.
const OVERLAY_FONDO = "rgba(0, 0, 0, 0.18)";

// Brief §2: fondo sólido y fijo (NO traslúcido sobre el color de la
// tarjeta) para los pills 1/3/5/7/9 -- mismo tono cálido casi blanco que ya
// traía la tarjeta antes de este color-coding. Probado: un fondo
// traslúcido que hereda el tono de la tarjeta puede casi igualar el color
// del texto de una nota acompañante (choque medido: card tenue/E con texto
// D#, contraste ~1:1, prácticamente invisible) -- un fondo fijo evita ese
// choque sin importar qué nota sea la tarjeta.
const COLOR_FONDO_PILL = "oklch(0.97 0.01 82)";
const COLOR_NOTA_PILL = "oklch(0.3 0.02 55)";

// Bloque de acorde de la vista final: tónica (1ª) + 3ª + 5ª + 7ª + 9ª —
// SIEMPRE en ese orden y siempre las cinco (brief "Ajustes ChordBlock/
// ChordCard §3": la 5ª ya no se oculta en calidades con quinta justa), cada
// nota con su número arábigo de función. Nunca números romanos: esos ya se
// usan para el grado del acorde dentro de la tonalidad en AcordeSelector,
// un concepto distinto que no hay que mezclar acá.
//
// Fondo de tarjeta = color de la nota raíz (colorRaiz), con el símbolo del
// acorde fijo en blanco encima (§1) en vez de recalcular negro/blanco por
// tarjeta. colorContrasteTexto (lib/cancionTeoria.ts) sigue viva, pero solo
// para decidir si la tarjeta lee oscura o clara en conjunto y elegir la
// variante del badge de compases (§4).
export function ChordBlock({
  acorde,
  densidad = "compacta",
}: {
  acorde: AcordeGuardado;
  densidad?: Densidad;
}) {
  const tonos = tonosDelAcorde(acorde.notaRaiz, acorde.calidad);
  const colorRaiz = colorRaizAcorde(acorde.notaRaiz, acorde.calidad);
  const cardOscura = colorContrasteTexto(colorRaiz) === "#ffffff";
  const colorBadge = cardOscura ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.25)";
  const colorTextoBadge = cardOscura ? "#ffffff" : "#000000";
  const notas = [
    { numero: "1", nota: tonos.raiz, color: colorRaiz },
    ...tonos.acompanantes.map((t) => ({ numero: t.intervalo.replace("ª", ""), nota: t.nota, color: colorExtension(t.nota) })),
  ];
  const tamano = TAMANOS[densidad];

  return (
    <div
      className={`rounded-xl ${tamano.padding}`}
      style={{ background: `linear-gradient(${OVERLAY_FONDO}, ${OVERLAY_FONDO}), ${colorRaiz}`, border: "1px solid oklch(0.89 0.013 78)" }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div
          className={`${tamano.simbolo} font-extrabold leading-tight break-words`}
          style={{ color: COLOR_SIMBOLO, fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
        </div>
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono ${tamano.badge}`}
          style={{ background: colorBadge, color: colorTextoBadge }}
        >
          {acorde.duracionCompases}c
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {notas.map((n, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono ${tamano.nota} font-bold`}
            style={{ background: COLOR_FONDO_PILL, color: COLOR_NOTA_PILL }}
          >
            <span style={{ color: n.color }}>{n.numero}</span>
            {n.nota}
          </span>
        ))}
      </div>
    </div>
  );
}
