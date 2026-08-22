import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, bloqueVisible, type NombreBloque } from "@/lib/malgestoEventos";

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

// Brief 21 §4, revisado en "Nuevo nivel de rol: Miembro administrador":
// valida banda activa + regla de visibilidad efectiva del bloque (igual que
// antes), y además exige rol administrador o superadmin en esa banda — un
// miembro de solo consulta ya no puede crear/editar contenido en ningún
// bloque, solo mirarlo. (Antes cualquier miembro activo con el bloque
// visible podía escribir acá — Brief 21 §3 — ese criterio se revirtió a
// pedido explícito.)
export async function requerirAccesoBloque(bandaId: string, bloque: NombreBloque): Promise<string> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const membresia = membresias.find((m) => m.bandaId === bandaId);
  if (!membresia) throw new Error("No pertenecés a esa banda.");

  const superadmin = esSuperadminDeMembresias(membresias);
  if (!bloqueVisible(membresia, bloque, superadmin)) throw new Error("No tenés acceso a ese bloque.");
  if (membresia.rol !== "administrador" && membresia.rol !== "superadmin") {
    throw new Error("Necesitás ser administrador o superadmin para crear o editar acá.");
  }

  return user.id;
}

// Brief "Presskit: el botón 'Editar' también para admin de banda": variante
// de requerirAccesoBloque para módulos (hoy solo Presskit) donde el gate
// anterior era requerirSuperadmin -- global, sin exigir membresía en la
// banda puntual. requerirAccesoBloque por sí sola SÍ exige esa membresía
// (busca la fila de esta banda incluso para superadmin), lo que angostaría
// la garantía de "superadmin edita cualquier banda" apenas una banda no
// tenga de alta a ese superadmin puntual -- caso de hoy no se da (crearBanda
// siempre agrega como miembro a quien la crea), pero no hace falta
// arriesgarlo: acá el superadmin corta camino ANTES de esa búsqueda, igual
// que requerirSuperadmin, y el resto (administrador de esa banda puntual)
// delega en requerirAccesoBloque sin duplicar su lógica.
export async function requerirAdminDeBandaOSuperadmin(bandaId: string, bloque: NombreBloque): Promise<string> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  if (esSuperadminDeMembresias(membresias)) return user.id;

  return requerirAccesoBloque(bandaId, bloque);
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
    .select("id, banda_id, rol, plaza_id, bloques_visibles, nombre_mostrar_propuesto")
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
      bloques_visibles: inv.bloques_visibles,
    }))
  );

  // Brief "Rediseño de Gestión > Integrantes" §2: la plaza reservada al
  // invitar se confirma acá. Sin transacción real -- este cliente no expone
  // RPC/transacciones y el resto de esta capa (ver eliminarPersona más abajo)
  // ya asume llamadas secuenciales -- así que si la plaza puntual quedó
  // ocupada en el medio por una asignación DIRECTA a otra persona desde
  // "editar integrante" (el único camino que la reserva de invitaciones no
  // cubre: el índice único parcial solo protege invitación contra invitación,
  // no invitación contra asignación directa), el insert cae en 23505 acá y se
  // ignora esa plaza puntual en vez de bloquear la aceptación entera -- la
  // persona igual entra a la banda, solo queda sin ese instrumento asignado.
  for (const inv of invitacionesPendientes) {
    if (!inv.plaza_id) continue;
    const { error } = await admin.from("persona_plazas").insert({ persona_id: usuarioId, plaza_id: inv.plaza_id });
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  // Brief §2 punto 3: si la persona ya tiene nombre_mostrar (por ejemplo, ya
  // existía en el sistema por otra banda) no se pisa -- se usa el propuesto
  // solo para completar un nombre vacío.
  const nombrePropuesto = invitacionesPendientes.find((inv) => inv.nombre_mostrar_propuesto?.trim())?.nombre_mostrar_propuesto ?? null;
  if (nombrePropuesto) {
    const { data: personaExistente } = await admin.from("personas").select("nombre_mostrar").eq("usuario_id", usuarioId).maybeSingle();
    if (!personaExistente?.nombre_mostrar) {
      await admin.from("personas").upsert({ usuario_id: usuarioId, nombre_mostrar: nombrePropuesto }, { onConflict: "usuario_id" });
    }
  }

  await admin
    .from("invitaciones")
    .update({ estado: "aceptada" })
    .in(
      "id",
      invitacionesPendientes.map((inv) => inv.id)
    );

  return "inicio";
}
