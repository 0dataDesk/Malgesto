"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import {
  crearSetlist,
  actualizarSetlistItems,
  iniciarEnVivo,
  detenerEnVivo,
  corregirEnVivo,
  obtenerEnVivoIniciadoEn,
  type ItemInput,
} from "@/lib/setlistsData";

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

// Brief "Cronómetro sincronizado en vivo": mismo criterio de acceso que el
// resto de Set List (requerirMembresia — cualquier miembro activo, sin
// exigir rol) — es una herramienta colaborativa de escenario, no una acción
// administrativa. revalidatePath solo en /vivo: iniciar/detener/corregir no
// cambian nada que se vea en el editor o la lista.
export async function iniciarEnVivoAction(setlistId: string, bandaId: string): Promise<string> {
  await requerirMembresia(bandaId);
  const iniciadoEn = await iniciarEnVivo(setlistId);
  revalidatePath(`/set-list/${setlistId}/vivo`);
  return iniciadoEn;
}

export async function detenerEnVivoAction(setlistId: string, bandaId: string): Promise<void> {
  await requerirMembresia(bandaId);
  await detenerEnVivo(setlistId);
  revalidatePath(`/set-list/${setlistId}/vivo`);
}

export async function corregirEnVivoAction(setlistId: string, bandaId: string, offsetSegundos: number): Promise<string> {
  await requerirMembresia(bandaId);
  const iniciadoEn = await corregirEnVivo(setlistId, offsetSegundos);
  revalidatePath(`/set-list/${setlistId}/vivo`);
  return iniciadoEn;
}

// Lectura liviana para el polling entre dispositivos — sin revalidatePath,
// no muta nada.
export async function obtenerEnVivoIniciadoEnAction(setlistId: string, bandaId: string): Promise<string | null> {
  await requerirMembresia(bandaId);
  return obtenerEnVivoIniciadoEn(setlistId);
}
