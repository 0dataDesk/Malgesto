"use client";

import type { StagePlotItem } from "@/lib/stagePlotData";
import {
  ETIQUETA_TIPO,
  GLIFO_TIPO,
  GLIFO_INSTRUMENTO,
  FORMA_TIPO,
  COLOR_ESCENARIO,
  COLOR_PEDALERA,
  COLOR_MIC_FONDO,
  COLOR_MIC_DETALLE,
  type TipoItem,
  type FormaItem,
  type TipoEscenario,
} from "@/lib/stagePlotCatalogo";
import { colorConAlpha } from "@/lib/eventoUI";
import { textoLegibleSobre } from "@/lib/colorContraste";

// Brief "Rediseño de Stage Plot — Entrega 1" §1: lo que viaja al soltar un
// ítem nuevo desde la paleta -- antes solo era el tipo (texto plano en
// dataTransfer), ahora también la plaza/dispositivo cuando aplica, así que
// el payload es JSON en vez de un string suelto. Brief "Stage Plot —
// Entrega 2" §4: se suma `dispositivoId` para amplificador. Brief "ajustes
// visuales" §7: `etiqueta` opcional -- las 2 variantes de Side Fill (L/R)
// de la paleta la precargan ("L"/"R") al crear el ítem, editable después
// igual que cualquier etiqueta de escenario.
export type PayloadNuevoItem = { tipo: TipoItem; plazaId: string | null; dispositivoId: string | null; etiqueta?: string | null };

function tamanoForma(forma: FormaItem): { w: number; h: number } {
  switch (forma) {
    case "circulo":
      return { w: 44, h: 44 };
    case "circulo-chico":
      return { w: 30, h: 30 };
    case "rectangulo":
      return { w: 56, h: 38 };
    // Brief "ajustes visuales" §10: menos alto que el rectángulo genérico
    // de teclado -- amplificador real es más aplanado/horizontal.
    case "rectangulo-plano":
      return { w: 60, h: 24 };
    // Brief "ajustes visuales" §8: notoriamente grande -- referencia
    // concreta de 2 a 2.5x el diámetro del círculo de músico (44), para que
    // se lea como "acá va el espacio de la batería" (antes, corregido mal
    // una vez, había quedado más chico que DI/AC en vez de más grande).
    case "rectangulo-punteado":
      return { w: 104, h: 76 };
    // Brief §6: mismo tamaño que tenía como "rectangulo" (Mix no se toca en
    // tamaño, solo cambia de forma).
    case "trapecio-invertido":
      return { w: 56, h: 38 };
    // Brief §7: mismo trapecio de Mix, rotado ~45° -- viewBox más ancho y
    // cuadrado para que la rotación no recorte las puntas de la figura.
    case "trapecio-invertido-45":
      return { w: 58, h: 58 };
    // Brief §3: mitad del tamaño anterior (38x38).
    case "rombo":
      return { w: 19, h: 19 };
    // Brief §4: mitad del tamaño anterior (40x38).
    case "triangulo":
      return { w: 20, h: 19 };
    // Brief §5: mitad del tamaño anterior (46x30).
    case "pedalera":
      return { w: 23, h: 15 };
  }
}

// Brief §2: forma por categoría -- un solo lugar arma el SVG de cada
// forma, reusado por cada ítem del lienzo. `glifo` es el texto corto
// dentro del ícono (para músico, el instrumento real vía
// GLIFO_INSTRUMENTO -- no un glifo fijo por tipo, ver stagePlotCatalogo).
// Brief "Stage Plot — Entrega 2" §2: `cantidadPedales` solo aplica a
// forma="pedalera" -- dibuja una grilla de 6 casillas, tantas prendidas
// como pedales reales tenga la persona dueña (ya acotado a 6 en
// stagePlotData).
function IconoForma({
  forma,
  color,
  glifo,
  colorBorde = "white",
  cantidadPedales = 0,
}: {
  forma: FormaItem;
  color: string;
  glifo: string;
  colorBorde?: string;
  cantidadPedales?: number;
}) {
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
          <circle cx={cx} cy={cy} r={r} fill={color} stroke={colorBorde} strokeWidth="2" />
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
          <rect x="1" y="1" width={w - 2} height={h - 2} rx="6" fill={color} stroke={colorBorde} strokeWidth="2" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    // Brief "ajustes visuales" §10: mismo dibujo que "rectangulo" pero con
    // su propio tamaño (más aplanado, ver tamanoForma) -- por eso texto más
    // chico, si no el glifo se ve apretado en un rectángulo bajo.
    case "rectangulo-plano":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="1" y="1" width={w - 2} height={h - 2} rx="5" fill={color} stroke={colorBorde} strokeWidth="2" />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="700" fill={colorTexto}>
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
    // Brief §6: corte transversal de una cuña de monitor real -- más ancho
    // arriba, angosto abajo. El glifo queda siempre horizontal (no
    // rotado), centrado en el medio de la figura.
    case "trapecio-invertido":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={`4,3 ${w - 4},3 ${w * 0.72},${h - 3} ${w * 0.28},${h - 3}`} fill={color} stroke={colorBorde} strokeWidth="2" strokeLinejoin="round" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    // Brief §7: mismo trapecio de arriba, rotado ~45° -- el `transform`
    // rota solo el polígono (mismo criterio que "rombo" con su rect), el
    // texto se dibuja aparte para que quede siempre legible/horizontal.
    case "trapecio-invertido-45":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon
            points="9,11 49,11 41,47 17,47"
            fill={color}
            stroke={colorBorde}
            strokeWidth="2"
            strokeLinejoin="round"
            transform={`rotate(45 ${w / 2} ${h / 2})`}
          />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    case "rombo":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="3" y="3" width={w - 6} height={h - 6} rx="2" fill={color} stroke="white" strokeWidth="1.5" transform={`rotate(45 ${w / 2} ${h / 2})`} />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" fontFamily="monospace" fontSize="6" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    case "triangulo":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={`${w / 2},1.5 ${w - 1.5},${h - 2} 1.5,${h - 2}`} fill={color} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          <text x={w / 2} y={h - 4} textAnchor="middle" fontFamily="monospace" fontSize="6" fontWeight="700" fill={colorTexto}>
            {glifo}
          </text>
        </svg>
      );
    case "pedalera": {
      const columnas = 3;
      const filas = 2;
      const pad = 2;
      const gap = 1.5;
      const cellW = (w - pad * 2 - gap * (columnas - 1)) / columnas;
      const cellH = (h - pad * 2 - gap * (filas - 1)) / filas;
      const casillas = Array.from({ length: columnas * filas }, (_, idx) => {
        const prendida = idx < cantidadPedales;
        const x = pad + (idx % columnas) * (cellW + gap);
        const y = pad + Math.floor(idx / columnas) * (cellH + gap);
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={cellW}
            height={cellH}
            rx="1"
            fill={prendida ? "white" : "none"}
            fillOpacity={prendida ? 0.95 : 1}
            stroke="white"
            strokeOpacity={prendida ? 1 : 0.4}
            strokeWidth="1"
          />
        );
      });
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x="1" y="1" width={w - 2} height={h - 2} rx="3" fill={color} stroke="white" strokeWidth="1.5" />
          {casillas}
        </svg>
      );
    }
  }
}

// Brief "Stage Plot — Entrega 2" §1/§3: el indicador de voz ya no es un
// ítem "mic" aparte para arrastrar -- es un círculo chico automático según
// `item.tieneVoz`. Brief "ajustes visuales" §11: pasa de la esquina
// inferior derecha al centro del borde inferior de la figura, y de color
// de banda a un color fijo "de micrófono real" (gris oscuro con un detalle
// interior más claro), igual en toda la app sin importar la banda.
export function IconoConVoz({
  forma,
  color,
  glifo,
  colorBorde = "white",
  tieneVoz = false,
  cantidadPedales = 0,
}: {
  forma: FormaItem;
  color: string;
  glifo: string;
  colorBorde?: string;
  tieneVoz?: boolean;
  cantidadPedales?: number;
}) {
  const { w, h } = tamanoForma(forma);
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <IconoForma forma={forma} color={color} glifo={glifo} colorBorde={colorBorde} cantidadPedales={cantidadPedales} />
      {tieneVoz && (
        <span
          className="absolute rounded-full"
          style={{
            width: 15,
            height: 15,
            left: "50%",
            bottom: -6,
            transform: "translateX(-50%)",
            background: COLOR_MIC_FONDO,
            border: "2px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
          }}
        >
          <span
            className="absolute rounded-full"
            style={{ width: 5, height: 5, left: "50%", top: 2, transform: "translateX(-50%)", background: COLOR_MIC_DETALLE }}
          />
        </span>
      )}
    </div>
  );
}

function glifoDe(item: StagePlotItem): string {
  if (item.tipo === "musico") {
    return item.instrumentoTipo ? GLIFO_INSTRUMENTO[item.instrumentoTipo] : "MUS";
  }
  return GLIFO_TIPO[item.tipo];
}

// Brief "Stage Plot — Entrega 2" §4: color por tipo de dueño -- ítems de
// una persona (musico/mic/teclado) usan el color de la banda, amplificador
// usa los colores reales de marca del diseño asignado (nunca un color
// genérico de la app), el resto usa su color neutro fijo de escenario.
// Brief "ajustes visuales" §5: pedalera sale de este grupo -- es equipo
// genérico, no identidad de integrante, así que pasa a su gris fijo
// (COLOR_PEDALERA) en vez de bandaColor.
function colorDeItem(item: StagePlotItem, bandaColor: string): string {
  if (item.tipo === "amplificador") return item.colorFondo ?? bandaColor;
  if (item.tipo === "pedalera") return COLOR_PEDALERA;
  if (item.tipo === "musico" || item.tipo === "mic" || item.tipo === "teclado") return bandaColor;
  return COLOR_ESCENARIO[item.tipo as TipoEscenario];
}

// Brief §4: "usando los colores reales de marca del diseño" cubre AMBOS
// colores del diseño, no solo el de fondo -- colorAcento se usa como borde
// del rectángulo en vez del blanco genérico de siempre, así el amplificador
// se ve con su identidad completa (ej. Hartke: fondo azul, borde/acento
// distinto), igual que en su panel de Seteos.
function bordeDeItem(item: StagePlotItem): string {
  if (item.tipo === "amplificador") return item.colorAcento ?? "white";
  return "white";
}

// Brief "Stage Plot — Entrega 2" §6: guías puramente visuales, sin
// interacción -- una cruz continua muy discreta (4 cuadrantes) y una
// cuadrícula punteada aún más discreta (9 celdas), para diferenciarlas
// entre sí a simple vista. `pointer-events-none` para no interferir con
// drag/click de los ítems reales; viewBox 0-100 porque los ítems ya se
// posicionan en ese mismo sistema de porcentaje.
function GuiasLienzo() {
  const colorGuia = "oklch(0.5 0.02 55)";
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="50" y1="0" x2="50" y2="100" stroke={colorGuia} strokeOpacity="0.16" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="50" x2="100" y2="50" stroke={colorGuia} strokeOpacity="0.16" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1="33.333" y1="0" x2="33.333" y2="100" stroke={colorGuia} strokeOpacity="0.09" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <line x1="66.667" y1="0" x2="66.667" y2="100" stroke={colorGuia} strokeOpacity="0.09" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="33.333" x2="100" y2="33.333" stroke={colorGuia} strokeOpacity="0.09" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="66.667" x2="100" y2="66.667" stroke={colorGuia} strokeOpacity="0.09" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
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
    <div className="flex flex-col gap-1.5">
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
        <GuiasLienzo />

        {items.map((item) => {
          const activo = item.id === seleccionadoId;
          const forma = FORMA_TIPO[item.tipo];
          const color = colorDeItem(item, bandaColor);
          const colorBorde = bordeDeItem(item);
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
              className="absolute"
              style={{
                left: `${item.posX}%`,
                top: `${item.posY}%`,
                transform: "translate(-50%, -50%)",
                cursor: interactivo ? "grab" : "default",
              }}
            >
              {/* Brief "ajustes visuales" §2: sin cajita de nombre/instrumento
                  debajo -- el badge de 3 letras del ícono alcanza para
                  identificar de un vistazo; el nombre completo sigue
                  disponible al seleccionar el ítem (panel "... seleccionado"
                  en StagePlotEditor). */}
              <div
                className="rounded-full"
                style={{ boxShadow: activo ? "0 0 0 3px oklch(0.99 0.01 82), 0 0 0 5px oklch(0.24 0.02 55)" : "0 4px 10px -4px rgba(0,0,0,0.4)" }}
                title={ETIQUETA_TIPO[item.tipo]}
              >
                <IconoConVoz forma={forma} color={color} glifo={glifoDe(item)} colorBorde={colorBorde} tieneVoz={item.tieneVoz} cantidadPedales={item.cantidadPedales} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Brief "Stage Plot — Entrega 2" §6: fuera del recuadro con las
          guías, no pegado al borde interior (antes era un overlay
          absoluto dentro del mismo div con la cruz/cuadrícula). */}
      <div className="text-center font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "oklch(0.7 0.02 55)" }}>
        Frente del escenario (público)
      </div>
    </div>
  );
}
