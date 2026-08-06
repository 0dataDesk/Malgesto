// Sin "server-only": lo usan tanto el editor/paleta (cliente) como la
// data layer (servidor) y el export a SVG/PNG — un solo catálogo para que
// los tres coincidan siempre en color/glifo/etiqueta por tipo de ítem.
export const TIPOS_ITEM = [
  "vocalista",
  "guitarrista",
  "bajista",
  "baterista",
  "teclado",
  "dj",
  "monitor",
  "microfono",
  "amplificador",
  "otro",
] as const;

export type TipoItem = (typeof TIPOS_ITEM)[number];

export const ETIQUETA_TIPO: Record<TipoItem, string> = {
  vocalista: "Vocalista",
  guitarrista: "Guitarrista",
  bajista: "Bajista",
  baterista: "Baterista",
  teclado: "Teclado",
  dj: "DJ",
  monitor: "Monitor",
  microfono: "Micrófono",
  amplificador: "Amplificador",
  otro: "Otro",
};

// Glifo corto mostrado dentro del ícono — mismo texto en el lienzo
// interactivo y en el SVG generado para exportar/compartir.
export const GLIFO_TIPO: Record<TipoItem, string> = {
  vocalista: "VOZ",
  guitarrista: "GTR",
  bajista: "BAJ",
  baterista: "BAT",
  teclado: "TEC",
  dj: "DJ",
  monitor: "MON",
  microfono: "MIC",
  amplificador: "AMP",
  otro: "?",
};

export const COLOR_TIPO: Record<TipoItem, string> = {
  vocalista: "oklch(0.6 0.19 25)",
  guitarrista: "oklch(0.55 0.15 255)",
  bajista: "oklch(0.55 0.14 150)",
  baterista: "oklch(0.6 0.15 55)",
  teclado: "oklch(0.55 0.17 305)",
  dj: "oklch(0.62 0.14 200)",
  monitor: "oklch(0.5 0.02 55)",
  microfono: "oklch(0.68 0.15 95)",
  amplificador: "oklch(0.4 0.02 55)",
  otro: "oklch(0.6 0.02 55)",
};

export function esTipoItemValido(valor: string): valor is TipoItem {
  return (TIPOS_ITEM as readonly string[]).includes(valor);
}
