import type { TipoEvento } from "@/lib/malgestoEventos";

// Color e identidad visual por tipo de evento, tomado literal del HTML de
// Design. Cumpleaños y Gira son ambos dorados y casi idénticos — no es un
// descuido: la leyenda del board (línea 40) redondea a oklch(0.74 0.12 78),
// pero las pantallas 05/06 en uso real (dot línea 472, borde de tarjeta
// línea 555) usan consistentemente oklch(0.72 0.12 78) para Cumpleaños —
// se sigue esa fuente por ser la que corresponde a las pantallas de este
// brief. Gira usa oklch(0.74 0.12 78) (marcador línea 502, tarjeta 564-565).
// Se revierte acá el violeta distinto que se había usado en el Brief 2 para
// diferenciarlos — quedan visualmente casi idénticos en el calendario real
// (ver nota en el reporte de este brief).
export const COLOR_TIPO: Record<TipoEvento, string> = {
  show: "oklch(0.64 0.15 34)",
  ensayo: "oklch(0.64 0.13 195)",
  cumpleanos: "oklch(0.72 0.12 78)",
  gira: "oklch(0.74 0.12 78)",
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

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_SEMANA_ABREV = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
