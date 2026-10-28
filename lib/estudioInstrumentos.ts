// Modo Estudio: instrumentos, afinaciones y formas de acorde. Todo se calcula
// en el cliente; nada de esto se guarda en la base.
import { NOTAS, semitonosDeCalidad, simboloAcorde, type Calidad, type Nota } from "@/lib/cancionTeoria";

export type NombreInstrumento = "guitarra" | "bajo" | "ukulele";

export type Afinacion = {
  id: string;
  etiqueta: string;
  // Nota MIDI de cada cuerda al aire, de la más grave a la más aguda
  // (ukulele: orden G C E A, re-entrante).
  cuerdas: number[];
  nombres: string[];
};

export const INSTRUMENTOS_ESTUDIO: Record<NombreInstrumento, { etiqueta: string; afinaciones: Afinacion[] }> = {
  guitarra: {
    etiqueta: "Guitarra",
    afinaciones: [
      { id: "estandar", etiqueta: "Estándar (EADGBE)", cuerdas: [40, 45, 50, 55, 59, 64], nombres: ["E", "A", "D", "G", "B", "E"] },
      { id: "dropd", etiqueta: "Drop D (DADGBE)", cuerdas: [38, 45, 50, 55, 59, 64], nombres: ["D", "A", "D", "G", "B", "E"] },
    ],
  },
  bajo: {
    etiqueta: "Bajo 4",
    afinaciones: [
      { id: "estandar", etiqueta: "Estándar (EADG)", cuerdas: [28, 33, 38, 43], nombres: ["E", "A", "D", "G"] },
      { id: "dropd", etiqueta: "Drop D (DADG)", cuerdas: [26, 33, 38, 43], nombres: ["D", "A", "D", "G"] },
    ],
  },
  ukulele: {
    etiqueta: "Ukulele",
    afinaciones: [{ id: "estandar", etiqueta: "Estándar (GCEA)", cuerdas: [67, 60, 64, 69], nombres: ["G", "C", "E", "A"] }],
  },
};

export type Forma = { trastes: (number | null)[]; origen: "catalogo" | "calculada" };

// Formas comunes (guitarra, afinación estándar), de la cuerda 6 a la 1. "x" = no tocar.
const CATALOGO_GUITARRA: Record<string, string> = {
  C: "x32010", D: "xx0232", E: "022100", F: "133211", G: "320003", A: "x02220", B: "x24442",
  Am: "x02210", Bm: "x24432", Cm: "x35543", Dm: "xx0231", Em: "022000", Fm: "133111", Gm: "355333",
  C7: "x32310", D7: "xx0212", E7: "020100", G7: "320001", A7: "x02020", B7: "x21202",
  Cmaj7: "x32000", Dmaj7: "xx0222", Fmaj7: "xx3210", Gmaj7: "320002", Amaj7: "x02120",
  Am7: "x02010", Dm7: "xx0211", Em7: "022030", Bm7: "x20202",
  Asus2: "x02200", Asus4: "x02230", Dsus2: "xx0230", Dsus4: "xx0233", Esus4: "022200",
};

// Ukulele GCEA, de la cuerda G a la A.
const CATALOGO_UKULELE: Record<string, string> = {
  C: "0003", Am: "2000", F: "2010", G: "0232", G7: "0212", Em: "0432", Dm: "2210", D: "2220",
  A: "2100", E7: "1202", C7: "0001", D7: "2020", Bm: "4222", B7: "2322", Fmaj7: "2413", Cmaj7: "0002",
};

function desdeTexto(txt: string): (number | null)[] {
  // Los trastes de dos dígitos no están en el catálogo; cada carácter es una cuerda.
  return txt.split("").map((c) => (c === "x" ? null : Number(c)));
}

const cacheFormas = new Map<string, Forma | null>();

export function notasDelAcorde(raiz: Nota, calidad: Calidad): number[] {
  const r = NOTAS.indexOf(raiz);
  return semitonosDeCalidad(calidad).map((s) => (r + s) % 12);
}

// Forma del acorde en el instrumento y la afinación dados. Bajo: sin formas
// (se toca nota por nota; para eso está el mástil).
export function formaDeAcorde(
  instrumento: NombreInstrumento,
  afinacion: Afinacion,
  raiz: Nota,
  calidad: Calidad
): Forma | null {
  if (instrumento === "bajo") return null;
  const clave = `${instrumento}|${afinacion.id}|${raiz}|${calidad}`;
  if (cacheFormas.has(clave)) return cacheFormas.get(clave)!;

  const simbolo = simboloAcorde(raiz, calidad);
  let forma: Forma | null = null;
  const esEstandarGuitarra = instrumento === "guitarra" && afinacion.id === "estandar";
  if (esEstandarGuitarra && CATALOGO_GUITARRA[simbolo]) {
    forma = { trastes: desdeTexto(CATALOGO_GUITARRA[simbolo]), origen: "catalogo" };
  } else if (instrumento === "ukulele" && CATALOGO_UKULELE[simbolo]) {
    forma = { trastes: desdeTexto(CATALOGO_UKULELE[simbolo]), origen: "catalogo" };
  } else {
    forma = calcularForma(afinacion, raiz, calidad);
  }
  cacheFormas.set(clave, forma);
  return forma;
}

// Búsqueda de una forma tocable: todas las notas del acorde presentes, la raíz
// como nota más grave, pocas cuerdas apagadas, mano compacta y cerca del inicio.
function calcularForma(afinacion: Afinacion, raiz: Nota, calidad: Calidad): Forma | null {
  const cuerdas = afinacion.cuerdas;
  const n = cuerdas.length;
  const clase = notasDelAcorde(raiz, calidad);
  const idxRaiz = clase[0];
  const minSonando = n > 4 ? 4 : 3;

  let mejor: { trastes: (number | null)[]; puntos: number } | null = null;
  for (let base = 0; base <= 9; base++) {
    const opciones: (number | null)[][] = cuerdas.map((abierta) => {
      const o: (number | null)[] = [null];
      if (clase.includes(abierta % 12)) o.push(0);
      for (let t = Math.max(base, 1); t <= base + 3; t++) if (clase.includes((abierta + t) % 12)) o.push(t);
      return o;
    });
    const actual: (number | null)[] = new Array(n).fill(null);
    const recorrer = (i: number) => {
      if (i === n) {
        const sonando = actual.filter((t) => t !== null).length;
        if (sonando < minSonando) return;
        const primera = actual.findIndex((t) => t !== null);
        if (actual.slice(primera).some((t) => t === null)) return; // sin huecos
        if ((cuerdas[primera] + (actual[primera] as number)) % 12 !== idxRaiz) return; // raíz abajo
        const presentes = new Set(actual.map((t, k) => (t === null ? -1 : (cuerdas[k] + t) % 12)));
        if (!clase.every((c) => presentes.has(c))) return;
        const pisados = actual.filter((t): t is number => t !== null && t > 0);
        const span = pisados.length ? Math.max(...pisados) - Math.min(...pisados) : 0;
        const abiertas = actual.filter((t) => t === 0).length;
        const puntos =
          (n - sonando) * 2 + span * 1.5 + pisados.reduce((a, b) => a + b, 0) * 0.15 - abiertas * 0.8 + (pisados.length > 4 ? 3 : 0);
        if (!mejor || puntos < mejor.puntos) mejor = { trastes: [...actual], puntos };
        return;
      }
      for (const o of opciones[i]) {
        actual[i] = o;
        recorrer(i + 1);
      }
      actual[i] = null;
    };
    recorrer(0);
  }
  const m = mejor as { trastes: (number | null)[]; puntos: number } | null;
  return m ? { trastes: m.trastes, origen: "calculada" } : null;
}

// Todas las posiciones de las notas del acorde en el mástil (traste 0 a `hasta`).
export function posicionesEnMastil(
  afinacion: Afinacion,
  raiz: Nota,
  calidad: Calidad,
  hasta = 12
): { cuerda: number; traste: number; esRaiz: boolean; nota: Nota }[] {
  const clase = notasDelAcorde(raiz, calidad);
  const out: { cuerda: number; traste: number; esRaiz: boolean; nota: Nota }[] = [];
  afinacion.cuerdas.forEach((abierta, cuerda) => {
    for (let t = 0; t <= hasta; t++) {
      const pc = (abierta + t) % 12;
      if (clase.includes(pc)) out.push({ cuerda, traste: t, esRaiz: pc === clase[0], nota: NOTAS[pc] });
    }
  });
  return out;
}
