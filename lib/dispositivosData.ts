import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type CategoriaCatalogo = "amplificador" | "pedal";
export type CategoriaDispositivo = CategoriaCatalogo | "consola";
export type TipoControl = "perilla" | "boton" | "luz" | "entrada" | "salida";

export type DisenoDispositivo = { id: string; categoria: CategoriaCatalogo; marca: string; modelo: string };

export type ControlDiseno = {
  id: string;
  tipo: TipoControl;
  nombre: string;
  posX: number;
  posY: number;
  min: number | null;
  max: number | null;
  valorDefault: number | null;
  orden: number;
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
};

export type DispositivoConConteo = DispositivoAsignado & {
  cantidadGeneral: number;
  cantidadPorCancion: number;
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
  pos_x: number;
  pos_y: number;
  min: number | null;
  max: number | null;
  valor_default: number | null;
  orden: number;
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
  };
}

// Catálogo de diseños (Gestión > Integrantes, para el dropdown de asignar) —
// se carga a mano en Supabase, sin formulario de alta en la app.
export async function obtenerDisenosPorCategoria(categoria: CategoriaCatalogo): Promise<DisenoDispositivo[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("disenos_dispositivo")
    .select("id, categoria, marca, modelo")
    .eq("categoria", categoria)
    .order("marca", { ascending: true })
    .order("modelo", { ascending: true });
  return (data ?? []) as DisenoDispositivo[];
}

type DispositivoRow = {
  id: string;
  banda_id: string;
  usuario_id: string;
  categoria: string;
  diseno_id: string | null;
  nombre: string | null;
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
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(marca, modelo)")
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
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(marca, modelo)")
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
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(marca, modelo)")
    .eq("banda_id", bandaId)
    .eq("usuario_id", usuarioId)
    .eq("categoria", "consola")
    .limit(1);
  if (existente && existente.length > 0) return mapDispositivo(existente[0] as unknown as DispositivoRow);

  const { data, error } = await admin
    .from("dispositivos")
    .insert({ banda_id: bandaId, usuario_id: usuarioId, categoria: "consola", diseno_id: null })
    .select("id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(marca, modelo)")
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

// Pantalla Seteos "Mis dispositivos" — solo amplificador/pedal (consola no
// tiene diseño ni controles, no aparece acá) del usuario actual en la banda
// activa, con conteo de seteos para el badge "Falta seteo general".
export async function obtenerDispositivosDeUsuario(bandaIds: string[], usuarioId: string): Promise<DispositivoConConteo[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select(
      "id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(marca, modelo), seteos(id, es_general, cancion_id)"
    )
    .in("banda_id", bandaIds)
    .eq("usuario_id", usuarioId)
    .in("categoria", ["amplificador", "pedal"]);

  return ((data ?? []) as unknown as (DispositivoRow & { seteos: { id: string; es_general: boolean; cancion_id: string | null }[] })[]).map(
    (d) => {
      const seteos = d.seteos ?? [];
      return {
        ...mapDispositivo(d),
        cantidadGeneral: seteos.filter((s) => s.es_general).length,
        cantidadPorCancion: seteos.filter((s) => s.cancion_id).length,
      };
    }
  );
}

// Detalle de dispositivo (Seteos): asignación + diseño completo (controles
// posicionados) + todos sus seteos (título de canción resuelto).
export async function obtenerDispositivoCompleto(dispositivoId: string): Promise<DispositivoCompleto | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select(
      "id, banda_id, usuario_id, categoria, diseno_id, nombre, disenos_dispositivo(id, categoria, marca, modelo, diseno_controles(id, tipo, nombre, pos_x, pos_y, min, max, valor_default, orden)), seteos(id, nombre, valores, cancion_id, es_general, canciones(id, titulo))"
    )
    .eq("id", dispositivoId)
    .single();

  if (!data) return null;

  const disenoRaw = data.disenos_dispositivo as unknown as
    | (DisenoDispositivo & { diseno_controles: Parameters<typeof mapControl>[0][] })
    | null;

  const seteosRaw = (data.seteos ?? []) as unknown as {
    id: string;
    nombre: string;
    valores: unknown;
    cancion_id: string | null;
    es_general: boolean;
    canciones: { id: string; titulo: string } | null;
  }[];

  return {
    ...mapDispositivo(data as unknown as DispositivoRow),
    diseno: disenoRaw
      ? {
          id: disenoRaw.id,
          categoria: disenoRaw.categoria,
          marca: disenoRaw.marca,
          modelo: disenoRaw.modelo,
          controles: disenoRaw.diseno_controles.map(mapControl).sort((a, b) => a.orden - b.orden),
        }
      : null,
    seteos: seteosRaw.map((s) => ({
      id: s.id,
      dispositivoId,
      nombre: s.nombre,
      valores: (s.valores as Record<string, number> | null) ?? {},
      cancionId: s.cancion_id,
      cancionTitulo: s.canciones?.titulo ?? null,
      esGeneral: s.es_general,
    })),
  };
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
  const { error: errorLiberar } = await admin
    .from("seteos")
    .update({ cancion_id: null })
    .eq("dispositivo_id", dispositivoId)
    .eq("cancion_id", cancionId);
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
    .select(
      "id, usuario_id, categoria, nombre, disenos_dispositivo(marca, modelo), seteos(id, nombre, valores, cancion_id, es_general)"
    )
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
