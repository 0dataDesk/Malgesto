import type { StagePlotItem } from "@/lib/stagePlotData";
import { GLIFO_TIPO, GLIFO_INSTRUMENTO, FORMA_TIPO, COLOR_ESCENARIO, type FormaItem } from "@/lib/stagePlotCatalogo";
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

function etiquetaVisible(item: StagePlotItem): string | null {
  if (item.tipo === "musico" || item.tipo === "mic") {
    if (!item.nombrePersona || !item.instrumento) return null;
    return `${item.instrumento} · ${item.nombrePersona}`;
  }
  return item.etiqueta;
}

// Brief "Rediseño de Stage Plot — Entrega 1" §2: mismas 6 formas que el
// lienzo interactivo (StagePlotLienzo), reimplementadas acá en SVG puro
// centrado en (cx, cy) -- los dos no comparten código (uno es DOM/CSS, el
// otro un string SVG armado a mano) pero sí el mismo catálogo de tamaños/
// colores, para que el documento exportado se vea como una versión prolija
// del lienzo, no como algo distinto.
function formaSvg(forma: FormaItem, cx: number, cy: number, color: string, colorTexto: string, glifo: string): string {
  const texto = (x: number, y: number, size: number, fill: string) =>
    glifo ? `<text x="${x}" y="${y}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="${size}" font-weight="700" fill="${fill}">${escaparXml(glifo)}</text>` : "";

  switch (forma) {
    case "circulo":
      return `<circle cx="${cx}" cy="${cy}" r="30" fill="${color}" stroke="white" stroke-width="2.5" />${texto(cx, cy + 4, 12, colorTexto)}`;
    case "circulo-chico":
      return `<circle cx="${cx}" cy="${cy}" r="20" fill="${color}" stroke="white" stroke-width="2.5" />${texto(cx, cy + 3, 9, colorTexto)}`;
    case "rectangulo":
      return `<rect x="${cx - 38}" y="${cy - 26}" width="76" height="52" rx="8" fill="${color}" stroke="white" stroke-width="2.5" />${texto(cx, cy + 5, 12, colorTexto)}`;
    case "rectangulo-punteado":
      return `<rect x="${cx - 54}" y="${cy - 35}" width="108" height="70" rx="10" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="3" stroke-dasharray="9 7" />${texto(cx, cy + 5, 13, color)}`;
    case "rombo":
      return `<rect x="${cx - 18}" y="${cy - 18}" width="36" height="36" rx="4" fill="${color}" stroke="white" stroke-width="2.5" transform="rotate(45 ${cx} ${cy})" />${texto(cx, cy + 4, 10, colorTexto)}`;
    case "triangulo":
      return `<polygon points="${cx},${cy - 27} ${cx + 27},${cy + 22} ${cx - 27},${cy + 22}" fill="${color}" stroke="white" stroke-width="2.5" stroke-linejoin="round" />${texto(cx, cy + 16, 10, colorTexto)}`;
  }
}

// Blanco u oscuro según el color de fondo del ícono -- misma lógica de
// contraste real que ya usa el resto de la app (lib/colorContraste.ts),
// reimplementada acá en forma síncrona simplificada (luminancia aproximada
// por percepción, sin el pipeline oklch completo) porque este archivo corre
// también fuera de React y no vale la pena duplicar el parser de color
// completo para un caso tan acotado: los únicos fondos acá son
// COLOR_ESCENARIO (fijos, conocidos) y bandaColor (oklch o hex, ambos ya
// vienen validados desde bandas.color).
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

  const iconos = items
    .map((item) => {
      const cx = MARGEN + (item.posX / 100) * (ANCHO - MARGEN * 2);
      const cy = LIENZO_Y + (item.posY / 100) * LIENZO_ALTO;
      const forma = FORMA_TIPO[item.tipo];
      const color = item.tipo === "musico" || item.tipo === "mic" ? bandaColor : COLOR_ESCENARIO[item.tipo];
      const colorTexto = item.tipo === "musico" || item.tipo === "mic" ? colorBanda : textoParaFondo(color);
      const glifo = glifoDe(item);
      const etiqueta = etiquetaVisible(item);
      const etiquetaSvg = etiqueta
        ? `<rect x="${cx - 70}" y="${cy + 38}" width="140" height="26" rx="5" fill="white" fill-opacity="0.94" stroke="#d8d0c4" />
           <text x="${cx}" y="${cy + 55}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="600" fill="#4a453f">${escaparXml(etiqueta)}</text>`
        : "";
      return `<g>${formaSvg(forma, cx, cy, color, colorTexto, glifo)}${etiquetaSvg}</g>`;
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
