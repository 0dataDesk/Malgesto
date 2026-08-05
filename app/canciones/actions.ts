"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearCancion, actualizarCancion, eliminarCancion, type CancionInput } from "@/lib/cancionesData";

// Brief "Nuevo nivel de rol: Miembro administrador": crear/editar/eliminar
// canciones era abierto a cualquier miembro activo (requerirMembresia, sin
// chequeo de rol ni de bloque) — ahora exige el mismo criterio que Finanzas,
// requerirAccesoBloque: bloque canciones activo en la banda + persona no
// restringida por bloques_visibles + rol administrador o superadmin.
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
  redirect("/canciones");
}
