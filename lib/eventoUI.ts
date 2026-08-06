import type { TipoEvento, EstadoEvento } from "@/lib/malgestoEventos";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";

// Color e identidad visual por tipo de evento. Show/Ensayo/Cumpleaños
// siguen el HTML de Design literal (Cumpleaños: oklch(0.72 0.12 78), tomado
// de las pantallas 05/06 en uso real — ver detalle en el commit de la
// corrección de fidelidad anterior). Gira es la única excepción deliberada:
// Design lo deja casi idéntico a Cumpleaños, pero eso confunde ambos tipos
// en el calendario con datos reales, así que mantiene el violeta propio del
// Brief 2 en vez de seguir la fidelidad literal en este punto.
export const COLOR_TIPO: Record<TipoEvento, string> = {
  show: "oklch(0.64 0.15 34)",
  ensayo: "oklch(0.64 0.13 195)",
  cumpleanos: "oklch(0.72 0.12 78)",
  gira: "oklch(0.58 0.14 300)",
};

// Brief "Color de banda configurable...": el color de banda dejó de
// calcularse por índice (era inestable — dependía del orden de
// miembros_banda, que puede variar) — ahora es un valor fijo en
// bandas.color, elegido por el superadmin desde Gestión > Bandas entre
// estas opciones. Paleta acotada (no color picker libre) para garantizar
// buen contraste sobre fondo claro — evita los hues ya reservados con otro
// significado en el calendario (tentativo 88, gira 300, cumpleaños 78).
export const PALETA_COLOR_BANDA = [
  "oklch(0.64 0.15 34)", // naranja (acento primario de la app)
  "oklch(0.64 0.13 195)", // teal
  "oklch(0.6 0.14 280)", // violeta-azulado
  "oklch(0.55 0.14 150)", // verde
  "oklch(0.6 0.15 210)", // azul
  "oklch(0.6 0.16 350)", // magenta
  "oklch(0.58 0.16 20)", // rojo
  "oklch(0.58 0.15 110)", // verde-lima
];

// Inserta un canal alfa dentro de un color oklch(...) ya armado, ej.
// colorConAlpha("oklch(0.6 0.1 30)", 0.16) -> "oklch(0.6 0.1 30 / 0.16)".
export function colorConAlpha(color: string, alpha: number): string {
  return color.replace(/\)$/, ` / ${alpha})`);
}

// Brief "Paleta definitiva de colores del calendario": fondo de DÍA en el
// grid del mes — independiente de COLOR_TIPO de arriba (ese sigue siendo
// el acento de badges/pills en el resto de la app — EventoDetalle, borde
// de la lista "varios eventos este día" — sin cambios, esto es
// exclusivamente para el fondo de la celda). 3 intensidades por tipo:
// normal (mes actual, no pasado) / pasado (más claro, cualquier día ya
// transcurrido) / mesSiguiente (más oscuro, overflow de cierre futuro) —
// mismo patrón de 3 estados para los 3 tipos, colores sólidos (no alpha
// sobre el fondo de página, a diferencia del sistema anterior) para que la
// intensidad sea exacta y predecible.
export type IntensidadFondoDia = "pasado" | "normal" | "mesSiguiente";

// Show: escala de grises pura (chroma casi 0) — el hue 55 es el mismo que
// ya usa el resto de la app para sus neutros, así el gris no se siente
// "importado" de otra paleta.
export const FONDO_SHOW: Record<IntensidadFondoDia, string> = {
  pasado: "oklch(0.915 0.008 55)",
  normal: "oklch(0.82 0.012 55)",
  mesSiguiente: "oklch(0.70 0.016 55)",
};

// Ensayo: café/mostaza — mismo hue base que los grises de Show pero con
// chroma real (0.045-0.095 vs ~0.01), así se distingue con claridad sin
// pelearse por atención con el naranja de acento (hue 34) ni con el ámbar
// de tentativo (hue 88, chroma 0.17).
export const FONDO_ENSAYO: Record<IntensidadFondoDia, string> = {
  pasado: "oklch(0.87 0.045 55)",
  normal: "oklch(0.74 0.08 52)",
  mesSiguiente: "oklch(0.62 0.095 48)",
};

// Cumpleaños: dorado discreto — chroma deliberadamente más baja que Ensayo
// ("discreto y agradable, no llamativo"), hue corrido hacia el amarillo
// para no confundirse ni con Ensayo ni con tentativo.
export const FONDO_CUMPLEANOS: Record<IntensidadFondoDia, string> = {
  pasado: "oklch(0.91 0.022 95)",
  normal: "oklch(0.83 0.035 95)",
  mesSiguiente: "oklch(0.70 0.045 92)",
};

export const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  show: "Show",
  ensayo: "Ensayo",
  cumpleanos: "Cumpleaños",
  gira: "Gira",
};

// Brief "Estado Tentativo...": amarillo/ámbar de advertencia, deliberadamente
// distinto de todo lo que ya usa el calendario (acento show/naranja 34,
// gira/violeta 300, ensayo/teal 195, cumpleaños/durazno 78, paleta de banda
// 34/195/280/150) — es el único fondo de día pensado para decir "esto
// necesita revisión", no solo "acá pasa algo".
export const COLOR_TENTATIVO = "oklch(0.62 0.17 88)";

export const ETIQUETA_ESTADO: Record<EstadoEvento, string> = {
  confirmado: "Confirmado",
  tentativo: "Tentativo",
};

// MXN con separador de miles y 2 decimales, ej. $18,000.00 (Brief 9 §14).
const FORMATO_MONEDA = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatoMoneda(n: number): string {
  return FORMATO_MONEDA.format(n);
}

// Brief de refinamiento §1-2: mismo criterio que ya usaba CalendarioShell
// para sacar eventos pasados de "Próximos eventos" — hora de fin efectiva
// (fechaFin si existe, si no fechaInicio; en giras eso es el fin de la gira)
// contra "ahora" en hora de México — centralizado acá para que el indicativo
// del detalle y el color de la grilla no puedan desincronizarse de ese
// filtro.
export function eventoYaPaso(evento: { fechaInicio: string; fechaFin: string | null }): boolean {
  return enZonaApp(evento.fechaFin ?? evento.fechaInicio) < ahoraEnZonaApp();
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DIAS_SEMANA_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
export const DIAS_SEMANA_ABREV = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
