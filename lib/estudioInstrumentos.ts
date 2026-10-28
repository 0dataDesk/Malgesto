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

export type Barre = { traste: number; desde: number; hasta: number };
export type Forma = {
  trastes: (number | null)[];
  // Dedo (1 índice … 4 meñique) que pisa cada cuerda; null si está al aire o apagada.
  dedos: (number | null)[];
  barre: Barre | null;
  origen: "catalogo" | "calculada";
};

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
  return txt.split("").map((c) => (c === "x" ? null : Number(c)));
}

// Sugerencia de digitación. Cejilla (dedo 1 sobre varias cuerdas) cuando hay
// 2+ notas en el traste más bajo y harían falta más de 4 dedos, o 3+ notas ahí.
// Los demás dedos van de menor a mayor traste. Es una guía, no una verdad única.
export function asignarDedos(trastes: (number | null)[]): { dedos: (number | null)[]; barre: Barre | null; valido: boolean } {
  const pisadas = trastes.map((t, cuerda) => ({ t, cuerda })).filter((x): x is { t: number; cuerda: number } => x.t !== null && x.t > 0);
  const dedos: (number | null)[] = trastes.map(() => null);
  if (pisadas.length === 0) return { dedos, barre: null, valido: true };
  const minTraste = Math.min(...pisadas.map((p) => p.t));
  const enMin = pisadas.filter((p) => p.t === minTraste);
  let barre: Barre | null = null;
  if (enMin.length >= 2 && (pisadas.length > 4 || enMin.length >= 3)) {
    const desde = Math.min(...enMin.map((p) => p.cuerda));
    const hasta = Math.max(...enMin.map((p) => p.cuerda));
    const libre = trastes.slice(desde, hasta + 1).every((t) => t === null || t >= minTraste);
    if (libre) barre = { traste: minTraste, desde, hasta };
  }
  const resto = pisadas
    .filter((p) => !(barre && p.t === minTraste && p.cuerda >= barre.desde && p.cuerda <= barre.hasta))
    .sort((x, y) => x.t - y.t || x.cuerda - y.cuerda);
  let dedo = barre ? 2 : 1;
  if (barre) enMin.forEach((p) => (dedos[p.cuerda] = 1));
  for (const p of resto) {
    if (dedo > 4) return { dedos, barre, valido: false };
    dedos[p.cuerda] = dedo;
    dedo += 1;
  }
  return { dedos, barre, valido: true };
}

function conDedos(trastes: (number | null)[], origen: Forma["origen"]): Forma {
  const { dedos, barre } = asignarDedos(trastes);
  return { trastes, dedos, barre, origen };
}

const cacheVariantes = new Map<string, Forma[]>();

export function notasDelAcorde(raiz: Nota, calidad: Calidad): number[] {
  const r = NOTAS.indexOf(raiz);
  return semitonosDeCalidad(calidad).map((s) => (r + s) % 12);
}

// Varias formas de tocar el mismo acorde, de la más cómoda/abierta a las más
// agudas. Bajo: sin formas (se toca nota por nota; para eso está el mástil).
export function variantesDeAcorde(instrumento: NombreInstrumento, afinacion: Afinacion, raiz: Nota, calidad: Calidad): Forma[] {
  if (instrumento === "bajo") return [];
  const clave = `${instrumento}|${afinacion.id}|${raiz}|${calidad}`;
  const guardada = cacheVariantes.get(clave);
  if (guardada) return guardada;

  const simbolo = simboloAcorde(raiz, calidad);
  const lista: Forma[] = [];
  const agregar = (f: Forma) => {
    if (!lista.some((x) => x.trastes.join(",") === f.trastes.join(","))) lista.push(f);
  };
  const esEstandarGuitarra = instrumento === "guitarra" && afinacion.id === "estandar";
  if (esEstandarGuitarra && CATALOGO_GUITARRA[simbolo]) agregar(conDedos(desdeTexto(CATALOGO_GUITARRA[simbolo]), "catalogo"));
  if (instrumento === "ukulele" && CATALOGO_UKULELE[simbolo]) agregar(conDedos(desdeTexto(CATALOGO_UKULELE[simbolo]), "catalogo"));
  calcularFormas(afinacion, raiz, calidad).forEach(agregar);
  const res = lista.slice(0, 6);
  cacheVariantes.set(clave, res);
  return res;
}

export function formaDeAcorde(instrumento: NombreInstrumento, afinacion: Afinacion, raiz: Nota, calidad: Calidad, variante = 0): Forma | null {
  const v = variantesDeAcorde(instrumento, afinacion, raiz, calidad);
  return v[Math.min(variante, v.length - 1)] ?? null;
}

// Busca la mejor forma tocable en cada zona del mástil: todas las notas del
// acorde, la raíz como nota más grave, pocas cuerdas apagadas, mano compacta y
// una digitación posible con 4 dedos (cejilla incluida).
function calcularFormas(afinacion: Afinacion, raiz: Nota, calidad: Calidad): Forma[] {
  const cuerdas = afinacion.cuerdas;
  const n = cuerdas.length;
  const clase = notasDelAcorde(raiz, calidad);
  const idxRaiz = clase[0];
  const minSonando = n > 4 ? 4 : 3;
  const porZona: { trastes: (number | null)[]; puntos: number }[] = [];

  for (let base = 0; base <= 10; base += 2) {
    const opciones: (number | null)[][] = cuerdas.map((abierta) => {
      const o: (number | null)[] = [null];
      if (base === 0 && clase.includes(abierta % 12)) o.push(0);
      for (let t = Math.max(base, 1); t <= base + 3; t++) if (clase.includes((abierta + t) % 12)) o.push(t);
      return o;
    });
    let mejor: { trastes: (number | null)[]; puntos: number } | null = null;
    const actual: (number | null)[] = new Array(n).fill(null);
    const recorrer = (i: number) => {
      if (i === n) {
        const sonando = actual.filter((t) => t !== null).length;
        if (sonando < minSonando) return;
        const primera = actual.findIndex((t) => t !== null);
        if (actual.slice(primera).some((t) => t === null)) return;
        if ((cuerdas[primera] + (actual[primera] as number)) % 12 !== idxRaiz) return;
        const presentes = new Set(actual.map((t, k) => (t === null ? -1 : (cuerdas[k] + t) % 12)));
        if (!clase.every((c) => presentes.has(c))) return;
        if (!asignarDedos(actual).valido) return;
        const pisados = actual.filter((t): t is number => t !== null && t > 0);
        const span = pisados.length ? Math.max(...pisados) - Math.min(...pisados) : 0;
        const abiertas = actual.filter((t) => t === 0).length;
        const puntos = (n - sonando) * 2 + span * 1.5 + pisados.reduce((a, b) => a + b, 0) * 0.12 - abiertas * 0.8;
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
    if (mejor) porZona.push(mejor);
  }
  return porZona.sort((a, b) => a.puntos - b.puntos).map((z) => conDedos(z.trastes, "calculada"));
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
