"use client";

import type { ControlDiseno } from "@/lib/dispositivosData";
import { Knob } from "./Knob";
import { SliderVertical } from "./SliderVertical";
import { Boton } from "./Boton";
import { ControlDecorativo } from "./ControlDecorativo";

// Franja azul del panel real del Hartke — acento del borde exterior del
// panel COMPLETO en el layout agrupado, nunca de cada caja individual
// (brief "Seteos — rediseño de navegación, layout agrupado y selector de
// canción" §4).
const ACENTO_PANEL = "oklch(0.52 0.16 255)";

function renderControl(
  c: ControlDiseno,
  valores: Record<string, number>,
  onChange: (controlId: string, valor: number) => void,
  disabled = false
) {
  if (c.tipo === "perilla") {
    const valor = valores[c.id] ?? c.valorDefault ?? 0;
    return c.estilo === "deslizante" ? (
      <SliderVertical key={c.id} control={c} valor={valor} onChange={(v) => onChange(c.id, v)} disabled={disabled} />
    ) : (
      <Knob key={c.id} control={c} valor={valor} onChange={(v) => onChange(c.id, v)} disabled={disabled} />
    );
  }
  if (c.tipo === "boton") {
    return (
      <Boton key={c.id} control={c} valor={valores[c.id] ?? c.valorDefault ?? 0} onChange={(v) => onChange(c.id, v)} disabled={disabled} />
    );
  }
  return <ControlDecorativo key={c.id} control={c} />;
}

type PanelProps = {
  controles: ControlDiseno[];
  valores: Record<string, number>;
  onChange: (controlId: string, valor: number) => void;
};

// Layout viejo por posición libre (pos_x/pos_y) — se mantiene sin cambios
// para diseños que todavía no tienen "grupo" asignado a ningún control (ej.
// Tone Mallet, brief §5: "sin cambios por ahora").
function PanelLibre({ controles, valores, onChange }: PanelProps) {
  return (
    <div
      className="relative w-full overflow-visible rounded-2xl"
      style={{
        aspectRatio: "16 / 10",
        background: "linear-gradient(160deg, oklch(0.32 0.02 55), oklch(0.24 0.02 52))",
        border: "1px solid oklch(0.4 0.03 55)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px -14px rgba(0,0,0,0.6)",
      }}
    >
      {controles.map((c) => (
        <div
          key={c.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.posX ?? 50}%`, top: `${c.posY ?? 50}%` }}
        >
          {renderControl(c, valores, onChange)}
        </div>
      ))}
    </div>
  );
}

// Layout agrupado por "grupo" (brief §4) — reemplaza pos_x/pos_y como fuente
// de verdad. Controles con el mismo grupo van juntos en una caja con marco
// blanco y esquinas rectas, fondo negro, etiqueta del grupo arriba. El
// acento azul es el borde exterior del panel completo. Controles con
// grupo=null se dibujan sueltos, sin caja. Responsivo: en mobile las cajas
// se apilan en una columna; en pantallas más anchas se acomodan una al lado
// de la otra y envuelven — cada caja envuelve sus propios controles
// internamente si no entran en una fila.
// Un control puede "controlar" un grupo entero (brief "Hartke HA3500 —
// reagrupar cajas..." §5, ej. el In/Out del Hartke bypasea el Graphic
// Equalizer) — genérico por `controlaGrupo`, sin hardcodear ningún nombre de
// control. Un grupo gateado está habilitado cuando el valor actual de su
// controlador es igual al máximo de ese controlador (la posición "prendida"
// del on/off); sin controlador, siempre está habilitado.
function grupoHabilitado(nombreGrupo: string, controles: ControlDiseno[], valores: Record<string, number>): boolean {
  const controlador = controles.find((c) => c.controlaGrupo === nombreGrupo);
  if (!controlador) return true;
  // Mismo fallback que Boton.tsx para min/max nulos (binario 0/1 por defecto).
  const max = controlador.max ?? 1;
  const valorActual = valores[controlador.id] ?? controlador.valorDefault ?? max;
  return valorActual === max;
}

function PanelAgrupado({ controles, valores, onChange }: PanelProps) {
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
    <div className="w-full rounded-2xl p-4" style={{ background: "oklch(0.1 0 0)", border: `2px solid ${ACENTO_PANEL}` }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {sueltos.length > 0 && (
          <div className="flex flex-row flex-wrap gap-3 sm:flex-col sm:gap-2.5">
            {sueltos.map((c) => renderControl(c, valores, onChange))}
          </div>
        )}
        {grupos.map((g) => {
          const habilitado = grupoHabilitado(g.nombre, controles, valores);
          // Cajas de solo botones se centran (ej. "Controles"); cajas de
          // solo faders deslizantes fuerzan un grid de 5 columnas en vez de
          // envolver por ancho disponible (ej. el ecualizador gráfico, para
          // que siempre queden 2 filas de 5 parejas, no 6+4 según la
          // pantalla). Ninguna de las dos reglas depende del nombre del
          // grupo, solo de qué tipo de controles contiene.
          const soloBotones = g.controles.every((c) => c.tipo === "boton");
          const soloDeslizantes = g.controles.every((c) => c.tipo === "perilla" && c.estilo === "deslizante");
          return (
            <div key={g.nombre} className="w-full min-w-0 border border-white/60 bg-black p-3 sm:w-auto">
              <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-white/70">{g.nombre}</div>
              <div
                className={
                  soloDeslizantes
                    ? "grid grid-cols-5 justify-items-center gap-x-2 gap-y-3"
                    : soloBotones
                      ? "flex flex-wrap items-center justify-center gap-x-3 gap-y-3"
                      : "flex flex-wrap items-end gap-x-3 gap-y-3"
                }
              >
                {g.controles.map((c) => renderControl(c, valores, onChange, !habilitado))}
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
export function PanelDispositivo({ controles, valores, onChange }: PanelProps) {
  const usaGrupos = controles.some((c) => c.grupo !== null);
  return usaGrupos ? (
    <PanelAgrupado controles={controles} valores={valores} onChange={onChange} />
  ) : (
    <PanelLibre controles={controles} valores={valores} onChange={onChange} />
  );
}
