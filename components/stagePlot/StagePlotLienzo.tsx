"use client";

import type { StagePlotItem } from "@/lib/stagePlotData";
import { ETIQUETA_TIPO, GLIFO_TIPO, COLOR_TIPO, type TipoItem } from "@/lib/stagePlotCatalogo";

// Lienzo fijo, proporción "hoja horizontal" (16:9) — es un diagrama
// relativo (izquierda/derecha/centro/adelante/atrás), no a escala real del
// venue (ver Brief Stage Plot). pos_x/pos_y son porcentaje 0-100 del
// lienzo, así que un mismo stage plot se ve igual en cualquier tamaño de
// pantalla — nunca en píxeles absolutos.
//
// Un solo componente para las 3 vistas (editor, solo-lectura autenticada,
// share público): `interactivo` habilita arrastrar para reposicionar y
// tocar para seleccionar; las otras dos vistas lo usan en modo lectura.
export function StagePlotLienzo({
  items,
  interactivo = false,
  seleccionadoId = null,
  onSeleccionarItem,
  onSoltarNuevo,
  onSoltarMover,
}: {
  items: StagePlotItem[];
  interactivo?: boolean;
  seleccionadoId?: string | null;
  onSeleccionarItem?: (itemId: string) => void;
  onSoltarNuevo?: (tipo: TipoItem, posX: number, posY: number) => void;
  onSoltarMover?: (itemId: string, posX: number, posY: number) => void;
}) {
  const calcularPosicion = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = ((e.clientX - rect.left) / rect.width) * 100;
    const posY = ((e.clientY - rect.top) / rect.height) * 100;
    return { posX: Math.min(100, Math.max(0, posX)), posY: Math.min(100, Math.max(0, posY)) };
  };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl"
      style={{ aspectRatio: "16 / 9", background: "oklch(0.99 0.008 82)", border: "2px solid oklch(0.82 0.016 78)" }}
      onDragOver={interactivo ? (e) => e.preventDefault() : undefined}
      onDrop={
        interactivo
          ? (e) => {
              e.preventDefault();
              const { posX, posY } = calcularPosicion(e);
              const nuevoTipo = e.dataTransfer.getData("text/stage-plot-nuevo");
              const itemId = e.dataTransfer.getData("text/stage-plot-item");
              if (nuevoTipo) onSoltarNuevo?.(nuevoTipo as TipoItem, posX, posY);
              else if (itemId) onSoltarMover?.(itemId, posX, posY);
            }
          : undefined
      }
    >
      {/* Marco de referencia "frente del escenario" — puramente visual, orienta
          al sonidista sin implicar medidas reales. */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "oklch(0.7 0.02 55)", paddingBottom: 6 }}
      >
        Frente del escenario (público)
      </div>

      {items.map((item) => {
        const activo = item.id === seleccionadoId;
        return (
          <div
            key={item.id}
            draggable={interactivo}
            onDragStart={
              interactivo
                ? (e) => {
                    e.dataTransfer.setData("text/stage-plot-item", item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }
                : undefined
            }
            onClick={interactivo ? () => onSeleccionarItem?.(item.id) : undefined}
            className="absolute flex flex-col items-center"
            style={{
              left: `${item.posX}%`,
              top: `${item.posY}%`,
              transform: "translate(-50%, -50%)",
              cursor: interactivo ? "grab" : "default",
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full font-mono text-[10px] font-bold"
              style={{
                background: COLOR_TIPO[item.tipo],
                color: "oklch(0.99 0.01 82)",
                boxShadow: activo ? "0 0 0 3px oklch(0.99 0.01 82), 0 0 0 5px oklch(0.24 0.02 55)" : "0 4px 10px -4px rgba(0,0,0,0.4)",
              }}
              title={ETIQUETA_TIPO[item.tipo]}
            >
              {GLIFO_TIPO[item.tipo]}
            </div>
            {item.etiqueta && (
              <span
                className="mt-1 max-w-[90px] truncate rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-semibold"
                style={{ background: "oklch(0.99 0.008 82 / 0.92)", color: "oklch(0.3 0.02 55)", border: "1px solid oklch(0.86 0.016 78)" }}
              >
                {item.etiqueta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
