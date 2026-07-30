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
  crearGira,
  type NuevoEventoInput,
  type Evento,
} from "@/lib/malgestoEventos";

// Brief 18 §3: crear/editar/eliminar eventos (y asignarles gira/Set List) es
// solo para superadmin — los miembros mantienen lectura completa del
// calendario pero su interacción de escritura es en Canciones. El rol vive
// por fila de miembros_banda (establecerSuperadmin lo aplica parejo a todas
// las bandas activas de la persona, ver lib/gestionData.ts), así que
// chequear el rol en la banda puntual de la mutación es correcto y no hace
// falta un chequeo "global" aparte.
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

export async function crearEventoAction(input: NuevoEventoInput) {
  if (input.tipo === "gira" && input.bandaIds && input.bandaIds.length > 0) {
    await requerirSuperadminEnTodas(input.bandaIds);
  } else {
    await requerirSuperadminEnBanda(input.bandaId);
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

export async function crearGiraRapidaAction(
  bandaIds: string[],
  nombre: string,
  desde: string,
  hasta: string,
  pais: string | null,
  ciudades: string | null
): Promise<Evento> {
  await requerirSuperadminEnTodas(bandaIds);
  const gira = await crearGira(bandaIds, nombre, desde, hasta, pais, ciudades);
  revalidatePath("/inicio");
  return gira;
}
