import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { enZonaApp } from "@/lib/zonaHoraria";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";

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
// único candado real.
export async function eliminarIncidencia(usuarioId: string, incidenciaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("incidencias").delete().eq("id", incidenciaId).eq("usuario_id", usuarioId);
  if (error) throw new Error(error.message);
}

export type AusenciaPersona = {
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

type EventoParaConflicto = { id: string; banda_id: string; tipo: string; fecha_inicio: string; fecha_fin: string | null };

// Brief "Disponibilidad de integrantes": ausencias de los integrantes de
// las bandas dadas -- combina 2 fuentes:
// 1. Manuales: malgesto.incidencias, capturadas por cada quien sobre sí
//    mismo (§1).
// 2. Automáticas: un integrante de banda X con un evento (show/ensayo/gira)
//    agendado ese mismo día con OTRA banda a la que pertenezca -- calculado
//    al vuelo contra malgesto.eventos, nunca duplicado en incidencias (§3).
// El resultado nunca revela CON QUÉ otra banda es el conflicto automático
// ("no restringido... ni de qué banda es el conflicto si es automático") --
// cada fila solo lleva la banda que se está evaluando (bandaId=X), nunca Y.
export async function obtenerAusencias(bandaIds: string[]): Promise<AusenciaPersona[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();

  const { data: misMiembros } = await admin.from("miembros_banda").select("usuario_id, banda_id").in("banda_id", bandaIds).eq("activo", true);
  if (!misMiembros || misMiembros.length === 0) return [];

  const personaIds = [...new Set(misMiembros.map((m) => m.usuario_id))];

  // Bandas de CADA una de esas personas (no solo bandaIds pedidos) -- hace
  // falta el panorama completo para detectar el conflicto con "otra banda".
  const { data: todasMembresias } = await admin
    .from("miembros_banda")
    .select("usuario_id, banda_id")
    .in("usuario_id", personaIds)
    .eq("activo", true);

  const bandasPorPersona = new Map<string, Set<string>>();
  for (const m of todasMembresias ?? []) {
    const set = bandasPorPersona.get(m.usuario_id) ?? new Set<string>();
    set.add(m.banda_id);
    bandasPorPersona.set(m.usuario_id, set);
  }
  const todasLasBandas = [...new Set((todasMembresias ?? []).map((m) => m.banda_id))];

  const [{ data: incidencias }, { data: personas }, { data: authData }, { data: personaPlazas }, { data: eventosDirectos }, { data: giraBandasRelevantes }] =
    await Promise.all([
      admin.from("incidencias").select("usuario_id, fecha_inicio, fecha_fin").in("usuario_id", personaIds),
      admin.from("personas").select("usuario_id, nombre_mostrar"),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("persona_plazas").select("persona_id, plazas(banda_id, instrumento, etiqueta)").in("persona_id", personaIds),
      admin
        .from("eventos")
        .select("id, banda_id, tipo, fecha_inicio, fecha_fin")
        .in("banda_id", todasLasBandas)
        .in("tipo", ["show", "ensayo", "gira"]),
      admin.from("gira_bandas").select("gira_evento_id, banda_id").in("banda_id", todasLasBandas),
    ]);

  // Mismo patrón "directos + extra" que obtenerEventos (lib/malgestoEventos.ts):
  // una gira puede involucrar una banda relevante solo como secundaria
  // (gira_bandas), sin que su banda_id primaria esté en todasLasBandas.
  const idsDirectos = new Set((eventosDirectos ?? []).map((e) => e.id));
  const idsExtra = [...new Set((giraBandasRelevantes ?? []).map((g) => g.gira_evento_id))].filter((id) => !idsDirectos.has(id));
  const { data: eventosExtra } =
    idsExtra.length > 0
      ? await admin.from("eventos").select("id, banda_id, tipo, fecha_inicio, fecha_fin").in("id", idsExtra)
      : { data: [] as EventoParaConflicto[] };

  const eventos: EventoParaConflicto[] = [...(eventosDirectos ?? []), ...(eventosExtra ?? [])];
  const giraIds = eventos.filter((e) => e.tipo === "gira").map((e) => e.id);
  const bandasPorGira = new Map<string, Set<string>>();
  if (giraIds.length > 0) {
    const { data: relaciones } = await admin.from("gira_bandas").select("gira_evento_id, banda_id").in("gira_evento_id", giraIds);
    for (const r of relaciones ?? []) {
      const set = bandasPorGira.get(r.gira_evento_id) ?? new Set<string>();
      set.add(r.banda_id);
      bandasPorGira.set(r.gira_evento_id, set);
    }
  }

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
        usuarioId: inc.usuario_id,
        nombre: nombreDe(inc.usuario_id),
        bandaId,
        instrumentos: instrumentosDe(inc.usuario_id, bandaId),
        fechaInicio: inc.fecha_inicio,
        fechaFin: inc.fecha_fin,
      });
    }
  }

  for (const ev of eventos) {
    const bandasDelEvento = ev.tipo === "gira" ? (bandasPorGira.get(ev.id) ?? new Set([ev.banda_id])) : new Set([ev.banda_id]);
    const inicio = diaISO(ev.fecha_inicio);
    const fin = ev.fecha_fin ? diaISO(ev.fecha_fin) : inicio;

    for (const [usuarioId, susBandas] of bandasPorPersona) {
      const tieneEventoAca = [...bandasDelEvento].some((y) => susBandas.has(y));
      if (!tieneEventoAca) continue;
      for (const bandaId of susBandas) {
        if (!bandaIds.includes(bandaId)) continue;
        if (bandasDelEvento.has(bandaId)) continue; // no es "otra" banda
        resultado.push({
          usuarioId,
          nombre: nombreDe(usuarioId),
          bandaId,
          instrumentos: instrumentosDe(usuarioId, bandaId),
          fechaInicio: inicio,
          fechaFin: fin,
        });
      }
    }
  }

  return resultado;
}
