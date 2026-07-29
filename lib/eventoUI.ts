import type { TipoEvento } from "@/lib/malgestoEventos";

// Color e identidad visual por tipo de evento. Show/Ensayo/Cumpleaños
// siguen el HTML de Design literal (Cumpleaños: oklch(0.72 0.12 78), tomado
// de las pantallas 05/06 en uso real — ver detalle en el commit de la
// corrección de fidelidad anterior). Gira es la única excepción deliberada:
// Design lo deja casi idéntico a Cumpleaños, pero eso confunde ambos tipos
// en el calendario con datos reales, así que mantiene el violeta propio del
// Brief 2 en vez de seguir la fidelidad literal en este punto.
export const COLOR_TIPO: Record<TipoEvento, string> = {
  show: "oklch(0.64 0.15 34)",
  ensayo: "oklch(0.64 0.13 195)",
  cumpleanos: "oklch(0.72 0.12 78)",
  gira: "oklch(0.58 0.14 300)",
};

// Color por banda, para los chips de filtro (Design línea 449-452): cada
// banda tiene un color estable de esta paleta, en el orden en que aparece
// en miembros_banda. Leocadio/naranja es el primero porque es el acento
// primario de toda la app (botones, header, etc. en /login ya lo usan).
const PALETA_BANDA = ["oklch(0.64 0.15 34)", "oklch(0.64 0.13 195)", "oklch(0.6 0.14 280)", "oklch(0.55 0.14 150)"];

export function colorPorIndiceBanda(indice: number): string {
  return PALETA_BANDA[indice % PALETA_BANDA.length];
}

// Inserta un canal alfa dentro de un color oklch(...) ya armado, ej.
// colorConAlpha("oklch(0.6 0.1 30)", 0.16) -> "oklch(0.6 0.1 30 / 0.16)".
export function colorConAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

export const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  show: "Show",
  ensayo: "Ensayo",
  cumpleanos: "Cumpleaños",
  gira: "Gira",
};

// MXN con separador de miles y 2 decimales, ej. $18,000.00 (Brief 9 §14).
const FORMATO_MONEDA = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatoMoneda(n: number): string {
  return FORMATO_MONEDA.format(n);
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_SEMANA_ABREV = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
