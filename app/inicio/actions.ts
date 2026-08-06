"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import {
  obtenerMembresias,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  asignarGiraEvento,
  asignarSetlistEvento,
  asignarEstadoEvento,
  crearGira,
  type NuevoEventoInput,
  type Evento,
  type EstadoEvento,
} from "@/lib/malgestoEventos";
import { crearSetlist } from "@/lib/setlistsData";

// Brief 18 §3: editar/eliminar eventos (y asignarles gira/Set List) es solo
// para superadmin — crear se amplió a administrador también, ver
// requerirEscrituraEnBanda/EnTodas más abajo. El rol vive por fila de
// miembros_banda, así que chequearlo en la banda puntual de la mutación es
// correcto y no hace falta un chequeo "global" aparte.
async function requerirSuperadminEnBanda(bandaId: string) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const membresia = membresias.find((m) => m.bandaId === bandaId);
  if (!membresia) throw new Error("No pertenecés a esa banda.");
  if (membresia.rol !== "superadmin") throw new Error("Solo superadmin puede crear, editar o eliminar eventos.");
}

// Para giras multi-banda (Brief 9 §18): superadmin en TODAS las bandas
// seleccionadas, no solo la primaria.
async function requerirSuperadminEnTodas(bandaIds: string[]) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const misMembresias = new Map(membresias.map((m) => [m.bandaId, m]));
  for (const bandaId of bandaIds) {
    const membresia = misMembresias.get(bandaId);
    if (!membresia) throw new Error("No pertenecés a una de las bandas seleccionadas.");
    if (membresia.rol !== "superadmin") throw new Error("Solo superadmin puede crear, editar o eliminar eventos.");
  }
}

// Brief "Nuevo nivel de rol: Miembro administrador": a diferencia de editar/
// eliminar/asignar (que siguen siendo solo superadmin, sin cambios — ver
// requerirSuperadminEnBanda/EnTodas arriba), CREAR un evento nuevo (show,
// ensayo o gira) también lo puede hacer un administrador. Deliberadamente
// dos funciones separadas en vez de agregar un parámetro a las de arriba,
// para que el guard de cada action deje explícito en la firma qué nivel de
// permiso exige sin tener que leer el cuerpo.
async function requerirEscrituraEnBanda(bandaId: string) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const membresia = membresias.find((m) => m.bandaId === bandaId);
  if (!membresia) throw new Error("No pertenecés a esa banda.");
  if (membresia.rol !== "superadmin" && membresia.rol !== "administrador") {
    throw new Error("Necesitás ser administrador o superadmin para crear eventos.");
  }
}

async function requerirEscrituraEnTodas(bandaIds: string[]) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const misMembresias = new Map(membresias.map((m) => [m.bandaId, m]));
  for (const bandaId of bandaIds) {
    const membresia = misMembresias.get(bandaId);
    if (!membresia) throw new Error("No pertenecés a una de las bandas seleccionadas.");
    if (membresia.rol !== "superadmin" && membresia.rol !== "administrador") {
      throw new Error("Necesitás ser administrador o superadmin para crear eventos.");
    }
  }
}

export async function crearEventoAction(input: NuevoEventoInput) {
  if (input.tipo === "gira" && input.bandaIds && input.bandaIds.length > 0) {
    await requerirEscrituraEnTodas(input.bandaIds);
  } else {
    await requerirEscrituraEnBanda(input.bandaId);
  }
  await crearEvento(input);
  revalidatePath("/inicio");
}

export async function actualizarEventoAction(eventoId: string, input: NuevoEventoInput) {
  if (input.tipo === "gira" && input.bandaIds && input.bandaIds.length > 0) {
    await requerirSuperadminEnTodas(input.bandaIds);
  } else {
    await requerirSuperadminEnBanda(input.bandaId);
  }
  await actualizarEvento(eventoId, input);
  revalidatePath("/inicio");
}

export async function eliminarEventoAction(eventoId: string, bandaId: string) {
  await requerirSuperadminEnBanda(bandaId);
  await eliminarEvento(eventoId);
  revalidatePath("/inicio");
}

export async function asignarGiraAction(eventoId: string, bandaId: string, giraId: string | null) {
  await requerirSuperadminEnBanda(bandaId);
  await asignarGiraEvento(eventoId, giraId);
  revalidatePath("/inicio");
}

export async function asignarSetlistAction(eventoId: string, bandaId: string, setlistId: string | null) {
  await requerirSuperadminEnBanda(bandaId);
  await asignarSetlistEvento(eventoId, setlistId);
  revalidatePath("/inicio");
}

// Brief "Crear Set List desde un evento": atajo desde el detalle de un Show o
// Ensayo — crea el Set List (banda heredada del evento, sin volver a
// preguntar) y lo asigna en el mismo paso, usando el mismo mecanismo de
// asignación de arriba (asignarSetlistEvento), sin pasar por el form de
// edición completo. El Set List resultante no es especial: queda igual que
// cualquier otro, visible en /set-list y reasignable desde ahí.
export async function crearSetlistDesdeEventoAction(eventoId: string, bandaId: string, nombre: string) {
  await requerirSuperadminEnBanda(bandaId);
  const nombreFinal = nombre.trim() || "Set sin nombre";
  const setlistId = await crearSetlist(bandaId, nombreFinal);
  await asignarSetlistEvento(eventoId, setlistId);
  revalidatePath("/inicio");
  revalidatePath("/set-list");
  return { id: setlistId, nombre: nombreFinal };
}

export async function asignarEstadoAction(eventoId: string, bandaId: string, estado: EstadoEvento) {
  await requerirSuperadminEnBanda(bandaId);
  await asignarEstadoEvento(eventoId, estado);
  revalidatePath("/inicio");
}

export async function crearGiraRapidaAction(
  bandaIds: string[],
  nombre: string,
  desde: string,
  hasta: string,
  pais: string | null,
  ciudades: string | null,
  estado: EstadoEvento = "confirmado"
): Promise<Evento> {
  await requerirEscrituraEnTodas(bandaIds);
  const gira = await crearGira(bandaIds, nombre, desde, hasta, pais, ciudades, estado);
  revalidatePath("/inicio");
  return gira;
}
