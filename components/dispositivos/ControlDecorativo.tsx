import type { ControlDiseno } from "@/lib/dispositivosData";
import type { TemaDispositivo } from "./PanelDispositivo";

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
// Nombres de 3+ palabras se parten en 2 líneas (todas menos la última /
// la última) — ej. "DC IN 9-18V" → "DC IN" / "9-18V" — sin depender del
// texto exacto de ningún control puntual.
function partirEtiqueta(nombre: string): [string, string] | null {
  const palabras = nombre.split(" ").filter(Boolean);
  if (palabras.length < 3) return null;
  return [palabras.slice(0, -1).join(" "), palabras[palabras.length - 1]];
}

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
  const etiquetaPartida = partirEtiqueta(control.nombre);

  return (
    <div className="flex flex-col items-center gap-1" title={control.nota ?? undefined}>
      {esLuz &&
        (encendida ? (
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: "oklch(0.72 0.19 25)", boxShadow: "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)" }}
          />
        ) : (
          <div className="h-3 w-3 rounded-full" style={{ background: tema.superficie, border: `1px solid ${tema.textoSecundario}` }} />
        ))}
      <div className="text-center font-mono text-[9px] font-bold uppercase leading-tight tracking-wide" style={{ color: tema.texto }}>
        {etiquetaPartida ? (
          <>
            {etiquetaPartida[0]}
            <br />
            {etiquetaPartida[1]}
          </>
        ) : (
          control.nombre
        )}
      </div>
    </div>
  );
}
