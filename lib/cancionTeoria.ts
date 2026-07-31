// Lógica pura de armonía del módulo Canciones — construida desde cero para
// Malgesto a partir del Brief 4/7, sin referencia a ningún otro repo. Nada
// de esto se persiste calculado: tonos, acordes diatónicos y color siempre
// se recalculan desde tonalidad + nota_raiz + calidad.

export const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type Nota = (typeof NOTAS)[number];

export const CALIDADES = [
  "mayor", "menor", "disminuido", "aumentado",
  "7", "maj7", "m7", "dim7", "m7b5", "sus2", "sus4",
] as const;
export type Calidad = (typeof CALIDADES)[number];

type Intervalo = { semitonos: number; etiqueta: string };

// Fórmulas en semitonos desde la raíz. El brief da explícitas mayor, menor,
// disminuido, 7, maj7, m7 y m7b5 — aumentado, dim7, sus2 y sus4 no traían
// fórmula, así que se completan con la teoría estándar (5ª aumentada, 7ª
// disminuida, 2ª/4ª suspendidas), consistente con que el brief ya da esas
// calidades por sentado como botones a construir.
const INTERVALOS_POR_CALIDAD: Record<Calidad, Intervalo[]> = {
  mayor: [{ semitonos: 4, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }],
  menor: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }],
  disminuido: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 6, etiqueta: "5ª" }],
  aumentado: [{ semitonos: 4, etiqueta: "3ª" }, { semitonos: 8, etiqueta: "5ª" }],
  "7": [{ semitonos: 4, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }, { semitonos: 10, etiqueta: "7ª" }],
  maj7: [{ semitonos: 4, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }, { semitonos: 11, etiqueta: "7ª" }],
  m7: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }, { semitonos: 10, etiqueta: "7ª" }],
  dim7: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 6, etiqueta: "5ª" }, { semitonos: 9, etiqueta: "7ª" }],
  m7b5: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 6, etiqueta: "5ª" }, { semitonos: 10, etiqueta: "7ª" }],
  sus2: [{ semitonos: 2, etiqueta: "2ª" }, { semitonos: 7, etiqueta: "5ª" }],
  sus4: [{ semitonos: 5, etiqueta: "4ª" }, { semitonos: 7, etiqueta: "5ª" }],
};

// 5ª explícita solo cuando no es justa (brief §5).
const CALIDADES_CON_QUINTA_EXPLICITA = new Set<Calidad>(["disminuido", "dim7", "m7b5", "aumentado"]);
export function requiereQuintaExplicita(calidad: Calidad): boolean {
  return CALIDADES_CON_QUINTA_EXPLICITA.has(calidad);
}

const SUFIJO_POR_CALIDAD: Record<Calidad, string> = {
  mayor: "", menor: "m", disminuido: "dim", aumentado: "aum",
  "7": "7", maj7: "maj7", m7: "m7", dim7: "dim7", m7b5: "m7b5", sus2: "sus2", sus4: "sus4",
};

function notaEn(indice: number): Nota {
  return NOTAS[((indice % 12) + 12) % 12];
}

export type TonoAcorde = { raiz: Nota; acompanantes: { intervalo: string; nota: Nota }[] };

// Brief 19 §6: la 9ª ya no es opcional — todo acorde la incluye siempre.
export function tonosDelAcorde(raiz: Nota, calidad: Calidad): TonoAcorde {
  const idxRaiz = NOTAS.indexOf(raiz);
  const intervalos = [...INTERVALOS_POR_CALIDAD[calidad], { semitonos: 14, etiqueta: "9ª" }];
  return {
    raiz,
    acompanantes: intervalos.map((i) => ({ intervalo: i.etiqueta, nota: notaEn(idxRaiz + i.semitonos) })),
  };
}

export function simboloAcorde(raiz: Nota, calidad: Calidad): string {
  return `${raiz}${SUFIJO_POR_CALIDAD[calidad]}`;
}

export type Modo = "mayor" | "menor";
export type Tonalidad = { raiz: Nota; modo: Modo };

const PASOS_MAYOR = [2, 2, 1, 2, 2, 2, 1];
const PASOS_MENOR = [2, 1, 2, 2, 1, 2, 2];

export function escalaDiatonica(tonalidad: Tonalidad): Nota[] {
  const pasos = tonalidad.modo === "mayor" ? PASOS_MAYOR : PASOS_MENOR;
  const idxRaiz = NOTAS.indexOf(tonalidad.raiz);
  const notas: Nota[] = [];
  let acumulado = 0;
  for (let i = 0; i < 7; i++) {
    notas.push(notaEn(idxRaiz + acumulado));
    acumulado += pasos[i];
  }
  return notas;
}

const CALIDAD_POR_GRADO_MAYOR: Calidad[] = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const CALIDAD_POR_GRADO_MENOR: Calidad[] = ["m7", "m7b5", "maj7", "m7", "m7", "maj7", "7"];
const ROMANOS_MAYOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const ROMANOS_MENOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

export type AcordeDiatonico = { grado: number; romano: string; raiz: Nota; calidad: Calidad; simbolo: string };

// Los 7 acordes diatónicos naturales de una tonalidad. Los botones de
// calidad manual (mayor/menor/7/dim/...) no reemplazan esto — construyen
// acordes que se salen de la tonalidad, en cualquier nota.
export function acordesDiatonicos(tonalidad: Tonalidad): AcordeDiatonico[] {
  const escala = escalaDiatonica(tonalidad);
  const calidades = tonalidad.modo === "mayor" ? CALIDAD_POR_GRADO_MAYOR : CALIDAD_POR_GRADO_MENOR;
  const romanos = tonalidad.modo === "mayor" ? ROMANOS_MAYOR : ROMANOS_MENOR;
  return escala.map((raiz, i) => ({
    grado: i + 1,
    romano: romanos[i],
    raiz,
    calidad: calidades[i],
    simbolo: simboloAcorde(raiz, calidades[i]),
  }));
}

// hue(nota) = (120 - 30*índice) mod 360 — C=120°(verde) ... F=330°(rosa),
// F#=300°(morado) ... (brief §5).
export function huePorNota(nota: Nota): number {
  const idx = NOTAS.indexOf(nota);
  return (((120 - 30 * idx) % 360) + 360) % 360;
}

type CategoriaColor = "mayor" | "dominante" | "menor" | "tenue";

const CATEGORIA_COLOR_POR_CALIDAD: Record<Calidad, CategoriaColor> = {
  mayor: "mayor", maj7: "mayor",
  "7": "dominante",
  menor: "menor", m7: "menor",
  disminuido: "tenue", dim7: "tenue", m7b5: "tenue", aumentado: "tenue", sus2: "tenue", sus4: "tenue",
};

// Brief 12 §6: intensidades recalibradas para tema claro (antes pensadas
// para texto de color sobre fondo oscuro — "tenue" en particular con
// l:82 quedaba invisible sobre una tarjeta clara). El hue por nota no
// cambia, solo qué tan oscuro es el tono para que siga siendo legible como
// texto sobre blanco/crema.
const INTENSIDAD_POR_CATEGORIA: Record<CategoriaColor, { s: number; l: number }> = {
  mayor: { s: 65, l: 42 },
  dominante: { s: 60, l: 40 },
  menor: { s: 45, l: 45 },
  tenue: { s: 30, l: 48 },
};

export function colorRaizAcorde(raiz: Nota, calidad: Calidad): string {
  const hue = huePorNota(raiz);
  const { s, l } = INTENSIDAD_POR_CATEGORIA[CATEGORIA_COLOR_POR_CALIDAD[calidad]];
  return `hsl(${hue} ${s}% ${l}%)`;
}

const S_EXTENSION = 60;
const L_EXTENSION = 40;

export function colorExtension(nota: Nota): string {
  return `hsl(${huePorNota(nota)} ${S_EXTENSION}% ${L_EXTENSION}%)`;
}

// Inserta un canal alfa en un color hsl(...) ya armado — mismo truco que
// colorConAlpha en lib/eventoUI.ts, pero para hsl en vez de oklch.
export function colorConAlphaHSL(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}
