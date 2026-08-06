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
  duracionSegundos: number | null;
};

// Brief "renombrar bloques libres...": sample -> secuencia, dialogo ->
// interludio (rename ya hecho en la DB, sin datos que migrar), + marcador
// nuevo (divisor de sección: Intro/Encore/Parte N, sin cancion_id, con
// etiqueta obligatoria — misma regla de consistencia que secuencia/interludio,
// ver CHECK constraint en la migración de este brief).
export type TipoItemSetlist = "cancion" | "secuencia" | "interludio" | "marcador";

export type SetlistItem = {
  id: string;
  orden: number;
  tipo: TipoItemSetlist;
  etiqueta: string | null;
  notasTransicion: string | null;
  // Brief "Tiempos en Set List": solo se persiste para secuencia/interludio
  // (cancion saca su duración de canciones.duracion_segundos vía join,
  // marcador no lleva duración) — null en los otros dos casos.
  duracionSegundos: number | null;
  cancion: CancionEnSetlist | null;
};

export type SetlistCompleto = {
  id: string;
  bandaId: string;
  nombre: string;
  // Hora de inicio del cronómetro en vivo — compartida entre todos los
  // dispositivos que tengan la vista "En vivo" abierta, null = no corriendo.
  enVivoIniciadoEn: string | null;
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
  const { data: setlist } = await admin
    .from("setlists")
    .select("id, banda_id, nombre, en_vivo_iniciado_en")
    .eq("id", setlistId)
    .single();
  if (!setlist) return null;

  const { data: items } = await admin
    .from("setlist_items")
    .select(
      "id, orden, tipo, etiqueta, notas_transicion, duracion_segundos, canciones(id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_segundos)"
    )
    .eq("setlist_id", setlistId)
    .order("orden", { ascending: true });

  return {
    id: setlist.id,
    bandaId: setlist.banda_id,
    nombre: setlist.nombre,
    enVivoIniciadoEn: setlist.en_vivo_iniciado_en,
    items: (items ?? []).map((i) => {
      const c = i.canciones as unknown as {
        id: string;
        titulo: string;
        tonalidad_nota: Nota;
        tonalidad_modo: Modo;
        bpm: number | null;
        duracion_segundos: number | null;
      } | null;
      return {
        id: i.id,
        orden: i.orden,
        tipo: i.tipo as TipoItemSetlist,
        etiqueta: i.etiqueta,
        notasTransicion: i.notas_transicion,
        duracionSegundos: i.duracion_segundos,
        cancion: c && {
          id: c.id,
          titulo: c.titulo,
          tonalidadNota: c.tonalidad_nota,
          tonalidadModo: c.tonalidad_modo,
          bpm: c.bpm,
          duracionSegundos: c.duracion_segundos,
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

export type ItemInput = {
  tipo: TipoItemSetlist;
  cancionId: string | null;
  etiqueta: string | null;
  notasTransicion: string | null;
  duracionSegundos: number | null;
};

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
      tipo: it.tipo,
      cancion_id: it.cancionId,
      etiqueta: it.etiqueta,
      orden: i,
      notas_transicion: it.notasTransicion,
      duracion_segundos: it.duracionSegundos,
    }))
  );
  if (errInsert) throw new Error(errInsert.message);
}

// Brief "Cronómetro sincronizado en vivo": UNA hora de inicio por set list,
// compartida entre todos los dispositivos (setlists.en_vivo_iniciado_en) —
// nunca un timer local independiente. El servidor genera el timestamp
// (new Date(), no lo que mande el cliente) para que el reloj de un
// dispositivo desincronizado no descalibre a los demás.
export async function iniciarEnVivo(setlistId: string): Promise<string> {
  const admin = supabaseMalgesto();
  const iniciadoEn = new Date().toISOString();
  const { error } = await admin.from("setlists").update({ en_vivo_iniciado_en: iniciadoEn }).eq("id", setlistId);
  if (error) throw new Error(error.message);
  return iniciadoEn;
}

export async function detenerEnVivo(setlistId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("setlists").update({ en_vivo_iniciado_en: null }).eq("id", setlistId);
  if (error) throw new Error(error.message);
}

// Corrección manual: reescribe en_vivo_iniciado_en a (ahora - offsetSegundos)
// -- offsetSegundos es la suma de duraciones hasta el punto elegido
// (calcularAcumuladoGlobal en lib/setlistCatalogo.ts). "Ahora" es el reloj
// del servidor, mismo criterio que iniciarEnVivo.
export async function corregirEnVivo(setlistId: string, offsetSegundos: number): Promise<string> {
  const admin = supabaseMalgesto();
  const iniciadoEn = new Date(Date.now() - offsetSegundos * 1000).toISOString();
  const { error } = await admin.from("setlists").update({ en_vivo_iniciado_en: iniciadoEn }).eq("id", setlistId);
  if (error) throw new Error(error.message);
  return iniciadoEn;
}

// Lectura liviana para el polling de sincronización entre dispositivos (ver
// SetlistEnVivoCliente.tsx) — no trae el setlist completo.
export async function obtenerEnVivoIniciadoEn(setlistId: string): Promise<string | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("setlists").select("en_vivo_iniciado_en").eq("id", setlistId).maybeSingle();
  return data?.en_vivo_iniciado_en ?? null;
}
