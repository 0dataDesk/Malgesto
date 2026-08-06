"use client";

import { useState, useTransition } from "react";
import type { StagePlotItem } from "@/lib/stagePlotData";
import { TIPOS_ITEM, ETIQUETA_TIPO, GLIFO_TIPO, COLOR_TIPO, type TipoItem } from "@/lib/stagePlotCatalogo";
import { crearItemAction, moverItemAction, actualizarEtiquetaItemAction, eliminarItemAction } from "@/app/stage-plot/actions";
import { StagePlotLienzo } from "./StagePlotLienzo";
import { StagePlotAcciones } from "./StagePlotAcciones";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

// Paleta de íconos arrastrables (Brief Stage Plot §2): un chip por tipo,
// arrastrado con Drag and Drop nativo (sin dependencias nuevas — ver
// investigación previa, no había ninguna librería de DnD en el repo).
// Reposicionar un ícono ya puesto usa el mismo mecanismo: StagePlotLienzo
// distingue "nuevo desde paleta" de "mover existente" por qué dataTransfer
// key trae el drop (ver onSoltarNuevo/onSoltarMover acá abajo).
function PaletaIconos() {
  return (
    <div className="flex flex-wrap gap-2">
      {TIPOS_ITEM.map((tipo) => (
        <div
          key={tipo}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/stage-plot-nuevo", tipo);
            e.dataTransfer.effectAllowed = "copy";
          }}
          className="flex cursor-grab items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-xs font-bold"
          style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.86 0.016 78)" }}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[8px] font-bold"
            style={{ background: COLOR_TIPO[tipo], color: "oklch(0.99 0.01 82)" }}
          >
            {GLIFO_TIPO[tipo]}
          </span>
          {ETIQUETA_TIPO[tipo]}
        </div>
      ))}
    </div>
  );
}

export function StagePlotEditor({
  bandaId,
  bandaNombre,
  stagePlotId,
  itemsIniciales,
  shareToken,
}: {
  bandaId: string;
  bandaNombre: string;
  stagePlotId: string;
  itemsIniciales: StagePlotItem[];
  shareToken: string;
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [etiquetaDraft, setEtiquetaDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seleccionado = items.find((i) => i.id === seleccionadoId) ?? null;

  const seleccionar = (itemId: string) => {
    setSeleccionadoId(itemId);
    setEtiquetaDraft(items.find((i) => i.id === itemId)?.etiqueta ?? "");
  };

  const soltarNuevo = (tipo: TipoItem, posX: number, posY: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const item = await crearItemAction(bandaId, stagePlotId, tipo, null, posX, posY);
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
        <PaletaIconos />
      </div>

      <StagePlotLienzo
        items={items}
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
          <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
            Etiqueta (opcional)
          </label>
          <div className="flex gap-2">
            <input
              value={etiquetaDraft}
              onChange={(e) => setEtiquetaDraft(e.target.value)}
              placeholder='Ej. "Ampli de bajo Fender", "Vocal principal"'
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

      <StagePlotAcciones items={items} bandaNombre={bandaNombre} shareToken={shareToken} />
    </div>
  );
}
