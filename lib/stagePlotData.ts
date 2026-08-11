import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { esTipoItemValido, type TipoItem } from "@/lib/stagePlotCatalogo";
import { etiquetaPlaza, type Instrumento } from "@/lib/instrumentoCatalogo";

// Brief "Rediseño de Stage Plot — Entrega 1": todo ítem debe ser trazable a
// un dato real -- musico/mic llevan `plazaId` (malgesto.plazas), nunca
// texto libre. `instrumento`/`nombrePersona` NO son columnas de
// stage_plot_items: se resuelven acá, en cada lectura, contra la plaza y
// quien la ocupe hoy (persona_plazas) -- si la banda reasigna esa plaza a
// otra persona, el stage plot lo refleja solo, sin editar nada a mano.
// `etiqueta` (columna real) solo aplica a monitor/di/power/riser.
export type StagePlotItem = {
  id: string;
  stagePlotId: string;
  tipo: TipoItem;
  plazaId: string | null;
  etiqueta: string | null;
  // `instrumentoTipo` es el enum crudo (para elegir glifo, ver
  // GLIFO_INSTRUMENTO en stagePlotCatalogo.ts); `instrumento` es el texto ya
  // formateado para mostrar (vía etiquetaPlaza, resuelve el caso "otro" con
  // su etiqueta libre). Ambos null salvo musico/mic.
  instrumentoTipo: Instrumento | null;
  instrumento: string | null;
  nombrePersona: string | null;
  posX: number;
  posY: number;
  rotacion: number;
  orden: number;
};

export type StagePlot = {
  id: string;
  bandaId: string;
  notas: string | null;
  shareToken: string;
  items: StagePlotItem[];
};

type FilaItem = {
  id: string;
  stage_plot_id: string;
  tipo: string;
  plaza_id: string | null;
  etiqueta: string | null;
  pos_x: number | string;
  pos_y: number | string;
  rotacion: number | string;
  orden: number;
};

// Resuelve instrumento + nombre de la persona para un conjunto de plazas,
// en un solo viaje -- usado por cada lectura de stage plot para enriquecer
// los ítems musico/mic. Mismo patrón de 3 fuentes (personas.nombre_mostrar
// -> user_metadata.full_name -> email) que ya usan gestionData.ts y
// ausenciasData.ts para nunca mostrar un nombre vacío.
type InfoPlaza = { instrumentoTipo: Instrumento; instrumento: string; nombrePersona: string };

async function resolverInfoPlazas(plazaIds: string[]): Promise<Map<string, InfoPlaza>> {
  const mapa = new Map<string, InfoPlaza>();
  if (plazaIds.length === 0) return mapa;

  const admin = supabaseMalgesto();
  const [{ data: plazas }, { data: personaPlazas }] = await Promise.all([
    admin.from("plazas").select("id, instrumento, etiqueta").in("id", plazaIds),
    admin.from("persona_plazas").select("plaza_id, persona_id").in("plaza_id", plazaIds),
  ]);

  const plazaPorId = new Map((plazas ?? []).map((p) => [p.id, p]));
  const personaIdPorPlaza = new Map((personaPlazas ?? []).map((pp) => [pp.plaza_id, pp.persona_id]));
  const personaIds = [...new Set(personaIdPorPlaza.values())];
  if (personaIds.length === 0) return mapa;

  const [{ data: personas }, { data: authData }] = await Promise.all([
    admin.from("personas").select("usuario_id, nombre_mostrar").in("usuario_id", personaIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const nombrePorId = new Map((personas ?? []).map((p) => [p.usuario_id, p.nombre_mostrar]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );
  const nombreDe = (usuarioId: string) => nombrePorId.get(usuarioId) || fullNamePorId.get(usuarioId) || emailPorId.get(usuarioId) || "Integrante";

  for (const plazaId of plazaIds) {
    const plaza = plazaPorId.get(plazaId);
    const personaId = personaIdPorPlaza.get(plazaId);
    if (!plaza || !personaId) continue; // plaza sin nadie asignado hoy -- ver mapItems más abajo
    mapa.set(plazaId, {
      instrumentoTipo: plaza.instrumento as Instrumento,
      instrumento: etiquetaPlaza(plaza.instrumento, plaza.etiqueta),
      nombrePersona: nombreDe(personaId),
    });
  }
  return mapa;
}

async function mapItems(filas: FilaItem[]): Promise<StagePlotItem[]> {
  const plazaIds = [...new Set(filas.filter((f) => f.plaza_id).map((f) => f.plaza_id as string))];
  const infoPorPlaza = await resolverInfoPlazas(plazaIds);

  return filas
    .map((i) => {
      const info = i.plaza_id ? infoPorPlaza.get(i.plaza_id) : undefined;
      return {
        id: i.id,
        stagePlotId: i.stage_plot_id,
        // stage_plot_items.tipo tiene CHECK en DB (migración de este brief) --
        // a diferencia de antes, no hace falta un fallback defensivo acá.
        tipo: (esTipoItemValido(i.tipo) ? i.tipo : "monitor") as TipoItem,
        plazaId: i.plaza_id,
        etiqueta: i.etiqueta,
        instrumentoTipo: info?.instrumentoTipo ?? null,
        instrumento: info?.instrumento ?? (i.plaza_id ? "Sin asignar" : null),
        nombrePersona: info?.nombrePersona ?? (i.plaza_id ? "Sin asignar" : null),
        posX: Number(i.pos_x),
        posY: Number(i.pos_y),
        rotacion: Number(i.rotacion),
        orden: i.orden,
      };
    })
    .sort((a, b) => a.orden - b.orden);
}

const COLUMNAS_STAGE_PLOT = "id, banda_id, notas, share_token, stage_plot_items(id, stage_plot_id, tipo, plaza_id, etiqueta, pos_x, pos_y, rotacion, orden)";

async function mapStagePlot(sp: { id: string; banda_id: string; notas: string | null; share_token: string; stage_plot_items: unknown }): Promise<StagePlot> {
  const filas = (sp.stage_plot_items ?? []) as FilaItem[];
  return {
    id: sp.id,
    bandaId: sp.banda_id,
    notas: sp.notas,
    shareToken: sp.share_token,
    items: await mapItems(filas),
  };
}

export async function obtenerStagePlot(bandaId: string): Promise<StagePlot | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("stage_plots").select(COLUMNAS_STAGE_PLOT).eq("banda_id", bandaId).maybeSingle();
  return data ? await mapStagePlot(data) : null;
}

// Una plantilla por banda (UNIQUE(banda_id) en DB) — se crea vacía la
// primera vez que alguien entra al editor o a la vista, no hace falta un
// paso explícito de "crear stage plot".
export async function obtenerOCrearStagePlot(bandaId: string): Promise<StagePlot> {
  const existente = await obtenerStagePlot(bandaId);
  if (existente) return existente;

  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("stage_plots").insert({ banda_id: bandaId }).select(COLUMNAS_STAGE_PLOT).single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el stage plot.");
  return mapStagePlot(data);
}

export type StagePlotPublico = { stagePlot: StagePlot; bandaNombre: string; bandaColor: string };

// Lookup público por share_token — sin chequeo de membresía a propósito,
// es la ruta pensada para abrirse sin sesión (ver app/plot/[token]).
export async function obtenerStagePlotPorToken(token: string): Promise<StagePlotPublico | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("stage_plots")
    .select(`${COLUMNAS_STAGE_PLOT}, bandas(nombre, color)`)
    .eq("share_token", token)
    .maybeSingle();
  if (!data) return null;

  const banda = data.bandas as unknown as { nombre: string; color: string } | null;
  return { stagePlot: await mapStagePlot(data), bandaNombre: banda?.nombre ?? "Banda", bandaColor: banda?.color ?? "oklch(0.6 0.02 55)" };
}

// Brief §1: la paleta del editor -- una plaza entra acá solo si tiene una
// persona asignada hoy (persona_plazas); sin persona no hay a quién
// dibujar, así que ni aparece. `esVozOCoro` es lo que separa la sección
// "Micrófono" (Brief: "solo aparecen las plazas de tipo voz o coro") del
// resto en "Integrantes" (todas, incluida voz/coro -- una cantante también
// es "músico" en el lienzo, además de llevar mic).
export type PlazaConPersona = {
  plazaId: string;
  instrumento: Instrumento;
  etiqueta: string | null;
  usuarioId: string;
  nombrePersona: string;
  esVozOCoro: boolean;
};

export async function obtenerPlazasConPersonaDeBanda(bandaId: string): Promise<PlazaConPersona[]> {
  const admin = supabaseMalgesto();
  const { data: plazas } = await admin.from("plazas").select("id, instrumento, etiqueta").eq("banda_id", bandaId);
  if (!plazas || plazas.length === 0) return [];

  const plazaIds = plazas.map((p) => p.id);
  const { data: personaPlazas } = await admin.from("persona_plazas").select("plaza_id, persona_id").in("plaza_id", plazaIds);
  const personaIdPorPlaza = new Map((personaPlazas ?? []).map((pp) => [pp.plaza_id, pp.persona_id]));
  const personaIds = [...new Set(personaIdPorPlaza.values())];
  if (personaIds.length === 0) return [];

  const [{ data: personas }, { data: authData }] = await Promise.all([
    admin.from("personas").select("usuario_id, nombre_mostrar").in("usuario_id", personaIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const nombrePorId = new Map((personas ?? []).map((p) => [p.usuario_id, p.nombre_mostrar]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );
  const nombreDe = (usuarioId: string) => nombrePorId.get(usuarioId) || fullNamePorId.get(usuarioId) || emailPorId.get(usuarioId) || "Integrante";

  const resultado: PlazaConPersona[] = [];
  for (const p of plazas) {
    const usuarioId = personaIdPorPlaza.get(p.id);
    if (!usuarioId) continue;
    resultado.push({
      plazaId: p.id,
      instrumento: p.instrumento as Instrumento,
      etiqueta: p.etiqueta,
      usuarioId,
      nombrePersona: nombreDe(usuarioId),
      esVozOCoro: p.instrumento === "voz" || p.instrumento === "coro",
    });
  }
  return resultado;
}

function clamp0a100(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

// Brief §1/§3: musico y mic exigen plazaId (mismo candado que ya impone el
// CHECK stage_plot_items_plaza_requerida_check en DB, validado acá primero
// para un mensaje de error legible en vez del texto crudo del constraint).
// El resto de los tipos son elementos de escenario propios, sin dueño --
// si por error llegara un plazaId ahí, se ignora en vez de guardarlo.
export async function crearItem(
  stagePlotId: string,
  tipo: TipoItem,
  plazaId: string | null,
  etiqueta: string | null,
  posX: number,
  posY: number
): Promise<StagePlotItem> {
  const requierePlaza = tipo === "musico" || tipo === "mic";
  if (requierePlaza && !plazaId) throw new Error("Elegí a quién corresponde este ícono antes de soltarlo.");

  const admin = supabaseMalgesto();

  const { count } = await admin.from("stage_plot_items").select("id", { count: "exact", head: true }).eq("stage_plot_id", stagePlotId);

  const { data, error } = await admin
    .from("stage_plot_items")
    .insert({
      stage_plot_id: stagePlotId,
      tipo,
      plaza_id: requierePlaza ? plazaId : null,
      etiqueta: requierePlaza ? null : etiqueta?.trim() || null,
      pos_x: clamp0a100(posX),
      pos_y: clamp0a100(posY),
      orden: count ?? 0,
    })
    .select("id, stage_plot_id, tipo, plaza_id, etiqueta, pos_x, pos_y, rotacion, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el ícono.");
  const [item] = await mapItems([data]);
  return item;
}

export async function moverItem(itemId: string, posX: number, posY: number): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("stage_plot_items").update({ pos_x: clamp0a100(posX), pos_y: clamp0a100(posY) }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

// Brief §3: la etiqueta editable solo tiene sentido para monitor/di/power/
// riser -- musico/mic no la usan (su "etiqueta" en pantalla es
// nombre+instrumento, resuelto en cada lectura, nunca texto guardado acá).
// El guard vive en el server action (actualizarEtiquetaItemAction, que sí
// conoce el tipo del ítem); acá solo persiste.
export async function actualizarEtiquetaItem(itemId: string, etiqueta: string | null): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("stage_plot_items").update({ etiqueta: etiqueta?.trim() || null }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function eliminarItem(itemId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("stage_plot_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function obtenerTipoItem(itemId: string): Promise<TipoItem | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("stage_plot_items").select("tipo").eq("id", itemId).maybeSingle();
  if (!data || !esTipoItemValido(data.tipo)) return null;
  return data.tipo;
}
