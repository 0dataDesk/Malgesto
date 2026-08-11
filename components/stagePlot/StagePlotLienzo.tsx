"use client";

import type { StagePlotItem } from "@/lib/stagePlotData";
import { ETIQUETA_TIPO, GLIFO_TIPO, GLIFO_INSTRUMENTO, FORMA_TIPO, COLOR_ESCENARIO, type TipoItem, type FormaItem } from "@/lib/stagePlotCatalogo";
import { colorConAlpha } from "@/lib/eventoUI";
import { textoLegibleSobre } from "@/lib/colorContraste";

// Brief "Rediseño de Stage Plot — Entrega 1" §1: lo que viaja al soltar un
// ítem nuevo desde la paleta -- antes solo era el tipo (texto plano en
// dataTransfer), ahora también la plaza cuando aplica (musico/mic), así
// que el payload es JSON en vez de un string suelto.
export type PayloadNuevoItem = { tipo: TipoItem; plazaId: string | null };

function tamanoForma(forma: FormaItem): { w: number; h: number } {
  switch (forma) {
    case "circulo":
      return { w: 44, h: 44 };
    case "circulo-chico":
      return { w: 30, h: 30 };
    case "rectangulo":
      return { w: 56, h: 38 };
    case "rectangulo-punteado":
      return { w: 80, h: 52 };
    case "rombo":
      return { w: 38, h: 38 };
    case "triangulo":
      return { w: 40, h: 38 };
  }
}

// Brief §2: forma por categoría -- un solo lugar arma el SVG de cada
// forma, reusado por cada ítem del lienzo. `glifo` es el texto corto
// dentro del ícono (para músico, el instrumento real vía
// GLIFO_INSTRUMENTO -- no un glifo fijo por tipo, ver stagePlotCatalogo).
function IconoForma({ forma, color, glifo }: { forma: FormaItem; color: string; glifo: string }) {
  const { w, h } = tamanoForma(forma);
  const colorTexto = textoLegibleSobre(color);

  switch (forma) {
    case "circulo":
    case "circulo-chico": {
      const r = w / 2 - 2;
      const cx = w / 2;
      const cy = h / 2;
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <circle cx={cx} cy={cy} r={r} fill={color} stroke="white" strokeWidth="2" />
          {glifo && (
            <text x={cx} y={cy + (forma === "circulo" ? 4 : 3)} textAnchor="middle" fontFamily="monospace" fontSize={forma === "circulo" ? 10 : 7.5} fontWeight="700" fill={colorTexto}>
              {glifo}
            </text>
          )}
        </svg>
      );
    }
    case "rectangulo":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="1" y="1" width={w - 2} height={h - 2} rx="6" fill={color} stroke="white" strokeWidth="2" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    case "rectangulo-punteado":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="2" y="2" width={w - 4} height={h - 4} rx="8" fill={colorConAlpha(color, 0.12)} stroke={color} strokeWidth="2.5" strokeDasharray="7 5" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="700" fill={color}>
            {glifo}
          </text>
        </svg>
      );
    case "rombo":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="6" y="6" width={w - 12} height={h - 12} rx="3" fill={color} stroke="white" strokeWidth="2" transform={`rotate(45 ${w / 2} ${h / 2})`} />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    case "triangulo":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={`${w / 2},3 ${w - 3},${h - 4} 3,${h - 4}`} fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
          <text x={w / 2} y={h - 8} textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
  }
}

function glifoDe(item: StagePlotItem): string {
  if (item.tipo === "musico") {
    return item.instrumentoTipo ? GLIFO_INSTRUMENTO[item.instrumentoTipo] : "MUS";
  }
  return GLIFO_TIPO[item.tipo];
}

function etiquetaVisible(item: StagePlotItem): string | null {
  if (item.tipo === "musico" || item.tipo === "mic") {
    if (!item.nombrePersona || !item.instrumento) return null;
    return `${item.instrumento} · ${item.nombrePersona}`;
  }
  return item.etiqueta;
}

// Lienzo fijo, proporción "hoja horizontal" (16:9) — es un diagrama
// relativo (izquierda/derecha/centro/adelante/atrás), no a escala real del
// venue (ver Brief Stage Plot). pos_x/pos_y son porcentaje 0-100 del
// lienzo, así que un mismo stage plot se ve igual en cualquier tamaño de
// pantalla — nunca en píxeles absolutos.
//
// Un solo componente para las 3 vistas (editor, solo-lectura autenticada,
// share público): `interactivo` habilita arrastrar para reposicionar y
// tocar para seleccionar; las otras dos vistas lo usan en modo lectura.
// Brief "Rediseño de Stage Plot — Entrega 1" §2: `bandaColor` tiñe
// musico/mic (los elementos de escenario usan sus colores neutros fijos,
// ver COLOR_ESCENARIO) -- antes cada rol musical tenía su propio color fijo
// sin relación con la banda; ahora el color identifica "esto es de esta
// banda", no "esto es un bajista".
export function StagePlotLienzo({
  items,
  bandaColor,
  interactivo = false,
  seleccionadoId = null,
  onSeleccionarItem,
  onSoltarNuevo,
  onSoltarMover,
}: {
  items: StagePlotItem[];
  bandaColor: string;
  interactivo?: boolean;
  seleccionadoId?: string | null;
  onSeleccionarItem?: (itemId: string) => void;
  onSoltarNuevo?: (payload: PayloadNuevoItem, posX: number, posY: number) => void;
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
              const nuevoJson = e.dataTransfer.getData("text/stage-plot-nuevo");
              const itemId = e.dataTransfer.getData("text/stage-plot-item");
              if (nuevoJson) {
                try {
                  onSoltarNuevo?.(JSON.parse(nuevoJson) as PayloadNuevoItem, posX, posY);
                } catch {
                  // dataTransfer corrupto/ajeno -- se ignora el drop en vez de tronar.
                }
              } else if (itemId) onSoltarMover?.(itemId, posX, posY);
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
        const forma = FORMA_TIPO[item.tipo];
        const color = item.tipo === "musico" || item.tipo === "mic" ? bandaColor : COLOR_ESCENARIO[item.tipo];
        const etiqueta = etiquetaVisible(item);
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
              className="rounded-full"
              style={{ boxShadow: activo ? "0 0 0 3px oklch(0.99 0.01 82), 0 0 0 5px oklch(0.24 0.02 55)" : "0 4px 10px -4px rgba(0,0,0,0.4)" }}
              title={ETIQUETA_TIPO[item.tipo]}
            >
              <IconoForma forma={forma} color={color} glifo={glifoDe(item)} />
            </div>
            {etiqueta && (
              <span
                className="mt-1 max-w-[110px] truncate rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-semibold"
                style={{ background: "oklch(0.99 0.008 82 / 0.92)", color: "oklch(0.3 0.02 55)", border: "1px solid oklch(0.86 0.016 78)" }}
              >
                {etiqueta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
