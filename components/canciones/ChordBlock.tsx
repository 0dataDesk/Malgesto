import { simboloAcorde, tonosDelAcorde, colorRaizAcorde, colorContrasteTexto, requiereQuintaExplicita } from "@/lib/cancionTeoria";
import type { AcordeGuardado } from "@/lib/cancionesData";

export type Densidad = "grande" | "media" | "compacta";

const TAMANOS: Record<Densidad, { padding: string; simbolo: string; nota: string; badge: string }> = {
  grande: { padding: "p-3.5", simbolo: "text-2xl", nota: "text-xs", badge: "text-[11px]" },
  media: { padding: "p-2.5", simbolo: "text-lg", nota: "text-[11px]", badge: "text-[10px]" },
  compacta: { padding: "p-2", simbolo: "text-sm", nota: "text-[10px]", badge: "text-[9px]" },
};

// Bloque de acorde de la vista final (Brief 4 §7, retocado en Brief 12 §7,
// Brief 20 §2/§3, corregido en Brief 21 y en Brief de corrección §3-5):
// tónica (1ª) + 3ª + 5ª (solo si la calidad la requiere explícita) + 7ª + 9ª
// — SIEMPRE en ese orden, nunca arbitrario, cada nota con su número arábigo
// de función (1/3/5/7/9). Nunca números romanos: esos ya se usan para el
// grado del acorde dentro de la tonalidad en AcordeSelector, un concepto
// distinto que no hay que mezclar acá.
//
// Brief "Vista Final §1": las notas 1-3-5-7-9 ya no son un toggle -- se
// muestran siempre, fijas.
//
// Brief "Vista Final: fondo de color en tarjetas de acorde": el fondo de la
// tarjeta pasa a ser el color de la nota raíz (antes solo el texto del
// símbolo lo usaba, sobre fondo blanco). Con eso, ningún texto puede quedar
// en un color fijo -- todo el texto de la tarjeta (símbolo, badge de
// compases, notas/grados) usa el mismo negro-o-blanco calculado por
// contraste contra ESE fondo en particular.
export function ChordBlock({
  acorde,
  densidad = "compacta",
}: {
  acorde: AcordeGuardado;
  densidad?: Densidad;
}) {
  const tonos = tonosDelAcorde(acorde.notaRaiz, acorde.calidad);
  const acompanantes = tonos.acompanantes.filter(
    (t) => t.intervalo !== "5ª" || requiereQuintaExplicita(acorde.calidad)
  );
  const colorRaiz = colorRaizAcorde(acorde.notaRaiz, acorde.calidad);
  const colorTexto = colorContrasteTexto(colorRaiz);
  const colorPill = colorTexto === "#ffffff" ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.12)";
  const notas = [
    { numero: "1", nota: tonos.raiz },
    ...acompanantes.map((t) => ({ numero: t.intervalo.replace("ª", ""), nota: t.nota })),
  ];
  const tamano = TAMANOS[densidad];

  return (
    <div className={`rounded-xl ${tamano.padding}`} style={{ background: colorRaiz, border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="flex items-start justify-between gap-1.5">
        <div
          className={`${tamano.simbolo} font-extrabold leading-tight break-words`}
          style={{ color: colorTexto, fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {simboloAcorde(acorde.notaRaiz, acorde.calidad)}
        </div>
        <span className={`shrink-0 font-mono ${tamano.badge}`} style={{ color: colorTexto, opacity: 0.75 }}>
          {acorde.duracionCompases}c
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {notas.map((n, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono ${tamano.nota} font-bold`}
            style={{ background: colorPill, color: colorTexto }}
          >
            <span style={{ opacity: 0.75 }}>{n.numero}</span>
            {n.nota}
          </span>
        ))}
      </div>
    </div>
  );
}
