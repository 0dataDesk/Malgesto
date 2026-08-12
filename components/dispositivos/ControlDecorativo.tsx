import type { ControlDiseno } from "@/lib/dispositivosData";
import type { TemaDispositivo } from "./PanelDispositivo";

// Luces/entradas/salidas/referencias (Seteos, brief "Seteos — fix de
// navegación, colores de marca...") — puramente visuales, no interactivos:
// solo ayudan a que el panel se vea parecido al dispositivo real.
//
// §5: entrada/salida/referencia se dibujan como el texto/etiqueta real de la
// señalización del panel, sin la forma geométrica (círculo) que sí conserva
// "luz" (esa sí es una lucecita real en el equipo). "referencia" es el mismo
// tratamiento que entrada/salida, para señalización sin valor ni interacción
// (ej. "Ground Lift", "Pre/Post").
//
// `nota`: texto informativo opcional (ej. la advertencia de polaridad del DC
// IN) — se muestra como texto chico debajo de cualquier control decorativo
// que la tenga, y también como tooltip nativo (title) para quien pase el
// mouse por encima.
export function ControlDecorativo({ control, tema }: { control: ControlDiseno; tema: TemaDispositivo }) {
  const esLuz = control.tipo === "luz";

  return (
    <div className="flex flex-col items-center gap-1" title={control.nota ?? undefined}>
      {esLuz && (
        <div
          className="h-3 w-3 rounded-full"
          style={{ background: "oklch(0.72 0.19 25)", boxShadow: "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)" }}
        />
      )}
      <div className="font-mono text-[9px] font-bold uppercase tracking-wide" style={{ color: tema.texto }}>
        {control.nombre}
      </div>
      {control.nota && (
        <div className="max-w-[92px] text-center font-mono text-[7px] italic leading-tight" style={{ color: tema.textoSecundario }}>
          {control.nota}
        </div>
      )}
    </div>
  );
}
