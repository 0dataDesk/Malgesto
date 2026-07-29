import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { Nota, Modo } from "@/lib/cancionTeoria";

export type Setlist = {
  id: string;
  bandaId: string;
  nombre: string;
  cantidadCanciones: number;
};

export type CancionEnSetlist = {
  id: string;
  titulo: string;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionAprox: string | null;
};

export type SetlistItem = {
  id: string;
  orden: number;
  notasTransicion: string | null;
  cancion: CancionEnSetlist;
};

export type SetlistCompleto = {
  id: string;
  bandaId: string;
  nombre: string;
  items: SetlistItem[];
};

type ConteoEmbebido = { count: number }[] | { count: number } | null;

function contarEmbebido(v: ConteoEmbebido): number {
  if (!v) return 0;
  return Array.isArray(v) ? (v[0]?.count ?? 0) : v.count;
}

export async function obtenerSetlists(bandaIds: string[]): Promise<Setlist[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("setlists")
    .select("id, banda_id, nombre, setlist_items(count)")
    .in("banda_id", bandaIds)
    .order("nombre", { ascending: true });

  return (data ?? []).map((s) => ({
    id: s.id,
    bandaId: s.banda_id,
    nombre: s.nombre,
    cantidadCanciones: contarEmbebido(s.setlist_items as unknown as ConteoEmbebido),
  }));
}

export async function obtenerSetlistCompleto(setlistId: string): Promise<SetlistCompleto | null> {
  const admin = supabaseMalgesto();
  const { data: setlist } = await admin.from("setlists").select("id, banda_id, nombre").eq("id", setlistId).single();
  if (!setlist) return null;

  const { data: items } = await admin
    .from("setlist_items")
    .select("id, orden, notas_transicion, canciones(id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_aprox)")
    .eq("setlist_id", setlistId)
    .order("orden", { ascending: true });

  return {
    id: setlist.id,
    bandaId: setlist.banda_id,
    nombre: setlist.nombre,
    items: (items ?? [])
      .filter((i) => i.canciones)
      .map((i) => {
        const c = i.canciones as unknown as {
          id: string;
          titulo: string;
          tonalidad_nota: Nota;
          tonalidad_modo: Modo;
          bpm: number | null;
          duracion_aprox: string | null;
        };
        return {
          id: i.id,
          orden: i.orden,
          notasTransicion: i.notas_transicion,
          cancion: {
            id: c.id,
            titulo: c.titulo,
            tonalidadNota: c.tonalidad_nota,
            tonalidadModo: c.tonalidad_modo,
            bpm: c.bpm,
            duracionAprox: c.duracion_aprox,
          },
        };
      }),
  };
}

export async function crearSetlist(bandaId: string, nombre: string): Promise<string> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("setlists").insert({ banda_id: bandaId, nombre }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el Set List");
  return data.id;
}

export type ItemInput = { cancionId: string; notasTransicion: string | null };

// Reemplazo completo de los items en vez de diffear, igual que en Canciones
// y Calendario.
export async function actualizarSetlistItems(setlistId: string, items: ItemInput[]) {
  const admin = supabaseMalgesto();
  const { error: errDelete } = await admin.from("setlist_items").delete().eq("setlist_id", setlistId);
  if (errDelete) throw new Error(errDelete.message);

  if (items.length === 0) return;

  const { error: errInsert } = await admin.from("setlist_items").insert(
    items.map((it, i) => ({
      setlist_id: setlistId,
      cancion_id: it.cancionId,
      orden: i,
      notas_transicion: it.notasTransicion,
    }))
  );
  if (errInsert) throw new Error(errInsert.message);
}
