"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";
import { Knob } from "./Knob";
import { SliderVertical } from "./SliderVertical";
import { Boton } from "./Boton";
import { ControlDecorativo } from "./ControlDecorativo";

// Paleta derivada de los colores reales de marca del diseño (brief "Seteos —
// fix de navegación, colores de marca, enteros, marco grueso" §4) — fondo
// del panel/cajas, acento (marco de cajas, borde exterior, indicadores
// activos) y texto de etiquetas/valores, más dos variantes derivadas
// (superficie = cuerpo idle de perillas/botones, textoSecundario = labels
// atenuados) para no repetir los mismos tres colores planos en todos lados.
//
// Regla de color (brief "PanelDispositivo — regla de color exterior/
// interior, layout posicionado del Mallet, luz refleja botón" §1/2/4/5):
// `acento` queda reservado EXCLUSIVAMENTE al borde exterior del panel
// completo. Todo lo demás que antes usaba acento (bordes de cajas internas,
// contorno de perillas, contorno de botones) pasa a `texto`. El relleno de
// perillas/botones, el indicador de la perilla y el fondo activo de un
// botón siguen en acento, sin cambios ahí -- ver Knob.tsx/Boton.tsx.
export type TemaDispositivo = {
  fondo: string;
  acento: string;
  texto: string;
  textoSecundario: string;
  superficie: string;
};

// Fallback neutro para un diseño que todavía no tiene colores cargados —
// no debería pasar con los 2 diseños reales de hoy (ambos ya migrados), pero
// evita un panel roto si se agrega uno nuevo sin colores todavía.
export function construirTema(colorFondo: string | null, colorAcento: string | null, colorTexto: string | null): TemaDispositivo {
  const fondo = colorFondo ?? "#1a1a1a";
  const acento = colorAcento ?? "#3b82f6";
  const texto = colorTexto ?? "#e5e5e5";
  return {
    fondo,
    acento,
    texto,
    textoSecundario: `${texto}b3`,
    superficie: `color-mix(in srgb, ${fondo} 100%, white 14%)`,
  };
}

// Una luz puede reflejar el valor de otro control del mismo diseño en vez de
// tener estado propio (brief "...luz refleja botón", ej. AGS LED refleja el
// botón AGS) — "encendida" cuando ese control está en su valor máximo/
// activo. Sin `reflejaControlId`, se considera siempre encendida (visual de
// siempre). Vive acá (no en ControlDecorativo) porque necesita el resto de
// `controles` para resolver la referencia, algo que ya tiene este nivel.
function luzEncendida(c: ControlDiseno, controles: ControlDiseno[], valores: Record<string, number>): boolean {
  if (c.tipo !== "luz" || !c.reflejaControlId) return true;
  const referenciado = controles.find((x) => x.id === c.reflejaControlId);
  if (!referenciado) return true;
  const max = referenciado.max ?? 1;
  const valorActual = valores[referenciado.id] ?? referenciado.valorDefault ?? max;
  return valorActual === max;
}

function renderControl(
  c: ControlDiseno,
  valores: Record<string, number>,
  onChange: (controlId: string, valor: number) => void,
  disabled: boolean,
  tema: TemaDispositivo,
  controles: ControlDiseno[]
) {
  if (c.tipo === "perilla") {
    const valor = valores[c.id] ?? c.valorDefault ?? 0;
    return c.estilo === "deslizante" ? (
      <SliderVertical key={c.id} control={c} valor={valor} onChange={(v) => onChange(c.id, v)} disabled={disabled} tema={tema} />
    ) : (
      <Knob key={c.id} control={c} valor={valor} onChange={(v) => onChange(c.id, v)} disabled={disabled} tema={tema} />
    );
  }
  if (c.tipo === "boton") {
    return (
      <Boton
        key={c.id}
        control={c}
        valor={valores[c.id] ?? c.valorDefault ?? 0}
        onChange={(v) => onChange(c.id, v)}
        disabled={disabled}
        tema={tema}
      />
    );
  }
  return <ControlDecorativo key={c.id} control={c} tema={tema} encendida={luzEncendida(c, controles, valores)} />;
}

type PanelProps = {
  controles: ControlDiseno[];
  valores: Record<string, number>;
  onChange: (controlId: string, valor: number) => void;
  tema: TemaDispositivo;
};

// Layout viejo por posición libre (pos_x/pos_y) — se mantiene para diseños
// que no tienen "grupo" asignado a ningún control.
function PanelLibre({ controles, valores, onChange, tema }: PanelProps) {
  return (
    <div
      className="relative w-full overflow-visible rounded-2xl"
      style={{ aspectRatio: "16 / 10", background: tema.fondo, border: `4px solid ${tema.acento}` }}
    >
      {controles.map((c) => (
        <div
          key={c.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.posX ?? 50}%`, top: `${c.posY ?? 50}%` }}
        >
          {renderControl(c, valores, onChange, false, tema, controles)}
        </div>
      ))}
    </div>
  );
}

// Layout agrupado por "grupo" — reemplaza pos_x/pos_y a nivel panel como
// fuente de verdad del layout general. Controles con el mismo grupo van
// juntos en una caja con marco (color_texto, brief §1/2/4/5) y esquinas
// rectas, fondo del panel (color_fondo), etiqueta del grupo arriba. El
// acento es el borde exterior del panel completo. Controles con grupo=null
// se dibujan sueltos, sin caja.
function grupoHabilitado(nombreGrupo: string, controles: ControlDiseno[], valores: Record<string, number>): boolean {
  const controlador = controles.find((c) => c.controlaGrupo === nombreGrupo);
  if (!controlador) return true;
  const max = controlador.max ?? 1;
  const valorActual = valores[controlador.id] ?? controlador.valorDefault ?? max;
  return valorActual === max;
}

// Dentro de una caja, dos modos de acomodo (brief §3):
// - Posición libre: si TODOS los controles del grupo tienen pos_x/pos_y no
//   nulos, se dibujan en posición absoluta (0-100%, mismo criterio que
//   Stage Plot) — ej. el grupo "Tono" del Tone Mallet, con su acomodo real
//   irregular (Treble/Bass arriba, Gain/Master a los costados, Mid Freq/Mid
//   Level abajo).
// - Flow: si CUALQUIER control no tiene posición, toda la caja usa flow
//   layout (fila/grid por orden), como ya era. Dentro de flow hay dos
//   variantes, elegidas por composición (no por nombre de grupo):
//   - Grid de 5 columnas si son puros faders deslizantes (ej. el
//     ecualizador gráfico del Hartke).
//   - Centrado si el grupo es un cluster funcional uniforme (todo perillas
//     o todo botones) -- ej. "Controles"/"Preamp"/"Contour / Master" del
//     Hartke.
//   - Repartido (espaciado parejo de punta a punta) en cualquier otro caso
//     -- grupos mixtos o puramente decorativos, ej. "Señalización superior"
//     (5 jacks/referencias) y "Pie" (1 jack + 1 botón) del Tone Mallet.
function PanelAgrupado({ controles, valores, onChange, tema }: PanelProps) {
  const sueltos = controles.filter((c) => c.grupo === null).sort((a, b) => a.orden - b.orden);

  const porGrupo = new Map<string, ControlDiseno[]>();
  for (const c of controles) {
    if (c.grupo === null) continue;
    const lista = porGrupo.get(c.grupo) ?? [];
    lista.push(c);
    porGrupo.set(c.grupo, lista);
  }
  const grupos = [...porGrupo.entries()]
    .map(([nombre, ctrls]) => ({ nombre, controles: [...ctrls].sort((a, b) => a.orden - b.orden) }))
    .sort((a, b) => Math.min(...a.controles.map((c) => c.orden)) - Math.min(...b.controles.map((c) => c.orden)));

  return (
    <div className="w-full rounded-2xl p-4" style={{ background: tema.fondo, border: `4px solid ${tema.acento}` }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {sueltos.length > 0 && (
          <div className="flex flex-row flex-wrap gap-3 sm:flex-col sm:gap-2.5">
            {sueltos.map((c) => renderControl(c, valores, onChange, false, tema, controles))}
          </div>
        )}
        {grupos.map((g) => {
          const habilitado = grupoHabilitado(g.nombre, controles, valores);
          const posicionLibre = g.controles.every((c) => c.posX !== null && c.posY !== null);
          const soloDeslizantes = !posicionLibre && g.controles.every((c) => c.tipo === "perilla" && c.estilo === "deslizante");
          const clusterUniforme =
            !posicionLibre && !soloDeslizantes && (g.controles.every((c) => c.tipo === "perilla") || g.controles.every((c) => c.tipo === "boton"));

          return (
            <div
              key={g.nombre}
              className={`min-w-0 p-3 ${posicionLibre ? "w-full" : "w-full sm:w-auto"}`}
              style={{ background: tema.fondo, border: `3px solid ${tema.texto}` }}
            >
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: tema.textoSecundario }}>
                {g.nombre}
              </div>
              {posicionLibre ? (
                <div className="relative w-full" style={{ aspectRatio: "3 / 2" }}>
                  {g.controles.map((c) => (
                    <div key={c.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.posX}%`, top: `${c.posY}%` }}>
                      {renderControl(c, valores, onChange, !habilitado, tema, controles)}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={
                    soloDeslizantes
                      ? "grid grid-cols-5 justify-items-center gap-x-2 gap-y-3"
                      : clusterUniforme
                        ? "flex flex-wrap items-center justify-center gap-x-3 gap-y-3"
                        : "flex flex-wrap items-center justify-between gap-x-3 gap-y-3"
                  }
                >
                  {g.controles.map((c) => renderControl(c, valores, onChange, !habilitado, tema, controles))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Dibuja el panel del dispositivo — agrupado por "grupo" si el diseño lo
// usa, o por posición libre si no (ver PanelAgrupado/PanelLibre arriba).
export function PanelDispositivo({
  controles,
  valores,
  onChange,
  colorFondo,
  colorAcento,
  colorTexto,
}: {
  controles: ControlDiseno[];
  valores: Record<string, number>;
  onChange: (controlId: string, valor: number) => void;
  colorFondo: string | null;
  colorAcento: string | null;
  colorTexto: string | null;
}) {
  const tema = construirTema(colorFondo, colorAcento, colorTexto);
  const usaGrupos = controles.some((c) => c.grupo !== null);
  return usaGrupos ? (
    <PanelAgrupado controles={controles} valores={valores} onChange={onChange} tema={tema} />
  ) : (
    <PanelLibre controles={controles} valores={valores} onChange={onChange} tema={tema} />
  );
}
