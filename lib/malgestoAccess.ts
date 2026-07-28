import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

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
