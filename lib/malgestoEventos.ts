import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type TipoEvento = "ensayo" | "show" | "cumpleanos" | "gira";

export type Membresia = {
  bandaId: string;
  bandaNombre: string;
  rol: string;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
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
  setlistId: string | null;
  cuartoEnsayoId: string | null;
  cuartoEnsayoNombre: string | null;
  cuartoEnsayoLinkMaps: string | null;
};

type BandaEmbebida = {
  id: string;
  nombre: string;
  canciones_habilitado: boolean;
  setlist_habilitado: boolean;
  seteos_habilitado: boolean;
} | null;

type CuartoEmbebido = { nombre: string; link_maps: string } | null;

// Bandas del usuario, con su rol — determina si va directo al calendario de
// su única banda o si necesita el selector (más de una). banda_id es
// muchos-a-uno, así que el embed de supabase-js llega como objeto único, no
// como arreglo (el tipo inferido sin Database generado dice array; en
// runtime es objeto — de ahí el cast). Solo membresías activas (Brief 8):
// una fila con activo=false es un integrante removido, no debe seguir
// entrando a las bandas ni contar para superadmin/accesos.
export async function obtenerMembresias(usuarioId: string): Promise<Membresia[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("rol, bandas(id, nombre, canciones_habilitado, setlist_habilitado, seteos_habilitado)")
    .eq("usuario_id", usuarioId)
    .eq("activo", true);

  return (data ?? []).map((m) => {
    const banda = m.bandas as unknown as BandaEmbebida;
    return {
      bandaId: banda?.id ?? "",
      bandaNombre: banda?.nombre ?? "Banda",
      rol: m.rol,
      cancionesHabilitado: banda?.canciones_habilitado ?? true,
      setlistHabilitado: banda?.setlist_habilitado ?? true,
      seteosHabilitado: banda?.seteos_habilitado ?? true,
    };
  });
}

// Superadmin es global en esta consola (ver malgestoAccess.requerirSuperadmin)
// — calculado acá desde las membresías ya cargadas para no repetir el
// query en cada pantalla que ya tiene `membresias` a mano.
export function esSuperadminDeMembresias(membresias: Membresia[]): boolean {
  return membresias.some((m) => m.rol === "superadmin");
}

// Todos los eventos de las bandas dadas, con el nombre de banda ya resuelto
// (necesario para la vista mezclada de usuarios con más de una banda).
export async function obtenerEventos(bandaIds: string[]): Promise<Evento[]> {
  if (bandaIds.length === 0) return [];

  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("eventos")
    .select(
      "id, banda_id, tipo, titulo, fecha_inicio, fecha_fin, ubicacion, ingreso_esperado, gira_id, setlist_id, cuarto_ensayo_id, bandas(nombre), cuartos_ensayo(nombre, link_maps)"
    )
    .in("banda_id", bandaIds)
    .order("fecha_inicio", { ascending: true });

  return (data ?? []).map((e) => {
    const cuarto = e.cuartos_ensayo as unknown as CuartoEmbebido;
    return {
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
      setlistId: e.setlist_id,
      cuartoEnsayoId: e.cuarto_ensayo_id,
      cuartoEnsayoNombre: cuarto?.nombre ?? null,
      cuartoEnsayoLinkMaps: cuarto?.link_maps ?? null,
    };
  });
}

export type NuevoEventoInput = {
  bandaId: string;
  tipo: TipoEvento;
  titulo: string;
  fechaInicio: string;
  fechaFin: string | null;
  ubicacion: string | null;
  ingresoEsperado: number | null;
  giraId: string | null;
  setlistId: string | null;
  cuartoEnsayoId: string | null;
};

const puedeTenerSetlist = (tipo: TipoEvento) => tipo === "show" || tipo === "ensayo";

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
    gira_id: input.tipo === "show" ? input.giraId : null,
    setlist_id: puedeTenerSetlist(input.tipo) ? input.setlistId : null,
    cuarto_ensayo_id: input.tipo === "ensayo" ? input.cuartoEnsayoId : null,
  });
  if (error) throw new Error(error.message);
}

export async function actualizarEvento(eventoId: string, input: NuevoEventoInput) {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("eventos")
    .update({
      banda_id: input.bandaId,
      tipo: input.tipo,
      titulo: input.titulo,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      ubicacion: input.ubicacion,
      ingreso_esperado: input.tipo === "show" ? input.ingresoEsperado : null,
      gira_id: input.tipo === "show" ? input.giraId : null,
      setlist_id: puedeTenerSetlist(input.tipo) ? input.setlistId : null,
      cuarto_ensayo_id: input.tipo === "ensayo" ? input.cuartoEnsayoId : null,
    })
    .eq("id", eventoId);
  if (error) throw new Error(error.message);
}

// Alta rápida de gira (Brief 8 §7) — una gira es simplemente un evento con
// tipo "gira" (sin tabla propia, ver comentario de giraId más abajo), así
// que esto es un insert directo sin pasar por el formulario completo.
export async function crearGira(bandaId: string, nombre: string, desde: string, hasta: string): Promise<Evento> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("eventos")
    .insert({ banda_id: bandaId, tipo: "gira", titulo: nombre, fecha_inicio: desde, fecha_fin: hasta })
    .select("id, banda_id, tipo, titulo, fecha_inicio, fecha_fin, ubicacion, ingreso_esperado, gira_id, setlist_id, cuarto_ensayo_id, bandas(nombre)")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la gira.");

  return {
    id: data.id,
    bandaId: data.banda_id,
    bandaNombre: (data.bandas as unknown as BandaEmbebida)?.nombre ?? "Banda",
    tipo: data.tipo as TipoEvento,
    titulo: data.titulo,
    fechaInicio: data.fecha_inicio,
    fechaFin: data.fecha_fin,
    ubicacion: data.ubicacion,
    ingresoEsperado: data.ingreso_esperado === null ? null : Number(data.ingreso_esperado),
    giraId: data.gira_id,
    setlistId: data.setlist_id,
    cuartoEnsayoId: data.cuarto_ensayo_id,
    cuartoEnsayoNombre: null,
    cuartoEnsayoLinkMaps: null,
  };
}

export async function eliminarEvento(eventoId: string) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("eventos").delete().eq("id", eventoId);
  if (error) throw new Error(error.message);
}

// Reasignación puntual de gira desde el panel de detalle (sin pasar por el
// formulario de edición completo).
export async function asignarGiraEvento(eventoId: string, giraId: string | null) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("eventos").update({ gira_id: giraId }).eq("id", eventoId);
  if (error) throw new Error(error.message);
}

// Igual, pero para el Set List asignado (Brief 5) — el mismo patrón de
// reasignación puntual desde el detalle.
export async function asignarSetlistEvento(eventoId: string, setlistId: string | null) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("eventos").update({ setlist_id: setlistId }).eq("id", eventoId);
  if (error) throw new Error(error.message);
}
