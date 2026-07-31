// Catálogo cerrado de nombres de sección (brief §4) — sin "server-only":
// lo usan tanto el editor (cliente) como la data layer (servidor), y debe
// coincidir exactamente con el check constraint de malgesto.secciones.
export const NOMBRES_SECCION = [
  "Intro",
  "Verso 1", "Verso 2", "Verso 3", "Verso 4", "Verso 5",
  "Coro 1", "Coro 2", "Coro 3",
  "Puente",
  "Solo",
  "Outro",
  "Sección Única",
] as const;
export type NombreSeccion = (typeof NOMBRES_SECCION)[number];

// Brief 19 §8: no una paleta nueva — variaciones de intensidad (solo L, del
// oklch) del mismo acento naranja (H 34, C 0.15) que ya usa toda la app, una
// por FAMILIA de sección ("Verso 1"/"Verso 2" comparten familia "Verso") para
// diferenciarlas de un vistazo sin que los números dentro de una familia se
// vean distintos entre sí.
function familiaSeccion(nombre: NombreSeccion): string {
  return nombre.replace(/\s*\d+$/, "");
}

const FAMILIAS_SECCION = [...new Set(NOMBRES_SECCION.map(familiaSeccion))];

export function colorPorTipoSeccion(nombre: NombreSeccion): string {
  const idx = FAMILIAS_SECCION.indexOf(familiaSeccion(nombre));
  const l = 0.62 - (idx / (FAMILIAS_SECCION.length - 1)) * 0.22;
  return `oklch(${l.toFixed(3)} 0.15 34)`;
}
