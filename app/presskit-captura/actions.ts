"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import {
  actualizarPresskit,
  subirFoto,
  eliminarFoto,
  agregarRed,
  eliminarRed,
  marcarPresskitEnviado,
  type ActualizacionPresskit,
  type PresskitFoto,
  type PresskitRed,
} from "@/lib/presskitData";

export async function actualizarPresskitAction(bandaId: string, presskitId: string, cambios: ActualizacionPresskit): Promise<void> {
  await requerirSuperadmin();
  await actualizarPresskit(presskitId, cambios);
  revalidatePath(`/presskit-captura/${bandaId}`);
}

export async function subirFotoPresskitAction(formData: FormData): Promise<PresskitFoto> {
  await requerirSuperadmin();
  const bandaId = String(formData.get("bandaId") ?? "");
  const presskitId = String(formData.get("presskitId") ?? "");
  const orden = Number(formData.get("orden") ?? 0);
  const archivo = formData.get("archivo");
  if (!bandaId || !presskitId || !(archivo instanceof File)) throw new Error("Faltan datos de la foto.");

  const foto = await subirFoto(presskitId, bandaId, archivo, orden);
  revalidatePath(`/presskit-captura/${bandaId}`);
  return foto;
}

export async function eliminarFotoPresskitAction(bandaId: string, fotoId: string, storagePath: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarFoto(fotoId, storagePath);
  revalidatePath(`/presskit-captura/${bandaId}`);
}

export async function agregarRedPresskitAction(bandaId: string, presskitId: string, plataforma: string, url: string, orden: number): Promise<PresskitRed> {
  await requerirSuperadmin();
  const red = await agregarRed(presskitId, plataforma, url, orden);
  revalidatePath(`/presskit-captura/${bandaId}`);
  return red;
}

export async function eliminarRedPresskitAction(bandaId: string, redId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarRed(redId);
  revalidatePath(`/presskit-captura/${bandaId}`);
}

export async function marcarPresskitEnviadoAction(bandaId: string, presskitId: string): Promise<string> {
  await requerirSuperadmin();
  const enviadoEn = await marcarPresskitEnviado(presskitId);
  revalidatePath(`/presskit-captura/${bandaId}`);
  return enviadoEn;
}
