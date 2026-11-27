// Posición temporal de secciones y compases (Brief "Fase 3: nueva vista de
// Canción", Fase 1 §3). Sin timestamps manuales: todo se calcula desde el
// BPM + los compases + el orden de las secciones. La app no captura compás
// (time signature), así que se asume 4/4 en todo el repertorio (cumbia /
// rock) — 4 tiempos por compás.
//
// Sin "server-only": lo usa tanto la data layer (posición para guardar en
// caché de lectura) como la vista horizontal (cliente) para el control de
// reproducción discreto.

const TIEMPOS_POR_COMPAS = 4;

// Compases efectivos de una sección: el número explícito si lo tiene, si no
// la suma de la duración de sus acordes (comportamiento previo a Fase 3).
// Vive acá (módulo puro, sin "server-only") porque lo necesitan tanto la
// data layer como las vistas cliente.
export function compasesDeSeccion(s: {
  numeroCompases: number | null;
  acordes: { duracionCompases: number }[];
}): number {
  // Siempre la suma de lo capturado (acordes y silencios); `numeroCompases` quedó sin uso.
  return s.acordes.reduce((total, a) => total + Number(a.duracionCompases), 0);
}

// Duración de un acorde para mostrar: compases ("2c") o, si dura menos de un compás, tiempos ("2t").
export function etiquetaDuracion(compases: number): string {
  if (compases >= 1 || compases <= 0) return `${Number(compases.toFixed(2))}c`;
  return `${Number((compases * TIEMPOS_POR_COMPAS).toFixed(2))}t`;
}

export function segundosPorCompas(bpm: number): number {
  if (!bpm || bpm <= 0) return 0;
  return (TIEMPOS_POR_COMPAS * 60) / bpm;
}
