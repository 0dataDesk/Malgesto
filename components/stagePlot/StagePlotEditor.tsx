"use client";

import { useState, useTransition } from "react";
import type { StagePlotItem, PlazaConPersona } from "@/lib/stagePlotData";
import { ETIQUETA_TIPO, GLIFO_INSTRUMENTO, COLOR_ESCENARIO, type TipoItem } from "@/lib/stagePlotCatalogo";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { crearItemAction, moverItemAction, actualizarEtiquetaItemAction, eliminarItemAction } from "@/app/stage-plot/actions";
import { StagePlotLienzo, type PayloadNuevoItem } from "./StagePlotLienzo";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

const PLACEHOLDER_ETIQUETA: Record<Exclude<TipoItem, "musico" | "mic">, string> = {
  monitor: 'Ej. "Mix 1", "Mix 3 stereo"',
  di: 'Ej. "DI bajo"',
  power: 'Ej. "Power 1 - stage right"',
  riser: 'Ej. "2x1m, 40cm alto"',
};

// Chip arrastrable genérico de la paleta (Brief "Rediseño de Stage Plot —
// Entrega 1" §1): arrastrado con Drag and Drop nativo, mismo mecanismo de
// siempre (sin dependencias nuevas), pero ahora el payload es JSON
// (tipo + plazaId) en vez de un tipo suelto -- ver PayloadNuevoItem en
// StagePlotLienzo.
function ChipArrastrable({ payload, color, glifo, titulo, subtitulo }: { payload: PayloadNuevoItem; color: string; glifo: string; titulo: string; subtitulo?: string }) {
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
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-bold"
        style={{ background: color, color: "oklch(0.99 0.01 82)" }}
      >
        {glifo}
      </span>
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

const ESCENARIO: { tipo: Exclude<TipoItem, "musico" | "mic">; glifo: string }[] = [
  { tipo: "monitor", glifo: "MON" },
  { tipo: "di", glifo: "DI" },
  { tipo: "power", glifo: "PWR" },
  { tipo: "riser", glifo: "RSR" },
];

// Brief §1: paleta generada desde datos reales de la banda, no un catálogo
// fijo -- "Integrantes" (toda plaza con persona asignada), "Micrófono"
// (solo voz/coro, ya que son las que llevan mic vocal) y "Escenario"
// (genéricos, siempre iguales, sin plaza). Una banda sin plazas ve
// Integrantes/Micrófono vacíos y Escenario disponible igual.
function PaletaIconos({ plazas, bandaColor }: { plazas: PlazaConPersona[]; bandaColor: string }) {
  const mics = plazas.filter((p) => p.esVozOCoro);

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
            {plazas.map((p) => (
              <ChipArrastrable
                key={p.plazaId}
                payload={{ tipo: "musico", plazaId: p.plazaId }}
                color={bandaColor}
                glifo={GLIFO_INSTRUMENTO[p.instrumento]}
                titulo={etiquetaPlaza(p.instrumento, p.etiqueta)}
                subtitulo={p.nombrePersona}
              />
            ))}
          </div>
        )}
      </div>

      {mics.length > 0 && (
        <div>
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
            Micrófono
          </span>
          <div className="flex flex-wrap gap-2">
            {mics.map((p) => (
              <ChipArrastrable
                key={p.plazaId}
                payload={{ tipo: "mic", plazaId: p.plazaId }}
                color={bandaColor}
                glifo="MIC"
                titulo={etiquetaPlaza(p.instrumento, p.etiqueta)}
                subtitulo={p.nombrePersona}
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
          {ESCENARIO.map((e) => (
            <ChipArrastrable key={e.tipo} payload={{ tipo: e.tipo, plazaId: null }} color={COLOR_ESCENARIO[e.tipo]} glifo={e.glifo} titulo={ETIQUETA_TIPO[e.tipo]} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StagePlotEditor({
  bandaId,
  bandaColor,
  stagePlotId,
  itemsIniciales,
  plazas,
}: {
  bandaId: string;
  bandaColor: string;
  stagePlotId: string;
  itemsIniciales: StagePlotItem[];
  plazas: PlazaConPersona[];
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [etiquetaDraft, setEtiquetaDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seleccionado = items.find((i) => i.id === seleccionadoId) ?? null;
  // Brief §3: musico/mic no llevan etiqueta editable -- su identidad sale
  // de la plaza, no de texto capturado en el lienzo.
  const etiquetaEditable = seleccionado && seleccionado.tipo !== "musico" && seleccionado.tipo !== "mic";

  const seleccionar = (itemId: string) => {
    setSeleccionadoId(itemId);
    setEtiquetaDraft(items.find((i) => i.id === itemId)?.etiqueta ?? "");
  };

  const soltarNuevo = ({ tipo, plazaId }: PayloadNuevoItem, posX: number, posY: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const item = await crearItemAction(bandaId, stagePlotId, tipo, plazaId, posX, posY);
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
        <PaletaIconos plazas={plazas} bandaColor={bandaColor} />
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
                  placeholder={PLACEHOLDER_ETIQUETA[seleccionado.tipo as Exclude<TipoItem, "musico" | "mic">]}
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
            // Brief §3: nombre + instrumento leídos de la plaza, no
            // editables como texto libre acá -- si hace falta cambiarlos,
            // se edita la plaza/persona en Gestión, no el ítem del lienzo.
            <p className="text-sm" style={{ color: "oklch(0.35 0.02 55)" }}>
              {seleccionado.instrumento} · {seleccionado.nombrePersona}
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
