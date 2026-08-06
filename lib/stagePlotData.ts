import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { esTipoItemValido, type TipoItem } from "@/lib/stagePlotCatalogo";

export type StagePlotItem = {
  id: string;
  stagePlotId: string;
  tipo: TipoItem;
  etiqueta: string | null;
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

function mapItem(i: {
  id: string;
  stage_plot_id: string;
  tipo: string;
  etiqueta: string | null;
  pos_x: number | string;
  pos_y: number | string;
  rotacion: number | string;
  orden: number;
}): StagePlotItem {
  return {
    id: i.id,
    stagePlotId: i.stage_plot_id,
    // stage_plot_items.tipo no tiene CHECK en DB (validado en app) — un tipo
    // legado o corrupto cae en "otro" en vez de tronar toda la lectura.
    tipo: esTipoItemValido(i.tipo) ? i.tipo : "otro",
    etiqueta: i.etiqueta,
    posX: Number(i.pos_x),
    posY: Number(i.pos_y),
    rotacion: Number(i.rotacion),
    orden: i.orden,
  };
}

const COLUMNAS_STAGE_PLOT = "id, banda_id, notas, share_token, stage_plot_items(id, stage_plot_id, tipo, etiqueta, pos_x, pos_y, rotacion, orden)";

function mapStagePlot(sp: {
  id: string;
  banda_id: string;
  notas: string | null;
  share_token: string;
  stage_plot_items: unknown;
}): StagePlot {
  const items = (sp.stage_plot_items ?? []) as Parameters<typeof mapItem>[0][];
  return {
    id: sp.id,
    bandaId: sp.banda_id,
    notas: sp.notas,
    shareToken: sp.share_token,
    items: items.map(mapItem).sort((a, b) => a.orden - b.orden),
  };
}

export async function obtenerStagePlot(bandaId: string): Promise<StagePlot | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("stage_plots").select(COLUMNAS_STAGE_PLOT).eq("banda_id", bandaId).maybeSingle();
  return data ? mapStagePlot(data) : null;
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
  return { stagePlot: mapStagePlot(data), bandaNombre: banda?.nombre ?? "Banda", bandaColor: banda?.color ?? "oklch(0.6 0.02 55)" };
}

function clamp0a100(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

export async function crearItem(stagePlotId: string, tipo: TipoItem, etiqueta: string | null, posX: number, posY: number): Promise<StagePlotItem> {
  const admin = supabaseMalgesto();

  const { count } = await admin.from("stage_plot_items").select("id", { count: "exact", head: true }).eq("stage_plot_id", stagePlotId);

  const { data, error } = await admin
    .from("stage_plot_items")
    .insert({
      stage_plot_id: stagePlotId,
      tipo,
      etiqueta: etiqueta?.trim() || null,
      pos_x: clamp0a100(posX),
      pos_y: clamp0a100(posY),
      orden: count ?? 0,
    })
    .select("id, stage_plot_id, tipo, etiqueta, pos_x, pos_y, rotacion, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el ícono.");
  return mapItem(data);
}

export async function moverItem(itemId: string, posX: number, posY: number): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("stage_plot_items").update({ pos_x: clamp0a100(posX), pos_y: clamp0a100(posY) }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

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
