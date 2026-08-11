import type { TipoEvento, EstadoEvento } from "@/lib/malgestoEventos";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";

// Color e identidad visual por tipo de evento. Show/Ensayo siguen el HTML de
// Design literal, sin cambios acá (el brief "Calendario — sistema de
// colores" es exclusivamente sobre el fondo de día del grid, ver
// FONDO_GRISES más abajo -- este COLOR_TIPO sigue siendo el acento de
// badges/pills en el resto de la app, EventoDetalle/AgendaView, según ya
// documentaba este comentario). Cumpleaños y Gira sí cambian: Brief
// "Calendario — sistema de colores" los vuelve colores FIJOS en hex, iguales
// sin importar la fecha -- gira en particular unifica el valor que hoy se ve
// distinto entre el día del calendario (por el bug de colorConAlpha con hex,
// ver abajo) y el badge de "Próximos eventos".
export const COLOR_TIPO: Record<TipoEvento, string> = {
  show: "oklch(0.64 0.15 34)",
  ensayo: "oklch(0.64 0.13 195)",
  cumpleanos: "#E0839C",
  gira: "#7C5CBF",
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// Inserta un canal alfa dentro de un color ya armado -- oklch(...) o
// #rrggbb. Ej. colorConAlpha("oklch(0.6 0.1 30)", 0.16) ->
// "oklch(0.6 0.1 30 / 0.16)"; colorConAlpha("#7C5CBF", 0.22) ->
// "#7C5CBF38" (canal alfa de 8 dígitos hex, soportado nativamente por CSS).
// El caso hex se agrega acá (Brief "Calendario — sistema de colores": Gira
// pasa a guardarse en hex) -- antes el regex solo cazaba el ")" final de
// oklch(...) y para un hex sin paréntesis no hacía nada, devolviendo el
// color de entrada intacto y OPACO en vez de atenuado (rompía cualquier
// fondo con alpha que dependiera de un color en hex).
export function colorConAlpha(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const canalAlfa = Math.round(clamp01(alpha) * 255).toString(16).padStart(2, "0");
    return `${color}${canalAlfa}`;
  }
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

// Brief "Calendario — sistema de colores": Show y Ensayo comparten ahora la
// MISMA escala de grises (antes Ensayo tenía su propia paleta café/mostaza,
// FONDO_ENSAYO) -- lo que los distingue ya no es el color sino cómo se
// aplica (relleno completo para Show, borde de ~2px para Ensayo, dejando el
// fondo natural del calendario -- ver MesView). "pasado" y "normal" quedan
// igual que siempre (se ven bien, brief pide no tocarlos); "mesSiguiente"
// pasa a un gris neutro puro en hex -- el oklch anterior se veía con tinte
// café.
export const FONDO_GRISES: Record<IntensidadFondoDia, string> = {
  pasado: "oklch(0.915 0.008 55)",
  normal: "oklch(0.82 0.012 55)",
  mesSiguiente: "#3F3F42",
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
