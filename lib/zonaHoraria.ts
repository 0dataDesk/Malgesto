// Brief 16: la app es de una sola banda de zona horaria — México — pero no
// hay que asumir que el navegador o el servidor (Vercel corre en UTC) están
// configurados en esa zona. Todo el manejo de fecha/hora de eventos pasa por
// acá en vez de por los getters locales crudos de Date (que dependen de la
// zona horaria ambiente de donde corra el código, no de la de la app).
export const ZONA_HORARIA_APP = "America/Mexico_City";

const formatoPartes = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA_APP,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export type PartesFecha = { anio: number; mes: number; dia: number; hora: number; minuto: number };

// Wall-clock en ZONA_HORARIA_APP para un instante UTC dado. `mes` queda
// 0-indexado (como Date) para poder alimentar directo un `new Date(...)`.
export function partesEnZonaApp(iso: string): PartesFecha {
  const partes = Object.fromEntries(formatoPartes.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return {
    anio: Number(partes.year),
    mes: Number(partes.month) - 1,
    dia: Number(partes.day),
    // Intl devuelve "24" para medianoche con hour12:false en vez de "00".
    hora: partes.hour === "24" ? 0 : Number(partes.hour),
    minuto: Number(partes.minute),
  };
}

// Date "sintético": sus getters LOCALES (getDate, getMonth, getHours...)
// devuelven la hora que ese instante UTC tiene en ZONA_HORARIA_APP, sin
// importar en qué zona horaria esté corriendo el navegador o el servidor.
// Pensado para pasarle a esMismoDia/mismoMesAno/diaDelMes tal cual estaban.
export function enZonaApp(iso: string): Date {
  const p = partesEnZonaApp(iso);
  return new Date(p.anio, p.mes, p.dia, p.hora, p.minuto);
}

// Inversa: el usuario eligió año/mes/día/hora/minuto como hora de pared en
// ZONA_HORARIA_APP (nunca en la zona ambiente) — esto devuelve el ISO UTC
// correspondiente para guardar. Calcula el offset real en vez de asumir uno
// fijo, así sigue siendo correcto si México reintrodujera horario de verano.
export function aUtcDesdeZonaApp(anio: number, mes: number, dia: number, hora: number, minuto: number): string {
  const aproximado = new Date(Date.UTC(anio, mes, dia, hora, minuto));
  const obtenidoComoSiFueraUtc = partesEnZonaApp(aproximado.toISOString());
  const pedidoMs = Date.UTC(anio, mes, dia, hora, minuto);
  const obtenidoMs = Date.UTC(
    obtenidoComoSiFueraUtc.anio,
    obtenidoComoSiFueraUtc.mes,
    obtenidoComoSiFueraUtc.dia,
    obtenidoComoSiFueraUtc.hora,
    obtenidoComoSiFueraUtc.minuto
  );
  const offsetMs = pedidoMs - obtenidoMs;
  return new Date(aproximado.getTime() + offsetMs).toISOString();
}

// "Ahora" como Date sintético en ZONA_HORARIA_APP — para resaltar "hoy" en
// la grilla sin depender de en qué zona horaria esté el dispositivo de quien
// mira el calendario.
export function ahoraEnZonaApp(): Date {
  return enZonaApp(new Date().toISOString());
}
