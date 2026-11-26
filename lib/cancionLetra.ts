// Una sola captura de acordes: la fila de la parte (con su duración y sus ciclos repetidos) es la única fuente;
// la letra solo lleva texto y cada línea toma sus acordes en orden desde esa fila.
// Módulo puro (sin React) para poder revisarlo en `npm run check`.
import type { Nota, Calidad } from "@/lib/cancionTeoria";

export type AcordeFila = { notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null; duracionCompases: number; silencio?: boolean };
export type AcordeLetra = { posicion: number; notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null };
export type LineaLetra = { texto: string; tipo: "letra" | "tab"; acordes: AcordeLetra[] };

// ---- Ciclos de la fila --------------------------------------------------------------------------------------------

const mismoAcorde = (a: AcordeFila, b: AcordeFila) =>
  a.notaRaiz === b.notaRaiz && a.calidad === b.calidad && (a.notaBajo ?? null) === (b.notaBajo ?? null) && a.duracionCompases === b.duracionCompases && !!a.silencio === !!b.silencio;
const mismoNombre = (a: AcordeFila, b: AcordeFila) => a.notaRaiz === b.notaRaiz && a.calidad === b.calidad && (a.notaBajo ?? null) === (b.notaBajo ?? null) && !!a.silencio === !!b.silencio;

export type ItemFila = { tipo: "acorde"; i: number } | { tipo: "ciclo"; inicio: number; largo: number; veces: number };

function bloquesIguales(ac: AcordeFila[], a: number, b: number, largo: number): boolean {
  for (let j = 0; j < largo; j++) if (!mismoAcorde(ac[a + j], ac[b + j])) return false;
  return true;
}

// Agrupa en ciclos lo que se repite seguido (G D Am C ×8). Busca primero lo que más cubre; si un ciclo arranca desviado
// (el primer ciclo trae otra duración), lo alinea para que el ciclo empiece donde se ve natural.
export function agruparCiclos(ac: AcordeFila[]): ItemFila[] {
  const out: ItemFila[] = [];
  const recorrer = (lo: number, hi: number) => {
    let mejor: { s: number; largo: number; veces: number } | null = null;
    for (let largo = 1; largo <= Math.floor((hi - lo) / 2); largo++) {
      for (let s = lo; s + 2 * largo <= hi; s++) {
        let veces = 1;
        while (s + (veces + 1) * largo <= hi && bloquesIguales(ac, s, s + veces * largo, largo)) veces++;
        if (veces < 2) continue;
        const cubre = veces * largo;
        if (!mejor || cubre > mejor.veces * mejor.largo || (cubre === mejor.veces * mejor.largo && largo < mejor.largo)) mejor = { s, largo, veces };
      }
    }
    if (!mejor) {
      for (let i = lo; i < hi; i++) out.push({ tipo: "acorde", i });
      return;
    }
    const { largo } = mejor;
    let s = mejor.s;
    let veces = mejor.veces;
    // Alinear: elegir la rotación cuyo bloque coincide (por nombre) con los acordes que lo preceden.
    let mejorR = 0;
    for (let r = 0; r < largo && veces * largo - r >= 2 * largo; r++) {
      const ini = s + r;
      if (ini - largo < lo) continue;
      let todos = true;
      for (let j = 0; j < largo && todos; j++) todos = mismoNombre(ac[ini - largo + j], ac[ini + j]);
      if (todos) {
        mejorR = r;
        break;
      }
    }
    s += mejorR;
    veces = Math.floor((veces * largo - mejorR) / largo);
    recorrer(lo, s);
    out.push({ tipo: "ciclo", inicio: s, largo, veces });
    recorrer(s + veces * largo, hi);
  };
  recorrer(0, ac.length);
  return out;
}

// ---- Fila que se edita: la estructura la decide quien captura, nunca se agrupa sola mientras se edita -----------------

export type ItemEdicion = { tipo: "acorde"; a: AcordeFila } | { tipo: "ciclo"; bloque: AcordeFila[]; veces: number };

// Al abrir una parte ya guardada se agrupa lo que se repite (solo esa vez); al editar, la estructura es la que se arma a mano.
export function filaDesdeAcordes(ac: AcordeFila[]): ItemEdicion[] {
  return agruparCiclos(ac).map((it) =>
    it.tipo === "acorde"
      ? { tipo: "acorde" as const, a: { ...ac[it.i] } }
      : { tipo: "ciclo" as const, bloque: ac.slice(it.inicio, it.inicio + it.largo).map((x) => ({ ...x })), veces: it.veces }
  );
}

// Todos los acordes, en orden, con los ciclos repetidos las veces que digan.
export function expandirFila(fila: ItemEdicion[]): AcordeFila[] {
  return fila.flatMap((it) => (it.tipo === "acorde" ? [{ ...it.a }] : Array.from({ length: Math.max(1, it.veces) }, () => it.bloque.map((x) => ({ ...x }))).flat()));
}

// Convierte en un ciclo los últimos `n` acordes sueltos (los que están al final de la fila, sin pasar por otro ciclo).
export function agruparUltimos(fila: ItemEdicion[], n: number, veces: number): ItemEdicion[] {
  let sueltos = 0;
  while (sueltos < fila.length && fila[fila.length - 1 - sueltos].tipo === "acorde") sueltos++;
  const cuantos = Math.min(Math.max(1, Math.round(n)), sueltos);
  if (cuantos === 0) return fila;
  const bloque = fila.slice(fila.length - cuantos).map((x) => ({ ...(x as { tipo: "acorde"; a: AcordeFila }).a }));
  return [...fila.slice(0, fila.length - cuantos), { tipo: "ciclo", bloque, veces: Math.max(2, Math.round(veces)) }];
}

// Deshace un ciclo: deja sus acordes sueltos, tantas veces como se repetía.
export function deshacerCiclo(fila: ItemEdicion[], i: number): ItemEdicion[] {
  const it = fila[i];
  if (!it || it.tipo !== "ciclo") return fila;
  const sueltos: ItemEdicion[] = Array.from({ length: Math.max(1, it.veces) }, () => it.bloque.map((x) => ({ tipo: "acorde" as const, a: { ...x } }))).flat();
  return [...fila.slice(0, i), ...sueltos, ...fila.slice(i + 1)];
}

// ---- Letra: los acordes de cada línea salen de la fila ----------------------------------------------------------

// Posiciones donde empieza cada palabra del texto.
export function inicioDePalabras(texto: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < texto.length; i++) if (texto[i] !== " " && (i === 0 || texto[i - 1] === " ")) out.push(i);
  return out.length ? out : [0];
}

// Reparte n acordes sobre el texto según su duración, siempre al inicio de una palabra (el primero, al inicio).
export function ubicarAcordes(texto: string, pesos: number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const palabras = inicioDePalabras(texto);
  const total = pesos.reduce((a, b) => a + b, 0) || n;
  const largo = texto.trimEnd().length;
  const out: number[] = [];
  let acum = 0;
  for (let j = 0; j < n; j++) {
    const objetivo = j === 0 ? 0 : (largo * acum) / total;
    let p = palabras.reduce((m, x) => (Math.abs(x - objetivo) < Math.abs(m - objetivo) ? x : m), palabras[0]);
    if (j > 0 && p < out[j - 1]) p = out[j - 1];
    out.push(p);
    acum += pesos[j];
  }
  return out;
}

// ---- Sílabas (español): para mover un acorde sílaba por sílaba ----------------------------------------------------

const VOCALES = "aeiouáéíóúü";
const FUERTES = "aeoáéó";
const INSEPARABLES = new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "kr", "pl", "bl", "cl", "gl", "fl", "kl", "ch", "ll", "rr"]);

// Dos vocales seguidas se separan (hiato) si ambas son fuertes o si una es una i/u acentuada; si no, forman diptongo.
function hiato(a: string, b: string): boolean {
  if (FUERTES.includes(a) && FUERTES.includes(b)) return true;
  if (a === "í" || a === "ú" || b === "í" || b === "ú") return true;
  return a === b;
}

// Posiciones (dentro de la palabra) donde empieza cada sílaba.
export function iniciosDeSilaba(palabra: string): number[] {
  const w = palabra.toLowerCase();
  const n = w.length;
  const esVocal = (i: number): boolean => {
    const c = w[i];
    if (!c) return false;
    if (VOCALES.includes(c)) {
      // La u de «que», «qui», «gue», «gui» no suena como vocal.
      if (c === "u" && i > 0 && (w[i - 1] === "q" || (w[i - 1] === "g" && "eiéí".includes(w[i + 1] ?? "")))) return false;
      return true;
    }
    return c === "y" && i === n - 1;
  };
  const nucleos: [number, number][] = [];
  for (let i = 0; i < n; ) {
    if (!esVocal(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && esVocal(j + 1) && !hiato(w[j], w[j + 1])) j++;
    nucleos.push([i, j]);
    i = j + 1;
  }
  const inicios = [0];
  for (let k = 0; k + 1 < nucleos.length; k++) {
    const desde = nucleos[k][1] + 1;
    const hasta = nucleos[k + 1][0];
    const cons = w.slice(desde, hasta);
    const largo = cons.length;
    let inicio: number;
    if (largo <= 1) inicio = desde + (largo === 1 ? 0 : 0);
    else if (largo === 2) inicio = INSEPARABLES.has(cons) ? desde : desde + 1;
    else if (largo === 3) inicio = INSEPARABLES.has(cons.slice(1)) ? desde + 1 : desde + 2;
    else inicio = desde + 2;
    if (inicio > 0 && inicio < n) inicios.push(inicio);
  }
  return inicios;
}

// Lugares donde puede pararse un acorde al moverlo: el inicio de cada sílaba y los signos de puntuación (la coma, etc.).
export function paradasDeMovimiento(texto: string): number[] {
  const paradas = new Set<number>([0]);
  for (const m of texto.matchAll(/[\p{L}\p{N}'’]+/gu)) {
    const base = m.index ?? 0;
    iniciosDeSilaba(m[0]).forEach((i) => paradas.add(base + i));
  }
  for (const m of texto.matchAll(/[,.;:!?¿¡…]/g)) paradas.add(m.index ?? 0);
  return [...paradas].sort((a, b) => a - b);
}

// Mueve un acorde a la sílaba (o signo) anterior (-1) o siguiente (+1).
export function moverPosicion(texto: string, pos: number, dir: -1 | 1): number {
  const paradas = paradasDeMovimiento(texto);
  if (dir > 0) return paradas.find((p) => p > pos) ?? pos;
  const antes = paradas.filter((p) => p < pos);
  return antes.length ? antes[antes.length - 1] : 0;
}

const conteos = (letra: LineaLetra[]) => letra.map((l) => (l.tipo === "letra" ? l.acordes.length : 0));
export const sinSilencios = (ac: AcordeFila[]) => ac.filter((a) => !a.silencio);

// Reparte los acordes de la fila entre las líneas de letra según `cuentas` (acordes por línea), en orden.
// Una línea cuyo conteo no cambió conserva sus posiciones; las demás se ubican solas.
export function aplicarConteos(letra: LineaLetra[], progresion: AcordeFila[], cuentas: number[]): LineaLetra[] {
  const actuales = conteos(letra);
  let puntero = 0;
  return letra.map((l, li) => {
    if (l.tipo !== "letra") return l;
    const c = cuentas[li] ?? 0;
    const bloque = progresion.slice(puntero, puntero + c);
    puntero += c;
    const previas = [...l.acordes].sort((a, b) => a.posicion - b.posicion);
    const posiciones = c === actuales[li] && previas.length === bloque.length ? previas.map((p) => p.posicion) : ubicarAcordes(l.texto, bloque.map((a) => a.duracionCompases));
    return { ...l, acordes: bloque.map((a, j) => ({ posicion: posiciones[j] ?? 0, notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo })) };
  });
}

// Reparto parejo de m acordes entre las líneas de letra.
export function cuentasParejas(letra: LineaLetra[], m: number): number[] {
  const idx = letra.map((l, i) => (l.tipo === "letra" ? i : -1)).filter((i) => i >= 0);
  const out = letra.map(() => 0);
  if (idx.length === 0) return out;
  const base = Math.floor(m / idx.length);
  const resto = m % idx.length;
  idx.forEach((li, k) => (out[li] = base + (k < resto ? 1 : 0)));
  return out;
}

// Sincroniza la letra con la fila. Si ya reparten el mismo número de acordes solo se refrescan los nombres
// (así un cambio de acorde arriba se ve en la letra); si no, se reparten parejo. `forzar` reparte siempre.
export function sincronizarLetra(letra: LineaLetra[], progresion: AcordeFila[], forzar = false): LineaLetra[] {
  const m = progresion.length;
  const cur = conteos(letra);
  const suma = cur.reduce((a, b) => a + b, 0);
  if (!forzar && m === 0) return letra;
  if (!forzar && suma === m) return aplicarConteos(letra, progresion, cur);
  return aplicarConteos(letra, progresion, cuentasParejas(letra, m));
}

// Pasa un acorde de una línea a la vecina: `delta` +1 = esta línea toma uno; −1 = le da uno.
export function moverFrontera(letra: LineaLetra[], progresion: AcordeFila[], li: number, delta: 1 | -1): LineaLetra[] {
  const cuentas = conteos(letra);
  const lineas = letra.map((l, i) => (l.tipo === "letra" ? i : -1)).filter((i) => i >= 0);
  const k = lineas.indexOf(li);
  if (k < 0) return letra;
  if (delta > 0) {
    const siguiente = lineas.slice(k + 1).find((i) => cuentas[i] > 0);
    const previo = [...lineas.slice(0, k)].reverse().find((i) => cuentas[i] > 0);
    const donante = siguiente ?? previo;
    if (donante === undefined) return letra;
    cuentas[donante] -= 1;
    cuentas[li] += 1;
  } else {
    if (cuentas[li] <= 0) return letra;
    const destino = lineas[k + 1] ?? lineas[k - 1];
    if (destino === undefined) return letra;
    cuentas[li] -= 1;
    cuentas[destino] += 1;
  }
  return aplicarConteos(letra, progresion, cuentas);
}

// Cambia el texto de una línea; si tiene acordes, se vuelven a ubicar sobre el texto nuevo.
export function cambiarTexto(letra: LineaLetra[], progresion: AcordeFila[], li: number, texto: string): LineaLetra[] {
  const cuentas = conteos(letra);
  const inicio = cuentas.slice(0, li).reduce((a, b) => a + b, 0);
  return letra.map((l, i) => {
    if (i !== li) return l;
    if (l.tipo !== "letra" || l.acordes.length === 0) return { ...l, texto };
    const pesos = progresion.slice(inicio, inicio + l.acordes.length).map((a) => a.duracionCompases);
    const pos = ubicarAcordes(texto, pesos.length === l.acordes.length ? pesos : l.acordes.map(() => 1));
    const ordenados = [...l.acordes].sort((a, b) => a.posicion - b.posicion);
    return { ...l, texto, acordes: ordenados.map((a, j) => ({ ...a, posicion: pos[j] ?? 0 })) };
  });
}
