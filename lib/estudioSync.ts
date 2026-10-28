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

// Índice de la ocurrencia que suena en `posicionMs`: la última marca que ya
// pasó. -1 si todavía no empieza (o no hay marcas).
export function ocurrenciaEn(tiemposMs: (number | null)[], posicionMs: number): number {
  let lo = 0;
  let hi = tiemposMs.length - 1;
  let res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = tiemposMs[mid];
    if (t === null || t === undefined) {
      // marca faltante: buscar hacia atrás la más cercana válida
      let k = mid - 1;
      while (k >= lo && (tiemposMs[k] === null || tiemposMs[k] === undefined)) k--;
      if (k < lo) {
        lo = mid + 1;
        continue;
      }
      if ((tiemposMs[k] as number) <= posicionMs) {
        res = k;
        lo = mid + 1;
      } else hi = k - 1;
      continue;
    }
    if (t <= posicionMs) {
      res = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return res;
}

// Posición estimada entre dos avisos del reproductor (que llegan cada cierto tiempo).
export function posicionEstimada(ultimaMs: number, recibidoEn: number, ahora: number, pausado: boolean): number {
  return pausado ? ultimaMs : ultimaMs + Math.max(0, ahora - recibidoEn);
}
