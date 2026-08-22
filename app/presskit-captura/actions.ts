"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import {
  actualizarPresskit,
  subirFoto,
  eliminarFoto,
  agregarRed,
  eliminarRed,
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

// Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados"
// §1/§2: "Enviar a Presskit" (y "Liga publicada", que ya vivía en
// DetalleBanda desde el brief anterior) se sacaron por completo de esta
// pantalla -- ver enviarPresskitAction/actualizarLigaPublicadaAction en
// app/gestion/actions.ts.
