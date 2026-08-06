import type { StagePlotItem } from "@/lib/stagePlotData";
import { GLIFO_TIPO, COLOR_TIPO } from "@/lib/stagePlotCatalogo";

// Construye el SVG de forma independiente del DOM interactivo (no lo
// serializa desde la pantalla) — mismo catálogo de color/glifo que
// StagePlotLienzo, así que el resultado se ve igual, pero esta función no
// depende de nada que el usuario haya arrastrado/seleccionado en ese
// momento. viewBox 1600x900 (16:9, "hoja horizontal") — pos_x/pos_y (0-100)
// se escalan directo a esas unidades, en los dos ejes por igual, así los
// íconos (círculos) no se deforman.
function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function construirSvg(items: StagePlotItem[], bandaNombre: string): string {
  const ANCHO = 1600;
  const ALTO = 900;

  const circulos = items
    .map((item) => {
      const cx = (item.posX / 100) * ANCHO;
      const cy = (item.posY / 100) * ALTO;
      const glifo = escaparXml(GLIFO_TIPO[item.tipo]);
      const etiqueta = item.etiqueta ? escaparXml(item.etiqueta) : null;
      const etiquetaSvg = etiqueta
        ? `<rect x="${cx - 60}" y="${cy + 34}" width="120" height="24" rx="5" fill="white" fill-opacity="0.92" stroke="#d8d0c4" />
           <text x="${cx}" y="${cy + 50}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="600" fill="#4a453f">${etiqueta}</text>`
        : "";
      return `<g>
        <circle cx="${cx}" cy="${cy}" r="30" fill="${COLOR_TIPO[item.tipo]}" stroke="white" stroke-width="2" />
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="white">${escaparXml(glifo)}</text>
        ${etiquetaSvg}
      </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
    <rect width="${ANCHO}" height="${ALTO}" fill="#fdfaf5" />
    <rect x="6" y="6" width="${ANCHO - 12}" height="${ALTO - 12}" fill="none" stroke="#d3c9b8" stroke-width="4" rx="18" />
    <text x="28" y="42" font-family="sans-serif" font-size="24" font-weight="800" fill="#3d3830">${escaparXml(bandaNombre)} — Stage Plot</text>
    ${circulos}
    <text x="${ANCHO / 2}" y="${ALTO - 22}" text-anchor="middle" font-family="monospace" font-size="14" letter-spacing="3" fill="#b3aa9c">FRENTE DEL ESCENARIO (PÚBLICO)</text>
  </svg>`;
}

// Rasteriza el SVG generado a PNG y dispara la descarga — sin dependencias
// nuevas: Image + <canvas> nativos del browser.
export async function descargarStagePlotPng(items: StagePlotItem[], bandaNombre: string): Promise<void> {
  const svgString = construirSvg(items, bandaNombre);
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
    canvas.height = 900;
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
