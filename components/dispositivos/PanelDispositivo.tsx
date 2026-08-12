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

function renderControl(
  c: ControlDiseno,
  valores: Record<string, number>,
  onChange: (controlId: string, valor: number) => void,
  disabled: boolean,
  tema: TemaDispositivo
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
  return <ControlDecorativo key={c.id} control={c} tema={tema} />;
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
          {renderControl(c, valores, onChange, false, tema)}
        </div>
      ))}
    </div>
  );
}

// Layout agrupado por "grupo" (brief §4 del brief anterior) — reemplaza
// pos_x/pos_y como fuente de verdad. Controles con el mismo grupo van
// juntos en una caja con marco (color_acento del diseño) y esquinas rectas,
// fondo del panel (color_fondo), etiqueta del grupo arriba. El mismo acento
// es el borde exterior del panel completo. Marco exterior y líneas de caja
// notablemente más gruesos (brief "...marco grueso" §3): 4px el exterior,
// 3px cada caja. Controles con grupo=null se dibujan sueltos, sin caja.
function grupoHabilitado(nombreGrupo: string, controles: ControlDiseno[], valores: Record<string, number>): boolean {
  const controlador = controles.find((c) => c.controlaGrupo === nombreGrupo);
  if (!controlador) return true;
  const max = controlador.max ?? 1;
  const valorActual = valores[controlador.id] ?? controlador.valorDefault ?? max;
  return valorActual === max;
}

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
            {sueltos.map((c) => renderControl(c, valores, onChange, false, tema))}
          </div>
        )}
        {grupos.map((g) => {
          const habilitado = grupoHabilitado(g.nombre, controles, valores);
          const soloDeslizantes = g.controles.every((c) => c.tipo === "perilla" && c.estilo === "deslizante");
          return (
            <div key={g.nombre} className="w-full min-w-0 p-3 sm:w-auto" style={{ background: tema.fondo, border: `3px solid ${tema.acento}` }}>
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: tema.textoSecundario }}>
                {g.nombre}
              </div>
              <div
                className={
                  soloDeslizantes
                    ? "grid grid-cols-5 justify-items-center gap-x-2 gap-y-3"
                    : "flex flex-wrap items-center justify-center gap-x-3 gap-y-3"
                }
              >
                {g.controles.map((c) => renderControl(c, valores, onChange, !habilitado, tema))}
              </div>
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
