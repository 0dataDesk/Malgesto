import { DIAS_SEMANA_ABREV, MESES } from "@/lib/eventoUI";
import { enZonaApp } from "@/lib/zonaHoraria";

// Brief 16: estas utilidades ya NO asumen la zona horaria ambiente (la del
// navegador o, en SSR, la del servidor) — los `iso` que reciben (fecha_inicio
// / fecha_fin, siempre UTC) se convierten primero a hora de ZONA_HORARIA_APP
// vía enZonaApp (lib/zonaHoraria.ts) antes de leer año/mes/día/hora. `esMismoDia`
// y `mismoMesAno` siguen operando sobre los getters locales de un Date común:
// lo que cambió es que quien las llama con un `iso` de evento debe pasarle
// `enZonaApp(iso)`, no `new Date(iso)` crudo (ver CalendarioShell/MesView).
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
  return String(enZonaApp(iso).getDate()).padStart(2, "0");
}

export function diaSemanaAbrev(iso: string): string {
  return DIAS_SEMANA_ABREV[enZonaApp(iso).getDay()];
}

export function hora(iso: string): string {
  const d = enZonaApp(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function nombreMesAno(fecha: Date): string {
  return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function nombreMes(iso: string): string {
  return MESES[enZonaApp(iso).getMonth()];
}

export function mismoMesAno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Brief "Disponibilidad de integrantes": "YYYY-MM-DD" a partir de los
// getters locales de un Date de calendario (mismo criterio que esMismoDia,
// no una conversión de zona) — para comparar directo contra columnas `date`
// de Postgres (incidencias.fecha_inicio/fin), que ya vienen así, sin hora
// ni zona que convertir.
export function fechaISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
