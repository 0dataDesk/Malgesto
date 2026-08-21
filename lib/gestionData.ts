import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { DispositivoAsignado } from "@/lib/dispositivosData";

export type BandaSimple = {
  id: string;
  nombre: string;
  color: string;
  // Brief "Rediseño de Ausencias §5/§6": opcional -- si no está capturado,
  // el calendario sigue mostrando el punto de color de siempre.
  emoji: string | null;
  genero: string | null;
  numeroIntegrantes: number | null;
  archivada: boolean;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
  finanzasHabilitado: boolean;
  stagePlotHabilitado: boolean;
};

export type PersonaPendiente = {
  usuarioId: string;
  email: string;
  primerAcceso: string;
};

export type ResultadoInvitacion = { ok: true } | { ok: false; motivo: string };

// Un superadmin lo es de forma global en esta consola — si tiene rol
// superadmin en alguna banda, administra todas (crear banda, invitar a
// cualquiera, resolver pendientes globales), no solo la suya. La pantalla
// 15 es un escritorio de gestión del sistema, no un panel por banda. Solo
// cuenta si la membresía sigue activa (Brief 8: un superadmin removido de
// esa banda pierde el acceso).
export async function esSuperadmin(usuarioId: string): Promise<boolean> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("rol", "superadmin")
    .eq("activo", true)
    .limit(1);
  return !!data && data.length > 0;
}

export async function obtenerBandasTodas(): Promise<BandaSimple[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("bandas")
    .select(
      "id, nombre, color, emoji, genero, numero_integrantes, archivada, canciones_habilitado, setlist_habilitado, seteos_habilitado, finanzas_habilitado, stage_plot_habilitado"
    )
    .order("nombre", { ascending: true });
  return (data ?? []).map((b) => ({
    id: b.id,
    nombre: b.nombre,
    color: b.color,
    emoji: b.emoji,
    genero: b.genero,
    numeroIntegrantes: b.numero_integrantes,
    archivada: b.archivada,
    cancionesHabilitado: b.canciones_habilitado,
    setlistHabilitado: b.setlist_habilitado,
    seteosHabilitado: b.seteos_habilitado,
    finanzasHabilitado: b.finanzas_habilitado,
    stagePlotHabilitado: b.stage_plot_habilitado,
  }));
}

export async function crearBanda(nombre: string, usuarioIdCreador: string): Promise<string> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin.from("bandas").insert({ nombre }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la banda.");

  const { error: errMiembro } = await admin
    .from("miembros_banda")
    .insert({ usuario_id: usuarioIdCreador, banda_id: data.id, rol: "superadmin" });
  if (errMiembro) throw new Error(errMiembro.message);

  return data.id;
}

export type ActualizacionBanda = {
  nombre: string;
  color: string;
  emoji: string | null;
  genero: string | null;
  numeroIntegrantes: number | null;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
  finanzasHabilitado: boolean;
  stagePlotHabilitado: boolean;
};

export async function actualizarBanda(bandaId: string, cambios: ActualizacionBanda): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("bandas")
    .update({
      nombre: cambios.nombre,
      color: cambios.color,
      emoji: cambios.emoji,
      genero: cambios.genero,
      numero_integrantes: cambios.numeroIntegrantes,
      canciones_habilitado: cambios.cancionesHabilitado,
      setlist_habilitado: cambios.setlistHabilitado,
      seteos_habilitado: cambios.seteosHabilitado,
      finanzas_habilitado: cambios.finanzasHabilitado,
      stage_plot_habilitado: cambios.stagePlotHabilitado,
    })
    .eq("id", bandaId);
  if (error) throw new Error(error.message);
}

export async function archivarBanda(bandaId: string, archivada: boolean): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("bandas").update({ archivada }).eq("id", bandaId);
  if (error) throw new Error(error.message);
}

// Irreversible — el cascade de FKs (verificado en la migración de Brief 9)
// se encarga de eventos, canciones/secciones/acordes, setlists/setlist_items,
// dispositivos/seteos, membresías, invitaciones y lugares de esa banda.
export async function eliminarBanda(bandaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("bandas").delete().eq("id", bandaId);
  if (error) throw new Error(error.message);
}

// Plazas (Brief 9 §6/§9): catálogo de instrumentos por banda, reemplaza el
// arreglo libre `miembros_banda.instrumentos`.
export type Plaza = { id: string; bandaId: string; instrumento: string; etiqueta: string | null };

export async function obtenerPlazas(bandaIds: string[]): Promise<Plaza[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("plazas")
    .select("id, banda_id, instrumento, etiqueta")
    .in("banda_id", bandaIds)
    .order("created_at", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, bandaId: p.banda_id, instrumento: p.instrumento, etiqueta: p.etiqueta }));
}

// Brief 13 §1: cada instrumento del catálogo fijo se agrega una sola vez por
// banda (ya se quita de las opciones una vez agregado, ver BandasPanel), así
// que "cantidad" no tiene sentido — cada alta crea exactamente una plaza.
// "Otro" sigue siendo la excepción con etiqueta libre.
export async function crearPlaza(bandaId: string, instrumento: string, etiqueta: string | null): Promise<Plaza> {
  const admin = supabaseMalgesto();
  const fila = { banda_id: bandaId, instrumento, etiqueta: instrumento === "otro" ? etiqueta : null };

  const { data, error } = await admin.from("plazas").insert(fila).select("id, banda_id, instrumento, etiqueta").single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el instrumento.");
  return { id: data.id, bandaId: data.banda_id, instrumento: data.instrumento, etiqueta: data.etiqueta };
}

export async function eliminarPlaza(plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("plazas").delete().eq("id", plazaId);
  if (error) throw new Error(error.message);
}

// Instrumentos propios (brief "Instrumentos propios + selector de
// instrumento activo en Seteos"): equipo físico real de cada persona --
// separado de `plazas`, que modela el rol/instrumento que ocupa dentro de
// una banda. Sin banda_id: es del integrante, no de una membresía puntual.
export type InstrumentoPropio = { id: string; usuarioId: string; instrumento: string; marca: string | null; modelo: string | null };

export async function crearInstrumentoPropio(
  usuarioId: string,
  instrumento: string,
  marca: string | null,
  modelo: string | null
): Promise<InstrumentoPropio> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("instrumentos_propios")
    .insert({ usuario_id: usuarioId, instrumento, marca, modelo })
    .select("id, usuario_id, instrumento, marca, modelo")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear el instrumento.");
  return { id: data.id, usuarioId: data.usuario_id, instrumento: data.instrumento, marca: data.marca, modelo: data.modelo };
}

export async function actualizarInstrumentoPropio(id: string, instrumento: string, marca: string | null, modelo: string | null): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("instrumentos_propios").update({ instrumento, marca, modelo }).eq("id", id);
  if (error) throw new Error(error.message);
}

// El FK de seteos.instrumento_propio_id no tiene ON DELETE (queda RESTRICT
// por default) -- si hay seteos guardados con este instrumento, Postgres
// rechaza el borrado (23503) en vez de dejarlos huérfanos o borrarlos en
// cascada sin avisar.
export async function eliminarInstrumentoPropio(id: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("instrumentos_propios").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("No se puede eliminar: hay seteos guardados con este instrumento. Cambiá esos seteos a otro instrumento primero.");
    }
    throw new Error(error.message);
  }
}

// Brief 13 §3: una plaza solo puede ser ocupada por integrantes de la misma
// banda (la UI ya filtra por membresía activa, esto es el resguardo de
// servidor) y solo por una persona a la vez (garantizado por el constraint
// UNIQUE(plaza_id) en la DB — acá solo traducimos el 23505 a un mensaje claro).
export async function asignarPersonaAPlaza(usuarioId: string, plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();

  const { data: plaza, error: errorPlaza } = await admin.from("plazas").select("banda_id").eq("id", plazaId).single();
  if (errorPlaza || !plaza) throw new Error("No se encontró el instrumento.");

  const { data: miembro } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("banda_id", plaza.banda_id)
    .eq("activo", true)
    .maybeSingle();
  if (!miembro) throw new Error("Esta persona no pertenece a la banda de este instrumento.");

  const { error } = await admin.from("persona_plazas").upsert({ persona_id: usuarioId, plaza_id: plazaId }, { onConflict: "persona_id,plaza_id" });
  if (error) {
    if (error.code === "23505") {
      const nombre = await nombreOcupantePlaza(plazaId);
      throw new Error(nombre ? `Esta plaza ya está ocupada por ${nombre}.` : "Esta plaza ya está ocupada por otra persona.");
    }
    throw new Error(error.message);
  }
}

async function nombreOcupantePlaza(plazaId: string): Promise<string | null> {
  const admin = supabaseMalgesto();
  const { data: fila } = await admin.from("persona_plazas").select("persona_id").eq("plaza_id", plazaId).maybeSingle();
  if (!fila) return null;
  const { data: persona } = await admin.from("personas").select("nombre_mostrar").eq("usuario_id", fila.persona_id).maybeSingle();
  if (persona?.nombre_mostrar) return persona.nombre_mostrar;
  const { data: usuario } = await admin.auth.admin.getUserById(fila.persona_id);
  return usuario?.user?.email ?? null;
}

export async function quitarPersonaDePlaza(usuarioId: string, plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("persona_plazas").delete().eq("persona_id", usuarioId).eq("plaza_id", plazaId);
  if (error) throw new Error(error.message);
}

// Brief "Rediseño de Gestión > Integrantes" §2: plazas que una invitación
// pendiente ya reservó (invitaciones.plaza_id, protegido por el índice único
// parcial invitaciones_plaza_pendiente_unique) -- junto con persona_plazas,
// es lo que el formulario de invitar resta para armar "disponibles" por
// banda. Se listan sueltas (no por banda) porque el llamador ya tiene todas
// las plazas de todas las bandas y filtra client-side.
export async function obtenerPlazasReservadas(): Promise<string[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("invitaciones").select("plaza_id").eq("estado", "pendiente").not("plaza_id", "is", null);
  return (data ?? []).map((i) => i.plaza_id as string);
}

// Todos los usuarios de auth.users (vía Admin Auth API — la app nunca
// consulta el esquema auth directamente, ni siquiera con la service role)
// que no tengan fila en miembros_banda, ni invitación pendiente por su
// correo, ni estén marcados como ignorados. created_at de auth.users hace
// de "fecha de primer intento de acceso": Supabase crea esa fila recién en
// el primer login con Google, no antes.
export async function obtenerPersonasPendientes(): Promise<PersonaPendiente[]> {
  const admin = supabaseMalgesto();

  const [{ data: authData }, { data: miembros }, { data: invitacionesPendientes }, { data: ignorados }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("miembros_banda").select("usuario_id"),
      admin.from("invitaciones").select("email").eq("estado", "pendiente"),
      admin.from("accesos_ignorados").select("usuario_id"),
    ]);

  const idsConBanda = new Set((miembros ?? []).map((m) => m.usuario_id));
  const emailsConInvitacion = new Set((invitacionesPendientes ?? []).map((i) => i.email.toLowerCase()));
  const idsIgnorados = new Set((ignorados ?? []).map((a) => a.usuario_id));

  return (authData?.users ?? [])
    .filter(
      (u) =>
        !!u.email &&
        !idsConBanda.has(u.id) &&
        !emailsConInvitacion.has(u.email.toLowerCase()) &&
        !idsIgnorados.has(u.id)
    )
    .map((u) => ({ usuarioId: u.id, email: u.email!, primerAcceso: u.created_at }));
}

export async function ignorarPersonaPendiente(usuarioId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("accesos_ignorados").upsert({ usuario_id: usuarioId });
  if (error) throw new Error(error.message);
}

export type RolInvitable = "miembro" | "administrador";

// Brief "Rediseño de Gestión > Integrantes" §2: rol, plaza y bloques
// visibles ahora se eligen por banda al invitar (antes era un único rol
// global para todas las bandas seleccionadas) -- cada entrada se traduce 1:1
// en una fila de `invitaciones`. `plazaId: null` = "sin instrumento asignado
// por ahora"; `bloquesVisibles: null` = sin restricción (mismo criterio que
// ya usa miembros_banda.bloques_visibles, ver actualizarBloquesVisibles).
export type InvitacionPorBanda = {
  bandaId: string;
  rol: RolInvitable;
  plazaId: string | null;
  bloquesVisibles: string[] | null;
};

// Invitar/asignar (Brief 9 §10-11, rol elegible desde Brief "Nuevo nivel de
// rol: Miembro administrador", ahora una configuración completa por banda
// desde Brief "Rediseño de Gestión > Integrantes" §2). Superadmin sigue sin
// poder otorgarse desde acá — por eso RolInvitable ni siquiera lo contempla.
// No hay una acción separada para cederlo sobre alguien ya existente (se
// quitó por Brief "3 pendientes" §1: estaba sin conectar a ninguna UI y
// tenía un bug latente al revertir); si hace falta en el futuro, se
// construye de nuevo con la lógica correcta en ese momento.
export async function invitarPersona(
  email: string,
  nombreMostrarPropuesto: string | null,
  invitacionesPorBanda: InvitacionPorBanda[]
): Promise<ResultadoInvitacion> {
  const admin = supabaseMalgesto();
  const emailNormalizado = email.trim().toLowerCase();
  const nombrePropuesto = nombreMostrarPropuesto?.trim() || null;

  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const usuarioExistente = authData?.users.find((u) => u.email?.toLowerCase() === emailNormalizado);

  const errores: string[] = [];
  let algunaOk = false;

  for (const item of invitacionesPorBanda) {
    if (usuarioExistente) {
      const { data: yaMiembro } = await admin
        .from("miembros_banda")
        .select("id")
        .eq("usuario_id", usuarioExistente.id)
        .eq("banda_id", item.bandaId)
        .eq("activo", true)
        .limit(1);
      if (yaMiembro && yaMiembro.length > 0) {
        errores.push("ya es miembro de una de las bandas seleccionadas");
        continue;
      }
    }

    const { data: invitacionExistente } = await admin
      .from("invitaciones")
      .select("id")
      .eq("email", emailNormalizado)
      .eq("banda_id", item.bandaId)
      .eq("estado", "pendiente")
      .limit(1);
    if (invitacionExistente && invitacionExistente.length > 0) {
      errores.push("ya hay una invitación pendiente en una de las bandas seleccionadas");
      continue;
    }

    const { error } = await admin.from("invitaciones").insert({
      email: emailNormalizado,
      banda_id: item.bandaId,
      rol: item.rol,
      estado: "pendiente",
      plaza_id: item.plazaId,
      bloques_visibles: item.bloquesVisibles,
      nombre_mostrar_propuesto: nombrePropuesto,
    });
    if (error) {
      // La reserva de plaza es inmediata al mandar la invitación, protegida
      // por invitaciones_plaza_pendiente_unique (índice único parcial sobre
      // plaza_id donde estado='pendiente') -- si dos invitaciones para la
      // misma plaza se mandan casi a la vez, la segunda pisa acá con 23505 y
      // se traduce a un mensaje que tiene sentido para quien invita, no el
      // texto crudo del constraint.
      if (error.code === "23505" && error.message.includes("invitaciones_plaza_pendiente_unique")) {
        errores.push("esa plaza se acaba de ocupar, elegí otra");
      } else {
        errores.push(error.message);
      }
      continue;
    }
    algunaOk = true;
  }

  if (usuarioExistente && algunaOk) {
    await admin.from("accesos_ignorados").delete().eq("usuario_id", usuarioExistente.id);
  }

  if (!algunaOk) return { ok: false, motivo: errores[0] ?? "No se pudo invitar." };
  if (errores.length > 0) return { ok: false, motivo: `Invitada a algunas bandas, pero: ${errores.join("; ")}.` };
  return { ok: true };
}

export async function actualizarFechaNacimiento(usuarioId: string, fecha: string | null): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("personas")
    .upsert({ usuario_id: usuarioId, fecha_nacimiento: fecha }, { onConflict: "usuario_id" });
  if (error) throw new Error(error.message);
}

// Integrantes (Brief 8 §2, plazas desde Brief 9 §6): un listado unificado por
// persona, combinando invitaciones pendientes y filas de miembros_banda
// (activas o inactivas — "inactivo" es alguien removido de una banda sin
// borrar su historial). El bucket "personas pendientes de asignar" (Brief 7,
// obtenerPersonasPendientes) es un concepto distinto — logins de Google sin
// invitación ni membresía alguna — y se mantiene aparte en la pantalla.
export type EstadoIntegrante = "invitado" | "activo" | "inactivo";

export type PlazaAsignada = { plazaId: string; instrumento: string; etiqueta: string | null };

// Brief "Voz — nuevo botón cíclico en la fila de Rol, fuera de
// Instrumentos": campo independiente de las plazas de instrumento (esas ya
// no aceptan voz/coro, ver migración de ese brief) -- un solo botón cíclico
// por persona+banda en vez de una plaza que solo una persona puede ocupar.
export type Voz = "sin_voz" | "principal" | "coro";

export type BandaDeIntegrante = {
  bandaId: string;
  bandaNombre: string;
  activo: boolean;
  rol: string;
  plazas: PlazaAsignada[];
  bloquesVisibles: string[] | null;
  // Brief "Seteos — catálogo de diseños" §1: amplificador(es)/pedal(es)/
  // consola asignados a esta persona en esta banda.
  dispositivos: DispositivoAsignado[];
  voz: Voz;
};

export type Integrante = {
  usuarioId: string | null;
  email: string;
  nombreMostrar: string | null;
  fechaNacimiento: string | null;
  estado: EstadoIntegrante;
  esSuperadmin: boolean;
  bandas: BandaDeIntegrante[];
  // Brief "Instrumentos propios...": a diferencia de `bandas[].plazas`, no
  // vive por banda -- es una sola lista por persona.
  instrumentosPropios: InstrumentoPropio[];
};

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

export async function obtenerIntegrantes(): Promise<Integrante[]> {
  const admin = supabaseMalgesto();
  const [
    { data: bandas },
    { data: miembros },
    { data: invitacionesPendientes },
    { data: authData },
    { data: personas },
    { data: personaPlazas },
    { data: dispositivos },
    { data: instrumentosPropios },
  ] = await Promise.all([
    admin.from("bandas").select("id, nombre"),
    admin.from("miembros_banda").select("usuario_id, banda_id, rol, activo, bloques_visibles, voz"),
    admin.from("invitaciones").select("email").eq("estado", "pendiente"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("personas").select("usuario_id, nombre_mostrar, fecha_nacimiento"),
    admin.from("persona_plazas").select("persona_id, plazas(id, banda_id, instrumento, etiqueta)"),
    admin.from("dispositivos").select("id, banda_id, usuario_id, categoria, diseno_id, nombre, habilitado, disenos_dispositivo(marca, modelo)"),
    admin.from("instrumentos_propios").select("id, usuario_id, instrumento, marca, modelo").order("created_at", { ascending: true }),
  ]);

  const dispositivosPorPersonaYBanda = new Map<string, DispositivoAsignado[]>();
  for (const d of (dispositivos ?? []) as unknown as DispositivoRow[]) {
    const key = `${d.usuario_id}:${d.banda_id}`;
    const lista = dispositivosPorPersonaYBanda.get(key) ?? [];
    lista.push({
      id: d.id,
      bandaId: d.banda_id,
      usuarioId: d.usuario_id,
      categoria: d.categoria as DispositivoAsignado["categoria"],
      disenoId: d.diseno_id,
      disenoMarca: d.disenos_dispositivo?.marca ?? null,
      disenoModelo: d.disenos_dispositivo?.modelo ?? null,
      apodo: d.nombre,
      habilitado: d.habilitado,
    });
    dispositivosPorPersonaYBanda.set(key, lista);
  }

  const instrumentosPropiosPorUsuarioId = new Map<string, InstrumentoPropio[]>();
  for (const i of instrumentosPropios ?? []) {
    const lista = instrumentosPropiosPorUsuarioId.get(i.usuario_id) ?? [];
    lista.push({ id: i.id, usuarioId: i.usuario_id, instrumento: i.instrumento, marca: i.marca, modelo: i.modelo });
    instrumentosPropiosPorUsuarioId.set(i.usuario_id, lista);
  }

  const bandaPorId = new Map((bandas ?? []).map((b) => [b.id, b.nombre]));
  const emailPorUsuarioId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "(sin correo)"]));
  const nombrePorUsuarioId = new Map((personas ?? []).map((p) => [p.usuario_id, p.nombre_mostrar]));
  const fechaNacimientoPorUsuarioId = new Map((personas ?? []).map((p) => [p.usuario_id, p.fecha_nacimiento]));
  const fullNamePorUsuarioId = new Map(
    (authData?.users ?? []).map((u) => [u.id, (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null])
  );

  const plazasPorPersonaYBanda = new Map<string, PlazaAsignada[]>();
  for (const pp of personaPlazas ?? []) {
    const plaza = pp.plazas as unknown as { id: string; banda_id: string; instrumento: string; etiqueta: string | null } | null;
    if (!plaza) continue;
    const key = `${pp.persona_id}:${plaza.banda_id}`;
    const lista = plazasPorPersonaYBanda.get(key) ?? [];
    lista.push({ plazaId: plaza.id, instrumento: plaza.instrumento, etiqueta: plaza.etiqueta });
    plazasPorPersonaYBanda.set(key, lista);
  }

  type Acumulado = {
    usuarioId: string | null;
    email: string;
    bandas: BandaDeIntegrante[];
    tieneActivo: boolean;
    tieneInvitacion: boolean;
    tieneSuperadmin: boolean;
  };
  const porEmail = new Map<string, Acumulado>();

  for (const m of miembros ?? []) {
    const email = emailPorUsuarioId.get(m.usuario_id) ?? "(desconocido)";
    const key = email.toLowerCase();
    if (!porEmail.has(key)) {
      porEmail.set(key, { usuarioId: m.usuario_id, email, bandas: [], tieneActivo: false, tieneInvitacion: false, tieneSuperadmin: false });
    }
    const acc = porEmail.get(key)!;
    if (m.activo && m.rol === "superadmin") acc.tieneSuperadmin = true;
    acc.bandas.push({
      bandaId: m.banda_id,
      bandaNombre: bandaPorId.get(m.banda_id) ?? "Banda",
      activo: m.activo,
      rol: m.rol,
      plazas: plazasPorPersonaYBanda.get(`${m.usuario_id}:${m.banda_id}`) ?? [],
      bloquesVisibles: (m.bloques_visibles as string[] | null) ?? null,
      dispositivos: dispositivosPorPersonaYBanda.get(`${m.usuario_id}:${m.banda_id}`) ?? [],
      voz: (m.voz as Voz) ?? "sin_voz",
    });
    if (m.activo) acc.tieneActivo = true;
  }

  for (const inv of invitacionesPendientes ?? []) {
    const key = inv.email.toLowerCase();
    if (!porEmail.has(key)) {
      porEmail.set(key, { usuarioId: null, email: inv.email, bandas: [], tieneActivo: false, tieneInvitacion: false, tieneSuperadmin: false });
    }
    porEmail.get(key)!.tieneInvitacion = true;
  }

  return Array.from(porEmail.values())
    .map((acc): Integrante => ({
      usuarioId: acc.usuarioId,
      email: acc.email,
      nombreMostrar: acc.usuarioId
        ? nombrePorUsuarioId.get(acc.usuarioId) ?? fullNamePorUsuarioId.get(acc.usuarioId) ?? null
        : null,
      fechaNacimiento: acc.usuarioId ? fechaNacimientoPorUsuarioId.get(acc.usuarioId) ?? null : null,
      estado: acc.tieneActivo ? "activo" : acc.tieneInvitacion ? "invitado" : "inactivo",
      esSuperadmin: acc.tieneSuperadmin,
      bandas: acc.bandas,
      instrumentosPropios: acc.usuarioId ? instrumentosPropiosPorUsuarioId.get(acc.usuarioId) ?? [] : [],
    }))
    .sort((a, b) => {
      // Brief "Rediseño visual de Gestión" §3: alfabético por nombre para
      // mostrar (o correo si todavía no tiene uno), salvo que superadmin
      // siempre va primero sin importar el alfabeto.
      if (a.esSuperadmin !== b.esSuperadmin) return a.esSuperadmin ? -1 : 1;
      return (a.nombreMostrar || a.email).localeCompare(b.nombreMostrar || b.email, "es");
    });
}

export async function actualizarNombreMostrar(usuarioId: string, nombreMostrar: string): Promise<void> {
  const admin = supabaseMalgesto();
  const valor = nombreMostrar.trim() || null;
  const { error } = await admin
    .from("personas")
    .upsert({ usuario_id: usuarioId, nombre_mostrar: valor }, { onConflict: "usuario_id" });
  if (error) throw new Error(error.message);
}

// Quita a la persona de esa banda sin borrar la fila (activo=false), para
// conservar el historial (Brief 8 §2).
export async function removerDeBanda(usuarioId: string, bandaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("miembros_banda")
    .update({ activo: false })
    .eq("usuario_id", usuarioId)
    .eq("banda_id", bandaId);
  if (error) throw new Error(error.message);
}

// Vuelve a activar una fila previamente removida (mismo botón "Asignar" que
// una banda nueva desde Integrantes: si ya existe fila inactiva, se reactiva
// en vez de duplicarla).
export async function asignarABanda(usuarioId: string, bandaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { data: existente } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("banda_id", bandaId)
    .limit(1);

  if (existente && existente.length > 0) {
    const { error } = await admin.from("miembros_banda").update({ activo: true }).eq("id", existente[0].id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("miembros_banda").insert({ usuario_id: usuarioId, banda_id: bandaId, rol: "miembro" });
  if (error) throw new Error(error.message);
}

// Brief "3 pendientes" §2: cambia el rol de una membresía banda+persona ya
// existente entre los 2 niveles no sensibles — el rol es por fila (no
// global como superadmin), así que se toca solo esa banda puntual, sin
// afectar otras membresías de la misma persona. El filtro .neq("rol",
// "superadmin") es defensa en profundidad además del gate en la UI (que ya
// no muestra el selector para una fila en superadmin): ni con una llamada
// directa a este action se puede degradar a un superadmin desde acá.
export async function actualizarRol(usuarioId: string, bandaId: string, rol: RolInvitable): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("miembros_banda")
    .update({ rol })
    .eq("usuario_id", usuarioId)
    .eq("banda_id", bandaId)
    .neq("rol", "superadmin");
  if (error) throw new Error(error.message);
}

// Brief "Voz — nuevo botón cíclico en la fila de Rol, fuera de
// Instrumentos" §2: a diferencia de rol, no hay restricción de superadmin
// acá -- la voz es un atributo propio de la persona en esa banda,
// independiente de su nivel de permisos.
export async function actualizarVoz(usuarioId: string, bandaId: string, voz: Voz): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("miembros_banda").update({ voz }).eq("usuario_id", usuarioId).eq("banda_id", bandaId);
  if (error) throw new Error(error.message);
}

// Subpermisos por persona (Brief 21 §1): null = sin restricción (ve todo lo
// que la banda active, incluso bloques activados después); un array =
// restringida a esos bloques puntuales de esa banda. Calendario nunca forma
// parte del array porque nunca se restringe.
export async function actualizarBloquesVisibles(usuarioId: string, bandaId: string, bloques: string[] | null): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("miembros_banda")
    .update({ bloques_visibles: bloques })
    .eq("usuario_id", usuarioId)
    .eq("banda_id", bandaId);
  if (error) throw new Error(error.message);
}

// Brief "Ocultar botones... eliminar integrante": "Inactivar" ya existía
// implícitamente (destildar cada banda una por una desde "Bandas asignadas"
// ya deja a la persona en estado "inactivo" — ver el cálculo de `estado` en
// obtenerIntegrantes más abajo), pero no como una acción explícita de un
// solo clic. Esto hace lo mismo que remover cada banda por separado, en
// una sola llamada — no toca personas/auth, el historial queda intacto.
export async function inactivarPersona(usuarioId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("miembros_banda").update({ activo: false }).eq("usuario_id", usuarioId).eq("activo", true);
  if (error) throw new Error(error.message);
}

export type VerificacionEliminacion = { eliminable: true } | { eliminable: false; motivo: string };

// Criterio conservador (Brief "Eliminar integrante"): movimientos_financieros
// no tiene FK a usuario_id (verificado, ninguna tabla la tiene — la integridad
// acá es de aplicación, no de la base), así que borrar a la persona NO
// fallaría a nivel DB, dejaría movimientos financieros con creado_por
// huérfano en silencio. Se bloquea el borrado en vez de dejar ese rastro
// financiero sin dueño — "Inactivar" es la alternativa para este caso.
export async function verificarPersonaEliminable(usuarioId: string): Promise<VerificacionEliminacion> {
  const admin = supabaseMalgesto();
  const { count } = await admin.from("movimientos_financieros").select("id", { count: "exact", head: true }).eq("creado_por", usuarioId);
  if (count && count > 0) {
    return {
      eliminable: false,
      motivo: `No se puede eliminar: tiene ${count} movimiento${count === 1 ? "" : "s"} financiero${count === 1 ? "" : "s"} registrado${count === 1 ? "" : "s"} a su nombre. Para no perder ese historial, usá "Inactivar" en vez de eliminar.`,
    };
  }
  return { eliminable: true };
}

// Hard delete real (Brief "Eliminar integrante"): borra cuenta de auth,
// persona y todas sus membresías — no solo desactiva. Ningún usuario_id de
// la app tiene FK formal (confirmado contra information_schema), así que el
// orden de limpieza es responsabilidad de esta función, no de la DB: primero
// las filas propias de la app (para que, si algo falla acá, la cuenta de
// auth siga existiendo y se pueda reintentar sin dejar un estado "medio
// borrado" imposible de iniciar sesión pero con rastros sueltos), recién al
// final se borra la cuenta de auth.
export async function eliminarPersona(usuarioId: string): Promise<void> {
  const verificacion = await verificarPersonaEliminable(usuarioId);
  if (!verificacion.eliminable) throw new Error(verificacion.motivo);

  const admin = supabaseMalgesto();

  const { error: errorPlazas } = await admin.from("persona_plazas").delete().eq("persona_id", usuarioId);
  if (errorPlazas) throw new Error(errorPlazas.message);

  // dispositivos -> seteos cascadea por FK (dispositivo_id ON DELETE CASCADE).
  const { error: errorDispositivos } = await admin.from("dispositivos").delete().eq("usuario_id", usuarioId);
  if (errorDispositivos) throw new Error(errorDispositivos.message);

  const { error: errorMiembros } = await admin.from("miembros_banda").delete().eq("usuario_id", usuarioId);
  if (errorMiembros) throw new Error(errorMiembros.message);

  const { error: errorIgnorados } = await admin.from("accesos_ignorados").delete().eq("usuario_id", usuarioId);
  if (errorIgnorados) throw new Error(errorIgnorados.message);

  const { error: errorPersona } = await admin.from("personas").delete().eq("usuario_id", usuarioId);
  if (errorPersona) throw new Error(errorPersona.message);

  const { error: errorAuth } = await admin.auth.admin.deleteUser(usuarioId);
  if (errorAuth) throw new Error(errorAuth.message);
}
