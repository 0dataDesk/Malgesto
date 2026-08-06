// Sin "server-only" a propósito: lo necesitan tanto el editor (cliente,
// SetlistEditor.tsx) como la vista "En vivo" (server, vivo/page.tsx) — un
// solo catálogo de etiqueta/color por tipo de bloque libre para que ambas
// vistas coincidan siempre. setlistsData.ts sí es "server-only", así que
// estas constantes no pueden vivir ahí (romperían el boundary si un
// componente cliente las importara como valor, no solo como tipo).
import type { TipoItemSetlist } from "./setlistsData";

export const ETIQUETA_BLOQUE: Record<Exclude<TipoItemSetlist, "cancion">, string> = {
  secuencia: "Secuencia",
  interludio: "Interludio",
  marcador: "Marcador",
};

export const COLOR_BLOQUE: Record<Exclude<TipoItemSetlist, "cancion">, string> = {
  secuencia: "oklch(0.62 0.14 250)",
  interludio: "oklch(0.66 0.14 300)",
  marcador: "oklch(0.7 0.12 85)",
};

// Brief "Tiempos en Set List / cronómetro sincronizado": helpers de
// duración compartidos entre el editor y "En vivo" — mismo motivo que
// arriba, un solo cálculo para que no puedan desincronizarse entre vistas.
export type ItemParaDuracion = {
  tipo: TipoItemSetlist;
  duracionSegundos: number | null;
  cancion: { duracionSegundos: number | null } | null;
};

// cancion sale de canciones.duracion_segundos vía join; secuencia/interludio
// de su propio duracion_segundos; marcador no cuenta (null, no 0 — 0
// significaría "dura 0 segundos", null significa "no aplica").
export function segundosDelItem(it: ItemParaDuracion): number | null {
  if (it.tipo === "cancion") return it.cancion?.duracionSegundos ?? null;
  if (it.tipo === "marcador") return null;
  return it.duracionSegundos;
}

export type SubtotalSeccion = { segundos: number; faltanTiempos: boolean };

// Un subtotal de sección "cierra" en cada marcador (sección = todo lo que
// hay entre dos marcadores, o desde el inicio hasta el primero) y se
// reinicia después. Los items sin duración capturada cuentan 0 en la suma
// (no bloquean nada) pero marcan faltanTiempos=true para el indicador
// visual ("?").
export function calcularSubtotalesPorSeccion(items: ItemParaDuracion[]): {
  porMarcador: (SubtotalSeccion | null)[];
  total: SubtotalSeccion;
} {
  const porMarcador: (SubtotalSeccion | null)[] = new Array(items.length).fill(null);
  let segundos = 0;
  let faltanTiempos = false;
  let totalSegundos = 0;
  let totalFaltan = false;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.tipo === "marcador") {
      porMarcador[i] = { segundos, faltanTiempos };
      segundos = 0;
      faltanTiempos = false;
      continue;
    }
    const dur = segundosDelItem(it);
    if (dur === null) {
      faltanTiempos = true;
      totalFaltan = true;
    } else {
      segundos += dur;
      totalSegundos += dur;
    }
  }

  return { porMarcador, total: { segundos: totalSegundos, faltanTiempos: totalFaltan } };
}

// Acumulado GLOBAL desde el inicio del set (no resetea en marcadores, a
// diferencia de calcularSubtotalesPorSeccion) — es lo que necesita el
// cronómetro en vivo para saber, dado un tiempo transcurrido, en qué item
// debería estar la banda. Un item sin duración capturada cuenta 0 acá (una
// ventana de ancho 0 en la línea de tiempo — nunca puede "tocarle el turno"
// de quedar resaltado más que en el instante exacto de su inicio, reflejo
// honesto de que no sabemos cuánto dura).
export function calcularAcumuladoGlobal(items: ItemParaDuracion[]): { inicioDe: number[]; finDe: number[]; total: number } {
  const inicioDe: number[] = [];
  const finDe: number[] = [];
  let acumulado = 0;
  for (const it of items) {
    inicioDe.push(acumulado);
    acumulado += segundosDelItem(it) ?? 0;
    finDe.push(acumulado);
  }
  return { inicioDe, finDe, total: acumulado };
}

// Índice del item "actual" dado el tiempo transcurrido desde el inicio del
// set — el primero cuyo rango [inicio,fin) todavía no terminó. Si ya se
// pasó todo el set, se queda resaltado el último item real (no marcador).
export function itemActualPorTiempo(items: ItemParaDuracion[], segundosTranscurridos: number): number | null {
  const { finDe } = calcularAcumuladoGlobal(items);
  let ultimoNoMarcador: number | null = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].tipo === "marcador") continue;
    ultimoNoMarcador = i;
    if (segundosTranscurridos < finDe[i]) return i;
  }
  return ultimoNoMarcador;
}
