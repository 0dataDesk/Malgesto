// Catálogo cerrado de instrumentos para "plazas" (Brief 9 §9) — sin
// "server-only": lo usa tanto el editor de bandas/integrantes (cliente) como
// la data layer (servidor), y debe coincidir exactamente con el check
// constraint de malgesto.plazas.instrumento.
// Brief "Quitar voz/coro del catálogo de instrumentos" — voz/coro salieron
// de acá porque plazas.instrumento ya no las acepta (CHECK constraint de un
// brief anterior); "Voz" ahora vive aparte, como atributo cíclico de persona
// (ver `Voz`/`actualizarVoz` en gestionData.ts), no como plaza de catálogo.
export const INSTRUMENTOS = [
  "bajo",
  "guitarra_principal",
  "guitarra_segunda",
  "bateria",
  "acordeon",
  "teclado_piano",
  "otro",
] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];

export const ETIQUETA_INSTRUMENTO: Record<Instrumento, string> = {
  bajo: "Bajo",
  guitarra_principal: "Guitarra principal",
  guitarra_segunda: "Guitarra segunda",
  bateria: "Batería",
  acordeon: "Acordeón",
  teclado_piano: "Teclado/Piano",
  otro: "Otro",
};

// Brief 10 §2: "Otro" se muestra SOLO con su etiqueta libre (sin anteponer
// la palabra "Otro"); cualquier instrumento del catálogo fijo se muestra
// solo con su nombre (nunca lleva etiqueta).
export function etiquetaPlaza(instrumento: string, etiqueta: string | null): string {
  if (instrumento === "otro") return etiqueta || "Otro";
  return ETIQUETA_INSTRUMENTO[instrumento as Instrumento] ?? instrumento;
}
