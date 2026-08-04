import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { sincronizarMovimientoAutomatico } from "@/lib/finanzasData";
import type { Membresia, NombreBloque } from "@/lib/bloques";

export type { Membresia, NombreBloque };
export { bloqueVisible, algunaBandaConBloque, membresiasConBloque } from "@/lib/bloques";

export type TipoEvento = "ensayo" | "show" | "cumpleanos" | "gira";

// Brief "Estado Tentativo...": solo aplica a show/gira -- ensayo/cumpleanos
// siempre son "confirmado" (forzado a nivel app, ver crearEvento/
// actualizarEvento más abajo, igual que ya se hace con ingresoEsperado).
export type EstadoEvento = "confirmado" | "tentativo";

export type Evento = {
  id: string;
  bandaId: string;
  bandaIds: string[];
  bandaNombre: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  titulo: string;
  fechaInicio: string;
  fechaFin: string | null;
  ingresoEsperado: number | null;
  giraId: string | null;
  setlistId: string | null;
  lugarId: string | null;
  lugarNombre: string | null;
  lugarLinkMaps: string | null;
  pais: string | null;
  ciudades: string | null;
};

type BandaEmbebida = {
  id: string;
  nombre: string;
  canciones_habilitado: boolean;
  setlist_habilitado: boolean;
  seteos_habilitado: boolean;
  finanzas_habilitado: boolean;
} | null;

type LugarEmbebido = { nombre: string; link_maps: string } | null;

const puedeTenerSetlist = (tipo: TipoEvento) => tipo === "show" || tipo === "ensayo";
const puedeTenerLugar = (tipo: TipoEvento) => tipo === "ensayo" || tipo === "show";

// Brief 17: `bandas(nombre)` sin calificar quedó ambiguo desde que existe
// gira_bandas (Brief 9 §18) — PostgREST ve dos caminos posibles de eventos a
// bandas (el FK directo eventos.banda_id, y el many-to-many vía gira_bandas)
// y rechaza el embed con PGRST201 en vez de adivinar. Como el código no
// revisaba `error` acá (ver obtenerEventos), esto rompía en silencio TODA
// lectura de eventos — no solo los de fin de mes — devolviendo `[]` en vez
// de fallar ruidosamente. Se califica con el nombre del FK para desambiguar.
const COLUMNAS_EVENTO =
  "id, banda_id, tipo, estado, titulo, fecha_inicio, fecha_fin, ingreso_esperado, gira_id, setlist_id, lugar_id, pais, ciudades, bandas!eventos_banda_id_fkey(nombre), lugares(nombre, link_maps)";

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
    .select("rol, bloques_visibles, bandas(id, nombre, canciones_habilitado, setlist_habilitado, seteos_habilitado, finanzas_habilitado)")
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
      finanzasHabilitado: banda?.finanzas_habilitado ?? true,
      bloquesVisibles: (m.bloques_visibles as string[] | null) ?? null,
    };
  });
}

// Superadmin es global en esta consola (ver malgestoAccess.requerirSuperadmin)
// — calculado acá desde las membresías ya cargadas para no repetir el
// query en cada pantalla que ya tiene `membresias` a mano.
export function esSuperadminDeMembresias(membresias: Membresia[]): boolean {
  return membresias.some((m) => m.rol === "superadmin");
}

function mapearEvento(
  e: {
    id: string;
    banda_id: string;
    tipo: string;
    estado: string;
    titulo: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    ingreso_esperado: number | string | null;
    gira_id: string | null;
    setlist_id: string | null;
    lugar_id: string | null;
    pais: string | null;
    ciudades: string | null;
    bandas: unknown;
    lugares: unknown;
  },
  bandasGira?: { id: string; nombre: string }[]
): Evento {
  const lugar = e.lugares as unknown as LugarEmbebido;
  return {
    id: e.id,
    bandaId: e.banda_id,
    bandaIds: bandasGira && bandasGira.length > 0 ? bandasGira.map((b) => b.id) : [e.banda_id],
    bandaNombre:
      bandasGira && bandasGira.length > 0 ? bandasGira.map((b) => b.nombre).join(" + ") : (e.bandas as unknown as BandaEmbebida)?.nombre ?? "Banda",
    tipo: e.tipo as TipoEvento,
    estado: e.estado as EstadoEvento,
    titulo: e.titulo,
    fechaInicio: e.fecha_inicio,
    fechaFin: e.fecha_fin,
    ingresoEsperado: e.ingreso_esperado === null ? null : Number(e.ingreso_esperado),
    giraId: e.gira_id,
    setlistId: e.setlist_id,
    lugarId: e.lugar_id,
    lugarNombre: lugar?.nombre ?? null,
    lugarLinkMaps: lugar?.link_maps ?? null,
    pais: e.pais,
    ciudades: e.ciudades,
  };
}

// Todos los eventos de las bandas dadas. Una gira puede involucrar bandas
// además de la "primaria" (eventos.banda_id, Brief 9 §18) — así que además
// del filtro directo por banda_id hay que traer también las giras donde el
// usuario solo participa como banda secundaria (vía gira_bandas), y resolver
// el conjunto completo de bandas de cada gira para el filtro de chips y el
// nombre combinado.
export async function obtenerEventos(bandaIds: string[]): Promise<Evento[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();

  // Brief 17: antes estos errores se tragaban con `?? []` — un embed
  // ambiguo (u otro error real) quedaba indistinguible de "no hay eventos".
  const { data: directos, error: errorDirectos } = await admin.from("eventos").select(COLUMNAS_EVENTO).in("banda_id", bandaIds);
  if (errorDirectos) throw new Error(errorDirectos.message);

  const { data: girasSecundarias, error: errorGiras } = await admin.from("gira_bandas").select("gira_evento_id").in("banda_id", bandaIds);
  if (errorGiras) throw new Error(errorGiras.message);

  const idsDirectos = new Set((directos ?? []).map((e) => e.id));
  const idsSecundarios = [...new Set((girasSecundarias ?? []).map((g) => g.gira_evento_id))].filter((id) => !idsDirectos.has(id));

  let extra: NonNullable<typeof directos> = [];
  if (idsSecundarios.length > 0) {
    const { data, error: errorExtra } = await admin.from("eventos").select(COLUMNAS_EVENTO).in("id", idsSecundarios);
    if (errorExtra) throw new Error(errorExtra.message);
    extra = data ?? [];
  }

  const todos = [...(directos ?? []), ...extra];
  if (todos.length === 0) return [];

  const giraIds = todos.filter((e) => e.tipo === "gira").map((e) => e.id);
  const bandasPorGira = new Map<string, { id: string; nombre: string }[]>();
  if (giraIds.length > 0) {
    const { data: relaciones } = await admin.from("gira_bandas").select("gira_evento_id, bandas(id, nombre)").in("gira_evento_id", giraIds);
    for (const r of relaciones ?? []) {
      const banda = r.bandas as unknown as { id: string; nombre: string } | null;
      if (!banda) continue;
      const lista = bandasPorGira.get(r.gira_evento_id) ?? [];
      lista.push(banda);
      bandasPorGira.set(r.gira_evento_id, lista);
    }
  }

  return todos
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    .map((e) => mapearEvento(e, e.tipo === "gira" ? bandasPorGira.get(e.id) : undefined));
}

export type NuevoEventoInput = {
  bandaId: string;
  bandaIds?: string[];
  tipo: TipoEvento;
  // Solo se respeta para tipo show/gira -- crearEvento/actualizarEvento
  // fuerzan 'confirmado' para el resto sin importar lo que llegue acá.
  estado: EstadoEvento;
  titulo: string;
  fechaInicio: string;
  fechaFin: string | null;
  ingresoEsperado: number | null;
  giraId: string | null;
  setlistId: string | null;
  lugarId: string | null;
  lugarNuevo: { nombre: string; linkMaps: string } | null;
  pais: string | null;
  ciudades: string | null;
};

async function resolverLugarId(
  admin: ReturnType<typeof supabaseMalgesto>,
  bandaId: string,
  lugarId: string | null,
  lugarNuevo: { nombre: string; linkMaps: string } | null
): Promise<string | null> {
  if (lugarNuevo && lugarNuevo.nombre.trim() && lugarNuevo.linkMaps.trim()) {
    const { data, error } = await admin
      .from("lugares")
      .insert({ nombre: lugarNuevo.nombre.trim(), link_maps: lugarNuevo.linkMaps.trim() })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo guardar el lugar.");

    // Brief "Lugares...": un lugar creado desde el form de evento queda
    // asignado a la banda del evento actual (lugares ya no tienen una sola
    // banda "dueña" — ver lib/lugaresData.ts).
    const { error: errorBanda } = await admin.from("lugar_bandas").insert({ lugar_id: data.id, banda_id: bandaId });
    if (errorBanda) throw new Error(errorBanda.message);

    return data.id;
  }
  return lugarId;
}

export async function crearEvento(input: NuevoEventoInput) {
  const admin = supabaseMalgesto();

  if (input.tipo === "gira") {
    const bandaIds = input.bandaIds && input.bandaIds.length > 0 ? input.bandaIds : [input.bandaId];
    const { data, error } = await admin
      .from("eventos")
      .insert({
        banda_id: bandaIds[0],
        tipo: "gira",
        estado: input.estado,
        titulo: input.titulo,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin,
        pais: input.pais,
        ciudades: input.ciudades,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo crear la gira.");

    const { error: errBandas } = await admin.from("gira_bandas").insert(bandaIds.map((id) => ({ gira_evento_id: data.id, banda_id: id })));
    if (errBandas) throw new Error(errBandas.message);
    return;
  }

  const lugarId = puedeTenerLugar(input.tipo) ? await resolverLugarId(admin, input.bandaId, input.lugarId, input.lugarNuevo) : null;
  const ingresoEsperado = input.tipo === "show" ? input.ingresoEsperado : null;
  const estado = input.tipo === "show" ? input.estado : "confirmado";

  const { data, error } = await admin
    .from("eventos")
    .insert({
      banda_id: input.bandaId,
      tipo: input.tipo,
      estado,
      titulo: input.titulo,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      ingreso_esperado: ingresoEsperado,
      gira_id: input.tipo === "show" ? input.giraId : null,
      setlist_id: puedeTenerSetlist(input.tipo) ? input.setlistId : null,
      lugar_id: lugarId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el evento.");

  await sincronizarMovimientoAutomatico(data.id, input.bandaId, input.tipo, input.titulo, input.fechaInicio, ingresoEsperado);
}

export async function actualizarEvento(eventoId: string, input: NuevoEventoInput) {
  const admin = supabaseMalgesto();

  if (input.tipo === "gira") {
    const bandaIds = input.bandaIds && input.bandaIds.length > 0 ? input.bandaIds : [input.bandaId];
    const { error } = await admin
      .from("eventos")
      .update({
        banda_id: bandaIds[0],
        tipo: "gira",
        estado: input.estado,
        titulo: input.titulo,
        fecha_inicio: input.fechaInicio,
        fecha_fin: input.fechaFin,
        pais: input.pais,
        ciudades: input.ciudades,
      })
      .eq("id", eventoId);
    if (error) throw new Error(error.message);

    const { error: errDelete } = await admin.from("gira_bandas").delete().eq("gira_evento_id", eventoId);
    if (errDelete) throw new Error(errDelete.message);
    const { error: errInsert } = await admin.from("gira_bandas").insert(bandaIds.map((id) => ({ gira_evento_id: eventoId, banda_id: id })));
    if (errInsert) throw new Error(errInsert.message);
    return;
  }

  const lugarId = puedeTenerLugar(input.tipo) ? await resolverLugarId(admin, input.bandaId, input.lugarId, input.lugarNuevo) : null;
  const ingresoEsperado = input.tipo === "show" ? input.ingresoEsperado : null;
  const estado = input.tipo === "show" ? input.estado : "confirmado";

  const { error } = await admin
    .from("eventos")
    .update({
      banda_id: input.bandaId,
      tipo: input.tipo,
      estado,
      titulo: input.titulo,
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      ingreso_esperado: ingresoEsperado,
      gira_id: input.tipo === "show" ? input.giraId : null,
      setlist_id: puedeTenerSetlist(input.tipo) ? input.setlistId : null,
      lugar_id: lugarId,
      pais: null,
      ciudades: null,
    })
    .eq("id", eventoId);
  if (error) throw new Error(error.message);

  await sincronizarMovimientoAutomatico(eventoId, input.bandaId, input.tipo, input.titulo, input.fechaInicio, ingresoEsperado);
}

// Alta rápida de gira (Brief 8 §7, multi-banda desde Brief 9 §18) — una gira
// es simplemente un evento con tipo "gira" (sin tabla propia); las bandas
// involucradas viven en gira_bandas, banda_id se queda con la primera como
// "primaria" por la restricción NOT NULL ya existente en eventos.
export async function crearGira(
  bandaIds: string[],
  nombre: string,
  desde: string,
  hasta: string,
  pais: string | null,
  ciudades: string | null,
  estado: EstadoEvento = "confirmado"
): Promise<Evento> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("eventos")
    .insert({ banda_id: bandaIds[0], tipo: "gira", estado, titulo: nombre, fecha_inicio: desde, fecha_fin: hasta, pais, ciudades })
    .select(COLUMNAS_EVENTO)
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la gira.");

  const { error: errBandas } = await admin.from("gira_bandas").insert(bandaIds.map((id) => ({ gira_evento_id: data.id, banda_id: id })));
  if (errBandas) throw new Error(errBandas.message);

  const { data: bandasInfo } = await admin.from("bandas").select("id, nombre").in("id", bandaIds);
  return mapearEvento(data, bandasInfo ?? []);
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

// Igual, pero para Tentativo/Confirmado (Brief "Estado Tentativo...") —
// permite confirmar una fecha tentativa (o volverla a tentativa) directo
// desde el detalle, sin pasar por el formulario completo de edición.
export async function asignarEstadoEvento(eventoId: string, estado: EstadoEvento) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("eventos").update({ estado }).eq("id", eventoId);
  if (error) throw new Error(error.message);
}
