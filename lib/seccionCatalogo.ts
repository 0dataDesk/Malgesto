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

// Brief 19 §8: no una paleta nueva — variaciones de intensidad (solo L, del
// oklch) del mismo acento naranja (H 34, C 0.15) que ya usa toda la app, una
// por FAMILIA de sección ("Verso 1"/"Verso 2" comparten familia "Verso") para
// diferenciarlas de un vistazo sin que los números dentro de una familia se
// vean distintos entre sí.
const FAMILIAS_SECCION: string[] = [...PARTES_SECCION];

export function colorPorTipoSeccion(nombre: NombreSeccion): string {
  const idx = Math.max(0, FAMILIAS_SECCION.indexOf(parteDe(nombre)));
  const l = 0.62 - (idx / (FAMILIAS_SECCION.length - 1)) * 0.22;
  return `oklch(${l.toFixed(3)} 0.15 34)`;
}
