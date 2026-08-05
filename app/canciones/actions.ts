"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import { crearCancion, actualizarCancion, eliminarCancion, type CancionInput } from "@/lib/cancionesData";

export async function crearCancionAction(input: CancionInput) {
  await requerirMembresia(input.bandaId);
  const cancionId = await crearCancion(input);
  revalidatePath("/canciones");
  redirect(`/canciones/${cancionId}`);
}

export async function actualizarCancionAction(cancionId: string, input: CancionInput) {
  await requerirMembresia(input.bandaId);
  await actualizarCancion(cancionId, input);
  revalidatePath("/canciones");
  revalidatePath(`/canciones/${cancionId}`);
  redirect(`/canciones?banda=${input.bandaId}`);
}

export async function eliminarCancionAction(cancionId: string, bandaId: string) {
  await requerirMembresia(bandaId);
  await eliminarCancion(cancionId);
  revalidatePath("/canciones");
  redirect("/canciones");
}
