import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

// Antes "cuartos_ensayo" (Brief 8) — renombrado a "lugares" (Brief 9 §12)
// porque ahora un lugar guardado sirve tanto para Ensayo como para Show, no
// solo para salas de ensayo.
// Brief "Lugares: de pertenece a una banda a tiene bandas asignadas": un
// lugar ya no pertenece a una sola banda (banda_id) — es una entidad
// independiente con una o más bandas asignadas vía lugar_bandas, mismo
// patrón que gira_bandas para Gira.
export type Lugar = {
  id: string;
  bandaIds: string[];
  nombre: string;
  linkMaps: string;
};

type LugarCrudo = { id: string; nombre: string; link_maps: string };

// Arma los `Lugar` completos (con TODAS sus bandas asignadas, no solo las
// que se usaron para filtrar) a partir de una lista de ids de lugar — mismo
// patrón que `bandasPorGira` en malgestoEventos.ts.
async function lugaresConBandas(admin: ReturnType<typeof supabaseMalgesto>, lugarIds: string[]): Promise<Lugar[]> {
  if (lugarIds.length === 0) return [];

  const { data: lugaresRaw, error: errorLugares } = await admin
    .from("lugares")
    .select("id, nombre, link_maps")
    .in("id", lugarIds)
    .order("nombre", { ascending: true });
  if (errorLugares) throw new Error(errorLugares.message);

  const { data: relaciones, error: errorRelaciones } = await admin.from("lugar_bandas").select("lugar_id, banda_id").in("lugar_id", lugarIds);
  if (errorRelaciones) throw new Error(errorRelaciones.message);

  const bandaIdsPorLugar = new Map<string, string[]>();
  for (const r of relaciones ?? []) {
    const lista = bandaIdsPorLugar.get(r.lugar_id) ?? [];
    lista.push(r.banda_id);
    bandaIdsPorLugar.set(r.lugar_id, lista);
  }

  return ((lugaresRaw ?? []) as LugarCrudo[]).map((l) => ({
    id: l.id,
    nombre: l.nombre,
    linkMaps: l.link_maps,
    bandaIds: bandaIdsPorLugar.get(l.id) ?? [],
  }));
}

// Lugares que tienen asignada AL MENOS UNA de las bandas dadas — para el
// selector del formulario de evento (Ensayo/Show), donde solo interesan los
// lugares utilizables por las bandas del usuario. Cada `Lugar` devuelto trae
// el conjunto COMPLETO de bandas asignadas (no solo las de `bandaIds`), para
// que el filtro por banda del evento en el form funcione bien.
export async function obtenerLugares(bandaIds: string[]): Promise<Lugar[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data: relaciones, error } = await admin.from("lugar_bandas").select("lugar_id").in("banda_id", bandaIds);
  if (error) throw new Error(error.message);
  const lugarIds = [...new Set((relaciones ?? []).map((r) => r.lugar_id))];
  return lugaresConBandas(admin, lugarIds);
}

// TODOS los lugares existentes, sin importar qué bandas tengan asignadas —
// para Gestión > Lugares, que ahora administra el catálogo completo en vez
// de uno por banda a la vez.
export async function obtenerLugaresTodos(): Promise<Lugar[]> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("lugares").select("id");
  if (error) throw new Error(error.message);
  return lugaresConBandas(admin, (data ?? []).map((l) => l.id));
}

export async function crearLugar(bandaIds: string[], nombre: string, linkMaps: string): Promise<Lugar> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("lugares").insert({ nombre, link_maps: linkMaps }).select("id, nombre, link_maps").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el lugar.");

  if (bandaIds.length > 0) {
    const { error: errorBandas } = await admin.from("lugar_bandas").insert(bandaIds.map((bandaId) => ({ lugar_id: data.id, banda_id: bandaId })));
    if (errorBandas) throw new Error(errorBandas.message);
  }

  return { id: data.id, nombre: data.nombre, linkMaps: data.link_maps, bandaIds };
}

export async function actualizarLugar(id: string, nombre: string, linkMaps: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("lugares").update({ nombre, link_maps: linkMaps }).eq("id", id);
  if (error) throw new Error(error.message);
}

// Reemplaza el conjunto completo de bandas asignadas a un lugar (borra y
// vuelve a insertar) — mismo patrón que gira_bandas en actualizarEvento.
export async function actualizarLugarBandas(id: string, bandaIds: string[]): Promise<void> {
  const admin = supabaseMalgesto();
  const { error: errorDelete } = await admin.from("lugar_bandas").delete().eq("lugar_id", id);
  if (errorDelete) throw new Error(errorDelete.message);
  if (bandaIds.length > 0) {
    const { error: errorInsert } = await admin.from("lugar_bandas").insert(bandaIds.map((bandaId) => ({ lugar_id: id, banda_id: bandaId })));
    if (errorInsert) throw new Error(errorInsert.message);
  }
}

export async function eliminarLugar(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("lugares").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
