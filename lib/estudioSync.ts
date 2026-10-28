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

// Ocurrencia que suena en `posicionMs`; -1 si aún no empieza.
export function ocurrenciaPorAnclas(anclas: Ancla[], posicionMs: number, total: number, duracionMs: number): number {
  if (total <= 0) return -1;
  const puntos: Ancla[] = [...anclas];
  if (!puntos.some((a) => a[0] === 0)) puntos.unshift([0, 0]);
  if (!puntos.some((a) => a[0] >= total)) puntos.push([total, Math.max(duracionMs, (puntos[puntos.length - 1]?.[1] ?? 0) + 1000)]);
  if (posicionMs < puntos[0][1]) return -1;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [k0, t0] = puntos[i];
    const [k1, t1] = puntos[i + 1];
    if (posicionMs < t1 || i === puntos.length - 2) {
      const frac = t1 > t0 ? (posicionMs - t0) / (t1 - t0) : 0;
      return Math.min(total - 1, Math.max(0, Math.floor(k0 + frac * (k1 - k0))));
    }
  }
  return total - 1;
}

// Posición estimada entre dos avisos del reproductor (que llegan cada cierto tiempo).
export function posicionEstimada(ultimaMs: number, recibidoEn: number, ahora: number, pausado: boolean): number {
  return pausado ? ultimaMs : ultimaMs + Math.max(0, ahora - recibidoEn);
}
