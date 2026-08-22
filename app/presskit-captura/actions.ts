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
  actualizarLigaPublicada,
  construirDocumentoPresskit,
  type ActualizacionPresskit,
  type CategoriaFotoPresskit,
  type PresskitFoto,
  type PresskitRed,
} from "@/lib/presskitData";

// Brief "Presskit — vista propia, estatus, liga publicada": todas las
// mutaciones de acá también revalidan /presskit (vista de nivel superior,
// no solo la de captura), porque su leyenda de estatus lee actualizado_en/
// enviado_en/liga_publicada del mismo presskit.
export async function actualizarPresskitAction(bandaId: string, presskitId: string, cambios: ActualizacionPresskit): Promise<void> {
  await requerirSuperadmin();
  await actualizarPresskit(presskitId, cambios);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
}

export async function subirFotoPresskitAction(formData: FormData): Promise<PresskitFoto> {
  await requerirSuperadmin();
  const bandaId = String(formData.get("bandaId") ?? "");
  const presskitId = String(formData.get("presskitId") ?? "");
  const orden = Number(formData.get("orden") ?? 0);
  const archivo = formData.get("archivo");
  const categoria = String(formData.get("categoria") ?? "") as CategoriaFotoPresskit;
  if (!bandaId || !presskitId || !(archivo instanceof File) || (categoria !== "banda" && categoria !== "flyer")) {
    throw new Error("Faltan datos de la foto.");
  }

  const foto = await subirFoto(presskitId, bandaId, archivo, orden, categoria);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
  return foto;
}

export async function eliminarFotoPresskitAction(bandaId: string, presskitId: string, fotoId: string, storagePath: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarFoto(presskitId, fotoId, storagePath);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
}

export async function agregarRedPresskitAction(bandaId: string, presskitId: string, plataforma: string, url: string, orden: number): Promise<PresskitRed> {
  await requerirSuperadmin();
  const red = await agregarRed(presskitId, plataforma, url, orden);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
  return red;
}

export async function eliminarRedPresskitAction(bandaId: string, presskitId: string, redId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarRed(presskitId, redId);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
}

// Brief "Presskit: documento completo para Design (reemplaza el resumen
// recortado)" §3: además de marcar enviado_en (como ya hacía), genera acá
// mismo el documento completo con construirDocumentoPresskit -- la misma
// función que Jorge puede pedirle a Code para esta banda fuera de la app,
// sin este marcado de por medio.
export async function marcarPresskitEnviadoAction(bandaId: string, presskitId: string): Promise<{ enviadoEn: string; documento: string }> {
  await requerirSuperadmin();
  const enviadoEn = await marcarPresskitEnviado(presskitId);
  const documento = await construirDocumentoPresskit(bandaId);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
  return { enviadoEn, documento };
}

export async function actualizarLigaPublicadaAction(bandaId: string, presskitId: string, liga: string | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarLigaPublicada(presskitId, liga);
  revalidatePath(`/presskit-captura/${bandaId}`);
  revalidatePath("/presskit");
}
