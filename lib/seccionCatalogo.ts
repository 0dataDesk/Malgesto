// Catálogo cerrado de nombres de sección (brief §4) — sin "server-only":
// lo usan tanto el editor (cliente) como la data layer (servidor), y debe
// coincidir exactamente con el check constraint de malgesto.secciones.
export const NOMBRES_SECCION = [
  "Intro",
  "Verso 1", "Verso 2", "Verso 3", "Verso 4", "Verso 5",
  "Coro 1", "Coro 2", "Coro 3",
  "Puente",
  "Outro",
] as const;
export type NombreSeccion = (typeof NOMBRES_SECCION)[number];
