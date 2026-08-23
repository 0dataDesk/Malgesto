// Sin "server-only" (mismo criterio que stagePlotCatalogo.ts): estas
// constantes son puro dato, sin I/O, y las necesita tanto la UI cliente
// (RiderInfoVista.tsx, para el selector de categoría) como el documento
// PDF (RiderPdfDocument.tsx) y la capa de datos server-only (riderData.ts).
// Viven acá SEPARADAS de riderData.ts a propósito: ese archivo sí tiene
// "server-only" (hace consultas a Supabase), y un componente cliente que
// importara un valor real desde ahí (no solo tipos) rompería el build
// ("server-only cannot be imported from a Client Component module").
export type CategoriaBackline = "bateria" | "amp_bajo" | "amp_guitarra" | "teclado_bases" | "mobiliario" | "otro";

export const CATEGORIAS_BACKLINE: CategoriaBackline[] = ["bateria", "amp_bajo", "amp_guitarra", "teclado_bases", "mobiliario", "otro"];

export const ETIQUETA_CATEGORIA_BACKLINE: Record<CategoriaBackline, string> = {
  bateria: "Batería",
  amp_bajo: "Amplificador de bajo",
  amp_guitarra: "Amplificador de guitarra",
  teclado_bases: "Teclado / Bases",
  mobiliario: "Mobiliario",
  otro: "Otro",
};

export function esCategoriaBacklineValida(valor: string): valor is CategoriaBackline {
  return (CATEGORIAS_BACKLINE as string[]).includes(valor);
}
