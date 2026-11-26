import { NOTAS, colorRaizAcorde, colorContrasteTexto, type Nota, type Modo } from "@/lib/cancionTeoria";

// Barra de color por nota (12 notas; cada una trae el color mayor, ancho, y el menor, franja). Marca la tonalidad de la
// canción: su nota se agranda con un aro y, si es menor, se ensancha y dice «Am»; las demás quedan atenuadas.
export function PaletaColor({ tonica, mini = false }: { tonica?: { raiz: Nota; modo: Modo }; mini?: boolean }) {
  // Versión discreta para las tarjetas: una tira de 12 notas finas y la de la canción, más alta y con su nombre.
  if (mini) {
    return (
      <div className="flex items-end gap-px" aria-label={tonica ? `Tonalidad ${tonica.raiz}${tonica.modo === "menor" ? "m" : ""}` : "Color por nota"} style={{ height: 14 }}>
        {NOTAS.map((n) => {
          const activa = tonica?.raiz === n;
          const menor = activa && tonica?.modo === "menor";
          const color = colorRaizAcorde(n, activa && tonica?.modo === "menor" ? "menor" : "mayor");
          return (
            <span
              key={n}
              className="flex items-center justify-center overflow-hidden"
              style={{ width: activa ? (menor ? 24 : 16) : 9, height: activa ? 14 : 6, borderRadius: 2, background: color, opacity: activa ? 1 : 0.4, color: colorContrasteTexto(color), fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 800, fontSize: 9, lineHeight: 1 }}
            >
              {activa ? `${n}${menor ? "m" : ""}` : ""}
            </span>
          );
        })}
      </div>
    );
  }
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
