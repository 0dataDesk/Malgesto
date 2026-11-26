import { NOTAS, colorRaizAcorde, colorContrasteTexto } from "@/lib/cancionTeoria";

// Referencia de color por nota (solo para mirar), en horizontal arriba a la derecha, a la altura del botón de regresar:
// 12 notas; cada una trae el color mayor (ancho) y el menor (franja). Mide lo mismo de alto que una línea de texto.
export function PaletaColor() {
  return (
    <div className="hidden items-center gap-0.5 md:flex" aria-label="Color por nota" style={{ height: 18 }}>
      {NOTAS.map((n) => (
        <div key={n} className="flex overflow-hidden rounded" title={`${n}: mayor (ancho) y menor (franja)`} style={{ height: 18, width: 30 }}>
          <div className="flex flex-1 items-center justify-center" style={{ background: colorRaizAcorde(n, "mayor"), fontFamily: "var(--font-space-mono), monospace", fontWeight: 700, fontSize: 9, color: colorContrasteTexto(colorRaizAcorde(n, "mayor")) }}>{n}</div>
          <div style={{ width: 6, background: colorRaizAcorde(n, "menor") }} />
        </div>
      ))}
    </div>
  );
}
