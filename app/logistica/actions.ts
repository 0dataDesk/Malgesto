"use server";

import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import { crearPuntoLogistica, actualizarPuntoLogistica, eliminarPuntoLogistica, type PuntoLogistica } from "@/lib/logisticaData";

// Brief "Logística: línea de tiempo del evento": sin restricción de rol más
// allá de pertenecer a la banda -- mismo criterio que Ausencias
// (crearIncidenciaAction en app/inicio/actions.ts), no el de
// requerirSuperadminEnBanda que gatea Editar/Eliminar de EventoDetalle. La
// logística es información operativa del evento, útil para que cualquier
// integrante la consulte y la mantenga al día, no una acción administrativa.
export async function crearPuntoLogisticaAction(
  eventoId: string,
  bandaId: string,
  hora: string,
  diaSiguiente: boolean,
  etiqueta: string,
  lugarId: string | null
): Promise<PuntoLogistica> {
  await requerirMembresia(bandaId);
  if (!hora) throw new Error("Elegí una hora para el punto.");
  if (!etiqueta.trim()) throw new Error("La etiqueta no puede quedar vacía.");
  const punto = await crearPuntoLogistica(eventoId, hora, diaSiguiente, etiqueta, lugarId);
  revalidatePath(`/logistica/${eventoId}`);
  return punto;
}

export async function actualizarPuntoLogisticaAction(
  puntoId: string,
  eventoId: string,
  bandaId: string,
  hora: string,
  diaSiguiente: boolean,
  etiqueta: string,
  lugarId: string | null
): Promise<PuntoLogistica> {
  await requerirMembresia(bandaId);
  if (!hora) throw new Error("Elegí una hora para el punto.");
  if (!etiqueta.trim()) throw new Error("La etiqueta no puede quedar vacía.");
  const punto = await actualizarPuntoLogistica(puntoId, hora, diaSiguiente, etiqueta, lugarId);
  revalidatePath(`/logistica/${eventoId}`);
  return punto;
}

export async function eliminarPuntoLogisticaAction(puntoId: string, eventoId: string, bandaId: string): Promise<void> {
  await requerirMembresia(bandaId);
  await eliminarPuntoLogistica(puntoId);
  revalidatePath(`/logistica/${eventoId}`);
}
