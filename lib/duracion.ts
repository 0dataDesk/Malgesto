// Sin "server-only": son funciones puras usadas solo del lado cliente
// (CancionForm, SetlistEditor, SetlistEnVivoCliente) para convertir entre
// el mm:ss que escribe el usuario y los duracion_segundos que se guardan.

export function formatoMMSS(segundos: number | null): string | null {
  if (segundos === null || segundos < 0) return null;
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Acepta m:ss o mm:ss (1-3 dígitos de minutos, 0-59 de segundos). Texto
// vacío o inválido -> null (el llamador decide si eso es "sin duración" o
// un error, según si el campo estaba vacío a propósito).
export function parseMMSS(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const match = /^(\d{1,3}):([0-5]?\d)$/.exec(limpio);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
