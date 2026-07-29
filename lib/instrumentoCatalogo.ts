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
  voz: "Voz",
  coro: "Coro",
  otro: "Otro",
};
