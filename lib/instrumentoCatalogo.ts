// Catálogo cerrado de instrumentos (Brief 8 §2) — sin "server-only": lo usa
// tanto el editor de integrantes (cliente) como la data layer (servidor).
// Es un text[] en miembros_banda, validado solo acá (no con check constraint
// de Postgres, a diferencia de secciones.nombre, porque es un arreglo).
export const INSTRUMENTOS = ["bajo", "guitarra", "bateria", "voz", "teclado", "otro"] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];

export const ETIQUETA_INSTRUMENTO: Record<Instrumento, string> = {
  bajo: "Bajo",
  guitarra: "Guitarra",
  bateria: "Batería",
  voz: "Voz",
  teclado: "Teclado/Piano",
  otro: "Otro",
};
