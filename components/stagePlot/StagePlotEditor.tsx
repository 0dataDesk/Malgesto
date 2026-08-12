"use client";

import { useState, useTransition } from "react";
import type { StagePlotItem, PlazaConPersona, AmplificadorAsignado } from "@/lib/stagePlotData";
import {
  ETIQUETA_TIPO,
  GLIFO_TIPO,
  GLIFO_INSTRUMENTO,
  FORMA_TIPO,
  COLOR_ESCENARIO,
  tieneEtiquetaEditable,
  type TipoEscenario,
} from "@/lib/stagePlotCatalogo";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { crearItemAction, moverItemAction, actualizarEtiquetaItemAction, eliminarItemAction } from "@/app/stage-plot/actions";
import { StagePlotLienzo, IconoConVoz, type PayloadNuevoItem } from "./StagePlotLienzo";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

const PLACEHOLDER_ETIQUETA: Record<TipoEscenario, string> = {
  mix: 'Ej. "Mix 1", "Mix 3 stereo"',
  side_fill: 'Ej. "Mix 7" (se numera igual que Mix)',
  di: 'Ej. "DI bajo"',
  power: 'Ej. "AC 1 - stage right"',
  riser: 'Ej. "2x1m, 40cm alto"',
};

// Chip arrastrable genérico de la paleta (Brief "Rediseño de Stage Plot —
// Entrega 1" §1): arrastrado con Drag and Drop nativo, mismo mecanismo de
// siempre (sin dependencias nuevas), pero ahora el payload es JSON
// (tipo + plazaId/dispositivoId) en vez de un tipo suelto -- ver
// PayloadNuevoItem en StagePlotLienzo. Brief "Stage Plot — Entrega 2": el
// ícono de la píldora ya no es un círculo fijo -- reusa IconoConVoz (mismo
// componente que dibuja los ítems en el lienzo) para que la paleta se vea
// idéntica a lo que se va a soltar, badges de voz/pedalera incluidos.
function ChipArrastrable({
  payload,
  forma,
  color,
  glifo,
  colorBorde,
  tieneVoz,
  cantidadPedales,
  titulo,
  subtitulo,
}: {
  payload: PayloadNuevoItem;
  forma: Parameters<typeof IconoConVoz>[0]["forma"];
  color: string;
  glifo: string;
  colorBorde?: string;
  tieneVoz?: boolean;
  cantidadPedales?: number;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/stage-plot-nuevo", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex cursor-grab items-center gap-2 rounded-full py-1.5 pl-2 pr-3"
      style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.86 0.016 78)" }}
    >
      <IconoConVoz forma={forma} color={color} glifo={glifo} colorBorde={colorBorde} tieneVoz={tieneVoz} cantidadPedales={cantidadPedales} />
      <div className="leading-tight">
        {/* Brief §1: instrumento como dato principal, más visible que el
            nombre -- por eso va primero y en negrita, el nombre queda
            secundario debajo. */}
        <div className="text-xs font-bold" style={{ color: "oklch(0.28 0.02 55)" }}>
          {titulo}
        </div>
        {subtitulo && (
          <div className="text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
            {subtitulo}
          </div>
        )}
      </div>
    </div>
  );
}

const TIPOS_ESCENARIO: TipoEscenario[] = ["mix", "side_fill", "di", "power", "riser"];

// Brief "Stage Plot — Entrega 2" §1: paleta generada desde datos reales de
// la banda -- "Integrantes" (toda plaza con persona asignada, una sola
// variante fija de músico/teclado por combinación real de voz, + un botón
// de "+ Pedalera" aparte si esa persona tiene pedales en Seteos), "Seteo"
// (un ítem por amplificador realmente asignado, §4) y "Escenario"
// (genéricos, siempre iguales, sin plaza/dispositivo). "Micrófono" como
// sección aparte queda obsoleta (Entrega 1) -- la voz ahora es un atributo
// visual automático del propio ícono, ver IconoConVoz.
function PaletaIconos({ plazas, amplificadores, bandaColor }: { plazas: PlazaConPersona[]; amplificadores: AmplificadorAsignado[]; bandaColor: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
          Integrantes
        </span>
        {plazas.length === 0 ? (
          <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
            Esta banda todavía no tiene integrantes con instrumento asignado.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {plazas.map((p) => {
              // Brief §3: teclado es un elemento aparte (forma distinta, no
              // circular), nunca el círculo genérico de músico, y nunca
              // ofrece pedalera aunque la persona tenga pedales en Seteos.
              const esTeclado = p.instrumento === "teclado_piano";
              return (
                <div key={p.plazaId} className="flex items-center gap-1.5">
                  <ChipArrastrable
                    payload={{ tipo: esTeclado ? "teclado" : "musico", plazaId: p.plazaId, dispositivoId: null }}
                    forma={esTeclado ? "rectangulo" : "circulo"}
                    color={bandaColor}
                    glifo={esTeclado ? GLIFO_TIPO.teclado : GLIFO_INSTRUMENTO[p.instrumento]}
                    tieneVoz={p.tieneVoz}
                    titulo={etiquetaPlaza(p.instrumento, p.etiqueta)}
                    subtitulo={p.nombrePersona}
                  />
                  {!esTeclado && p.cantidadPedales > 0 && (
                    <ChipArrastrable
                      payload={{ tipo: "pedalera", plazaId: p.plazaId, dispositivoId: null }}
                      forma="pedalera"
                      color={bandaColor}
                      glifo=""
                      cantidadPedales={p.cantidadPedales}
                      titulo="+ Pedalera"
                      subtitulo={`${Math.min(p.cantidadPedales, 6)} pedal${p.cantidadPedales === 1 ? "" : "es"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {amplificadores.length > 0 && (
        <div>
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
            Seteo
          </span>
          <div className="flex flex-wrap gap-2">
            {amplificadores.map((a) => (
              <ChipArrastrable
                key={a.dispositivoId}
                payload={{ tipo: "amplificador", plazaId: null, dispositivoId: a.dispositivoId }}
                forma="rectangulo"
                color={a.colorFondo}
                colorBorde={a.colorAcento}
                glifo={GLIFO_TIPO.amplificador}
                titulo={a.disenoNombre}
                subtitulo={a.nombrePersona}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
          Escenario
        </span>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ESCENARIO.map((tipo) => (
            <ChipArrastrable
              key={tipo}
              payload={{ tipo, plazaId: null, dispositivoId: null }}
              forma={FORMA_TIPO[tipo]}
              color={COLOR_ESCENARIO[tipo]}
              glifo={GLIFO_TIPO[tipo]}
              titulo={ETIQUETA_TIPO[tipo]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function etiquetaSeleccionado(item: StagePlotItem): string {
  if (item.tipo === "amplificador") return `${item.disenoNombre} · ${item.nombrePersona}`;
  if (item.tipo === "pedalera") return `Pedalera · ${item.nombrePersona}`;
  return `${item.instrumento} · ${item.nombrePersona}`;
}

export function StagePlotEditor({
  bandaId,
  bandaColor,
  stagePlotId,
  itemsIniciales,
  plazas,
  amplificadores,
}: {
  bandaId: string;
  bandaColor: string;
  stagePlotId: string;
  itemsIniciales: StagePlotItem[];
  plazas: PlazaConPersona[];
  amplificadores: AmplificadorAsignado[];
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [etiquetaDraft, setEtiquetaDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seleccionado = items.find((i) => i.id === seleccionadoId) ?? null;
  // Brief §3 (Entrega 1) / Entrega 2: solo los elementos de escenario sin
  // dueño llevan etiqueta editable -- el resto resuelve su identidad desde
  // la plaza o dispositivo asignado.
  const etiquetaEditable = seleccionado && tieneEtiquetaEditable(seleccionado.tipo);

  const seleccionar = (itemId: string) => {
    setSeleccionadoId(itemId);
    setEtiquetaDraft(items.find((i) => i.id === itemId)?.etiqueta ?? "");
  };

  const soltarNuevo = ({ tipo, plazaId, dispositivoId }: PayloadNuevoItem, posX: number, posY: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const item = await crearItemAction(bandaId, stagePlotId, tipo, plazaId, dispositivoId, posX, posY);
        setItems((prev) => [...prev, item]);
        seleccionar(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el ícono.");
      }
    });
  };

  const soltarMover = (itemId: string, posX: number, posY: number) => {
    // Optimista: la posición se ve al soltar, sin esperar la vuelta del
    // server action — coherente con que esto es un reposicionamiento
    // visual, no una operación con riesgo de datos (a diferencia de
    // Finanzas, ver memoria de proyecto).
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, posX, posY } : i)));
    startTransition(async () => {
      try {
        await moverItemAction(bandaId, itemId, posX, posY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la posición.");
      }
    });
  };

  const guardarEtiqueta = () => {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await actualizarEtiquetaItemAction(bandaId, seleccionado.id, etiquetaDraft);
        setItems((prev) => prev.map((i) => (i.id === seleccionado.id ? { ...i, etiqueta: etiquetaDraft.trim() || null } : i)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la etiqueta.");
      }
    });
  };

  const eliminarSeleccionado = () => {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarItemAction(bandaId, seleccionado.id);
        setItems((prev) => prev.filter((i) => i.id !== seleccionado.id));
        setSeleccionadoId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el ícono.");
      }
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-bricolage), sans-serif" }}>
          Editar Stage Plot
        </h1>
        <p className="mb-3 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Arrastrá un ícono de la paleta al lienzo para colocarlo. Ya puesto, se puede volver a arrastrar para reposicionarlo, o tocarlo para
          editarle la etiqueta o eliminarlo.
        </p>
        <PaletaIconos plazas={plazas} amplificadores={amplificadores} bandaColor={bandaColor} />
      </div>

      <StagePlotLienzo
        items={items}
        bandaColor={bandaColor}
        interactivo
        seleccionadoId={seleccionadoId}
        onSeleccionarItem={seleccionar}
        onSoltarNuevo={soltarNuevo}
        onSoltarMover={soltarMover}
      />

      {seleccionado && (
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{ETIQUETA_TIPO[seleccionado.tipo]} seleccionado</span>
            <button type="button" onClick={() => setSeleccionadoId(null)} className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
              Cerrar
            </button>
          </div>

          {etiquetaEditable ? (
            <>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
                Etiqueta (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  value={etiquetaDraft}
                  onChange={(e) => setEtiquetaDraft(e.target.value)}
                  placeholder={PLACEHOLDER_ETIQUETA[seleccionado.tipo as TipoEscenario]}
                  className={inputCls}
                  style={inputStyle}
                  maxLength={60}
                />
                <button
                  type="button"
                  onClick={guardarEtiqueta}
                  disabled={pending}
                  className="shrink-0 rounded-lg px-4 text-sm font-bold disabled:opacity-60"
                  style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
                >
                  Guardar
                </button>
              </div>
            </>
          ) : (
            // Brief §3 (Entrega 1): nombre + instrumento/diseño leídos de la
            // plaza o dispositivo, no editables como texto libre acá -- si
            // hace falta cambiarlos, se edita en Gestión/Seteos, no acá.
            <p className="text-sm" style={{ color: "oklch(0.35 0.02 55)" }}>
              {etiquetaSeleccionado(seleccionado)}
            </p>
          )}

          <button
            type="button"
            onClick={eliminarSeleccionado}
            disabled={pending}
            className="mt-3 text-sm font-bold disabled:opacity-60"
            style={{ color: "oklch(0.5 0.18 25)" }}
          >
            Eliminar del lienzo
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
