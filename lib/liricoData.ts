import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import {
  ESTADOS_IDEA, ESTADOS_LETRA, ESTADOS_LECCION, ORIGENES, RESULTADOS, MAX,
  elegir, limpiar, titulo, parOrdenado,
  type Conexion, type Ejercicio, type Idea, type IdeaResumen, type Leccion, type Letra, type Tecnica, type Version, type EstadoIdea, type EstadoLeccion,
} from "@/lib/liricoModelo";

// Lírico: lectura y escritura en Supabase (solo servidor). Toda función recibe la banda y comprueba que lo tocado le pertenezca.

export async function listarTecnicas(): Promise<Tecnica[]> {
  const { data, error } = await supabaseMalgesto().from("lirico_tecnicas").select("clave, orden, nombre, resumen, cuerpo").order("orden");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listarIdeas(bandaId: string): Promise<IdeaResumen[]> {
  const { data, error } = await supabaseMalgesto().from("lirico_ideas").select("id, titulo, origen, estado, updated_at").eq("banda_id", bandaId).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, titulo: r.titulo, origen: elegir(r.origen, ORIGENES, "nueva"), estado: elegir(r.estado, ESTADOS_IDEA, "semilla"), actualizada: String(r.updated_at) }));
}

export async function leccionesDeBanda(bandaId: string): Promise<{ tecnica: string; estado: EstadoLeccion }[]> {
  const db = supabaseMalgesto();
  const { data: ideas } = await db.from("lirico_ideas").select("id").eq("banda_id", bandaId);
  const ids = (ideas ?? []).map((i) => i.id);
  if (ids.length === 0) return [];
  const { data, error } = await db.from("lirico_lecciones").select("tecnica, estado").in("idea_id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({ tecnica: l.tecnica, estado: elegir(l.estado, ESTADOS_LECCION, "en_curso") }));
}

export async function obtenerIdea(bandaId: string, ideaId: string): Promise<Idea | null> {
  const db = supabaseMalgesto();
  const { data: i, error } = await db.from("lirico_ideas").select("id, titulo, texto, origen, origen_ref, estado, updated_at").eq("id", ideaId).eq("banda_id", bandaId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!i) return null;

  const { data: letrasF } = await db.from("lirico_letras").select("id, titulo, objetivo, premisa, angulo, plano_literal, plano_figurado, estado").eq("idea_id", i.id).order("created_at");
  const letraIds = (letrasF ?? []).map((l) => l.id);
  const { data: versF } = letraIds.length ? await db.from("lirico_versiones").select("id, letra_id, numero, texto, nota, autor, created_at").in("letra_id", letraIds).order("numero") : { data: [] };
  const { data: lecF } = await db.from("lirico_lecciones").select("id, letra_id, tecnica, objetivo, contenido, estado").eq("idea_id", i.id).order("created_at");
  const lecIds = (lecF ?? []).map((l) => l.id);
  const { data: ejF } = lecIds.length ? await db.from("lirico_ejercicios").select("id, leccion_id, orden, consigna, respuesta, correccion, resultado").in("leccion_id", lecIds).order("orden") : { data: [] };
  const { data: conF } = await db.from("lirico_conexiones").select("id, idea_a, idea_b, motivo").or(`idea_a.eq.${i.id},idea_b.eq.${i.id}`);
  const otrasIds = (conF ?? []).map((c) => (c.idea_a === i.id ? c.idea_b : c.idea_a));
  const { data: otras } = otrasIds.length ? await db.from("lirico_ideas").select("id, titulo").in("id", otrasIds) : { data: [] };
  const tituloDe = new Map((otras ?? []).map((o) => [o.id, o.titulo as string]));

  const letras: Letra[] = (letrasF ?? []).map((l) => ({
    id: l.id, titulo: l.titulo, objetivo: l.objetivo, premisa: l.premisa, angulo: l.angulo, planoLiteral: l.plano_literal, planoFigurado: l.plano_figurado,
    estado: elegir(l.estado, ESTADOS_LETRA, "borrador"),
    versiones: (versF ?? []).filter((v) => v.letra_id === l.id).map((v): Version => ({ id: v.id, numero: v.numero, texto: v.texto, nota: v.nota, autor: v.autor === "cosmo" ? "cosmo" : "jorge", creada: String(v.created_at) })),
  }));
  const lecciones: Leccion[] = (lecF ?? []).map((l) => ({
    id: l.id, letraId: l.letra_id, tecnica: l.tecnica, objetivo: l.objetivo, contenido: l.contenido, estado: elegir(l.estado, ESTADOS_LECCION, "en_curso"),
    ejercicios: (ejF ?? []).filter((e) => e.leccion_id === l.id).map((e): Ejercicio => ({ id: e.id, orden: e.orden, consigna: e.consigna, respuesta: e.respuesta, correccion: e.correccion, resultado: elegir(e.resultado, RESULTADOS, "pendiente") })),
  }));
  const conexiones: Conexion[] = (conF ?? []).map((c) => {
    const otra = c.idea_a === i.id ? c.idea_b : c.idea_a;
    return { id: c.id, otraId: otra, otraTitulo: tituloDe.get(otra) ?? "(idea)", motivo: c.motivo };
  });

  return { id: i.id, titulo: i.titulo, texto: i.texto, origen: elegir(i.origen, ORIGENES, "nueva"), origenRef: i.origen_ref, estado: elegir(i.estado, ESTADOS_IDEA, "semilla"), actualizada: String(i.updated_at), letras, lecciones, conexiones };
}

async function ideaDeBanda(bandaId: string, ideaId: string) {
  const { data } = await supabaseMalgesto().from("lirico_ideas").select("id").eq("id", ideaId).eq("banda_id", bandaId).maybeSingle();
  if (!data) throw new Error("Idea no encontrada.");
}

async function letraDeBanda(bandaId: string, letraId: string): Promise<string> {
  const { data } = await supabaseMalgesto().from("lirico_letras").select("id, idea_id").eq("id", letraId).maybeSingle();
  if (!data) throw new Error("Letra no encontrada.");
  await ideaDeBanda(bandaId, data.idea_id);
  return data.idea_id;
}

async function tocarIdea(ideaId: string) {
  await supabaseMalgesto().from("lirico_ideas").update({ updated_at: new Date().toISOString() }).eq("id", ideaId);
}

export async function crearIdea(bandaId: string, t: unknown, texto: unknown): Promise<string> {
  const nombre = titulo(t);
  if (!nombre) throw new Error("Ponle un título a la idea.");
  const { data, error } = await supabaseMalgesto().from("lirico_ideas").insert({ banda_id: bandaId, titulo: nombre, texto: limpiar(texto, MAX.texto), origen: "nueva" }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function guardarIdea(bandaId: string, ideaId: string, campos: { titulo?: unknown; texto?: unknown; estado?: unknown }) {
  await ideaDeBanda(bandaId, ideaId);
  const cambios: Record<string, string> = { updated_at: new Date().toISOString() };
  if (campos.titulo !== undefined) { const n = titulo(campos.titulo); if (!n) throw new Error("El título no puede quedar vacío."); cambios.titulo = n; }
  if (campos.texto !== undefined) cambios.texto = limpiar(campos.texto, MAX.texto);
  if (campos.estado !== undefined) cambios.estado = elegir(campos.estado, ESTADOS_IDEA, "semilla" as EstadoIdea);
  const { error } = await supabaseMalgesto().from("lirico_ideas").update(cambios).eq("id", ideaId);
  if (error) throw new Error(error.message);
}

export async function crearLetra(bandaId: string, ideaId: string, t: unknown, objetivo: unknown): Promise<string> {
  await ideaDeBanda(bandaId, ideaId);
  const nombre = titulo(t);
  const meta = limpiar(objetivo, MAX.corto).trim();
  if (!nombre) throw new Error("Ponle título a la letra.");
  if (!meta) throw new Error("Cada letra necesita su objetivo (qué quieres lograr o aprender con ella).");
  const { data, error } = await supabaseMalgesto().from("lirico_letras").insert({ idea_id: ideaId, titulo: nombre, objetivo: meta }).select("id").single();
  if (error) throw new Error(error.message);
  await supabaseMalgesto().from("lirico_ideas").update({ estado: "en_trabajo", updated_at: new Date().toISOString() }).eq("id", ideaId).eq("estado", "semilla");
  return data.id;
}

export async function guardarLetra(bandaId: string, letraId: string, c: { objetivo?: unknown; premisa?: unknown; angulo?: unknown; planoLiteral?: unknown; planoFigurado?: unknown; estado?: unknown }) {
  const ideaId = await letraDeBanda(bandaId, letraId);
  const cambios: Record<string, string> = { updated_at: new Date().toISOString() };
  if (c.objetivo !== undefined) { const o = limpiar(c.objetivo, MAX.corto).trim(); if (!o) throw new Error("El objetivo no puede quedar vacío."); cambios.objetivo = o; }
  if (c.premisa !== undefined) cambios.premisa = limpiar(c.premisa, MAX.corto);
  if (c.angulo !== undefined) cambios.angulo = limpiar(c.angulo, MAX.corto);
  if (c.planoLiteral !== undefined) cambios.plano_literal = limpiar(c.planoLiteral, MAX.corto);
  if (c.planoFigurado !== undefined) cambios.plano_figurado = limpiar(c.planoFigurado, MAX.corto);
  if (c.estado !== undefined) cambios.estado = elegir(c.estado, ESTADOS_LETRA, "borrador");
  const { error } = await supabaseMalgesto().from("lirico_letras").update(cambios).eq("id", letraId);
  if (error) throw new Error(error.message);
  await tocarIdea(ideaId);
}

// Las versiones solo se agregan (la base impide modificar el texto de una existente).
export async function agregarVersion(bandaId: string, letraId: string, texto: unknown, nota: unknown) {
  const ideaId = await letraDeBanda(bandaId, letraId);
  const cuerpo = limpiar(texto, MAX.texto);
  if (!cuerpo.trim()) throw new Error("La versión está vacía.");
  const db = supabaseMalgesto();
  for (let intento = 0; intento < 3; intento++) {
    const { data: ult } = await db.from("lirico_versiones").select("numero").eq("letra_id", letraId).order("numero", { ascending: false }).limit(1);
    const numero = (ult?.[0]?.numero ?? 0) + 1;
    const { error } = await db.from("lirico_versiones").insert({ letra_id: letraId, numero, texto: cuerpo, nota: limpiar(nota, MAX.corto), autor: "jorge" });
    if (!error) { await tocarIdea(ideaId); return; }
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudo numerar la versión; intenta de nuevo.");
}

// Jorge solo escribe su respuesta y marca el resultado; la consigna y la corrección las escribe Cosmo.
export async function guardarRespuesta(bandaId: string, ejercicioId: string, respuesta: unknown, resultado: unknown) {
  const db = supabaseMalgesto();
  const { data: e } = await db.from("lirico_ejercicios").select("id, leccion_id").eq("id", ejercicioId).maybeSingle();
  if (!e) throw new Error("Ejercicio no encontrado.");
  const { data: l } = await db.from("lirico_lecciones").select("idea_id").eq("id", e.leccion_id).maybeSingle();
  if (!l) throw new Error("Lección no encontrada.");
  await ideaDeBanda(bandaId, l.idea_id);
  const { error } = await db.from("lirico_ejercicios").update({ respuesta: limpiar(respuesta, MAX.texto), resultado: elegir(resultado, RESULTADOS, "hecho"), updated_at: new Date().toISOString() }).eq("id", ejercicioId);
  if (error) throw new Error(error.message);
  await tocarIdea(l.idea_id);
}

export async function crearConexion(bandaId: string, ideaId: string, otraId: string, motivo: unknown) {
  if (ideaId === otraId) throw new Error("Una idea no se conecta consigo misma.");
  await ideaDeBanda(bandaId, ideaId);
  await ideaDeBanda(bandaId, otraId);
  const m = limpiar(motivo, MAX.corto).trim();
  if (!m) throw new Error("Escribe por qué se conectan.");
  const [a, b] = parOrdenado(ideaId, otraId);
  const { error } = await supabaseMalgesto().from("lirico_conexiones").insert({ idea_a: a, idea_b: b, motivo: m });
  if (error) throw new Error(error.code === "23505" ? "Esas ideas ya están conectadas." : error.message);
}
