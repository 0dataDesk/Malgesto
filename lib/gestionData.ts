import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

export type BandaSimple = { id: string; nombre: string };

export type PersonaPendiente = {
  usuarioId: string;
  email: string;
  primerAcceso: string;
};

export type MiembroDeBanda = {
  usuarioId: string;
  email: string;
  rol: string;
};

export type BandaConMiembros = BandaSimple & { miembros: MiembroDeBanda[] };

export type ResultadoInvitacion = { ok: true } | { ok: false; motivo: string };

// Un superadmin lo es de forma global en esta consola — si tiene rol
// superadmin en alguna banda, administra todas (crear banda, invitar a
// cualquiera, resolver pendientes globales), no solo la suya. La pantalla
// 15 es un escritorio de gestión del sistema, no un panel por banda.
export async function esSuperadmin(usuarioId: string): Promise<boolean> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("rol", "superadmin")
    .limit(1);
  return !!data && data.length > 0;
}

export async function obtenerBandasTodas(): Promise<BandaSimple[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("bandas").select("id, nombre").order("nombre", { ascending: true });
  return data ?? [];
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

export async function invitarPersona(email: string, bandaId: string, rol: string): Promise<ResultadoInvitacion> {
  const admin = supabaseMalgesto();
  const emailNormalizado = email.trim().toLowerCase();

  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const usuarioExistente = authData?.users.find((u) => u.email?.toLowerCase() === emailNormalizado);

  if (usuarioExistente) {
    const { data: yaMiembro } = await admin
      .from("miembros_banda")
      .select("id")
      .eq("usuario_id", usuarioExistente.id)
      .eq("banda_id", bandaId)
      .limit(1);
    if (yaMiembro && yaMiembro.length > 0) {
      return { ok: false, motivo: "Esa persona ya es miembro de esta banda." };
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
    return { ok: false, motivo: "Ya hay una invitación pendiente para ese correo en esta banda." };
  }

  const { error } = await admin.from("invitaciones").insert({ email: emailNormalizado, banda_id: bandaId, rol, estado: "pendiente" });
  if (error) throw new Error(error.message);

  if (usuarioExistente) {
    const { error: errIgnorado } = await admin.from("accesos_ignorados").delete().eq("usuario_id", usuarioExistente.id);
    if (errIgnorado) throw new Error(errIgnorado.message);
  }

  return { ok: true };
}

// Pantalla 15 §5 (opcional): panorama de miembros por banda.
export async function obtenerMiembrosDeBandas(): Promise<BandaConMiembros[]> {
  const admin = supabaseMalgesto();
  const [{ data: bandas }, { data: miembros }, { data: authData }] = await Promise.all([
    admin.from("bandas").select("id, nombre").order("nombre", { ascending: true }),
    admin.from("miembros_banda").select("usuario_id, banda_id, rol"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const emailPorId = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? "(sin correo)"]));

  return (bandas ?? []).map((b) => ({
    id: b.id,
    nombre: b.nombre,
    miembros: (miembros ?? [])
      .filter((m) => m.banda_id === b.id)
      .map((m) => ({ usuarioId: m.usuario_id, email: emailPorId.get(m.usuario_id) ?? "(desconocido)", rol: m.rol })),
  }));
}
