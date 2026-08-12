import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { esTipoItemValido, requierePlaza, requiereDispositivo, puedeMostrarVoz, type TipoItem } from "@/lib/stagePlotCatalogo";
import { etiquetaPlaza, type Instrumento } from "@/lib/instrumentoCatalogo";
import type { Voz } from "@/lib/gestionData";

// Brief "Rediseño de Stage Plot — Entrega 1": todo ítem debe ser trazable a
// un dato real -- musico/mic/teclado/pedalera llevan `plazaId`
// (malgesto.plazas), amplificador lleva `dispositivoId` (malgesto.
// dispositivos), nunca texto libre. `instrumento`/`nombrePersona`/
// `tieneVoz`/`cantidadPedales`/`disenoNombre`/`colorFondo`/`colorAcento` NO
// son columnas de stage_plot_items: se resuelven acá, en cada lectura,
// contra la plaza/dispositivo y su estado actual (persona_plazas,
// miembros_banda.voz, dispositivos categoria=pedal, disenos_dispositivo) --
// si la banda reasigna una plaza, cambia la voz de alguien, o agrega/saca
// pedales, el stage plot lo refleja solo, sin editar nada a mano. `etiqueta`
// (columna real) solo aplica a mix/side_fill/di/power/riser.
export type StagePlotItem = {
  id: string;
  stagePlotId: string;
  tipo: TipoItem;
  plazaId: string | null;
  dispositivoId: string | null;
  etiqueta: string | null;
  // `instrumentoTipo` es el enum crudo (para elegir glifo, ver
  // GLIFO_INSTRUMENTO en stagePlotCatalogo.ts); `instrumento` es el texto ya
  // formateado para mostrar (vía etiquetaPlaza, resuelve el caso "otro" con
  // su etiqueta libre). Ambos null salvo musico/mic/teclado/pedalera.
  instrumentoTipo: Instrumento | null;
  instrumento: string | null;
  nombrePersona: string | null;
  // Brief "Stage Plot — Entrega 2" §1/§3: musico/teclado/mic dibujan el
  // indicador de voz pegado al frente cuando esto es true (ver
  // puedeMostrarVoz en stagePlotCatalogo.ts). Siempre false para el resto.
  tieneVoz: boolean;
  // §2: cantidad de pedales reales de la persona dueña de esta pedalera,
  // ya acotada a 6 (una sola pedalera no puede "mostrar" más de 6 casillas
  // -- si la persona tiene más, hacen falta varias pedaleras en el lienzo,
  // cada una mostrando el mismo total capado). 0 salvo tipo="pedalera".
  cantidadPedales: number;
  // §4: identidad + colores reales de marca del amplificador asignado.
  // Todos null salvo tipo="amplificador".
  disenoNombre: string | null;
  colorFondo: string | null;
  colorAcento: string | null;
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
  dispositivo_id: string | null;
  etiqueta: string | null;
  pos_x: number | string;
  pos_y: number | string;
  rotacion: number | string;
  orden: number;
};

// Brief "Seteos — catálogo de diseños" §1 / "Stage Plot — Entrega 2" §4:
// mismo fallback que construirTema en PanelDispositivo.tsx para diseños sin
// colores cargados todavía -- un amplificador en el lienzo nunca debe
// quedar sin color, aunque su diseño esté incompleto.
const COLOR_FONDO_FALLBACK = "#1a1a1a";
const COLOR_ACENTO_FALLBACK = "#3b82f6";

// Resuelve nombre para mostrar de un conjunto de usuarios en un solo viaje
// -- mismo patrón de 3 fuentes (personas.nombre_mostrar -> user_metadata.
// full_name -> email) que ya usan gestionData.ts/ausenciasData.ts, ahora
// compartido entre los 3 lookups de este archivo (plazas, dispositivos)
// en vez de repetido a mano en cada uno.
async function resolverNombresPersonas(usuarioIds: string[]): Promise<Map<string, string>> {
  const resultado = new Map<string, string>();
  if (usuarioIds.length === 0) return resultado;

  const admin = supabaseMalgesto();
  const [{ data: personas }, { data: authData }] = await Promise.all([
    admin.from("personas").select("usuario_id, nombre_mostrar").in("usuario_id", usuarioIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  const nombrePorId = new Map((personas ?? []).map((p) => [p.usuario_id, p.nombre_mostrar]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );
  for (const uid of usuarioIds) {
    resultado.set(uid, nombrePorId.get(uid) || fullNamePorId.get(uid) || emailPorId.get(uid) || "Integrante");
  }
  return resultado;
}

// Brief "Stage Plot — Entrega 2" §1/§2: voz (miembros_banda.voz, brief
// "Voz — nuevo botón cíclico...") y cantidad de pedales (dispositivos
// categoria=pedal) son atributos de PERSONA+BANDA, no de plaza -- se
// resuelven juntos acá para no repetir la consulta cuando se necesitan los
// dos (paleta de Integrantes) o uno solo (ítems ya puestos en el lienzo).
async function resolverVozYPedales(
  bandaId: string,
  usuarioIds: string[]
): Promise<{ vozPorUsuario: Map<string, boolean>; pedalesPorUsuario: Map<string, number> }> {
  const vozPorUsuario = new Map<string, boolean>();
  const pedalesPorUsuario = new Map<string, number>();
  if (usuarioIds.length === 0) return { vozPorUsuario, pedalesPorUsuario };

  const admin = supabaseMalgesto();
  const [{ data: miembros }, { data: pedales }] = await Promise.all([
    admin.from("miembros_banda").select("usuario_id, voz").eq("banda_id", bandaId).in("usuario_id", usuarioIds),
    admin.from("dispositivos").select("usuario_id").eq("banda_id", bandaId).eq("categoria", "pedal").in("usuario_id", usuarioIds),
  ]);

  for (const m of miembros ?? []) vozPorUsuario.set(m.usuario_id, (m.voz as Voz) !== "sin_voz");
  for (const p of pedales ?? []) pedalesPorUsuario.set(p.usuario_id, (pedalesPorUsuario.get(p.usuario_id) ?? 0) + 1);

  return { vozPorUsuario, pedalesPorUsuario };
}

type InfoPlaza = {
  instrumentoTipo: Instrumento;
  instrumento: string;
  nombrePersona: string;
  usuarioId: string;
  tieneVoz: boolean;
  cantidadPedales: number;
};

// Resuelve instrumento + nombre + voz + cantidad de pedales para un
// conjunto de plazas, en un solo viaje -- usado por cada lectura de stage
// plot para enriquecer los ítems musico/mic/teclado/pedalera.
async function resolverInfoPlazas(bandaId: string, plazaIds: string[]): Promise<Map<string, InfoPlaza>> {
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

  const [nombrePorId, { vozPorUsuario, pedalesPorUsuario }] = await Promise.all([
    resolverNombresPersonas(personaIds),
    resolverVozYPedales(bandaId, personaIds),
  ]);

  for (const plazaId of plazaIds) {
    const plaza = plazaPorId.get(plazaId);
    const personaId = personaIdPorPlaza.get(plazaId);
    if (!plaza || !personaId) continue; // plaza sin nadie asignado hoy -- ver mapItems más abajo
    mapa.set(plazaId, {
      instrumentoTipo: plaza.instrumento as Instrumento,
      instrumento: etiquetaPlaza(plaza.instrumento, plaza.etiqueta),
      nombrePersona: nombrePorId.get(personaId) ?? "Integrante",
      usuarioId: personaId,
      tieneVoz: vozPorUsuario.get(personaId) ?? false,
      cantidadPedales: pedalesPorUsuario.get(personaId) ?? 0,
    });
  }
  return mapa;
}

type InfoDispositivo = { disenoNombre: string; colorFondo: string; colorAcento: string; nombrePersona: string };

type DispositivoAmplificadorRow = {
  id: string;
  usuario_id: string;
  disenos_dispositivo: { marca: string; modelo: string; color_fondo: string | null; color_acento: string | null } | null;
};

// §4: resuelve marca+modelo, colores reales de marca y dueño para un
// conjunto de dispositivos (siempre amplificadores en este archivo) -- mismo
// criterio que resolverInfoPlazas, pero contra `dispositivos`/
// `disenos_dispositivo` en vez de `plazas`.
async function resolverInfoDispositivos(dispositivoIds: string[]): Promise<Map<string, InfoDispositivo>> {
  const mapa = new Map<string, InfoDispositivo>();
  if (dispositivoIds.length === 0) return mapa;

  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, usuario_id, disenos_dispositivo(marca, modelo, color_fondo, color_acento)")
    .in("id", dispositivoIds);
  const filas = (data ?? []) as unknown as DispositivoAmplificadorRow[];
  if (filas.length === 0) return mapa;

  const usuarioIds = [...new Set(filas.map((f) => f.usuario_id))];
  const nombrePorId = await resolverNombresPersonas(usuarioIds);

  for (const f of filas) {
    mapa.set(f.id, {
      disenoNombre: f.disenos_dispositivo ? `${f.disenos_dispositivo.marca} ${f.disenos_dispositivo.modelo}` : "Amplificador",
      colorFondo: f.disenos_dispositivo?.color_fondo ?? COLOR_FONDO_FALLBACK,
      colorAcento: f.disenos_dispositivo?.color_acento ?? COLOR_ACENTO_FALLBACK,
      nombrePersona: nombrePorId.get(f.usuario_id) ?? "Integrante",
    });
  }
  return mapa;
}

async function mapItems(bandaId: string, filas: FilaItem[]): Promise<StagePlotItem[]> {
  const plazaIds = [...new Set(filas.filter((f) => f.plaza_id).map((f) => f.plaza_id as string))];
  const dispositivoIds = [...new Set(filas.filter((f) => f.dispositivo_id).map((f) => f.dispositivo_id as string))];
  const [infoPorPlaza, infoPorDispositivo] = await Promise.all([
    resolverInfoPlazas(bandaId, plazaIds),
    resolverInfoDispositivos(dispositivoIds),
  ]);

  return filas
    .map((i) => {
      // stage_plot_items.tipo tiene CHECK en DB (migración de Entrega 1) --
      // a diferencia de antes de esa migración, no hace falta un fallback
      // defensivo elaborado acá.
      const tipo = (esTipoItemValido(i.tipo) ? i.tipo : "mix") as TipoItem;
      const infoPlaza = i.plaza_id ? infoPorPlaza.get(i.plaza_id) : undefined;
      const infoDispositivo = i.dispositivo_id ? infoPorDispositivo.get(i.dispositivo_id) : undefined;
      const plazaAsignada = requierePlaza(tipo);
      return {
        id: i.id,
        stagePlotId: i.stage_plot_id,
        tipo,
        plazaId: i.plaza_id,
        dispositivoId: i.dispositivo_id,
        etiqueta: i.etiqueta,
        instrumentoTipo: infoPlaza?.instrumentoTipo ?? null,
        instrumento: infoPlaza?.instrumento ?? (plazaAsignada && i.plaza_id ? "Sin asignar" : null),
        nombrePersona: infoPlaza?.nombrePersona ?? (plazaAsignada && i.plaza_id ? "Sin asignar" : null),
        tieneVoz: puedeMostrarVoz(tipo) ? (infoPlaza?.tieneVoz ?? false) : false,
        cantidadPedales: tipo === "pedalera" ? Math.min(infoPlaza?.cantidadPedales ?? 0, 6) : 0,
        disenoNombre: infoDispositivo?.disenoNombre ?? (requiereDispositivo(tipo) && i.dispositivo_id ? "Sin asignar" : null),
        colorFondo: infoDispositivo?.colorFondo ?? null,
        colorAcento: infoDispositivo?.colorAcento ?? null,
        posX: Number(i.pos_x),
        posY: Number(i.pos_y),
        rotacion: Number(i.rotacion),
        orden: i.orden,
      };
    })
    .sort((a, b) => a.orden - b.orden);
}

const COLUMNAS_STAGE_PLOT =
  "id, banda_id, notas, share_token, stage_plot_items(id, stage_plot_id, tipo, plaza_id, dispositivo_id, etiqueta, pos_x, pos_y, rotacion, orden)";

async function mapStagePlot(sp: { id: string; banda_id: string; notas: string | null; share_token: string; stage_plot_items: unknown }): Promise<StagePlot> {
  const filas = (sp.stage_plot_items ?? []) as FilaItem[];
  return {
    id: sp.id,
    bandaId: sp.banda_id,
    notas: sp.notas,
    shareToken: sp.share_token,
    items: await mapItems(sp.banda_id, filas),
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
// dibujar, así que ni aparece. `tieneVoz`/`cantidadPedales` (Brief "Stage
// Plot — Entrega 2" §1/§2) determinan qué variante del ícono de
// músico/teclado se ofrece y si además corresponde ofrecer "+ Pedalera" --
// ver PaletaIconos en StagePlotEditor.tsx.
export type PlazaConPersona = {
  plazaId: string;
  instrumento: Instrumento;
  etiqueta: string | null;
  usuarioId: string;
  nombrePersona: string;
  tieneVoz: boolean;
  cantidadPedales: number;
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

  const [nombrePorId, { vozPorUsuario, pedalesPorUsuario }] = await Promise.all([
    resolverNombresPersonas(personaIds),
    resolverVozYPedales(bandaId, personaIds),
  ]);

  const resultado: PlazaConPersona[] = [];
  for (const p of plazas) {
    const usuarioId = personaIdPorPlaza.get(p.id);
    if (!usuarioId) continue;
    resultado.push({
      plazaId: p.id,
      instrumento: p.instrumento as Instrumento,
      etiqueta: p.etiqueta,
      usuarioId,
      nombrePersona: nombrePorId.get(usuarioId) ?? "Integrante",
      tieneVoz: vozPorUsuario.get(usuarioId) ?? false,
      cantidadPedales: pedalesPorUsuario.get(usuarioId) ?? 0,
    });
  }
  return resultado;
}

// Brief "Stage Plot — Entrega 2" §4: la sección "Seteo" de la paleta -- un
// ítem por amplificador realmente asignado a alguien en la banda (mismos
// datos que Gestión > Integrantes/Seteos, resueltos acá de nuevo porque
// dispositivosData.ts no expone colores por dispositivo suelto, solo por
// diseño completo con controles, que no hace falta acá).
export type AmplificadorAsignado = {
  dispositivoId: string;
  usuarioId: string;
  nombrePersona: string;
  disenoNombre: string;
  colorFondo: string;
  colorAcento: string;
};

export async function obtenerAmplificadoresDeBanda(bandaId: string): Promise<AmplificadorAsignado[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, usuario_id, disenos_dispositivo(marca, modelo, color_fondo, color_acento)")
    .eq("banda_id", bandaId)
    .eq("categoria", "amplificador");
  const filas = (data ?? []) as unknown as DispositivoAmplificadorRow[];
  if (filas.length === 0) return [];

  const usuarioIds = [...new Set(filas.map((f) => f.usuario_id))];
  const nombrePorId = await resolverNombresPersonas(usuarioIds);

  return filas.map((f) => ({
    dispositivoId: f.id,
    usuarioId: f.usuario_id,
    nombrePersona: nombrePorId.get(f.usuario_id) ?? "Integrante",
    disenoNombre: f.disenos_dispositivo ? `${f.disenos_dispositivo.marca} ${f.disenos_dispositivo.modelo}` : "Amplificador",
    colorFondo: f.disenos_dispositivo?.color_fondo ?? COLOR_FONDO_FALLBACK,
    colorAcento: f.disenos_dispositivo?.color_acento ?? COLOR_ACENTO_FALLBACK,
  }));
}

function clamp0a100(valor: number): number {
  return Math.min(100, Math.max(0, valor));
}

// Brief §1/§3 (Entrega 1) + §2/§4 (Entrega 2): musico/mic/teclado/pedalera
// exigen plazaId, amplificador exige dispositivoId -- mismo candado que ya
// imponen los CHECK de la migración de este brief, validado acá primero
// para un mensaje de error legible en vez del texto crudo del constraint.
// El resto de los tipos son elementos de escenario propios, sin dueño -- si
// por error llegara un plazaId/dispositivoId ahí, se ignora en vez de
// guardarlo (igual que antes).
export async function crearItem(
  bandaId: string,
  stagePlotId: string,
  tipo: TipoItem,
  plazaId: string | null,
  dispositivoId: string | null,
  etiqueta: string | null,
  posX: number,
  posY: number
): Promise<StagePlotItem> {
  const necesitaPlaza = requierePlaza(tipo);
  const necesitaDispositivo = requiereDispositivo(tipo);
  if (necesitaPlaza && !plazaId) throw new Error("Elegí a quién corresponde este ícono antes de soltarlo.");
  if (necesitaDispositivo && !dispositivoId) throw new Error("Elegí el amplificador antes de soltarlo.");

  const admin = supabaseMalgesto();

  const { count } = await admin.from("stage_plot_items").select("id", { count: "exact", head: true }).eq("stage_plot_id", stagePlotId);

  const { data, error } = await admin
    .from("stage_plot_items")
    .insert({
      stage_plot_id: stagePlotId,
      tipo,
      plaza_id: necesitaPlaza ? plazaId : null,
      dispositivo_id: necesitaDispositivo ? dispositivoId : null,
      etiqueta: !necesitaPlaza && !necesitaDispositivo ? etiqueta?.trim() || null : null,
      pos_x: clamp0a100(posX),
      pos_y: clamp0a100(posY),
      orden: count ?? 0,
    })
    .select("id, stage_plot_id, tipo, plaza_id, dispositivo_id, etiqueta, pos_x, pos_y, rotacion, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el ícono.");
  const [item] = await mapItems(bandaId, [data]);
  return item;
}

export async function moverItem(itemId: string, posX: number, posY: number): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("stage_plot_items").update({ pos_x: clamp0a100(posX), pos_y: clamp0a100(posY) }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

// Brief §3: la etiqueta editable solo tiene sentido para mix/side_fill/di/
// power/riser -- el resto resuelve su identidad desde una plaza o
// dispositivo real, nunca texto libre. El guard vive en el server action
// (actualizarEtiquetaItemAction, que sí conoce el tipo del ítem); acá solo
// persiste.
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
