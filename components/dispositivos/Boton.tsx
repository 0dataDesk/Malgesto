"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";
import type { TemaDispositivo } from "./PanelDispositivo";
import { EtiquetaMultilinea } from "./EtiquetaMultilinea";

// Botón/interruptor (Seteos, brief "Seteos — catálogo") — a diferencia de la
// perilla, es discreto: min..max (enteros) se dibujan como posiciones de un
// interruptor. Con solo 2 posiciones (ej. 0/1) se ve como un toggle on/off,
// con etiqueta de texto real en vez de un punto ambiguo; con más, como un
// selector numérico de varias posiciones.
//
// Mapeo texto→posición (brief "Seteos — selector único global..." §4/§5): el
// nombre del control ("Pasivo/Activo", "In/Out") no siempre está escrito en
// orden min→max — "Pasivo/Activo" sí (Pasivo=min por defecto), pero
// "In/Out" no (In=max por defecto). Lo único que SIEMPRE es cierto en un
// nombre de 2 palabras es que la primera palabra describe el estado por
// defecto (así se redactó el control) — así que la palabra 0 se ancla a la
// posición de `valorDefault`, no a `min` a secas. Sin esto, "In/Out" queda
// mostrando "Out" como activo por defecto, exactamente al revés.
function etiquetasPorPosicion(control: ControlDiseno, min: number, max: number): Map<number, string> | null {
  if (min === max) return null;
  const partes = control.nombre.split("/").map((s) => s.trim());
  if (partes.length !== 2 || !partes[0] || !partes[1] || control.valorDefault === null) return null;

  const defaultEsMin = Math.round(control.valorDefault) === min;
  const etiquetaDefault = partes[0];
  const etiquetaOtra = partes[1];

  const mapa = new Map<number, string>();
  mapa.set(defaultEsMin ? min : max, etiquetaDefault);
  mapa.set(defaultEsMin ? max : min, etiquetaOtra);
  return mapa;
}

export function Boton({
  control,
  valor,
  onChange,
  disabled = false,
  tema,
}: {
  control: ControlDiseno;
  valor: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  tema: TemaDispositivo;
}) {
  const min = control.min ?? 0;
  const max = control.max ?? 1;
  const pasos = Math.max(2, Math.round(max - min) + 1);
  const etiquetas = pasos === 2 ? etiquetasPorPosicion(control, min, max) : null;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ opacity: disabled ? 0.35 : 1 }}>
      {/* Regla de color (brief "PanelDispositivo — regla de color exterior/
          interior..."): color_acento es exclusivo del borde exterior del
          panel -- el contorno del botón usa color_texto. El fondo activo
          sigue en acento, sin cambios ahí. `--escala-control` (brief
          "...responsivo en móvil" §2): escala el botón como unidad en el
          layout posicionado angosto, sin efecto en el flow del Hartke. */}
      <div
        className="flex overflow-hidden rounded-lg"
        style={{ border: `1px solid ${tema.texto}`, transform: "scale(var(--escala-control, 1))" }}
      >
        {Array.from({ length: pasos }, (_, i) => min + i).map((posicion) => {
          const activo = Math.round(valor) === posicion;
          const etiqueta = etiquetas?.get(posicion);
          return (
            <button
              key={posicion}
              type="button"
              onClick={() => onChange(posicion)}
              disabled={disabled}
              className={`flex h-9 items-center justify-center font-bold disabled:cursor-not-allowed ${
                etiqueta ? "px-2.5 text-[9px] uppercase tracking-wide" : "w-7 text-[10px]"
              }`}
              style={{
                background: activo ? tema.acento : tema.superficie,
                color: activo ? tema.texto : tema.textoSecundario,
              }}
              aria-label={`${control.nombre}: ${etiqueta ?? `posición ${posicion}`}`}
            >
              {etiqueta ?? (pasos <= 2 ? (activo ? "●" : "○") : posicion)}
            </button>
          );
        })}
      </div>
      {!etiquetas && (
        <div className="font-mono uppercase tracking-wide" style={{ color: tema.textoSecundario, fontSize: "clamp(7.5px, 2.1vw, 9px)" }}>
          <EtiquetaMultilinea texto={control.nombre} />
        </div>
      )}
    </div>
  );
}
