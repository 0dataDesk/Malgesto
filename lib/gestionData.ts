import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type BandaSimple = {
  id: string;
  nombre: string;
  genero: string | null;
  archivada: boolean;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
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
    .select("id, nombre, genero, archivada, canciones_habilitado, setlist_habilitado, seteos_habilitado")
    .order("nombre", { ascending: true });
  return (data ?? []).map((b) => ({
    id: b.id,
    nombre: b.nombre,
    genero: b.genero,
    archivada: b.archivada,
    cancionesHabilitado: b.canciones_habilitado,
    setlistHabilitado: b.setlist_habilitado,
    seteosHabilitado: b.seteos_habilitado,
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
  genero: string | null;
  cancionesHabilitado: boolean;
  setlistHabilitado: boolean;
  seteosHabilitado: boolean;
};

export async function actualizarBanda(bandaId: string, cambios: ActualizacionBanda): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("bandas")
    .update({
      nombre: cambios.nombre,
      genero: cambios.genero,
      canciones_habilitado: cambios.cancionesHabilitado,
      setlist_habilitado: cambios.setlistHabilitado,
      seteos_habilitado: cambios.seteosHabilitado,
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

export async function crearPlaza(bandaId: string, instrumento: string, etiqueta: string | null): Promise<Plaza> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("plazas")
    .insert({ banda_id: bandaId, instrumento, etiqueta })
    .select("id, banda_id, instrumento, etiqueta")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo crear la plaza.");
  return { id: data.id, bandaId: data.banda_id, instrumento: data.instrumento, etiqueta: data.etiqueta };
}

export async function eliminarPlaza(plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("plazas").delete().eq("id", plazaId);
  if (error) throw new Error(error.message);
}

export async function asignarPersonaAPlaza(usuarioId: string, plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("persona_plazas").upsert({ persona_id: usuarioId, plaza_id: plazaId }, { onConflict: "persona_id,plaza_id" });
  if (error) throw new Error(error.message);
}

export async function quitarPersonaDePlaza(usuarioId: string, plazaId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("persona_plazas").delete().eq("persona_id", usuarioId).eq("plaza_id", plazaId);
  if (error) throw new Error(error.message);
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

// Invitar/asignar (Brief 9 §10-11): multi-banda de una, siempre rol
// "miembro" (superadmin ya no se otorga desde acá — ver establecerSuperadmin).
export async function invitarPersona(email: string, bandaIds: string[]): Promise<ResultadoInvitacion> {
  const admin = supabaseMalgesto();
  const emailNormalizado = email.trim().toLowerCase();

  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const usuarioExistente = authData?.users.find((u) => u.email?.toLowerCase() === emailNormalizado);

  const errores: string[] = [];
  let algunaOk = false;

  for (const bandaId of bandaIds) {
    if (usuarioExistente) {
      const { data: yaMiembro } = await admin
        .from("miembros_banda")
        .select("id")
        .eq("usuario_id", usuarioExistente.id)
        .eq("banda_id", bandaId)
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
      .eq("banda_id", bandaId)
      .eq("estado", "pendiente")
      .limit(1);
    if (invitacionExistente && invitacionExistente.length > 0) {
      errores.push("ya hay una invitación pendiente en una de las bandas seleccionadas");
      continue;
    }

    const { error } = await admin.from("invitaciones").insert({ email: emailNormalizado, banda_id: bandaId, rol: "miembro", estado: "pendiente" });
    if (error) {
      errores.push(error.message);
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

// Cede/retira superadmin (Brief 9 §11) — acción aparte y deliberada sobre un
// integrante ya existente, nunca desde el flujo rápido de invitar. rol es
// binario "es superadmin en esta consola" replicado en cada fila activa (ver
// comentario de esSuperadmin), así que se aplica parejo a todas.
export async function establecerSuperadmin(usuarioId: string, activar: boolean): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("miembros_banda")
    .update({ rol: activar ? "superadmin" : "miembro" })
    .eq("usuario_id", usuarioId)
    .eq("activo", true);
  if (error) throw new Error(error.message);
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

export type BandaDeIntegrante = {
  bandaId: string;
  bandaNombre: string;
  activo: boolean;
  plazas: PlazaAsignada[];
};

export type Integrante = {
  usuarioId: string | null;
  email: string;
  nombreMostrar: string | null;
  fechaNacimiento: string | null;
  estado: EstadoIntegrante;
  esSuperadmin: boolean;
  bandas: BandaDeIntegrante[];
};

export async function obtenerIntegrantes(): Promise<Integrante[]> {
  const admin = supabaseMalgesto();
  const [{ data: bandas }, { data: miembros }, { data: invitacionesPendientes }, { data: authData }, { data: personas }, { data: personaPlazas }] =
    await Promise.all([
      admin.from("bandas").select("id, nombre"),
      admin.from("miembros_banda").select("usuario_id, banda_id, rol, activo"),
      admin.from("invitaciones").select("email").eq("estado", "pendiente"),
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("personas").select("usuario_id, nombre_mostrar, fecha_nacimiento"),
      admin.from("persona_plazas").select("persona_id, plazas(id, banda_id, instrumento, etiqueta)"),
    ]);

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
      plazas: plazasPorPersonaYBanda.get(`${m.usuario_id}:${m.banda_id}`) ?? [],
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
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
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
