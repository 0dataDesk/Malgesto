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

// Cambios sobre un acorde de un ciclo: valen para todas sus repeticiones.
export function reemplazarEnCiclo(ac: AcordeFila[], c: { inicio: number; largo: number; veces: number }, offset: number, patch: Partial<AcordeFila>): AcordeFila[] {
  const out = ac.map((a) => ({ ...a }));
  for (let r = 0; r < c.veces; r++) out[c.inicio + r * c.largo + offset] = { ...out[c.inicio + r * c.largo + offset], ...patch };
  return out;
}
export function quitarEnCiclo(ac: AcordeFila[], c: { inicio: number; largo: number; veces: number }, offset: number): AcordeFila[] {
  const quitar = new Set<number>();
  for (let r = 0; r < c.veces; r++) quitar.add(c.inicio + r * c.largo + offset);
  return ac.filter((_, i) => !quitar.has(i));
}
// Cambia cuántas veces se repite un ciclo (mínimo 1).
export function cambiarVeces(ac: AcordeFila[], c: { inicio: number; largo: number; veces: number }, nuevas: number): AcordeFila[] {
  const n = Math.max(1, Math.round(nuevas));
  const out = ac.map((a) => ({ ...a }));
  if (n > c.veces) {
    const bloque = out.slice(c.inicio, c.inicio + c.largo);
    const extra: AcordeFila[] = [];
    for (let r = c.veces; r < n; r++) bloque.forEach((a) => extra.push({ ...a }));
    out.splice(c.inicio + c.veces * c.largo, 0, ...extra);
  } else if (n < c.veces) {
    out.splice(c.inicio + n * c.largo, (c.veces - n) * c.largo);
  }
  return out;
}
// Repite los últimos `n` acordes `veces` veces en total (agrega las copias que faltan al final).
export function repetirUltimos(ac: AcordeFila[], n: number, veces: number): AcordeFila[] {
  const largo = Math.min(Math.max(1, Math.round(n)), ac.length);
  if (ac.length === 0) return ac;
  const bloque = ac.slice(ac.length - largo).map((a) => ({ ...a }));
  const out = ac.map((a) => ({ ...a }));
  for (let r = 1; r < Math.max(2, Math.round(veces)); r++) bloque.forEach((a) => out.push({ ...a }));
  return out;
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

// Mueve un acorde al inicio de la palabra anterior (-1) o siguiente (+1).
export function moverPosicion(texto: string, pos: number, dir: -1 | 1): number {
  const palabras = inicioDePalabras(texto);
  if (dir > 0) return palabras.find((p) => p > pos) ?? pos;
  const antes = palabras.filter((p) => p < pos);
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
