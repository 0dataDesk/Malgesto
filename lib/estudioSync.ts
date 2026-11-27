// Modo Estudio: liga de Spotify. Lógica pura (sin DOM) para poder probarla aparte.
// (Sin tiempos grabados ni calculados con el tempo: el avance del Estudio es a mano.)

// 'https://open.spotify.com/track/ID?si=…' | 'spotify:track:ID' -> 'spotify:track:ID'
export function uriDeSpotify(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const m = /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/|spotify:track:)([A-Za-z0-9]{10,30})/.exec(t);
  return m ? `spotify:track:${m[1]}` : null;
}
