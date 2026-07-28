import type { TipoEvento } from "@/lib/malgestoEventos";

// Color e identidad visual por tipo de evento — compartido entre la vista de
// Mes y la de Agenda para que el código de color sea consistente en toda la
// app. Gira usa un color propio (violeta) distinto de Cumpleaños: en el
// bundle de Design ambos comparten casi el mismo dorado, pero eso mezclaría
// "es cumpleaños de alguien" con "estás en gira" en el calendario real.
export const COLOR_TIPO: Record<TipoEvento, string> = {
  show: "oklch(0.64 0.15 34)",
  ensayo: "oklch(0.64 0.13 195)",
  cumpleanos: "oklch(0.72 0.12 78)",
  gira: "oklch(0.58 0.14 300)",
};

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

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_SEMANA_ABREV = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
