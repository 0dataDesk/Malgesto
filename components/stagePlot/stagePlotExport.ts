import type { StagePlotItem } from "@/lib/stagePlotData";
import {
  GLIFO_TIPO,
  GLIFO_INSTRUMENTO,
  FORMA_TIPO,
  COLOR_ESCENARIO,
  COLOR_PEDALERA,
  COLOR_MIC_FONDO,
  COLOR_MIC_DETALLE,
  type FormaItem,
  type TipoEscenario,
} from "@/lib/stagePlotCatalogo";
import { MESES } from "@/lib/eventoUI";
import { ahoraEnZonaApp } from "@/lib/zonaHoraria";

// Construye el SVG de forma independiente del DOM interactivo (no lo
// serializa desde la pantalla) — mismo catálogo de forma/color/glifo que
// StagePlotLienzo, así que el resultado se ve igual, pero esta función no
// depende de nada que el usuario haya arrastrado/seleccionado en ese
// momento. viewBox 1600x900 (16:9, "hoja horizontal") — pos_x/pos_y (0-100)
// se escalan directo a esas unidades, en los dos ejes por igual, así los
// íconos no se deforman.
function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function glifoDe(item: StagePlotItem): string {
  if (item.tipo === "musico") return item.instrumentoTipo ? GLIFO_INSTRUMENTO[item.instrumentoTipo] : "MUS";
  return GLIFO_TIPO[item.tipo];
}

// Brief "Stage Plot — Entrega 2" §1/§2/§4: mismo criterio que
// etiquetaVisible en StagePlotLienzo.tsx (no comparten código -- este
// archivo arma un string SVG, el otro es DOM/React -- pero sí el mismo
// catálogo y las mismas reglas por tipo, para que la imagen exportada se
// vea igual que el lienzo interactivo).
function etiquetaVisible(item: StagePlotItem): string | null {
  if (item.tipo === "musico" || item.tipo === "mic" || item.tipo === "teclado") {
    if (!item.nombrePersona || !item.instrumento) return null;
    return `${item.instrumento} · ${item.nombrePersona}`;
  }
  if (item.tipo === "pedalera") {
    return item.nombrePersona ? `Pedalera · ${item.nombrePersona}` : "Pedalera";
  }
  if (item.tipo === "amplificador") {
    if (!item.disenoNombre || !item.nombrePersona) return null;
    return `${item.disenoNombre} · ${item.nombrePersona}`;
  }
  return item.etiqueta;
}

// §4: musico/mic/teclado son ítems de una persona (color de banda);
// amplificador usa los colores reales de marca del diseño asignado; el
// resto usa su color neutro fijo de escenario. Brief "ajustes visuales" §5:
// pedalera sale de este grupo -- pasa a su gris fijo (COLOR_PEDALERA), ya
// no bandaColor, igual que en StagePlotLienzo.
function colorDeItem(item: StagePlotItem, bandaColor: string): string {
  if (item.tipo === "amplificador") return item.colorFondo ?? bandaColor;
  if (item.tipo === "pedalera") return COLOR_PEDALERA;
  if (item.tipo === "musico" || item.tipo === "mic" || item.tipo === "teclado") return bandaColor;
  return COLOR_ESCENARIO[item.tipo as TipoEscenario];
}

// §4: colorAcento como borde del rectángulo de amplificador en vez del
// blanco genérico -- ambos colores de marca del diseño quedan visibles,
// igual que en su panel de Seteos.
function bordeDeItem(item: StagePlotItem): string {
  if (item.tipo === "amplificador") return item.colorAcento ?? "white";
  return "white";
}

// Brief §1/§3: desplazamiento del centro del badge de voz respecto al
// centro de cada forma -- no hay un tamaño único (cada forma tiene su
// propio ancho/alto en este archivo, ver formaSvg), así que el offset está
// calibrado a mano por forma. Brief "ajustes visuales" §11: el badge pasa
// del borde inferior derecho al centro del borde inferior -- por eso `dx`
// es 0 en todos los casos, `dy` es la mitad del alto de cada forma (solo
// importa para circulo/circulo-chico/rectangulo, las únicas formas que
// puedeMostrarVoz habilita hoy -- el resto del Record existe por
// exhaustividad de TypeScript, sin efecto visual real).
const OFFSET_VOZ: Record<FormaItem, { dx: number; dy: number }> = {
  circulo: { dx: 0, dy: 34 },
  "circulo-chico": { dx: 0, dy: 23 },
  rectangulo: { dx: 0, dy: 30 },
  "rectangulo-plano": { dx: 0, dy: 21 },
  "rectangulo-punteado": { dx: 0, dy: 56 },
  "trapecio-invertido": { dx: 0, dy: 30 },
  "trapecio-invertido-45": { dx: 0, dy: 43 },
  rombo: { dx: 0, dy: 12 },
  triangulo: { dx: 0, dy: 17 },
  pedalera: { dx: 0, dy: 13 },
};

// Brief §11: color fijo "de micrófono real" (gris oscuro + detalle interior
// más claro) en vez del color de la banda -- mismo criterio que
// IconoConVoz en StagePlotLienzo.tsx.
function badgeVozSvg(forma: FormaItem, cx: number, cy: number): string {
  const { dx, dy } = OFFSET_VOZ[forma];
  const bx = cx + dx;
  const by = cy + dy;
  return `<circle cx="${bx}" cy="${by}" r="10" fill="${COLOR_MIC_FONDO}" stroke="white" stroke-width="2.5" /><circle cx="${bx}" cy="${by - 3}" r="3.5" fill="${COLOR_MIC_DETALLE}" />`;
}

// Brief "Rediseño de Stage Plot — Entrega 1" §2: mismas formas que el
// lienzo interactivo (StagePlotLienzo), reimplementadas acá en SVG puro
// centrado en (cx, cy) -- los dos no comparten código (uno es DOM/CSS, el
// otro un string SVG armado a mano) pero sí el mismo catálogo de tamaños/
// colores, para que el documento exportado se vea como una versión prolija
// del lienzo, no como algo distinto. Brief "Stage Plot — Entrega 2" §2:
// "pedalera" dibuja una grilla de 6 casillas en vez de glifo, tantas
// prendidas como `cantidadPedales` (ya acotado a 6 en stagePlotData).
function formaSvg(forma: FormaItem, cx: number, cy: number, color: string, colorTexto: string, glifo: string, colorBorde: string, cantidadPedales: number): string {
  const texto = (x: number, y: number, size: number, fill: string) =>
    glifo ? `<text x="${x}" y="${y}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="${size}" font-weight="700" fill="${fill}">${escaparXml(glifo)}</text>` : "";

  switch (forma) {
    case "circulo":
      return `<circle cx="${cx}" cy="${cy}" r="30" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" />${texto(cx, cy + 4, 12, colorTexto)}`;
    case "circulo-chico":
      return `<circle cx="${cx}" cy="${cy}" r="20" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" />${texto(cx, cy + 3, 9, colorTexto)}`;
    case "rectangulo":
      return `<rect x="${cx - 38}" y="${cy - 26}" width="76" height="52" rx="8" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" />${texto(cx, cy + 5, 12, colorTexto)}`;
    // Brief "ajustes visuales" §10: mismo dibujo que "rectangulo", con su
    // propio tamaño más aplanado (ver tamanoForma en StagePlotLienzo.tsx
    // para el equivalente DOM) y texto más chico acorde.
    case "rectangulo-plano":
      return `<rect x="${cx - 41}" y="${cy - 17}" width="82" height="34" rx="7" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" />${texto(cx, cy + 4, 10, colorTexto)}`;
    case "rectangulo-punteado":
      // Brief "ajustes visuales" §8: notoriamente grande -- 2 a 2.5x el
      // diámetro del círculo de músico (r=30, diámetro 60), ver tamanoForma
      // en StagePlotLienzo.tsx para el equivalente DOM.
      return `<rect x="${cx - 71}" y="${cy - 52}" width="142" height="104" rx="14" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="3" stroke-dasharray="9 7" />${texto(cx, cy + 5, 12, color)}`;
    // Brief §6: corte transversal de una cuña de monitor real -- mismo
    // tamaño que tenía como "rectangulo" (Mix no se toca en tamaño).
    case "trapecio-invertido":
      return `<polygon points="${cx - 33},${cy - 22} ${cx + 33},${cy - 22} ${cx + 16},${cy + 22} ${cx - 16},${cy + 22}" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" stroke-linejoin="round" />${texto(cx, cy + 5, 12, colorTexto)}`;
    // Brief §7: mismo trapecio de arriba, rotado ~45°.
    case "trapecio-invertido-45":
      return `<polygon points="${cx - 27},${cy - 24} ${cx + 27},${cy - 24} ${cx + 16},${cy + 24} ${cx - 16},${cy + 24}" fill="${color}" stroke="${colorBorde}" stroke-width="2.5" stroke-linejoin="round" transform="rotate(45 ${cx} ${cy})" />${texto(cx, cy + 4, 11, colorTexto)}`;
    // Brief §3: mitad del tamaño anterior (rect 36x36 pre-rotación).
    case "rombo":
      return `<rect x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="2" fill="${color}" stroke="${colorBorde}" stroke-width="1.5" transform="rotate(45 ${cx} ${cy})" />${texto(cx, cy + 3, 6, colorTexto)}`;
    // Brief §4: mitad del tamaño anterior (54x49).
    case "triangulo":
      return `<polygon points="${cx},${cy - 13.5} ${cx + 13.5},${cy + 11} ${cx - 13.5},${cy + 11}" fill="${color}" stroke="${colorBorde}" stroke-width="1.5" stroke-linejoin="round" />${texto(cx, cy + 8, 6, colorTexto)}`;
    // Brief §5: mitad del tamaño anterior (62x40).
    case "pedalera": {
      const w = 31;
      const h = 20;
      const x0 = cx - w / 2;
      const y0 = cy - h / 2;
      const fondo = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="${colorBorde}" stroke-width="1.5" />`;
      const columnas = 3;
      const filas = 2;
      const pad = 3;
      const gap = 2;
      const cellW = (w - pad * 2 - gap * (columnas - 1)) / columnas;
      const cellH = (h - pad * 2 - gap * (filas - 1)) / filas;
      let casillas = "";
      for (let idx = 0; idx < columnas * filas; idx++) {
        const prendida = idx < cantidadPedales;
        const x = x0 + pad + (idx % columnas) * (cellW + gap);
        const y = y0 + pad + Math.floor(idx / columnas) * (cellH + gap);
        casillas += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1" fill="${prendida ? "white" : "none"}" fill-opacity="${prendida ? 0.95 : 1}" stroke="white" stroke-opacity="${prendida ? 1 : 0.4}" stroke-width="1" />`;
      }
      return fondo + casillas;
    }
  }
}

// Blanco u oscuro según el color de fondo del ícono -- misma lógica de
// contraste real que ya usa el resto de la app (lib/colorContraste.ts),
// reimplementada acá en forma síncrona simplificada (luminancia aproximada
// por percepción, sin el pipeline oklch completo) porque este archivo corre
// también fuera de React y no vale la pena duplicar el parser de color
// completo para un caso tan acotado: los únicos fondos acá son
// COLOR_ESCENARIO (fijos, conocidos), bandaColor (oklch o hex, ambos ya
// vienen validados desde bandas.color) y colorFondo de amplificador (hex,
// ver fallback en stagePlotData.ts).
function textoParaFondo(color: string): string {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminancia > 0.6 ? "#2a2622" : "#ffffff";
  }
  const oklch = color.match(/oklch\(\s*([\d.]+)/i);
  const l = oklch ? Number(oklch[1]) : 0.5;
  return l > 0.7 ? "#2a2622" : "#ffffff";
}

function construirSvg(items: StagePlotItem[], bandaNombre: string, bandaColor: string): string {
  const ANCHO = 1600;
  const ALTO = 1000;
  const MARGEN = 48;
  const HEADER_ALTO = 130;
  const LIENZO_Y = HEADER_ALTO;
  const LIENZO_ALTO = ALTO - HEADER_ALTO - 60;

  const colorBanda = textoParaFondo(bandaColor);
  // Brief "ajustes visuales" §5: pedalera ya no usa bandaColor (ver
  // colorDeItem) -- sale de este grupo para que su contraste de texto se
  // calcule contra su propio gris, no contra el color de la banda.
  const esDeBanda = (tipo: StagePlotItem["tipo"]) => tipo === "musico" || tipo === "mic" || tipo === "teclado";

  const iconos = items
    .map((item) => {
      const cx = MARGEN + (item.posX / 100) * (ANCHO - MARGEN * 2);
      const cy = LIENZO_Y + (item.posY / 100) * LIENZO_ALTO;
      const forma = FORMA_TIPO[item.tipo];
      const color = colorDeItem(item, bandaColor);
      const colorBorde = bordeDeItem(item);
      const colorTexto = esDeBanda(item.tipo) ? colorBanda : textoParaFondo(color);
      const glifo = glifoDe(item);
      const etiqueta = etiquetaVisible(item);
      const badgeVoz = item.tieneVoz ? badgeVozSvg(forma, cx, cy) : "";
      const etiquetaSvg = etiqueta
        ? `<rect x="${cx - 70}" y="${cy + 38}" width="140" height="26" rx="5" fill="white" fill-opacity="0.94" stroke="#d8d0c4" />
           <text x="${cx}" y="${cy + 55}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="600" fill="#4a453f">${escaparXml(etiqueta)}</text>`
        : "";
      return `<g>${formaSvg(forma, cx, cy, color, colorTexto, glifo, colorBorde, item.cantidadPedales)}${badgeVoz}${etiquetaSvg}</g>`;
    })
    .join("\n");

  // Brief §5: encabezado "documento para mandar a un venue" -- nombre de
  // banda grande en una tipografía con carácter (serif, deliberadamente
  // distinta de la sans-serif de UI de la app) más el kicker "STAGE PLOT"
  // chico y espaciado debajo, no la jerarquía de un título de pantalla.
  const hoy = ahoraEnZonaApp();
  const fechaGeneracion = `Generado el ${hoy.getDate()} de ${MESES[hoy.getMonth()].toLowerCase()} de ${hoy.getFullYear()}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
    <rect width="${ANCHO}" height="${ALTO}" fill="#fdfaf5" />
    <rect x="6" y="6" width="${ANCHO - 12}" height="${ALTO - 12}" fill="none" stroke="#d3c9b8" stroke-width="3" rx="20" />

    <text x="${MARGEN}" y="62" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="700" fill="#2a2622">${escaparXml(bandaNombre)}</text>
    <text x="${MARGEN}" y="90" font-family="ui-monospace, monospace" font-size="14" letter-spacing="4" fill="#a89d8c">STAGE PLOT</text>
    <line x1="${MARGEN}" y1="108" x2="${ANCHO - MARGEN}" y2="108" stroke="#e3d9c8" stroke-width="1.5" />

    <rect x="${MARGEN}" y="${LIENZO_Y}" width="${ANCHO - MARGEN * 2}" height="${LIENZO_ALTO}" rx="16" fill="#ffffff" stroke="#e3d9c8" stroke-width="2" />
    ${iconos}
    <text x="${ANCHO / 2}" y="${LIENZO_Y + LIENZO_ALTO - 16}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" letter-spacing="3" fill="#b3aa9c">FRENTE DEL ESCENARIO (PÚBLICO)</text>

    <text x="${ANCHO - MARGEN}" y="${ALTO - 26}" text-anchor="end" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#b3aa9c">${escaparXml(fechaGeneracion)}</text>
  </svg>`;
}

// Rasteriza el SVG generado a PNG y dispara la descarga — sin dependencias
// nuevas: Image + <canvas> nativos del browser.
export async function descargarStagePlotPng(items: StagePlotItem[], bandaNombre: string, bandaColor: string): Promise<void> {
  const svgString = construirSvg(items, bandaNombre, bandaColor);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imagen = new Image();
      imagen.onload = () => resolve(imagen);
      imagen.onerror = () => reject(new Error("No se pudo generar la imagen del stage plot."));
      imagen.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo generar la imagen del stage plot.");
    ctx.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("No se pudo generar la imagen del stage plot.");

    const pngUrl = URL.createObjectURL(pngBlob);
    const enlace = document.createElement("a");
    enlace.href = pngUrl;
    enlace.download = `stage-plot-${bandaNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    enlace.click();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}
