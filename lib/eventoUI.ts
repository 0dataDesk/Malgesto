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
