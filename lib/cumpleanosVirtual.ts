import type { Evento } from "@/lib/malgestoEventos";

// Sin "server-only" a propósito: CalendarioShell (cliente) necesita generar
// estos eventos virtuales en cada cambio de mes, así que esta función pura
// (sin I/O) vive separada de la consulta a la base (lib/cumpleanos.ts).
export type PersonaConCumple = {
  usuarioId: string;
  nombre: string;
  fechaNacimiento: string; // "YYYY-MM-DD"
  bandaId: string;
  bandaNombre: string;
};

// Cumpleaños (Brief 9 §17): ya no es una fila real en eventos, se calcula al
// vuelo a partir de personas.fecha_nacimiento para cada año en la ventana
// centro±1 (cubre navegar meses hacia atrás/adelante sin recalcular en cada
// borde exacto de año).
export function generarCumpleanosVirtuales(personas: PersonaConCumple[], centro: Date): Evento[] {
  const anioBase = centro.getFullYear();
  const eventos: Evento[] = [];

  for (const p of personas) {
    const partes = p.fechaNacimiento.split("-");
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    for (const anio of [anioBase - 1, anioBase, anioBase + 1]) {
      const fecha = new Date(anio, mes, dia, 0, 0, 0);
      eventos.push({
        id: `cumple-${p.usuarioId}-${p.bandaId}-${anio}`,
        bandaId: p.bandaId,
        bandaIds: [p.bandaId],
        bandaNombre: p.bandaNombre,
        tipo: "cumpleanos",
        titulo: `Cumpleaños de ${p.nombre}`,
        fechaInicio: fecha.toISOString(),
        fechaFin: null,
        ingresoEsperado: null,
        giraId: null,
        setlistId: null,
        lugarId: null,
        lugarNombre: null,
        lugarLinkMaps: null,
        pais: null,
        ciudades: null,
      });
    }
  }

  return eventos;
}
