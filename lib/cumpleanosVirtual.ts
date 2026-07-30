import type { Evento } from "@/lib/malgestoEventos";

// Sin "server-only" a propósito: CalendarioShell (cliente) necesita generar
// estos eventos virtuales en cada cambio de mes, así que esta función pura
// (sin I/O) vive separada de la consulta a la base (lib/cumpleanos.ts).
export type PersonaConCumple = {
  usuarioId: string;
  nombre: string;
  fechaNacimiento: string; // "YYYY-MM-DD"
  bandaIds: string[];
  bandaNombre: string; // bandas que corresponde mostrarle a quien mira la lista, ya unidas con ", "
};

function construirEvento(p: PersonaConCumple, anio: number): Evento {
  const partes = p.fechaNacimiento.split("-");
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);
  const fecha = new Date(anio, mes, dia, 0, 0, 0);
  return {
    id: `cumple-${p.usuarioId}-${anio}`,
    bandaId: p.bandaIds[0],
    bandaIds: p.bandaIds,
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
  };
}

// Cumpleaños (Brief 9 §17): ya no es una fila real en eventos, se calcula al
// vuelo a partir de personas.fecha_nacimiento para cada año en la ventana
// centro±1 (cubre navegar meses hacia atrás/adelante en la grilla del mes sin
// recalcular en cada borde exacto de año). Úsese solo para MesView/selección
// de día — para la lista de "Próximos eventos" usar proximosCumpleanos, que
// no repite años ni muestra fechas ya pasadas (Brief 10 §6).
export function generarCumpleanosVirtuales(personas: PersonaConCumple[], centro: Date): Evento[] {
  const anioBase = centro.getFullYear();
  const eventos: Evento[] = [];
  for (const p of personas) {
    for (const anio of [anioBase - 1, anioBase, anioBase + 1]) {
      eventos.push(construirEvento(p, anio));
    }
  }
  return eventos;
}

// Exactamente una ocurrencia por persona: la próxima fecha de cumpleaños a
// partir de "desde" (inclusive del día de hoy) — si ya pasó este año, la del
// año siguiente. Nunca devuelve una fecha anterior a "desde" (Brief 10 §6).
export function proximosCumpleanos(personas: PersonaConCumple[], desde: Date): Evento[] {
  const inicioDeReferencia = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  return personas.map((p) => {
    const partes = p.fechaNacimiento.split("-");
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);
    let anio = inicioDeReferencia.getFullYear();
    if (new Date(anio, mes, dia, 0, 0, 0) < inicioDeReferencia) anio += 1;
    return construirEvento(p, anio);
  });
}
