import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type TipoControl = "eq_grafico" | "perillas";

export type Control = { id: string; nombre: string; min: number; max: number; valorDefault: number };

export type Dispositivo = {
  id: string;
  bandaId: string;
  usuarioId: string;
  nombre: string;
  tipoControl: TipoControl;
  controles: Control[];
};

export type DispositivoConConteo = Dispositivo & {
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

export type DispositivoCompleto = Dispositivo & { seteos: Seteo[] };

export type SeteoEnContexto = {
  dispositivo: { id: string; nombre: string; tipoControl: TipoControl };
  usuarioNombre: string;
  seteo: Seteo;
  etiqueta: "Vinculado" | "General";
};

type SeteoEmbebido = { id: string; es_general: boolean; cancion_id: string | null };
type CancionEmbebida = { id: string; titulo: string } | null;

function mapDispositivo(d: {
  id: string;
  banda_id: string;
  usuario_id: string;
  nombre: string;
  tipo_control: string;
  controles: unknown;
}): Dispositivo {
  return {
    id: d.id,
    bandaId: d.banda_id,
    usuarioId: d.usuario_id,
    nombre: d.nombre,
    tipoControl: d.tipo_control as TipoControl,
    controles: (d.controles as Control[] | null) ?? [],
  };
}

// Pantalla 12 "Mis dispositivos" — solo los del usuario actual en la banda
// activa, con conteo de seteos generales (0 o 1, por la constraint) y por
// canción para el resumen ("1 general + 3 por canción").
export async function obtenerDispositivos(bandaIds: string[], usuarioId: string): Promise<DispositivoConConteo[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, banda_id, usuario_id, nombre, tipo_control, controles, seteos(id, es_general, cancion_id)")
    .in("banda_id", bandaIds)
    .eq("usuario_id", usuarioId)
    .order("nombre", { ascending: true });

  return (data ?? []).map((d) => {
    const seteos = (d.seteos ?? []) as SeteoEmbebido[];
    return {
      ...mapDispositivo(d),
      cantidadGeneral: seteos.filter((s) => s.es_general).length,
      cantidadPorCancion: seteos.filter((s) => s.cancion_id).length,
    };
  });
}

// Pantalla 13 "Detalle de dispositivo" — dispositivo + todos sus seteos
// (título de canción resuelto para los vinculados).
export async function obtenerDispositivoCompleto(dispositivoId: string): Promise<DispositivoCompleto | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select(
      "id, banda_id, usuario_id, nombre, tipo_control, controles, seteos(id, nombre, valores, cancion_id, es_general, canciones(id, titulo))"
    )
    .eq("id", dispositivoId)
    .single();

  if (!data) return null;

  const seteosRaw = (data.seteos ?? []) as unknown as {
    id: string;
    nombre: string;
    valores: unknown;
    cancion_id: string | null;
    es_general: boolean;
    canciones: CancionEmbebida;
  }[];

  return {
    ...mapDispositivo(data),
    seteos: seteosRaw.map((s) => ({
      id: s.id,
      dispositivoId,
      nombre: s.nombre,
      valores: (s.valores as Record<string, number> | null) ?? {},
      cancionId: s.cancion_id,
      cancionTitulo: (s.canciones as unknown as CancionEmbebida)?.titulo ?? null,
      esGeneral: s.es_general,
    })),
  };
}

// Pantalla 14 "En contexto de canción" — todos los dispositivos de la banda
// (de cualquier miembro) que tengan algo relevante para esta canción: el
// seteo vinculado a la canción gana si existe, si no el general del
// dispositivo, y si no hay ninguno de los dos el dispositivo se omite.
export async function obtenerSeteosParaCancion(bandaId: string, cancionId: string): Promise<SeteoEnContexto[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("dispositivos")
    .select("id, usuario_id, nombre, tipo_control, seteos(id, nombre, valores, cancion_id, es_general)")
    .eq("banda_id", bandaId)
    .order("nombre", { ascending: true });

  const dispositivos = data ?? [];
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
    const seteos = (d.seteos ?? []) as { id: string; nombre: string; valores: unknown; cancion_id: string | null; es_general: boolean }[];
    const vinculado = seteos.find((s) => s.cancion_id === cancionId);
    const general = seteos.find((s) => s.es_general);
    const elegido = vinculado ?? general;
    if (!elegido) continue;

    resultado.push({
      dispositivo: { id: d.id, nombre: d.nombre, tipoControl: d.tipo_control as TipoControl },
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

export type NuevoDispositivoInput = {
  bandaId: string;
  usuarioId: string;
  nombre: string;
  tipoControl: TipoControl;
  controles: Control[];
};

export async function crearDispositivo(input: NuevoDispositivoInput): Promise<string> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("dispositivos")
    .insert({
      banda_id: input.bandaId,
      usuario_id: input.usuarioId,
      nombre: input.nombre,
      tipo_control: input.tipoControl,
      controles: input.controles,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el dispositivo.");
  return data.id;
}

export async function crearSeteo(dispositivoId: string, nombre: string, valores: Record<string, number>): Promise<string> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("seteos")
    .insert({ dispositivo_id: dispositivoId, nombre, valores, es_general: false, cancion_id: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el seteo.");
  return data.id;
}

export type ActualizarSeteoInput = {
  nombre: string;
  valores: Record<string, number>;
  cancionId: string | null;
  esGeneral: boolean;
};

// esGeneral y cancionId son mutuamente excluyentes (constraint en DB). Antes
// de guardar, libera el "general" anterior del mismo dispositivo (si
// corresponde) y cualquier seteo que ya estuviera vinculado a la misma
// canción en este dispositivo, para no chocar con los índices únicos
// parciales.
export async function actualizarSeteo(seteoId: string, dispositivoId: string, input: ActualizarSeteoInput) {
  const admin = supabaseMalgesto();

  if (input.esGeneral) {
    const { error } = await admin
      .from("seteos")
      .update({ es_general: false })
      .eq("dispositivo_id", dispositivoId)
      .neq("id", seteoId);
    if (error) throw new Error(error.message);
  }

  if (input.cancionId) {
    const { error } = await admin
      .from("seteos")
      .update({ cancion_id: null })
      .eq("dispositivo_id", dispositivoId)
      .eq("cancion_id", input.cancionId)
      .neq("id", seteoId);
    if (error) throw new Error(error.message);
  }

  const { error } = await admin
    .from("seteos")
    .update({
      nombre: input.nombre,
      valores: input.valores,
      cancion_id: input.esGeneral ? null : input.cancionId,
      es_general: input.esGeneral,
    })
    .eq("id", seteoId);
  if (error) throw new Error(error.message);
}
