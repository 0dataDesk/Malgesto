// Catálogo de PARTES de sección. Jorge elige solo la parte («Verso»); el
// número («Verso 2») lo pone el sistema según el orden: solo se numera si la
// parte aparece más de una vez en la canción, así que mover, agregar o quitar
// secciones renumera solo. El check constraint de malgesto_app.secciones acepta
// la parte con o sin número (migraciones 20261126000000 y 20261126010000).
export const PARTES_SECCION = [
  "Preintro",
  "Intro",
  "Verso",
  "Precoro",
  "Coro",
  "Puente",
  "Solo",
  "Outro",
  "Sección Única",
] as const;
export type ParteSeccion = (typeof PARTES_SECCION)[number];
// Nombre guardado: la parte, con número si hay más de una igual.
export type NombreSeccion = string;

// «Verso 2» → «Verso».
export function parteDe(nombre: string): string {
  return nombre.replace(/\s*\d+$/, "");
}

// Nombres finales según el orden: «Verso 1», «Coro», «Verso 2»…
export function etiquetasSecciones(partes: string[]): string[] {
  const total = new Map<string, number>();
  for (const p of partes) total.set(p, (total.get(p) ?? 0) + 1);
  const visto = new Map<string, number>();
  return partes.map((p) => {
    const n = (visto.get(p) ?? 0) + 1;
    visto.set(p, n);
    return (total.get(p) ?? 0) > 1 ? `${p} ${n}` : p;
  });
}

// Color de cada parte, en escala de blancos, grises y negro (sin color: así las partes se distinguen
// de un vistazo y los colores de los acordes resaltan). Las más usadas llevan los grises más separados;
// Preintro, Precoro y Sección Única son degradados ligeros entre vecinos, de menor prioridad.
// Orden de claro a oscuro: Verso, Intro, Solo, Outro, Puente, Coro.
const gris = (l: number) => `oklch(${l} 0 0)`;
const GRIS_POR_PARTE: Record<string, number> = { Verso: 0.93, Intro: 0.8, Solo: 0.68, Outro: 0.55, Puente: 0.4, Coro: 0.2 };
const DEGRADADO_POR_PARTE: Record<string, [number, number]> = {
  Preintro: [0.8, 0.98], // de Intro a casi blanco
  Precoro: [0.93, 0.2], // de Verso a Coro: va subiendo hacia el coro
  "Sección Única": [0.68, 0.93], // de Solo a Verso
};

// Fondo de la parte: un gris o un degradado ligero (CSS `background`).
export function colorPorTipoSeccion(nombre: NombreSeccion): string {
  const parte = parteDe(nombre);
  const d = DEGRADADO_POR_PARTE[parte];
  if (d) return `linear-gradient(135deg, ${gris(d[0])}, ${gris(d[1])})`;
  return gris(GRIS_POR_PARTE[parte] ?? 0.8);
}

// Tinta que se lee sobre ese fondo: clara sobre los grises oscuros, oscura sobre los claros.
export function tintaPorTipoSeccion(nombre: NombreSeccion): string {
  const parte = parteDe(nombre);
  const oscuro = parte === "Coro" || parte === "Puente" || parte === "Outro";
  return oscuro ? "oklch(0.99 0 0)" : "oklch(0.2 0 0)";
}
