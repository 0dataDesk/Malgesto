"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import {
  crearCancion,
  actualizarCancion,
  eliminarCancion,
  actualizarEstadoBorrador,
  reemplazarAudio,
  quitarAudio,
  type CancionInput,
  type TipoAudio,
} from "@/lib/cancionesData";

// Brief "Nuevo nivel de rol: Miembro administrador": crear/editar/eliminar
// canciones exige requerirAccesoBloque (bloque canciones activo + persona no
// restringida + rol administrador/superadmin).
export async function crearCancionAction(input: CancionInput) {
  await requerirAccesoBloque(input.bandaId, "canciones");
  const cancionId = await crearCancion(input);
  revalidatePath("/canciones");
  redirect(`/canciones/${cancionId}`);
}

export async function actualizarCancionAction(cancionId: string, input: CancionInput) {
  await requerirAccesoBloque(input.bandaId, "canciones");
  await actualizarCancion(cancionId, input);
  revalidatePath("/canciones");
  revalidatePath(`/canciones/${cancionId}`);
  redirect(`/canciones?banda=${input.bandaId}`);
}

export async function eliminarCancionAction(cancionId: string, bandaId: string) {
  await requerirAccesoBloque(bandaId, "canciones");
  await eliminarCancion(cancionId);
  revalidatePath("/canciones");
  redirect(`/canciones?banda=${bandaId}`);
}

// Brief "Fase 3: nueva vista de Canción" (Fase 1 §1 y §6): pasar de borrador
// a lista (o volver a borrador para corregir). Redirige al detalle, que ya
// enruta al modo correcto según es_borrador.
export async function actualizarEstadoBorradorAction(cancionId: string, bandaId: string, esBorrador: boolean) {
  await requerirAccesoBloque(bandaId, "canciones");
  await actualizarEstadoBorrador(cancionId, esBorrador);
  revalidatePath("/canciones");
  revalidatePath(`/canciones/${cancionId}`);
  redirect(`/canciones/${cancionId}`);
}

// Brief "Fase 3: nueva vista de Canción" (Fase 1 §4): audio de referencia
// (ensayo, se reemplaza sin histórico) y audio de secuencia (versión final).
// El archivo viaja como FormData desde el editor.
export async function subirAudioAction(cancionId: string, bandaId: string, tipo: TipoAudio, form: FormData): Promise<string> {
  await requerirAccesoBloque(bandaId, "canciones");
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) throw new Error("No llegó ningún archivo.");
  const url = await reemplazarAudio(cancionId, bandaId, tipo, archivo);
  revalidatePath(`/canciones/${cancionId}`);
  revalidatePath(`/canciones/${cancionId}/editar`);
  return url;
}

export async function quitarAudioAction(cancionId: string, bandaId: string, tipo: TipoAudio): Promise<void> {
  await requerirAccesoBloque(bandaId, "canciones");
  await quitarAudio(cancionId, tipo);
  revalidatePath(`/canciones/${cancionId}`);
  revalidatePath(`/canciones/${cancionId}/editar`);
}
