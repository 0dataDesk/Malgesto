// Catálogo cerrado de instrumentos para "plazas" (Brief 9 §9) — sin
// "server-only": lo usa tanto el editor de bandas/integrantes (cliente) como
// la data layer (servidor), y debe coincidir exactamente con el check
// constraint de malgesto.plazas.instrumento.
export const INSTRUMENTOS = [
  "bajo",
  "guitarra_principal",
  "guitarra_segunda",
  "bateria",
  "acordeon",
  "teclado_piano",
  "voz",
  "coro",
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
  // Brief "Rediseño de Gestión > Integrantes" §4: Voz y Coro son plazas
  // independientes en base (ya lo eran) -- la etiqueta lo deja explícito
  // para que no se lean como "la misma cosa" en el selector.
  voz: "Voz principal",
  coro: "Coro",
  otro: "Otro",
};

// Brief 10 §2: "Otro" se muestra SOLO con su etiqueta libre (sin anteponer
// la palabra "Otro"); cualquier instrumento del catálogo fijo se muestra
// solo con su nombre (nunca lleva etiqueta).
export function etiquetaPlaza(instrumento: string, etiqueta: string | null): string {
  if (instrumento === "otro") return etiqueta || "Otro";
  return ETIQUETA_INSTRUMENTO[instrumento as Instrumento] ?? instrumento;
}
