// Modo Estudio: sincronía exacta con Spotify. Lógica pura (sin DOM) para
// poder probarla aparte.

// 'https://open.spotify.com/track/ID?si=…' | 'spotify:track:ID' -> 'spotify:track:ID'
export function uriDeSpotify(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const m = /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/|spotify:track:)([A-Za-z0-9]{10,30})/.exec(t);
  return m ? `spotify:track:${m[1]}` : null;
}

// Una "ocurrencia" es un acorde tal como suena: una sección que se repite
// tres veces suena tres veces. `evento` es el índice del acorde en la lista
// única que muestra la pantalla.
export type Ocurrencia = { evento: number; seccion: number; vuelta: number };

export function ocurrencias(indicesPorSeccion: number[][], repeticiones: number[]): Ocurrencia[] {
  const out: Ocurrencia[] = [];
  indicesPorSeccion.forEach((ids, seccion) => {
    const veces = Math.max(1, repeticiones[seccion] ?? 1);
    for (let vuelta = 1; vuelta <= veces; vuelta++) ids.forEach((evento) => out.push({ evento, seccion, vuelta }));
  });
  return out;
}

// Anclas: pares [ocurrencia, milisegundo] que dicen "este acorde suena aquí".
// Entre dos anclas el tiempo se reparte parejo; si no hay anclas, la canción se
// reparte parejo de 0 a su duración. Cada ancla que se agrega afina el reparto.
export type Ancla = [number, number];

export function anclasValidas(x: unknown): Ancla[] {
  if (!Array.isArray(x)) return [];
  return x.filter((a): a is Ancla => Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]) && a[0] >= 0 && a[1] >= 0).sort((a, b) => a[0] - b[0]);
}

// Agrega (o reemplaza) un ancla y descarta las que quedarían en desorden.
export function agregarAncla(anclas: Ancla[], nueva: Ancla): Ancla[] {
  const sin = anclas.filter((a) => a[0] !== nueva[0]);
  const coherentes = sin.filter((a) => (a[0] < nueva[0] ? a[1] < nueva[1] : a[1] > nueva[1]));
  return [...coherentes, nueva].sort((a, b) => a[0] - b[0]);
}

// Peso de cada acorde de UNA sección: lo que dura se parece a cuánto texto cubre
// hasta el siguiente acorde (una línea cantada tarda más o menos lo mismo). Una
// sección sin letra (solo acordes) da el mismo peso fijo a cada acorde.
const HUECO_ENTRE_LINEAS = 8;
const PESO_ACORDE_SIN_LETRA = 24;
const PESO_MINIMO = 4;

export function pesosDeSeccion(lineas: { largo: number; posiciones: number[] }[], acordesSinLetra: number): number[] {
  const coords: number[] = [];
  let desplazamiento = 0;
  for (const l of lineas) {
    for (const p of [...l.posiciones].sort((x, y) => x - y)) coords.push(desplazamiento + Math.min(Math.max(p, 0), l.largo));
    desplazamiento += l.largo + HUECO_ENTRE_LINEAS;
  }
  if (coords.length === 0) return new Array(acordesSinLetra).fill(PESO_ACORDE_SIN_LETRA);
  return coords.map((c, j) => Math.max(PESO_MINIMO, (j + 1 < coords.length ? coords[j + 1] : desplazamiento) - c));
}

// Ocurrencia que suena en `posicionMs`; -1 si aún no empieza. `pesos` (uno por
// ocurrencia) reparte el tiempo en proporción; sin pesos, parejo.
export function ocurrenciaPorAnclas(anclas: Ancla[], posicionMs: number, total: number, duracionMs: number, pesos?: number[]): number {
  if (total <= 0) return -1;
  const pw = pesos && pesos.length === total ? pesos : new Array<number>(total).fill(1);
  const inicio: number[] = [0];
  for (let k = 0; k < total; k++) inicio.push(inicio[k] + Math.max(pw[k], 0.0001));
  const W = inicio[total];

  // puntos [peso acumulado, ms] por los que pasa la canción
  const puntos: [number, number][] = anclas.filter((a) => a[0] < total).map((a) => [inicio[a[0]], a[1]] as [number, number]);
  if (!puntos.some((q) => q[0] === 0)) puntos.unshift([0, 0]);
  puntos.push([W, Math.max(duracionMs, (puntos[puntos.length - 1]?.[1] ?? 0) + 1000)]);
  if (posicionMs < puntos[0][1]) return -1;

  let w = W;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [w0, t0] = puntos[i];
    const [w1, t1] = puntos[i + 1];
    if (posicionMs < t1 || i === puntos.length - 2) {
      w = t1 > t0 ? w0 + ((posicionMs - t0) / (t1 - t0)) * (w1 - w0) : w0;
      break;
    }
  }
  // último k con inicio[k] <= w
  let lo = 0;
  let hi = total - 1;
  let res = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (inicio[mid] <= w) {
      res = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return Math.min(total - 1, res);
}

// Posición estimada entre dos avisos del reproductor (que llegan cada cierto tiempo).
export function posicionEstimada(ultimaMs: number, recibidoEn: number, ahora: number, pausado: boolean): number {
  return pausado ? ultimaMs : ultimaMs + Math.max(0, ahora - recibidoEn);
}
