import type { ResumenAmplificador, ResumenPedales, ResumenEscenario } from "@/lib/riderData";

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider"
// §2/§5: extraído de RiderVista.tsx -- este resumen (amplificadores/
// pedaleras/escenario) se calcula a partir de lo que ya está colocado en
// el lienzo, así que vive debajo del plot en la pestaña "Stage" en vez de
// en "Rider" (que ahora es contenido propio capturado a mano: Backline,
// requerimientos de espacio, contra rider, contacto -- ver
// RiderInfoVista.tsx). Mismo contenido/markup de siempre.
export function ResumenEquipoVista({
  amplificadores,
  pedales,
  escenario,
}: {
  amplificadores: ResumenAmplificador[];
  pedales: ResumenPedales[];
  escenario: ResumenEscenario[];
}) {
  if (amplificadores.length === 0 && pedales.length === 0 && escenario.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.02 55)" }}>
        Resumen de equipo
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {amplificadores.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
              Amplificadores
            </div>
            <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
              {amplificadores.map((a, idx) => (
                <li key={idx}>
                  {a.disenoNombre} — {a.nombrePersona}
                </li>
              ))}
            </ul>
          </div>
        )}
        {pedales.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
              Pedaleras
            </div>
            <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
              {pedales.map((p, idx) => (
                <li key={idx}>
                  {p.nombrePersona}: {p.cantidad} pedal{p.cantidad === 1 ? "" : "es"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {escenario.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
              Escenario
            </div>
            <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
              {escenario.map((e) => (
                <li key={e.tipo}>
                  {e.etiqueta}: {e.cantidad}
                  {e.etiquetas.length > 0 ? ` (${e.etiquetas.join(", ")})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
