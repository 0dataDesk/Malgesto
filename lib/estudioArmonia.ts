// Modo Estudio: grado de un acorde dentro de la tonalidad, qué "se siente"
// ese grado, círculo de quintas y patrones comunes. Lógica pura.
import { NOTAS, escalaDiatonica, type Calidad, type Modo, type Nota, type Tonalidad } from "@/lib/cancionTeoria";

export function transponerNota(nota: Nota, semitonos: number): Nota {
  return NOTAS[(((NOTAS.indexOf(nota) + semitonos) % 12) + 12) % 12];
}

export function esMenorFamilia(calidad: Calidad): boolean {
  return calidad === "menor" || calidad === "m7" || calidad === "disminuido" || calidad === "dim7" || calidad === "m7b5";
}

const ROMANOS_MAYOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const ROMANOS_MENOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

const SENTIR_MAYOR = [
  "Es la casa: aquí se siente descanso.",
  "Suave y pensativo; prepara el camino hacia V.",
  "Parecido a la casa, pero más tranquilo.",
  "Se aleja de casa y abre el sonido.",
  "Tensión: pide volver a casa.",
  "La prima triste de la casa: menor y nostálgico.",
  "Tensión fuerte; pide resolver.",
];
const SENTIR_MENOR = [
  "Es la casa (menor): sonido serio.",
  "Inestable; lleva hacia v o V.",
  "La mayor de la casa: entra algo de luz.",
  "Se hunde, más oscuro todavía.",
  "Tensión suave que invita a volver.",
  "Cálido y esperanzador.",
  "Empuja de regreso a casa.",
];

export type GradoAcorde = {
  romano: string;
  grado: number | null; // 1..7 si es diatónico
  diatonico: boolean;
  sentir: string;
};

export function gradoEnTonalidad(raiz: Nota, calidad: Calidad, tonalidad: Tonalidad): GradoAcorde {
  const escala = escalaDiatonica(tonalidad);
  const i = escala.indexOf(raiz);
  const menorAcorde = esMenorFamilia(calidad);
  if (i === -1) {
    return { romano: "♭/♯", grado: null, diatonico: false, sentir: "Fuera de la tonalidad: un color prestado, suena a sorpresa." };
  }
  const romanos = tonalidad.modo === "mayor" ? ROMANOS_MAYOR : ROMANOS_MENOR;
  const esperadaMenor = romanos[i] === romanos[i].toLowerCase();
  if (menorAcorde !== esperadaMenor && !(calidad === "7" || calidad === "sus2" || calidad === "sus4")) {
    return { romano: romanos[i], grado: null, diatonico: false, sentir: "Cambia el color del grado normal: suena a sorpresa." };
  }
  return {
    romano: romanos[i],
    grado: i + 1,
    diatonico: true,
    sentir: (tonalidad.modo === "mayor" ? SENTIR_MAYOR : SENTIR_MENOR)[i],
  };
}

// Círculo de quintas: posición 0..11 (C arriba) de la raíz mayor; los menores
// van en el anillo interior en la posición de su relativa mayor.
const ORDEN_QUINTAS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

export function posicionEnCirculo(raiz: Nota, calidad: Calidad): { pos: number; anillo: "mayor" | "menor" } {
  const idx = NOTAS.indexOf(raiz);
  if (esMenorFamilia(calidad)) return { pos: ORDEN_QUINTAS.indexOf((idx + 3) % 12), anillo: "menor" };
  return { pos: ORDEN_QUINTAS.indexOf(idx), anillo: "mayor" };
}

export function etiquetaCirculo(pos: number, anillo: "mayor" | "menor"): string {
  const mayor = ORDEN_QUINTAS[pos];
  return anillo === "mayor" ? NOTAS[mayor] : `${NOTAS[(mayor + 9) % 12]}m`;
}

// Posición del centro tonal en el círculo (para una tonalidad menor, la de su relativa mayor).
export function centroTonal(tonalidad: Tonalidad): number {
  const idx = NOTAS.indexOf(tonalidad.raiz);
  return ORDEN_QUINTAS.indexOf(tonalidad.modo === "mayor" ? idx : (idx + 3) % 12);
}

const PATRONES: { romanos: string[]; nombre: string }[] = [
  { romanos: ["I", "V", "vi", "IV"], nombre: "la progresión más usada del pop" },
  { romanos: ["I", "vi", "IV", "V"], nombre: "la progresión de los años 50 (doo-wop)" },
  { romanos: ["vi", "IV", "I", "V"], nombre: "la versión triste del pop (empieza en la prima)" },
  { romanos: ["ii", "V", "I"], nombre: "el movimiento clave del jazz: prepara, tensa, descansa" },
  { romanos: ["I", "IV", "V"], nombre: "las tres bases del blues y el rock" },
  { romanos: ["i", "VI", "III", "VII"], nombre: "un clásico en menor, dramático" },
  { romanos: ["i", "VII", "VI", "VII"], nombre: "un vaivén en menor muy usado en rock" },
  { romanos: ["I", "IV", "I", "V"], nombre: "folk y country básico" },
];

export function patronEnSecuencia(romanos: string[]): { romanos: string[]; nombre: string } | null {
  for (const p of PATRONES) {
    for (let i = 0; i + p.romanos.length <= romanos.length; i++) {
      if (p.romanos.every((r, k) => romanos[i + k] === r)) return p;
    }
  }
  return null;
}

export function distanciaEnSemitonos(a: Nota, b: Nota): number {
  return (((NOTAS.indexOf(b) - NOTAS.indexOf(a)) % 12) + 12) % 12;
}

export type { Modo };
