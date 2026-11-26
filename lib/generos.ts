// Géneros de una canción: de 1 a 3 etiquetas guardadas como texto separado por comas («Pop, Rock»).
// La lista corta evita un mar de géneros: se reutilizan estos antes de inventar uno nuevo.
export const GENEROS_BASE = ["Rock", "Pop", "Indie", "Folk", "Alternativo", "Electrónica", "Psicodélico", "Punk", "Metal", "Reggae", "Dub", "Cumbia", "Jazz", "Blues", "Funk", "Hip hop"] as const;
export const MAX_GENEROS = 3;

export function parseGeneros(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const t of texto.split(",")) {
    const g = t.trim();
    const k = g.toLowerCase();
    if (g && !vistos.has(k)) {
      vistos.add(k);
      out.push(g);
    }
  }
  return out.slice(0, MAX_GENEROS);
}

export function textoDeGeneros(generos: string[]): string | null {
  const l = parseGeneros(generos.join(","));
  return l.length ? l.join(", ") : null;
}
