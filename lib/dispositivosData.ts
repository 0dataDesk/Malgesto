import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type CategoriaCatalogo = "amplificador" | "pedal";
export type CategoriaDispositivo = CategoriaCatalogo | "consola";
export type TipoControl = "perilla" | "boton" | "luz" | "entrada" | "salida" | "referencia";

export type DisenoDispositivo = {
  id: string;
  categoria: CategoriaCatalogo;
  marca: string;
  modelo: string;
  // Colores reales de marca (brief "Seteos — fix de navegación, colores de
  // marca..." §4) — fuente de los colores del panel, en vez de los tokens de
  // la app. Nullable: diseños viejos sin cargar todavía caen a un fallback
  // neutro (ver construirTema en PanelDispositivo.tsx).
  colorFondo: string | null;
  colorAcento: string | null;
  colorTexto: string | null;
};

export type ControlDiseno = {
  id: string;
  tipo: TipoControl;
  nombre: string;
  // Ya no son la fuente de verdad del layout (ver "grupo") — quedan por
  // compatibilidad, pueden ser null en diseños nuevos.
  posX: number | null;
  posY: number | null;
  min: number | null;
  max: number | null;
  valorDefault: number | null;
  orden: number;
  // Solo aplica a tipo="perilla" — "rotativa" (default visual cuando es
  // null) o "deslizante" (se dibuja como SliderVertical en vez de Knob).
  estilo: "rotativa" | "deslizante" | null;
  // Caja/sección visual a la que pertenece (ej. "Preamp", "Contour") — mismo
  // grupo se dibuja junto en un marco. Null = control independiente, sin
  // caja. Fuente de verdad del layout del panel (brief "Seteos — rediseño de
  // navegación, layout agrupado y selector de canción").
  grupo: string | null;
  // Solo aplica a tipo="perilla" — invierte la paleta de colores del Knob
  // (cuerpo claro/indicador oscuro en vez de al revés). Brief "Hartke
  // HA3500 — reagrupar cajas...", ej. el Master Volume.
  coloresInvertidos: boolean;
  // Nombre del grupo que este control habilita/deshabilita (ej. el "In/Out"
  // del Hartke controla "Graphic Equalizer") — null = no controla nada.
  // Solo tiene sentido en botones on/off; el control está "activo" cuando su
  // valor actual es igual a su max. Brief "Hartke HA3500 — ..." §5: mecanismo
  // genérico en vez de hardcodear el nombre "In/Out".
  controlaGrupo: string | null;
  // Texto informativo opcional (ej. la nota de polaridad del DC IN del Tone
  // Mallet) — se muestra como texto chico junto a cualquier control
  // decorativo que la tenga, no solo entradas. Brief "Seteos — fix de
  // navegación, colores de marca..." §5.
  nota: string | null;
  // Sufijo del valor mostrado (ej. "Hz" en el Mid Freq del Tone Mallet) —
  // solo aplica a tipo="perilla".
  unidad: string | null;
  // Solo aplica a tipo="luz" — id de otro control del mismo diseño cuyo
  // valor determina si esta luz se dibuja encendida (valor === max del
  // control referenciado) o apagada. La luz no es interactiva por sí misma,
  // solo refleja. Null = luz sin comportamiento asociado (siempre "encendida"
  // visualmente, como antes). Brief "PanelDispositivo — regla de color
  // exterior/interior, layout posicionado del Mallet, luz refleja botón".
  reflejaControlId: string | null;
};

export type DisenoCompleto = DisenoDispositivo & { controles: ControlDiseno[] };

// Asignación de un diseño del catálogo a un integrante (Gestión > Integrantes,
// brief "Seteos — catálogo de diseños"). `nombre` es el apodo opcional del
// integrante para su dispositivo, no confundir con marca/modelo del diseño.
export type DispositivoAsignado = {
  id: string;
  bandaId: string;
  usuarioId: string;
  categoria: CategoriaDispositivo;
  disenoId: string | null;
  disenoMarca: string | null;
  disenoModelo: string | null;
  apodo: string | null;
  // Brief "Seteos — selector único global..." §2: apagado = no aparece en la
  // lista principal de Seteos, vive colapsado en el acordeón "Deshabilitados".
  habilitado: boolean;
};

export type Seteo = {
  id: string;
  dispositivoId: string;
  nombre: string;
  valores: Record<string, number>;
  cancionId: string | null;
  cancionTitulo: string | null;
  esGeneral: boolean;
};

export type DispositivoCompleto = DispositivoAsignado & { diseno: DisenoCompleto | null; seteos: Seteo[] };

export type SeteoEnContexto = {
  dispositivo: { id: string; nombre: string };
  usuarioNombre: string;
  seteo: Seteo;
  etiqueta: "Vinculado" | "General";
};

function mapControl(c: {
  id: string;
  tipo: string;
  nombre: string;
  pos_x: number | null;
  pos_y: number | null;
  min: number | null;
  max: number | null;
  valor_default: number | null;
  orden: number;
  estilo: string | null;
  grupo: string | null;
  colores_invertidos: boolean;
  controla_grupo: string | null;
  nota: string | null;
  unidad: string | null;
  refleja_control_id: string | null;
}): ControlDiseno {
  return {
    id: c.id,
    tipo: c.tipo as TipoControl,
    nombre: c.nombre,
    posX: c.pos_x,
    posY: c.pos_y,
    min: c.min,
    max: c.max,
    valorDefault: c.valor_default,
    orden: c.orden,
    estilo: c.estilo as "rotativa" | "deslizante" | null,
    grupo: c.grupo,
    coloresInvertidos: c.colores_invertidos,
    controlaGrupo: c.controla_grupo,
    nota: c.nota,
    unidad: c.unidad,
    reflejaControlId: c.refleja_control_id,
  };
}

// Brief "Instrumentos propios + selector de instrumento activo en Seteos"
// §2: lectura liviana para /seteos (el alta/edición/borrado vive en Gestión >
// Integrantes, ver crearInstrumentoPropio/etc. en lib/gestionData.ts) — solo
// lo que la página necesita para decidir si mostrar el selector y con qué
// etiqueta.
export type InstrumentoPropioResumen = { id: string; instrumento: string; marca: string | null; modelo: string | null };

export async function obtenerInstrumentosPropiosDeUsuario(usuarioId: string): Promise<InstrumentoPropioResumen[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("instrumentos_propios")
    .select("id, instrumento, marca, modelo")
    .eq("usuario_id", usuarioId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((i) => ({ id: i.id, instrumento: i.instrumento, marca: i.marca, modelo: i.modelo }));
}

// Catálogo de diseños (Gestión > Integrantes, para el dropdown de asignar) —
// se carga a mano en Supabase, sin formulario de alta en la app.
export async function obtenerDisenosPorCategoria(categoria: CategoriaCatalogo): Promise<DisenoDispositivo[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("disenos_dispositivo")
    .select("id, categoria, marca, modelo, color_fondo, color_acento, color_texto")
    .eq("categoria", categoria)
    .order("marca", { ascending: true })
    .order("modelo", { ascending: true });
  return (data ?? []).map((d) => ({
    id: d.id,
    categoria: d.categoria as CategoriaCatalogo,
    marca: d.marca,
    modelo: d.modelo,
    colorFondo: d.color_fondo,
    colorAcento: d.color_acento,
    colorTexto: d.color_texto,
  }));
}

type DispositivoRow = {
  id: string;
  banda_id: string;
  usuario_id: string;
  categoria: string;
  diseno_id: string | null;
  nombre: string | null;
  habilitado: boolean;
  disenos_dispositivo: { marca: string; modelo: string } | null;
};

function mapDispositivo(d: DispositivoRow): DispositivoAsignado {
  return {
    id: d.id,
    bandaId: d.banda_id,
    usuarioId: d.usuario_id,
    categoria: d.categoria as CategoriaDispositivo,
    disenoId: d.diseno_id,
    disenoMarca: d.disenos_dispositivo?.marca ?? null,
    disenoModelo: d.disenos_dispositivo?.modelo ?? null,
    apodo: d.nombre,
    habilitado: d.habilitado,
  };
}

// Todas las asignaciones de las bandas dadas (de cualquier integrante) — usado
// por Gestión > Integrantes para armar la ficha "Amplificador(es)/Pedal(es)/
// Consola" de cada persona en cada banda.
export async function obtenerDispositivosAsignados(bandaIds: string[]): Promise<DispositivoAsignado[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(marca, modelo)")
    .in("banda_id", bandaIds);
  return ((data ?? []) as unknown as DispositivoRow[]).map(mapDispositivo);
}

// Asigna un diseño del catálogo a un integrante en una banda (Gestión >
// Integrantes §1) — crea la fila de asignación, sin seteos todavía (el
// general obligatorio se crea recién cuando la persona entra al detalle en
// Seteos, ver crearSeteoGeneralConDefaults).
export async function asignarDiseno(
  bandaId: string,
  usuarioId: string,
  categoria: CategoriaCatalogo,
  disenoId: string
): Promise<DispositivoAsignado> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("dispositivos")
    .insert({ banda_id: bandaId, usuario_id: usuarioId, categoria, diseno_id: disenoId })
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(marca, modelo)")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo asignar el diseño.");
  return mapDispositivo(data as unknown as DispositivoRow);
}

// Marca "va directo a consola" para un integrante en una banda — un solo
// marcador (fila sin diseno_id), sin sub-lista. No duplica si ya existe.
export async function marcarConsola(bandaId: string, usuarioId: string): Promise<DispositivoAsignado> {
  const admin = supabaseMalgesto();
  const { data: existente } = await admin
    .from("dispositivos")
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(marca, modelo)")
    .eq("banda_id", bandaId)
    .eq("usuario_id", usuarioId)
    .eq("categoria", "consola")
    .limit(1);
  if (existente && existente.length > 0) return mapDispositivo(existente[0] as unknown as DispositivoRow);

  const { data, error } = await admin
    .from("dispositivos")
    .insert({ banda_id: bandaId, usuario_id: usuarioId, categoria: "consola", diseno_id: null })
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(marca, modelo)")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo marcar consola.");
  return mapDispositivo(data as unknown as DispositivoRow);
}

// Quita una asignación (amplificador/pedal/consola) — borra la fila; sus
// seteos (si los hubiera) cascadean por FK.
export async function quitarDispositivo(dispositivoId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("dispositivos").delete().eq("id", dispositivoId);
  if (error) throw new Error(error.message);
}

// Consola automática (brief "Gestión > Integrantes — acordeones anidados,
// orden, consola automática" §2): "va directo a consola" ya no es una acción
// manual — se deriva del estado real de amplificadores de esa persona en esa
// banda. Se llama después de cualquier alta/baja de amplificador/pedal (es
// idempotente y barata, así que no hace falta filtrar por categoría acá:
// siempre refleja el estado actual). Sin amplificadores → asegura que exista
// la fila consola (la crea si falta) y la devuelve; con al menos uno →
// asegura que NO exista (la borra si estaba) y devuelve null. El caller usa
// el valor devuelto para sincronizar su propio estado en vez de adivinar.
export async function sincronizarConsola(bandaId: string, usuarioId: string): Promise<DispositivoAsignado | null> {
  const admin = supabaseMalgesto();
  const { data: amplificadores } = await admin
    .from("dispositivos")
    .select("id")
    .eq("banda_id", bandaId)
    .eq("usuario_id", usuarioId)
    .eq("categoria", "amplificador")
    .limit(1);

  if (amplificadores && amplificadores.length > 0) {
    const { data: consolaExistente } = await admin
      .from("dispositivos")
      .select("id")
      .eq("banda_id", bandaId)
      .eq("usuario_id", usuarioId)
      .eq("categoria", "consola")
      .limit(1);
    if (consolaExistente && consolaExistente.length > 0) {
      await quitarDispositivo(consolaExistente[0].id);
    }
    return null;
  }

  return marcarConsola(bandaId, usuarioId);
}

// Switch de habilitado/deshabilitado en Seteos (brief "Seteos — selector
// único global..." §2) — no borra nada, solo saca al dispositivo de la
// lista principal hacia el acordeón "Deshabilitados".
export async function actualizarHabilitadoDispositivo(dispositivoId: string, habilitado: boolean): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("dispositivos").update({ habilitado }).eq("id", dispositivoId);
  if (error) throw new Error(error.message);
}

const SELECT_DISPOSITIVO_COMPLETO =
  "id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(id, categoria, marca, modelo, color_fondo, color_acento, color_texto, diseno_controles(id, tipo, nombre, pos_x, pos_y, min, max, valor_default, orden, estilo, grupo, colores_invertidos, controla_grupo, nota, unidad, refleja_control_id)), seteos(id, nombre, valores, cancion_id, es_general, canciones(id, titulo))";

type DisenoDispositivoRow = {
  id: string;
  categoria: string;
  marca: string;
  modelo: string;
  color_fondo: string | null;
  color_acento: string | null;
  color_texto: string | null;
  diseno_controles: Parameters<typeof mapControl>[0][];
};

type DispositivoCompletoRow = DispositivoRow & {
  disenos_dispositivo: DisenoDispositivoRow | null;
  seteos: {
    id: string;
    nombre: string;
    valores: unknown;
    cancion_id: string | null;
    es_general: boolean;
    canciones: { id: string; titulo: string } | null;
  }[];
};

function mapDispositivoCompleto(d: DispositivoCompletoRow): DispositivoCompleto {
  const disenoRaw = d.disenos_dispositivo;
  return {
    ...mapDispositivo(d),
    diseno: disenoRaw
      ? {
          id: disenoRaw.id,
          categoria: disenoRaw.categoria as CategoriaCatalogo,
          marca: disenoRaw.marca,
          modelo: disenoRaw.modelo,
          colorFondo: disenoRaw.color_fondo,
          colorAcento: disenoRaw.color_acento,
          colorTexto: disenoRaw.color_texto,
          controles: disenoRaw.diseno_controles.map(mapControl).sort((a, b) => a.orden - b.orden),
        }
      : null,
    seteos: (d.seteos ?? []).map((s) => ({
      id: s.id,
      dispositivoId: d.id,
      nombre: s.nombre,
      valores: (s.valores as Record<string, number> | null) ?? {},
      cancionId: s.cancion_id,
      cancionTitulo: s.canciones?.titulo ?? null,
      esGeneral: s.es_general,
    })),
  };
}

// Pantalla Seteos: todos los dispositivos (amplificador/pedal — consola no
// tiene diseño ni controles, no aparece acá) del usuario actual en la banda
// activa, con diseño completo (controles) y seteos — se renderizan directo
// en la misma pantalla, sin pantalla de detalle aparte.
export async function obtenerDispositivosCompletosDeUsuario(bandaIds: string[], usuarioId: string): Promise<DispositivoCompleto[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select(SELECT_DISPOSITIVO_COMPLETO)
    .in("banda_id", bandaIds)
    .eq("usuario_id", usuarioId)
    .in("categoria", ["amplificador", "pedal"])
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as DispositivoCompletoRow[]).map(mapDispositivoCompleto);
}

// Seteo general obligatorio (brief §4): se crea con los valor_default de cada
// control perilla/boton la primera vez que la persona entra al detalle. Los
// controles sin valor_default (luz/entrada/salida) no guardan valor.
export async function crearSeteoGeneralConDefaults(dispositivoId: string, controles: ControlDiseno[]): Promise<Seteo> {
  const valores = Object.fromEntries(
    controles.filter((c) => (c.tipo === "perilla" || c.tipo === "boton") && c.valorDefault !== null).map((c) => [c.id, c.valorDefault as number])
  );
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("seteos")
    .insert({ dispositivo_id: dispositivoId, nombre: "General", valores, es_general: true, cancion_id: null })
    .select("id, nombre, valores, cancion_id, es_general")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el seteo general.");
  return {
    id: data.id,
    dispositivoId,
    nombre: data.nombre,
    valores: (data.valores as Record<string, number> | null) ?? {},
    cancionId: data.cancion_id,
    cancionTitulo: null,
    esGeneral: data.es_general,
  };
}

// Seteo nuevo para una canción puntual (brief §3: "opcional", se crea recién
// cuando el usuario elige editar el de esa canción por primera vez) — arranca
// con los mismos valor_default que el general.
export async function crearSeteoParaCancion(dispositivoId: string, cancionId: string, controles: ControlDiseno[]): Promise<Seteo> {
  const valores = Object.fromEntries(
    controles.filter((c) => (c.tipo === "perilla" || c.tipo === "boton") && c.valorDefault !== null).map((c) => [c.id, c.valorDefault as number])
  );
  const admin = supabaseMalgesto();
  const { error: errorLiberar } = await admin.from("seteos").update({ cancion_id: null }).eq("dispositivo_id", dispositivoId).eq("cancion_id", cancionId);
  if (errorLiberar) throw new Error(errorLiberar.message);

  const { data, error } = await admin
    .from("seteos")
    .insert({ dispositivo_id: dispositivoId, nombre: "Seteo", valores, es_general: false, cancion_id: cancionId })
    .select("id, nombre, valores, cancion_id, es_general")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el seteo.");
  return {
    id: data.id,
    dispositivoId,
    nombre: data.nombre,
    valores: (data.valores as Record<string, number> | null) ?? {},
    cancionId: data.cancion_id,
    cancionTitulo: null,
    esGeneral: data.es_general,
  };
}

// Guarda los valores de un seteo existente (general o de canción) — a
// diferencia del dispositivo viejo, acá general/por-canción ya no son
// intercambiables desde esta pantalla (eso se decide al crear el seteo), solo
// se actualizan los valores de los controles.
export async function actualizarValoresSeteo(seteoId: string, valores: Record<string, number>): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("seteos").update({ valores }).eq("id", seteoId);
  if (error) throw new Error(error.message);
}

// Canciones "En contexto de canción" (pantalla 14): un dispositivo por
// integrante de la banda (amplificador/pedal — consola no tiene seteos) que
// tenga algo relevante para esta canción: el seteo vinculado a la canción
// gana si existe, si no el general del dispositivo, y si no hay ninguno de
// los dos el dispositivo se omite.
export async function obtenerSeteosParaCancion(bandaId: string, cancionId: string): Promise<SeteoEnContexto[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, usuario_id, categoria, nombre, disenos_dispositivo(marca, modelo), seteos(id, nombre, valores, cancion_id, es_general)")
    .eq("banda_id", bandaId)
    .in("categoria", ["amplificador", "pedal"]);

  const dispositivos = (data ?? []) as unknown as {
    id: string;
    usuario_id: string;
    categoria: string;
    nombre: string | null;
    disenos_dispositivo: { marca: string; modelo: string } | null;
    seteos: { id: string; nombre: string; valores: unknown; cancion_id: string | null; es_general: boolean }[];
  }[];
  if (dispositivos.length === 0) return [];

  const usuarioIds = [...new Set(dispositivos.map((d) => d.usuario_id))];
  const nombres = new Map<string, string>();
  await Promise.all(
    usuarioIds.map(async (uid) => {
      const { data: userData } = await admin.auth.admin.getUserById(uid);
      const meta = userData?.user?.user_metadata as { full_name?: string } | undefined;
      nombres.set(uid, meta?.full_name || userData?.user?.email || "Miembro");
    })
  );

  const resultado: SeteoEnContexto[] = [];
  for (const d of dispositivos) {
    const vinculado = d.seteos.find((s) => s.cancion_id === cancionId);
    const general = d.seteos.find((s) => s.es_general);
    const elegido = vinculado ?? general;
    if (!elegido) continue;

    const nombreDispositivo = d.nombre || (d.disenos_dispositivo ? `${d.disenos_dispositivo.marca} ${d.disenos_dispositivo.modelo}` : "Dispositivo");

    resultado.push({
      dispositivo: { id: d.id, nombre: nombreDispositivo },
      usuarioNombre: nombres.get(d.usuario_id) ?? "Miembro",
      seteo: {
        id: elegido.id,
        dispositivoId: d.id,
        nombre: elegido.nombre,
        valores: (elegido.valores as Record<string, number> | null) ?? {},
        cancionId: elegido.cancion_id,
        cancionTitulo: null,
        esGeneral: elegido.es_general,
      },
      etiqueta: vinculado ? "Vinculado" : "General",
    });
  }

  return resultado;
}

// Brief "Instrumento como bloque agregable (reemplaza el selector de
// instrumento activo)": a diferencia de amplis/pedales (una asignación fija
// por integrante, cuyos VALORES varían por contexto vía `seteos`), acá lo
// que varía por contexto es la presencia misma del instrumento -- por eso es
// una tabla de relación simple (malgesto_app.instrumentos_en_cadena), sin
// controles/valores propios. cancionId null = agregado al General; con
// valor = agregado a esa canción puntual. Puede haber varios instrumentos
// distintos en la misma canción (doblar guitarra + mandolina, por ejemplo).
export type InstrumentoEnCadena = {
  id: string;
  bandaId: string;
  usuarioId: string;
  instrumentoPropioId: string;
  cancionId: string | null;
  instrumento: string;
  marca: string | null;
  modelo: string | null;
};

const SELECT_INSTRUMENTO_EN_CADENA = "id, banda_id, usuario_id, instrumento_propio_id, cancion_id, instrumentos_propios(instrumento, marca, modelo)";

type InstrumentoEnCadenaRow = {
  id: string;
  banda_id: string;
  usuario_id: string;
  instrumento_propio_id: string;
  cancion_id: string | null;
  instrumentos_propios: { instrumento: string; marca: string | null; modelo: string | null } | null;
};

function mapInstrumentoEnCadena(r: InstrumentoEnCadenaRow): InstrumentoEnCadena {
  return {
    id: r.id,
    bandaId: r.banda_id,
    usuarioId: r.usuario_id,
    instrumentoPropioId: r.instrumento_propio_id,
    cancionId: r.cancion_id,
    instrumento: r.instrumentos_propios?.instrumento ?? "Instrumento",
    marca: r.instrumentos_propios?.marca ?? null,
    modelo: r.instrumentos_propios?.modelo ?? null,
  };
}

// Todo lo agregado por este usuario en esta banda (General + todas las
// canciones a la vez) -- la pantalla filtra por vista en el cliente, mismo
// criterio que ya usa obtenerDispositivosCompletosDeUsuario para no repetir
// un fetch por cada canción que el usuario visite.
export async function obtenerInstrumentosEnCadena(bandaId: string, usuarioId: string): Promise<InstrumentoEnCadena[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("instrumentos_en_cadena")
    .select(SELECT_INSTRUMENTO_EN_CADENA)
    .eq("banda_id", bandaId)
    .eq("usuario_id", usuarioId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as unknown as InstrumentoEnCadenaRow[]).map(mapInstrumentoEnCadena);
}

// Sin UNIQUE en la tabla (ver comentario de la migración: NULL no se compara
// como igual a sí mismo en un índice único, así que no bloquearía duplicados
// en General de todas formas) -- la dedupe de "no agregar el mismo
// instrumento dos veces al mismo contexto" se resuelve acá.
export async function agregarInstrumentoEnCadena(
  bandaId: string,
  usuarioId: string,
  instrumentoPropioId: string,
  cancionId: string | null
): Promise<InstrumentoEnCadena> {
  const admin = supabaseMalgesto();

  let yaExiste = admin
    .from("instrumentos_en_cadena")
    .select("id")
    .eq("banda_id", bandaId)
    .eq("usuario_id", usuarioId)
    .eq("instrumento_propio_id", instrumentoPropioId);
  yaExiste = cancionId === null ? yaExiste.is("cancion_id", null) : yaExiste.eq("cancion_id", cancionId);
  const { data: existente } = await yaExiste.limit(1);
  if (existente && existente.length > 0) throw new Error("Ese instrumento ya está agregado acá.");

  const { data, error } = await admin
    .from("instrumentos_en_cadena")
    .insert({ banda_id: bandaId, usuario_id: usuarioId, instrumento_propio_id: instrumentoPropioId, cancion_id: cancionId })
    .select(SELECT_INSTRUMENTO_EN_CADENA)
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el instrumento.");
  return mapInstrumentoEnCadena(data as unknown as InstrumentoEnCadenaRow);
}

export async function quitarInstrumentoEnCadena(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("instrumentos_en_cadena").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
