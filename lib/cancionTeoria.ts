// Lógica pura de armonía del módulo Canciones — construida desde cero para
// Malgesto a partir del Brief 4/7, sin referencia a ningún otro repo. Nada
// de esto se persiste calculado: tonos, acordes diatónicos y color siempre
// se recalculan desde tonalidad + nota_raiz + calidad.

export const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export type Nota = (typeof NOTAS)[number];

export const CALIDADES = [
  "mayor", "menor", "disminuido", "aumentado",
  "7", "maj7", "m7", "dim7", "m7b5", "sus2", "sus4", "add9", "madd9",
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
  add9: [{ semitonos: 4, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }, { semitonos: 14, etiqueta: "9ª" }],
  madd9: [{ semitonos: 3, etiqueta: "3ª" }, { semitonos: 7, etiqueta: "5ª" }, { semitonos: 14, etiqueta: "9ª" }],
};

// Semitonos de cada nota del acorde sobre la raíz (la raíz es 0), sin la 9ª (salvo add9, que la lleva).
export function semitonosDeCalidad(calidad: Calidad): number[] {
  return [0, ...INTERVALOS_POR_CALIDAD[calidad].map((i) => i.semitonos)];
}

const SUFIJO_POR_CALIDAD: Record<Calidad, string> = {
  mayor: "", menor: "m", disminuido: "dim", aumentado: "aum",
  "7": "7", maj7: "maj7", m7: "m7", dim7: "dim7", m7b5: "m7b5", sus2: "sus2", sus4: "sus4", add9: "add9", madd9: "madd9",
};

function notaEn(indice: number): Nota {
  return NOTAS[((indice % 12) + 12) % 12];
}

export type TonoAcorde = { raiz: Nota; acompanantes: { intervalo: string; nota: Nota }[] };

// Brief 19 §6: la 9ª ya no es opcional — todo acorde la incluye siempre.
export function tonosDelAcorde(raiz: Nota, calidad: Calidad): TonoAcorde {
  const idxRaiz = NOTAS.indexOf(raiz);
  const base = INTERVALOS_POR_CALIDAD[calidad];
  const intervalos = base.some((i) => i.etiqueta === "9ª") ? base : [...base, { semitonos: 14, etiqueta: "9ª" }];
  return {
    raiz,
    acompanantes: intervalos.map((i) => ({ intervalo: i.etiqueta, nota: notaEn(idxRaiz + i.semitonos) })),
  };
}

// `bajo` solo se pone cuando es distinto de la raíz (acorde con barra: Dsus4/F#).
export function simboloAcorde(raiz: Nota, calidad: Calidad, bajo?: Nota | null): string {
  return `${raiz}${SUFIJO_POR_CALIDAD[calidad]}${bajo && bajo !== raiz ? `/${bajo}` : ""}`;
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
// Colores de las notas naturales: siete tonos bien separados entre sí (≥ 43°) y con un poco de variación de
// claridad para que vecinas como B/C y E/F no se confundan. Las notas con sostenido (#) no tienen tono
// propio: son un degradado más claro y suave de su natural (C# = C pálido).
const AJUSTE_NATURAL: Record<string, { hue: number; dl: number }> = {
  C: { hue: 128, dl: 0 },
  D: { hue: 52, dl: 0 },
  E: { hue: 8, dl: -4 },
  F: { hue: 318, dl: 3 },
  G: { hue: 272, dl: -2 },
  A: { hue: 225, dl: -2 },
  B: { hue: 182, dl: 4 },
};
const DL_SOSTENIDO = 16;
const DS_SOSTENIDO = -18;

function ajusteDeNota(nota: Nota): { hue: number; dl: number; ds: number } {
  const sostenido = nota.endsWith("#");
  const base = AJUSTE_NATURAL[nota[0]];
  return { hue: base.hue, dl: base.dl + (sostenido ? DL_SOSTENIDO : 0), ds: sostenido ? DS_SOSTENIDO : 0 };
}

export function huePorNota(nota: Nota): number {
  return ajusteDeNota(nota).hue;
}

type CategoriaColor = "mayor" | "dominante" | "menor" | "tenue";

const CATEGORIA_COLOR_POR_CALIDAD: Record<Calidad, CategoriaColor> = {
  mayor: "mayor", maj7: "mayor", add9: "mayor",
  "7": "dominante",
  menor: "menor", m7: "menor", madd9: "menor",
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
  const { hue, dl, ds } = ajusteDeNota(raiz);
  const { s, l } = INTENSIDAD_POR_CATEGORIA[CATEGORIA_COLOR_POR_CALIDAD[calidad]];
  return `hsl(${hue} ${s + ds}% ${l + dl}%)`;
}

const S_EXTENSION = 60;
const L_EXTENSION = 40;

// Color por nota para los pills 1/3/5/7/9 (independiente del color de fondo
// de la tarjeta, que sale de colorRaizAcorde) — cada nota acompañante tiene
// su propio color según su hue, no el de la raíz.
export function colorExtension(nota: Nota): string {
  const { hue, dl, ds } = ajusteDeNota(nota);
  return `hsl(${hue} ${S_EXTENSION + ds}% ${L_EXTENSION + dl}%)`;
}

function hslARgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r0, g0, b0] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r0 + m, g0 + m, b0 + m];
}

function canalLineal(canal: number): number {
  return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
}

// Luminancia relativa WCAG (0 = negro, 1 = blanco) a partir de un color
// hsl(h s% l%) como el que arma colorRaizAcorde.
function luminanciaRelativa(color: string): number {
  const match = /^hsl\((-?[\d.]+) ([\d.]+)% ([\d.]+)%\)$/.exec(color);
  if (!match) return 0;
  const [, h, s, l] = match;
  const [r, g, b] = hslARgb(Number(h), Number(s) / 100, Number(l) / 100);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

// Brief "Ajustes ChordBlock/ChordCard §1/§4": ya no decide el color del
// símbolo del acorde (fijo en blanco) -- queda para decidir si la tarjeta
// lee como "oscura" o "clara" en conjunto, uso que sigue vivo para elegir
// la variante del fondo del badge de compases (§4).
export function colorContrasteTexto(color: string): "#000000" | "#ffffff" {
  const luminancia = luminanciaRelativa(color);
  const contrasteBlanco = 1.05 / (luminancia + 0.05);
  const contrasteNegro = (luminancia + 0.05) / 0.05;
  return contrasteBlanco >= contrasteNegro ? "#ffffff" : "#000000";
}

// ---------------------------------------------------------------------------
// Grados de las notas de un acorde (para el bajo: 1, ♭3, 5, 7, 9…).
// ---------------------------------------------------------------------------
const GRADO_POR_SEMITONOS: Record<number, string> = {
  0: "1", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♯5", 9: "♭♭7", 10: "♭7", 11: "7", 14: "9",
};
// «1», «♭3», «5», «♭7», «9»… según el acorde. Solo para notas que pertenecen al acorde.
export function gradoDeNota(raiz: Nota, calidad: Calidad, nota: Nota): string {
  const base = NOTAS.indexOf(raiz);
  const pc = NOTAS.indexOf(nota);
  for (const s of semitonosDeCalidad(calidad)) {
    if ((base + s) % 12 === pc) return GRADO_POR_SEMITONOS[s] ?? String(s);
  }
  return "";
}

// ---------------------------------------------------------------------------
// Calidad armada pulsando varios botones en orden (m → add9 = menor con novena).
// Solo se permiten las combinaciones que existen como calidad.
// ---------------------------------------------------------------------------
export const TOKENS_CALIDAD = ["m", "dim", "aum", "7", "maj7", "m7b5", "sus2", "sus4", "add9"] as const;
export type TokenCalidad = (typeof TOKENS_CALIDAD)[number];

const CALIDAD_POR_TOKENS: Record<string, Calidad> = {
  "": "mayor", m: "menor", dim: "disminuido", aum: "aumentado",
  "7": "7", maj7: "maj7", "m+7": "m7", "dim+7": "dim7", m7b5: "m7b5",
  sus2: "sus2", sus4: "sus4", add9: "add9", "m+add9": "madd9",
};

// Calidad que resulta de los botones pulsados (en orden); null si esa combinación no existe.
export function calidadDeTokens(tokens: TokenCalidad[]): Calidad | null {
  return CALIDAD_POR_TOKENS[tokens.join("+")] ?? null;
}
// ¿Se puede pulsar `token` después de los ya pulsados?
export function tokenPermitido(tokens: TokenCalidad[], token: TokenCalidad): boolean {
  return calidadDeTokens([...tokens, token]) !== null;
}
// Los botones que dan exactamente esta calidad (para mostrar lo pulsado al editar un acorde).
export function tokensDeCalidad(calidad: Calidad): TokenCalidad[] {
  const clave = Object.keys(CALIDAD_POR_TOKENS).find((k) => CALIDAD_POR_TOKENS[k] === calidad) ?? "";
  return clave === "" ? [] : (clave.split("+") as TokenCalidad[]);
}

// ---------------------------------------------------------------------------
// Acordes de la tonalidad. Covers: propuesta básica (lo que casi siempre aparece).
// Canción propia: propuesta amplia (séptimas, suspendidos, novenas, prestados, dominantes secundarios).
// ---------------------------------------------------------------------------
export type AcordePropuesto = { raiz: Nota; calidad: Calidad; romano: string };
export type GrupoPropuesto = { titulo: string; acordes: AcordePropuesto[] };

export function acordesDeTonalidad(tonalidad: Tonalidad, detallado: boolean): GrupoPropuesto[] {
  const r = NOTAS.indexOf(tonalidad.raiz);
  const en = (s: number): Nota => notaEn(r + s);
  const a = (s: number, calidad: Calidad, romano: string): AcordePropuesto => ({ raiz: en(s), calidad, romano });
  const mayor = tonalidad.modo === "mayor";

  // Triadas del tono (en menor, la V mayor es la que casi siempre suena: cadencia).
  const triadas: AcordePropuesto[] = mayor
    ? [a(0, "mayor", "I"), a(2, "menor", "ii"), a(4, "menor", "iii"), a(5, "mayor", "IV"), a(7, "mayor", "V"), a(9, "menor", "vi"), a(11, "disminuido", "vii°")]
    : [a(0, "menor", "i"), a(2, "disminuido", "ii°"), a(3, "mayor", "III"), a(5, "menor", "iv"), a(7, "menor", "v"), a(8, "mayor", "VI"), a(10, "mayor", "VII")];
  const dominante: AcordePropuesto = a(7, "7", "V7");
  if (!mayor) triadas.push(a(7, "mayor", "V"));

  if (!detallado) return [{ titulo: "Del tono", acordes: [...triadas, dominante] }];

  const septimas: AcordePropuesto[] = mayor
    ? [a(0, "maj7", "Imaj7"), a(2, "m7", "ii7"), a(4, "m7", "iii7"), a(5, "maj7", "IVmaj7"), dominante, a(9, "m7", "vi7"), a(11, "m7b5", "viiø")]
    : [a(0, "m7", "i7"), a(2, "m7b5", "iiø"), a(3, "maj7", "IIImaj7"), a(5, "m7", "iv7"), dominante, a(8, "maj7", "VImaj7"), a(10, "7", "VII7")];
  const color: AcordePropuesto[] = mayor
    ? [a(0, "add9", "Iadd9"), a(0, "sus2", "Isus2"), a(0, "sus4", "Isus4"), a(5, "add9", "IVadd9"), a(5, "sus2", "IVsus2"), a(7, "sus4", "Vsus4"), a(9, "madd9", "vi(add9)"), a(9, "sus2", "visus2"), a(2, "sus4", "iisus4")]
    : [a(0, "madd9", "i(add9)"), a(0, "sus2", "isus2"), a(0, "sus4", "isus4"), a(3, "add9", "IIIadd9"), a(5, "madd9", "iv(add9)"), a(7, "sus4", "Vsus4"), a(8, "add9", "VIadd9")];
  const prestados: AcordePropuesto[] = mayor
    ? [a(10, "mayor", "♭VII"), a(8, "mayor", "♭VI"), a(3, "mayor", "♭III"), a(5, "menor", "iv"), a(0, "menor", "i"), a(7, "menor", "v")]
    : [a(0, "mayor", "I"), a(5, "mayor", "IV"), a(7, "7", "V7"), a(2, "menor", "ii"), a(1, "mayor", "♭II")];
  const secundarios: AcordePropuesto[] = mayor
    ? [a(9, "7", "V7/ii"), a(11, "7", "V7/iii"), a(0, "7", "V7/IV"), a(2, "7", "V7/V"), a(4, "7", "V7/vi")]
    : [a(10, "7", "V7/III"), a(0, "7", "V7/iv"), a(2, "7", "V7/v"), a(3, "7", "V7/VI")];

  return [
    { titulo: "Triadas del tono", acordes: triadas },
    { titulo: "Con séptima", acordes: septimas },
    { titulo: "Color: add9 y suspendidos", acordes: color },
    { titulo: "Prestados", acordes: prestados },
    { titulo: "Dominantes secundarios", acordes: secundarios },
  ];
}
