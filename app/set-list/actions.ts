"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import { crearSetlist, actualizarSetlistItems, type ItemInput } from "@/lib/setlistsData";

export async function crearSetlistAction(bandaId: string, formData: FormData) {
  await requerirMembresia(bandaId);
  const nombre = String(formData.get("nombre") ?? "").trim() || "Set sin nombre";
  const setlistId = await crearSetlist(bandaId, nombre);
  revalidatePath("/set-list");
  redirect(`/set-list/${setlistId}`);
}

export async function actualizarSetlistAction(setlistId: string, bandaId: string, items: ItemInput[]) {
  await requerirMembresia(bandaId);
  await actualizarSetlistItems(setlistId, items);
  revalidatePath("/set-list");
  revalidatePath(`/set-list/${setlistId}`);
  revalidatePath(`/set-list/${setlistId}/vivo`);
}
