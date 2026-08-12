import type { ControlDiseno } from "@/lib/dispositivosData";
import type { TemaDispositivo } from "./PanelDispositivo";
import { EtiquetaMultilinea } from "./EtiquetaMultilinea";

// Luces/entradas/salidas/referencias (Seteos, brief "Seteos — fix de
// navegación, colores de marca...") — puramente visuales, no interactivos:
// solo ayudan a que el panel se vea parecido al dispositivo real.
//
// §5 (brief anterior): entrada/salida/referencia se dibujan como el texto/
// etiqueta real de la señalización del panel, sin la forma geométrica
// (círculo) que sí conserva "luz" (esa sí es una lucecita real en el
// equipo). "referencia" es el mismo tratamiento que entrada/salida.
//
// `encendida` (brief "...luz refleja botón"): estado visual de una luz que
// refleja otro control (`reflejaControlId`, resuelto un nivel arriba en
// PanelDispositivo.tsx porque necesita ver el resto de los controles) — la
// luz sigue sin ser clickeable, esto solo cambia su apariencia.
//
// `nota`: texto informativo opcional (ej. la advertencia de polaridad del DC
// IN) — vive solo como tooltip nativo (title), no se muestra como texto
// siempre visible (para no saturar una etiqueta ya chica).
//
// El corte en 2+ líneas ahora depende de un salto de línea real en
// `nombre` (ej. "DC IN\n9-18V"), no de contar palabras -- ver
// EtiquetaMultilinea (brief "...etiquetas multilínea genéricas..." §1).
//
// `--escala-control` (brief "...responsivo en móvil" §2): en el layout
// posicionado, el lienzo completo se escala hacia abajo en viewport
// angosto para que las luces no se encimen con los controles vecinos --
// variable CSS heredada desde PanelDispositivo.tsx, sin efecto (scale(1))
// donde no se define. Solo la forma (el punto) usa esta escala; el texto
// de la etiqueta tiene su propio piso legible vía clamp(), no se achica al
// mismo ritmo.
export function ControlDecorativo({
  control,
  tema,
  encendida = true,
}: {
  control: ControlDiseno;
  tema: TemaDispositivo;
  encendida?: boolean;
}) {
  const esLuz = control.tipo === "luz";

  return (
    <div className="flex flex-col items-center gap-1" title={control.nota ?? undefined}>
      {esLuz &&
        (encendida ? (
          <div
            className="h-3 w-3 rounded-full"
            style={{
              background: "oklch(0.72 0.19 25)",
              boxShadow: "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)",
              transform: "scale(var(--escala-control, 1))",
            }}
          />
        ) : (
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: tema.superficie, border: `1px solid ${tema.textoSecundario}`, transform: "scale(var(--escala-control, 1))" }}
          />
        ))}
      <div
        className="text-center font-mono font-bold uppercase leading-tight tracking-wide"
        style={{ color: tema.texto, fontSize: "clamp(7.5px, 2.1vw, 9px)" }}
      >
        <EtiquetaMultilinea texto={control.nombre} />
      </div>
    </div>
  );
}
