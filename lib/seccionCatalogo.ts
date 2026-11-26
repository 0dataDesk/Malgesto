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

// Fondo de cada parte, en blancos, grises y negro, más dos texturas para las partes que se parecen:
// Intro = blanco con rayas diagonales que entran (/), Outro = blanco con rayas que salen (\), Solo = blanco con puntos grises, Sección Única = gris con puntos más finos.
// Preintro y Precoro son degradados que terminan en el fondo de la parte que les sigue, para que conecten:
// Preintro acaba en el blanco de Intro; Precoro empieza en el gris de Verso y acaba en el negro de Coro.
const gris = (l: number) => `oklch(${l} 0 0)`;
const GRIS_POR_PARTE: Record<string, number> = { Verso: 0.94, Puente: 0.54, Coro: 0.32 };
const rayas = (grados: number, alfa: number) => `repeating-linear-gradient(${grados}deg, transparent 0 7px, rgba(0,0,0,${alfa}) 7px 8px)`;

// Fondo de la parte (valor de CSS `background`, puede traer varias capas).
export function colorPorTipoSeccion(nombre: NombreSeccion): string {
  switch (parteDe(nombre)) {
    case "Intro": return `${gris(1)} ${rayas(135, 0.14)}`;
    case "Outro": return `${gris(1)} ${rayas(45, 0.2)}`;
    case "Solo": return `${gris(1)} radial-gradient(rgba(0,0,0,0.16) 1.3px, transparent 1.6px) 0 0 / 9px 9px`;
    case "Sección Única": return `${gris(0.8)} radial-gradient(rgba(0,0,0,0.2) 1px, transparent 1.3px) 0 0 / 6px 6px`;
    case "Preintro": return `linear-gradient(90deg, ${gris(0.62)}, ${gris(1)})`;
    case "Precoro": return `linear-gradient(90deg, ${gris(GRIS_POR_PARTE.Verso)}, ${gris(GRIS_POR_PARTE.Coro)})`;
    default: return gris(GRIS_POR_PARTE[parteDe(nombre)] ?? 0.8);
  }
}

// Tinta que se lee sobre ese fondo: clara solo sobre Coro y Puente (los grises oscuros), oscura en el resto.
export function tintaPorTipoSeccion(nombre: NombreSeccion): string {
  const parte = parteDe(nombre);
  return parte === "Coro" || parte === "Puente" ? "oklch(0.99 0 0)" : "oklch(0.2 0 0)";
}
