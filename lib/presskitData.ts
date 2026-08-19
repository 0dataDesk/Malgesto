import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

const BUCKET = "presskit";
const TIPOS_PERMITIDOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const TAMANO_MAXIMO = 10 * 1024 * 1024;

export type Presskit = {
  id: string;
  bandaId: string;
  bioLarga: string | null;
  pais: string | null;
  ciudad: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  enviadoEn: string | null;
};

type PresskitRow = {
  id: string;
  banda_id: string;
  bio_larga: string | null;
  pais: string | null;
  ciudad: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  enviado_en: string | null;
};

function mapPresskit(p: PresskitRow): Presskit {
  return {
    id: p.id,
    bandaId: p.banda_id,
    bioLarga: p.bio_larga,
    pais: p.pais,
    ciudad: p.ciudad,
    contactoNombre: p.contacto_nombre,
    contactoTelefono: p.contacto_telefono,
    contactoEmail: p.contacto_email,
    enviadoEn: p.enviado_en,
  };
}

const COLUMNAS_PRESSKIT = "id, banda_id, bio_larga, pais, ciudad, contacto_nombre, contacto_telefono, contacto_email, enviado_en";

// Un presskit por banda (UNIQUE(banda_id) en DB) -- se crea vacío la primera
// vez que alguien entra a la pantalla de captura, mismo criterio que
// obtenerOCrearStagePlot.
export async function obtenerOCrearPresskit(bandaId: string): Promise<Presskit> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("presskits").select(COLUMNAS_PRESSKIT).eq("banda_id", bandaId).maybeSingle();
  if (data) return mapPresskit(data);

  const { data: creado, error } = await admin.from("presskits").insert({ banda_id: bandaId }).select(COLUMNAS_PRESSKIT).single();
  if (error || !creado) throw new Error(error?.message ?? "No se pudo crear el presskit.");
  return mapPresskit(creado);
}

export type ActualizacionPresskit = {
  bioLarga: string | null;
  pais: string | null;
  ciudad: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
};

export async function actualizarPresskit(presskitId: string, cambios: ActualizacionPresskit): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("presskits")
    .update({
      bio_larga: cambios.bioLarga,
      pais: cambios.pais,
      ciudad: cambios.ciudad,
      contacto_nombre: cambios.contactoNombre,
      contacto_telefono: cambios.contactoTelefono,
      contacto_email: cambios.contactoEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", presskitId);
  if (error) throw new Error(error.message);
}

export type PresskitFoto = { id: string; storagePath: string; orden: number; url: string };

function urlPublicaFoto(admin: ReturnType<typeof supabaseMalgesto>, storagePath: string): string {
  return admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function obtenerFotos(presskitId: string): Promise<PresskitFoto[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("presskit_fotos").select("id, storage_path, orden").eq("presskit_id", presskitId).order("orden", { ascending: true });
  return (data ?? []).map((f) => ({ id: f.id, storagePath: f.storage_path, orden: f.orden, url: urlPublicaFoto(admin, f.storage_path) }));
}

// Sube el archivo al bucket `presskit` (público, 10MB, solo imágenes -- ya
// configurado en Storage) vía service role, igual que el resto de las
// escrituras de este módulo: el bucket no tiene policies propias para
// authenticated, así que la subida directa desde el cliente no funcionaría
// sin RLS de Storage, que este brief no pide agregar.
export async function subirFoto(presskitId: string, bandaId: string, archivo: File, ordenSiguiente: number): Promise<PresskitFoto> {
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) throw new Error("Solo se aceptan imágenes JPG, PNG o WebP.");
  if (archivo.size > TAMANO_MAXIMO) throw new Error("La imagen no puede superar los 10MB.");

  const admin = supabaseMalgesto();
  const path = `${bandaId}/${randomUUID()}.${extension}`;

  const { error: errorSubida } = await admin.storage.from(BUCKET).upload(path, archivo, { contentType: archivo.type });
  if (errorSubida) throw new Error(errorSubida.message);

  const { data, error } = await admin
    .from("presskit_fotos")
    .insert({ presskit_id: presskitId, storage_path: path, orden: ordenSiguiente })
    .select("id, storage_path, orden")
    .single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error(error?.message ?? "No se pudo guardar la foto.");
  }
  return { id: data.id, storagePath: data.storage_path, orden: data.orden, url: urlPublicaFoto(admin, data.storage_path) };
}

export async function eliminarFoto(fotoId: string, storagePath: string): Promise<void> {
  const admin = supabaseMalgesto();
  await admin.storage.from(BUCKET).remove([storagePath]);
  const { error } = await admin.from("presskit_fotos").delete().eq("id", fotoId);
  if (error) throw new Error(error.message);
}

export type PresskitRed = { id: string; plataforma: string; url: string; orden: number };

export async function obtenerRedes(presskitId: string): Promise<PresskitRed[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("presskit_redes").select("id, plataforma, url, orden").eq("presskit_id", presskitId).order("orden", { ascending: true });
  return data ?? [];
}

export async function agregarRed(presskitId: string, plataforma: string, url: string, ordenSiguiente: number): Promise<PresskitRed> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("presskit_redes")
    .insert({ presskit_id: presskitId, plataforma, url, orden: ordenSiguiente })
    .select("id, plataforma, url, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el link.");
  return data;
}

export async function eliminarRed(redId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("presskit_redes").delete().eq("id", redId);
  if (error) throw new Error(error.message);
}

// Marca el presskit como enviado a Design -- no genera nada visual, solo
// registra cuándo Jorge lo mandó (Brief §4). Devuelve el ISO guardado para
// que el cliente lo refleje sin esperar un revalidatePath.
export async function marcarPresskitEnviado(presskitId: string): Promise<string> {
  const admin = supabaseMalgesto();
  const ahora = new Date().toISOString();
  const { error } = await admin.from("presskits").update({ enviado_en: ahora, updated_at: ahora }).eq("id", presskitId);
  if (error) throw new Error(error.message);
  return ahora;
}
