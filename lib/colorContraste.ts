// Elegir texto legible (oscuro o claro) sobre un color de fondo de tarjeta,
// sin asumir formato -- bandas.color hoy convive en dos formatos: oklch(...)
// (paleta vieja) y #rrggbb (selector de color libre nuevo). Ambos se
// resuelven a RGB con el mismo pipeline y se miden con luminancia relativa
// estándar (WCAG), así el resultado es el mismo cálculo real sin importar
// cómo esté guardado el color.

type RGB = [number, number, number];

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_CLARO = "oklch(0.99 0.01 82)";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// oklch(L C H) -> RGB lineal (sin gamma todavía) -- matrices estándar de la
// spec CSS Color 4 (oklab -> linear sRGB).
function oklchARgbLineal(l: number, c: number, hGrados: number): RGB {
  const hRad = (hGrados * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

function linealASrgb8(v: number): number {
  const c = clamp01(v);
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
}

// Parsea "#rrggbb", "#rrggbbaa" (8 dígitos -- lo que produce colorConAlpha
// para un color de entrada en hex) u "oklch(L C H)" / "oklch(L C H / A)" (lo
// que produce colorConAlpha para oklch). Devuelve RGB 0-255 y alpha 0-1 (1
// si el color no trae canal alfa propio -- #rrggbb de 6 dígitos siempre es
// opaco).
function parsearColor(color: string): { rgb: RGB; alpha: number } {
  const hex = color.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const alpha = hex[2] !== undefined ? parseInt(hex[2], 16) / 255 : 1;
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha };
  }

  const ok = color.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)%?\s+([\d.]+)\s*(?:\/\s*([\d.]+)%?\s*)?\)$/i);
  if (ok) {
    const [rLin, gLin, bLin] = oklchARgbLineal(Number(ok[1]), Number(ok[2]), Number(ok[3]));
    return {
      rgb: [linealASrgb8(rLin), linealASrgb8(gLin), linealASrgb8(bLin)],
      alpha: ok[4] !== undefined ? Number(ok[4]) : 1,
    };
  }

  // Fallback defensivo: un formato no contemplado no debe romper el render;
  // un gris medio da contraste razonable con cualquiera de los dos textos.
  return { rgb: [136, 136, 136], alpha: 1 };
}

// Fondo real de página/tarjeta sobre el que se componen los colores
// translúcidos (mismo token que usa GestionShell/CalendarioShell) --
// resuelto con el mismo pipeline de conversión en vez de un RGB hardcodeado
// desconectado del valor real.
const FONDO_APP: RGB = (() => {
  const [r, g, b] = oklchARgbLineal(0.965, 0.012, 82);
  return [linealASrgb8(r), linealASrgb8(g), linealASrgb8(b)];
})();

function mezclarSobreFondo(rgb: RGB, alpha: number, fondo: RGB): RGB {
  return [
    rgb[0] * alpha + fondo[0] * (1 - alpha),
    rgb[1] * alpha + fondo[1] * (1 - alpha),
    rgb[2] * alpha + fondo[2] * (1 - alpha),
  ];
}

function luminanciaRelativa([r, g, b]: RGB): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(l1: number, l2: number): number {
  const claro = Math.max(l1, l2);
  const oscuro = Math.min(l1, l2);
  return (claro + 0.05) / (oscuro + 0.05);
}

// Texto legible (mismos tokens oscuro/claro que ya usa el resto de la app)
// para el color de fondo CSS dado -- pensado para pasarle literalmente el
// mismo string que se usa como `background` de la tarjeta (con o sin alpha),
// así el contraste se mide contra lo que realmente se ve en pantalla.
export function textoLegibleSobre(colorFondo: string): string {
  const { rgb, alpha } = parsearColor(colorFondo);
  const rgbEfectivo = alpha < 1 ? mezclarSobreFondo(rgb, alpha, FONDO_APP) : rgb;
  const luminancia = luminanciaRelativa(rgbEfectivo);
  const conOscuro = contraste(luminancia, luminanciaRelativa([0, 0, 0]));
  const conClaro = contraste(luminancia, luminanciaRelativa([255, 255, 255]));
  return conClaro > conOscuro ? TEXTO_CLARO : TEXTO_OSCURO;
}
