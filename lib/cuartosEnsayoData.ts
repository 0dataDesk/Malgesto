import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type CuartoEnsayo = {
  id: string;
  bandaId: string;
  nombre: string;
  linkMaps: string;
};

export async function obtenerCuartosEnsayo(bandaIds: string[]): Promise<CuartoEnsayo[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("cuartos_ensayo")
    .select("id, banda_id, nombre, link_maps")
    .in("banda_id", bandaIds)
    .order("nombre", { ascending: true });

  return (data ?? []).map((c) => ({ id: c.id, bandaId: c.banda_id, nombre: c.nombre, linkMaps: c.link_maps }));
}

export async function crearCuartoEnsayo(bandaId: string, nombre: string, linkMaps: string): Promise<CuartoEnsayo> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("cuartos_ensayo")
    .insert({ banda_id: bandaId, nombre, link_maps: linkMaps })
    .select("id, banda_id, nombre, link_maps")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el cuarto de ensayo.");
  return { id: data.id, bandaId: data.banda_id, nombre: data.nombre, linkMaps: data.link_maps };
}

export async function actualizarCuartoEnsayo(id: string, nombre: string, linkMaps: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("cuartos_ensayo").update({ nombre, link_maps: linkMaps }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarCuartoEnsayo(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("cuartos_ensayo").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
