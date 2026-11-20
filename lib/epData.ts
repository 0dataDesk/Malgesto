import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { CAMPOS, TECHOS_INICIALES, normalizarProyecto, type Proyecto, type Techos } from "@/lib/epModelo";

// Mapa del EP (planeación de un proyecto musical). Vive aparte de canciones: ver supabase/migrations/20261120130000.

type FilaSeccion = {
  id: string;
  pieza_id: string;
  orden: number;
  nombre: string;
  compases: number;
  energia: number;
  animo: number;
  tension: number;
  altos: number;
  medios: number;
  graves: number;
  sub: number;
  armonia: string;
  transmite: string;
};

export async function listarProyectos(bandaId: string): Promise<{ id: string; nombre: string; tipo: string }[]> {
  const db = supabaseMalgesto();
  const { data, error } = await db.from("proyectos_musicales").select("id, nombre, tipo").eq("banda_id", bandaId).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obtenerProyecto(bandaId: string, proyectoId?: string): Promise<Proyecto | null> {
  const db = supabaseMalgesto();
  let q = db.from("proyectos_musicales").select("id, banda_id, nombre, tipo, historia, techos, updated_at").eq("banda_id", bandaId);
  q = proyectoId ? q.eq("id", proyectoId) : q.order("created_at").limit(1);
  const { data: proys, error } = await q;
  if (error) throw new Error(error.message);
  const proy = proys?.[0];
  if (!proy) return null;

  const { data: piezas, error: e2 } = await db
    .from("proyecto_piezas")
    .select("id, orden, titulo, tonalidad, bpm, idea")
    .eq("proyecto_id", proy.id)
    .order("orden");
  if (e2) throw new Error(e2.message);

  const ids = (piezas ?? []).map((p) => p.id);
  let secciones: FilaSeccion[] = [];
  if (ids.length > 0) {
    const { data, error: e3 } = await db
      .from("proyecto_secciones")
      .select("id, pieza_id, orden, nombre, compases, energia, animo, tension, altos, medios, graves, sub, armonia, transmite")
      .in("pieza_id", ids)
      .order("orden");
    if (e3) throw new Error(e3.message);
    secciones = (data ?? []) as FilaSeccion[];
  }

  return {
    id: proy.id,
    bandaId: proy.banda_id,
    nombre: proy.nombre,
    tipo: proy.tipo === "album" ? "album" : "ep",
    historia: proy.historia,
    techos: Object.fromEntries(CAMPOS.map((c) => [c, typeof proy.techos?.[c] === "number" ? Math.min(100, Math.max(0, Math.round(proy.techos[c]))) : TECHOS_INICIALES[c]])) as Techos,
    version: String(proy.updated_at),
    piezas: (piezas ?? []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      tonalidad: p.tonalidad,
      bpm: p.bpm,
      idea: p.idea,
      secciones: secciones
        .filter((s) => s.pieza_id === p.id)
        .map((s) => ({
          id: s.id,
          nombre: s.nombre,
          compases: s.compases,
          energia: s.energia,
          animo: s.animo,
          tension: s.tension,
          altos: s.altos,
          medios: s.medios,
          graves: s.graves,
          sub: s.sub,
          armonia: s.armonia,
          transmite: s.transmite,
        })),
    })),
  };
}

export async function crearProyecto(bandaId: string, nombre: string, tipo: "ep" | "album"): Promise<string> {
  const db = supabaseMalgesto();
  const { data, error } = await db
    .from("proyectos_musicales")
    .insert({ banda_id: bandaId, nombre: nombre.trim().slice(0, 120) || "Sin nombre", tipo })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

// Guarda el proyecto completo tal como lo manda el cliente: actualiza lo que existe, agrega lo nuevo y borra lo que ya no está.
export async function guardarProyecto(bandaId: string, proyectoId: string, entrada: unknown, version: unknown): Promise<string> {
  const db = supabaseMalgesto();
  const p = normalizarProyecto(entrada);

  const { data: dueno } = await db.from("proyectos_musicales").select("id, updated_at").eq("id", proyectoId).eq("banda_id", bandaId).maybeSingle();
  if (!dueno) throw new Error("Proyecto no encontrado.");
  // Una pantalla vieja (sin marca de versión o con otra) no puede pisar lo guardado después.
  if (typeof version !== "string" || version !== String(dueno.updated_at)) throw new Error("DESACTUALIZADO");

  // Ningún id recibido puede pertenecer a otro proyecto (el cliente genera los ids, no se confía en ellos).
  const idsPiezas = p.piezas.map((x) => x.id);
  const idsSecciones = p.piezas.flatMap((x) => x.secciones.map((s) => s.id));
  if (idsPiezas.length > 0) {
    const { data: ajenas } = await db.from("proyecto_piezas").select("id").in("id", idsPiezas).neq("proyecto_id", proyectoId);
    if (ajenas && ajenas.length > 0) throw new Error("Identificador inválido.");
  }
  if (idsSecciones.length > 0) {
    const { data: filas } = await db.from("proyecto_secciones").select("id, pieza_id").in("id", idsSecciones);
    const propias = new Set(idsPiezas);
    const { data: previas } = await db.from("proyecto_piezas").select("id").eq("proyecto_id", proyectoId);
    (previas ?? []).forEach((x) => propias.add(x.id));
    if ((filas ?? []).some((f) => !propias.has(f.pieza_id))) throw new Error("Identificador inválido.");
  }

  const { data: nuevo, error: e1 } = await db
    .from("proyectos_musicales")
    .update({ nombre: p.nombre, tipo: p.tipo, historia: p.historia, techos: p.techos, updated_at: new Date().toISOString() })
    .eq("id", proyectoId)
    .select("updated_at")
    .single();
  if (e1) throw new Error(e1.message);

  if (p.piezas.length > 0) {
    const { error: e2 } = await db.from("proyecto_piezas").upsert(
      p.piezas.map((x, i) => ({ id: x.id, proyecto_id: proyectoId, orden: i, titulo: x.titulo, tonalidad: x.tonalidad, bpm: x.bpm, idea: x.idea })),
    );
    if (e2) throw new Error(e2.message);
  }

  // Borra piezas que ya no están (sus secciones caen en cascada).
  const { data: existentes } = await db.from("proyecto_piezas").select("id").eq("proyecto_id", proyectoId);
  const sobrantes = (existentes ?? []).map((x) => x.id).filter((id) => !idsPiezas.includes(id));
  if (sobrantes.length > 0) {
    const { error } = await db.from("proyecto_piezas").delete().in("id", sobrantes);
    if (error) throw new Error(error.message);
  }

  if (idsSecciones.length > 0) {
    const { error: e3 } = await db.from("proyecto_secciones").upsert(
      p.piezas.flatMap((x) =>
        x.secciones.map((s, i) => ({
          id: s.id,
          pieza_id: x.id,
          orden: i,
          nombre: s.nombre,
          compases: s.compases,
          energia: s.energia,
          animo: s.animo,
          tension: s.tension,
          altos: s.altos,
          medios: s.medios,
          graves: s.graves,
          sub: s.sub,
          armonia: s.armonia,
          transmite: s.transmite,
        })),
      ),
    );
    if (e3) throw new Error(e3.message);
  }

  // Borra secciones que ya no están dentro de las piezas que se conservan.
  if (idsPiezas.length > 0) {
    const { data: sec } = await db.from("proyecto_secciones").select("id").in("pieza_id", idsPiezas);
    const sobran = (sec ?? []).map((x) => x.id).filter((id) => !idsSecciones.includes(id));
    if (sobran.length > 0) {
      const { error } = await db.from("proyecto_secciones").delete().in("id", sobran);
      if (error) throw new Error(error.message);
    }
  }

  return String(nuevo.updated_at);
}

export async function eliminarProyecto(bandaId: string, proyectoId: string): Promise<void> {
  const db = supabaseMalgesto();
  const { error } = await db.from("proyectos_musicales").delete().eq("id", proyectoId).eq("banda_id", bandaId);
  if (error) throw new Error(error.message);
}
