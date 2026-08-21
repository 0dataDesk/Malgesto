import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

// Brief "Logística: línea de tiempo del evento": un punto en la línea de
// tiempo de un evento. `hora` es hora de pared del eje fijo 11:00–02:00 (del
// día siguiente) que usa la pantalla -- `diaSiguiente` distingue las horas
// después de medianoche (mismo criterio que ya documenta la columna en DB).
export type PuntoLogistica = {
  id: string;
  eventoId: string;
  hora: string; // "HH:MM"
  diaSiguiente: boolean;
  etiqueta: string;
  lugarId: string | null;
  lugarNombre: string | null;
  lugarLinkMaps: string | null;
};

type LugarEmbebido = { nombre: string; link_maps: string } | null;

type FilaPunto = {
  id: string;
  evento_id: string;
  hora: string;
  dia_siguiente: boolean;
  etiqueta: string;
  lugar_id: string | null;
  lugares: unknown;
};

const COLUMNAS_PUNTO = "id, evento_id, hora, dia_siguiente, etiqueta, lugar_id, lugares(nombre, link_maps)";

function mapearPunto(f: FilaPunto): PuntoLogistica {
  const lugar = f.lugares as unknown as LugarEmbebido;
  return {
    id: f.id,
    eventoId: f.evento_id,
    hora: f.hora.slice(0, 5),
    diaSiguiente: f.dia_siguiente,
    etiqueta: f.etiqueta,
    lugarId: f.lugar_id,
    lugarNombre: lugar?.nombre ?? null,
    lugarLinkMaps: lugar?.link_maps ?? null,
  };
}

// Orden de línea de tiempo: primero las horas del mismo día (11:00–23:59),
// después las del día siguiente (00:00–02:00) -- así el orden visual sigue
// siendo cronológico dentro de la noche del evento, no un 00:xx apareciendo
// antes que un 23:xx por orden alfabético plano de `hora`.
export async function obtenerPuntosLogistica(eventoId: string): Promise<PuntoLogistica[]> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("logistica_items").select(COLUMNAS_PUNTO).eq("evento_id", eventoId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as FilaPunto[])
    .map(mapearPunto)
    .sort((a, b) => (a.diaSiguiente !== b.diaSiguiente ? (a.diaSiguiente ? 1 : -1) : a.hora.localeCompare(b.hora)));
}

export async function crearPuntoLogistica(
  eventoId: string,
  hora: string,
  diaSiguiente: boolean,
  etiqueta: string,
  lugarId: string | null
): Promise<PuntoLogistica> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("logistica_items")
    .insert({ evento_id: eventoId, hora, dia_siguiente: diaSiguiente, etiqueta: etiqueta.trim(), lugar_id: lugarId })
    .select(COLUMNAS_PUNTO)
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el punto.");
  return mapearPunto(data as unknown as FilaPunto);
}

export async function actualizarPuntoLogistica(
  id: string,
  hora: string,
  diaSiguiente: boolean,
  etiqueta: string,
  lugarId: string | null
): Promise<PuntoLogistica> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("logistica_items")
    .update({ hora, dia_siguiente: diaSiguiente, etiqueta: etiqueta.trim(), lugar_id: lugarId })
    .eq("id", id)
    .select(COLUMNAS_PUNTO)
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo guardar el punto.");
  return mapearPunto(data as unknown as FilaPunto);
}

export async function eliminarPuntoLogistica(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("logistica_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
