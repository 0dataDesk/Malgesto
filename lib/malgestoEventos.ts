import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type TipoEvento = "ensayo" | "show" | "cumpleanos" | "gira";

export type Membresia = {
  bandaId: string;
  bandaNombre: string;
  rol: string;
};

export type Evento = {
  id: string;
  bandaId: string;
  bandaNombre: string;
  tipo: TipoEvento;
  titulo: string;
  fechaInicio: string;
  fechaFin: string | null;
  ubicacion: string | null;
  ingresoEsperado: number | null;
  giraId: string | null;
};

type BandaEmbebida = { id: string; nombre: string } | null;

// Bandas del usuario, con su rol — determina si va directo al calendario de
// su única banda o si necesita el selector (más de una). banda_id es
// muchos-a-uno, así que el embed de supabase-js llega como objeto único, no
// como arreglo (el tipo inferido sin Database generado dice array; en
// runtime es objeto — de ahí el cast).
export async function obtenerMembresias(usuarioId: string): Promise<Membresia[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("rol, bandas(id, nombre)")
    .eq("usuario_id", usuarioId);

  return (data ?? []).map((m) => {
    const banda = m.bandas as unknown as BandaEmbebida;
    return {
      bandaId: banda?.id ?? "",
      bandaNombre: banda?.nombre ?? "Banda",
      rol: m.rol,
    };
  });
}

// Todos los eventos de las bandas dadas, con el nombre de banda ya resuelto
// (necesario para la vista mezclada de usuarios con más de una banda).
export async function obtenerEventos(bandaIds: string[]): Promise<Evento[]> {
  if (bandaIds.length === 0) return [];

  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("eventos")
    .select("id, banda_id, tipo, titulo, fecha_inicio, fecha_fin, ubicacion, ingreso_esperado, gira_id, bandas(nombre)")
    .in("banda_id", bandaIds)
    .order("fecha_inicio", { ascending: true });

  return (data ?? []).map((e) => ({
    id: e.id,
    bandaId: e.banda_id,
    bandaNombre: (e.bandas as unknown as BandaEmbebida)?.nombre ?? "Banda",
    tipo: e.tipo as TipoEvento,
    titulo: e.titulo,
    fechaInicio: e.fecha_inicio,
    fechaFin: e.fecha_fin,
    ubicacion: e.ubicacion,
    ingresoEsperado: e.ingreso_esperado === null ? null : Number(e.ingreso_esperado),
    giraId: e.gira_id,
  }));
}

export type NuevoEventoInput = {
  bandaId: string;
  tipo: TipoEvento;
  titulo: string;
  fechaInicio: string;
  fechaFin: string | null;
  ubicacion: string | null;
  ingresoEsperado: number | null;
};

export async function crearEvento(input: NuevoEventoInput) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("eventos").insert({
    banda_id: input.bandaId,
    tipo: input.tipo,
    titulo: input.titulo,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    ubicacion: input.ubicacion,
    ingreso_esperado: input.tipo === "show" ? input.ingresoEsperado : null,
  });
  if (error) throw new Error(error.message);
}
