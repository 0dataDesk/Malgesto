import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

// Antes "cuartos_ensayo" (Brief 8) — renombrado a "lugares" (Brief 9 §12)
// porque ahora un lugar guardado sirve tanto para Ensayo como para Show, no
// solo para salas de ensayo.
export type Lugar = {
  id: string;
  bandaId: string;
  nombre: string;
  linkMaps: string;
};

export async function obtenerLugares(bandaIds: string[]): Promise<Lugar[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("lugares")
    .select("id, banda_id, nombre, link_maps")
    .in("banda_id", bandaIds)
    .order("nombre", { ascending: true });

  return (data ?? []).map((l) => ({ id: l.id, bandaId: l.banda_id, nombre: l.nombre, linkMaps: l.link_maps }));
}

export async function crearLugar(bandaId: string, nombre: string, linkMaps: string): Promise<Lugar> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("lugares")
    .insert({ banda_id: bandaId, nombre, link_maps: linkMaps })
    .select("id, banda_id, nombre, link_maps")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el lugar.");
  return { id: data.id, bandaId: data.banda_id, nombre: data.nombre, linkMaps: data.link_maps };
}

export async function actualizarLugar(id: string, nombre: string, linkMaps: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("lugares").update({ nombre, link_maps: linkMaps }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarLugar(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("lugares").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
