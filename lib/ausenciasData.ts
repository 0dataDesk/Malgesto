import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { fechaISO } from "@/lib/fechas";

export type Ausencia = {
  id: string;
  fechaInicio: string;
  fechaFin: string;
};

// "Mi disponibilidad" (Brief §1): cada quien gestiona solo las suyas, sin
// campo de motivo — solo el rango de fechas.
export async function obtenerMisIncidencias(usuarioId: string): Promise<Ausencia[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("incidencias")
    .select("id, fecha_inicio, fecha_fin")
    .eq("usuario_id", usuarioId)
    .order("fecha_inicio", { ascending: true });
  return (data ?? []).map((i) => ({ id: i.id, fechaInicio: i.fecha_inicio, fechaFin: i.fecha_fin }));
}

export async function crearIncidencia(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<Ausencia> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("incidencias")
    .insert({ usuario_id: usuarioId, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
    .select("id, fecha_inicio, fecha_fin")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo guardar la fecha.");
  return { id: data.id, fechaInicio: data.fecha_inicio, fechaFin: data.fecha_fin };
}

// Alcance por usuario_id además del id -- nadie puede borrar una incidencia
// ajena aunque conociera su id (Brief §1: "cada quien solo gestiona las
// suyas"). RLS está activo pero sin políticas (mismo patrón que el resto de
// la app, ver contexto del brief) así que este chequeo en el WHERE es el
// único candado real. Brief "Superadmin puede declarar/borrar ausencias de
// cualquier integrante": `comoSuperadmin` salta ese candado -- el caller
// (crearIncidenciaAction en app/inicio/actions.ts) es responsable de
// verificar server-side que quien llama realmente lo es antes de pasar
// `true`, este archivo no vuelve a chequear sesión.
export async function eliminarIncidencia(usuarioId: string, incidenciaId: string, comoSuperadmin = false): Promise<void> {
  const admin = supabaseMalgesto();
  let query = admin.from("incidencias").delete().eq("id", incidenciaId);
  if (!comoSuperadmin) query = query.eq("usuario_id", usuarioId);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export type AusenciaPersona = {
  // Brief "Rediseño de Ausencias": id de la incidencia real para origen
  // "manual" (permite borrarla desde el panel del día); una clave sintética
  // para "automatico" (no hay fila que borrar -- se recalcula cada vez).
  id: string;
  origen: "manual" | "automatico";
  usuarioId: string;
  nombre: string;
  bandaId: string;
  instrumentos: string[];
  // Rango cerrado "YYYY-MM-DD", uniforme sin importar el origen: una
  // incidencia manual usa su propio rango; un show/ensayo se representa
  // como [día, día]; una gira como [inicio, fin] -- así el consumidor
  // (MesView, NuevoEventoForm) hace un solo tipo de chequeo de rango, igual
  // que ya existe para giras (estaEnRangoGira).
  fechaInicio: string;
  fechaFin: string;
};

function diaISO(iso: string): string {
  const d = enZonaApp(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Brief "Ausencias — quitar las automáticas...": esta función combinaba 2
// fuentes -- manuales (malgesto.incidencias) y automáticas (calculadas al
// vuelo comparando eventos entre TODAS las bandas de cada persona). La
// automática se quita por completo acá: solo queda la manual.
export async function obtenerAusencias(bandaIds: string[]): Promise<AusenciaPersona[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();

  // Fix "ausencias con demasiado ruido": superadmin no genera ni recibe
  // ausencias -- pertenece a todas las bandas, así que sin este filtro
  // cualquier evento suyo en cualquier banda lo marcaría "ausente" en todas
  // las demás. Solo miembro/administrador cuentan.
  const { data: misMiembros } = await admin
    .from("miembros_banda")
    .select("usuario_id, banda_id")
    .in("banda_id", bandaIds)
    .in("rol", ["miembro", "administrador"])
    .eq("activo", true);
  if (!misMiembros || misMiembros.length === 0) return [];

  const personaIds = [...new Set(misMiembros.map((m) => m.usuario_id))];

  // Brief "Ausencias — quitar las automáticas...": ya no hace falta el
  // panorama COMPLETO de bandas de cada persona (eso era para detectar el
  // conflicto con "otra banda", eliminado acá) -- misMiembros ya está
  // scopeado a bandaIds, alcanza para saber a cuáles de las bandas pedidas
  // pertenece cada persona con incidencia manual.
  const bandasPorPersona = new Map<string, Set<string>>();
  for (const m of misMiembros) {
    const set = bandasPorPersona.get(m.usuario_id) ?? new Set<string>();
    set.add(m.banda_id);
    bandasPorPersona.set(m.usuario_id, set);
  }

  const [{ data: incidencias }, { data: personas }, { data: authData }, { data: personaPlazas }] = await Promise.all([
    admin.from("incidencias").select("id, usuario_id, fecha_inicio, fecha_fin").in("usuario_id", personaIds),
    admin.from("personas").select("usuario_id, nombre_mostrar"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("persona_plazas").select("persona_id, plazas(banda_id, instrumento, etiqueta)").in("persona_id", personaIds),
  ]);

  const nombrePorId = new Map((personas ?? []).map((p) => [p.usuario_id, p.nombre_mostrar]));
  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "Integrante"]));
  const fullNamePorId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );
  const nombreDe = (usuarioId: string) => nombrePorId.get(usuarioId) || fullNamePorId.get(usuarioId) || emailPorId.get(usuarioId) || "Integrante";

  const instrumentosPorPersonaBanda = new Map<string, string[]>();
  for (const pp of personaPlazas ?? []) {
    const plaza = pp.plazas as unknown as { banda_id: string; instrumento: string; etiqueta: string | null } | null;
    if (!plaza) continue;
    const key = `${pp.persona_id}:${plaza.banda_id}`;
    const lista = instrumentosPorPersonaBanda.get(key) ?? [];
    lista.push(etiquetaPlaza(plaza.instrumento, plaza.etiqueta));
    instrumentosPorPersonaBanda.set(key, lista);
  }
  const instrumentosDe = (usuarioId: string, bandaId: string) => instrumentosPorPersonaBanda.get(`${usuarioId}:${bandaId}`) ?? [];

  const resultado: AusenciaPersona[] = [];

  for (const inc of incidencias ?? []) {
    const bandas = bandasPorPersona.get(inc.usuario_id);
    if (!bandas) continue;
    for (const bandaId of bandas) {
      if (!bandaIds.includes(bandaId)) continue;
      resultado.push({
        id: inc.id,
        origen: "manual",
        usuarioId: inc.usuario_id,
        nombre: nombreDe(inc.usuario_id),
        bandaId,
        instrumentos: instrumentosDe(inc.usuario_id, bandaId),
        fechaInicio: inc.fecha_inicio,
        fechaFin: inc.fecha_fin,
      });
    }
  }

  // Brief "Rediseño de Ausencias §1": nunca fechas pasadas -- una ausencia
  // cuyo rango ya terminó no aporta nada, solo ruido. "Futuro" incluye hoy
  // (fechaFin >= hoy, no >).
  const hoy = fechaISO(ahoraEnZonaApp());
  return resultado.filter((a) => a.fechaFin >= hoy);
}

// Brief "Rediseño de Ausencias §1": cuando un Show/Ensayo/Gira pasa a
// estado=confirmado, el evento "reemplaza" cualquier ausencia manual
// declarada por los integrantes de ESA banda que se traslape con esa
// fecha -- ya se resolvió/negoció, deja de tener sentido seguir marcándolos
// ausentes ahí. Explícito acá, llamado desde el mismo server action que
// confirma (crearEvento/actualizarEvento/asignarEstadoEvento/crearGira en
// lib/malgestoEventos.ts) en vez de un trigger de base de datos, para que
// quede claro en el código dónde pasa. Solo miembro/administrador cuentan
// (mismo filtro que el resto de este archivo). El conflicto AUTOMÁTICO que
// esa misma persona sigue generando en SUS OTRAS bandas no se toca acá --
// no es una fila guardada, se recalcula al vuelo arriba.
export async function limpiarIncidenciasPorConfirmacion(bandaIds: string[], fechaInicio: string, fechaFin: string | null): Promise<void> {
  if (bandaIds.length === 0) return;
  const admin = supabaseMalgesto();

  const { data: miembros } = await admin
    .from("miembros_banda")
    .select("usuario_id")
    .in("banda_id", bandaIds)
    .in("rol", ["miembro", "administrador"])
    .eq("activo", true);
  const usuarioIds = [...new Set((miembros ?? []).map((m) => m.usuario_id))];
  if (usuarioIds.length === 0) return;

  // fecha_inicio/fecha_fin del evento son timestamptz; incidencias.fecha_*
  // son date -- se compara por día en ZONA_HORARIA_APP (mismo diaISO que ya
  // usa obtenerAusencias arriba para lo mismo).
  const inicioDia = diaISO(fechaInicio);
  const finDia = fechaFin ? diaISO(fechaFin) : inicioDia;

  const { error } = await admin
    .from("incidencias")
    .delete()
    .in("usuario_id", usuarioIds)
    .lte("fecha_inicio", finDia)
    .gte("fecha_fin", inicioDia);
  if (error) throw new Error(error.message);
}
