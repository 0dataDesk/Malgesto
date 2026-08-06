// Sin "server-only" a propósito: lo necesitan tanto el editor (cliente,
// SetlistEditor.tsx) como la vista "En vivo" (server, vivo/page.tsx) — un
// solo catálogo de etiqueta/color por tipo de bloque libre para que ambas
// vistas coincidan siempre. setlistsData.ts sí es "server-only", así que
// estas constantes no pueden vivir ahí (romperían el boundary si un
// componente cliente las importara como valor, no solo como tipo).
import type { TipoItemSetlist } from "./setlistsData";

export const ETIQUETA_BLOQUE: Record<Exclude<TipoItemSetlist, "cancion">, string> = {
  secuencia: "Secuencia",
  interludio: "Interludio",
  marcador: "Marcador",
};

export const COLOR_BLOQUE: Record<Exclude<TipoItemSetlist, "cancion">, string> = {
  secuencia: "oklch(0.62 0.14 250)",
  interludio: "oklch(0.66 0.14 300)",
  marcador: "oklch(0.7 0.12 85)",
};
