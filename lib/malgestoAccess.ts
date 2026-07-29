import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";

// Verifica que el usuario autenticado sea miembro de la banda dada — usado
// por los server actions de cualquier módulo (Calendario, Canciones...)
// antes de mutar datos de esa banda.
export async function requerirMembresia(bandaId: string) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("banda_id", bandaId)
    .eq("activo", true)
    .limit(1);

  if (!data || data.length === 0) throw new Error("No pertenecés a esa banda.");
}

// Verifica que el usuario autenticado tenga rol superadmin en al menos una
// banda — usado por los server actions de /gestion (Brief 7). Superadmin es
// global en esta consola: alcanza con serlo de una banda para administrar
// todas.
export async function requerirSuperadmin(): Promise<string> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("rol", "superadmin")
    .eq("activo", true)
    .limit(1);

  if (!data || data.length === 0) throw new Error("No tenés permisos de superadmin.");

  return user.id;
}

// Resuelve a dónde debe ir un usuario recién autenticado: si ya es miembro
// de alguna banda pasa directo, si tiene invitación(es) pendiente(s) las
// acepta y crea la membresía, y si no hay nada queda sin acceso (registrado
// en auth.users, consultable en Brief 7).
export async function resolverAccesoUsuario(usuarioId: string, email: string): Promise<"inicio" | "sin-acceso"> {
  const admin = supabaseMalgesto();

  const { data: yaMiembro } = await admin
    .from("miembros_banda")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("activo", true)
    .limit(1);

  if (yaMiembro && yaMiembro.length > 0) {
    return "inicio";
  }

  const { data: invitacionesPendientes } = await admin
    .from("invitaciones")
    .select("id, banda_id, rol")
    .eq("email", email)
    .eq("estado", "pendiente");

  if (!invitacionesPendientes || invitacionesPendientes.length === 0) {
    return "sin-acceso";
  }

  await admin.from("miembros_banda").insert(
    invitacionesPendientes.map((inv) => ({
      usuario_id: usuarioId,
      banda_id: inv.banda_id,
      rol: inv.rol,
    }))
  );

  await admin
    .from("invitaciones")
    .update({ estado: "aceptada" })
    .in(
      "id",
      invitacionesPendientes.map((inv) => inv.id)
    );

  return "inicio";
}
