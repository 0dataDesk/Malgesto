import { NOTAS, colorRaizAcorde, colorContrasteTexto, type Nota, type Modo } from "@/lib/cancionTeoria";

// Barra de color por nota (12 notas; cada una trae el color mayor, ancho, y el menor, franja). Marca la tonalidad de la
// canción: su nota se agranda con un aro y, si es menor, se ensancha y dice «Am»; las demás quedan atenuadas.
export function PaletaColor({ tonica }: { tonica?: { raiz: Nota; modo: Modo } }) {
  return (
    <div className="hidden items-center gap-1 md:flex" aria-label="Color por nota" style={{ height: 22, padding: "0 3px" }}>
      {NOTAS.map((n) => {
        const activa = tonica?.raiz === n;
        const menor = activa && tonica?.modo === "menor";
        const mayor = colorRaizAcorde(n, "mayor");
        return (
          <div
            key={n}
            className="flex overflow-hidden rounded"
            title={activa ? `Tonalidad: ${n}${menor ? "m" : ""}` : `${n}: mayor (ancho) y menor (franja)`}
            style={{ height: 18, width: menor ? 40 : 30, boxShadow: activa ? "0 0 0 2px oklch(0.25 0.04 262)" : "none", opacity: tonica && !activa ? 0.5 : 1 }}
          >
            <div className="flex flex-1 items-center justify-center" style={{ background: mayor, fontFamily: "var(--font-space-mono), monospace", fontWeight: 700, fontSize: activa ? 11 : 9, color: colorContrasteTexto(mayor) }}>
              {n}{menor ? "m" : ""}
            </div>
            <div style={{ width: 6, background: colorRaizAcorde(n, "menor") }} />
          </div>
        );
      })}
    </div>
  );
}
