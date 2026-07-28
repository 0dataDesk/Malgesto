import { DIAS_SEMANA_ABREV, MESES } from "@/lib/eventoUI";

// Utilidades de fecha en hora local del navegador — suficiente para una app
// de una sola zona horaria por banda, sin necesidad de manejo multi-zona.

export function esMismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function inicioDeMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

export function sumarMeses(fecha: Date, n: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
}

// Lunes = 0 ... Domingo = 6, para que la grilla arranque en lunes (igual que Design).
function diaSemanaLunesPrimero(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

export function diaDelMes(iso: string): string {
  return String(new Date(iso).getDate()).padStart(2, "0");
}

export function diaSemanaAbrev(iso: string): string {
  return DIAS_SEMANA_ABREV[new Date(iso).getDay()];
}

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function nombreMesAno(fecha: Date): string {
  return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function nombreMes(iso: string): string {
  return MESES[new Date(iso).getMonth()];
}

export function mismoMesAno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Celdas de la grilla del mes: arranca en lunes de la semana que contiene el
// día 1, y cierra en domingo de la semana que contiene el último día —
// siempre múltiplo de 7, sin semanas "de más" innecesarias.
export function celdasDelMes(mesDeReferencia: Date): Date[] {
  const primero = inicioDeMes(mesDeReferencia);
  const ultimo = new Date(mesDeReferencia.getFullYear(), mesDeReferencia.getMonth() + 1, 0);

  const inicio = new Date(primero);
  inicio.setDate(inicio.getDate() - diaSemanaLunesPrimero(primero));

  const fin = new Date(ultimo);
  fin.setDate(fin.getDate() + (6 - diaSemanaLunesPrimero(ultimo)));

  const celdas: Date[] = [];
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    celdas.push(new Date(d));
  }
  return celdas;
}
