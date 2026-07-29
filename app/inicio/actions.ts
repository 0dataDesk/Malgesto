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

async function requerirMembresia(bandaId: string) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const esMiembro = membresias.some((m) => m.bandaId === bandaId);
  if (!esMiembro) throw new Error("No pertenecés a esa banda.");
}

// Para giras multi-banda (Brief 9 §18): el usuario debe pertenecer a TODAS
// las bandas seleccionadas, no solo a la primaria.
async function requerirMembresiaEnTodas(bandaIds: string[]) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  const membresias = await obtenerMembresias(user.id);
  const misBandaIds = new Set(membresias.map((m) => m.bandaId));
  const faltante = bandaIds.find((id) => !misBandaIds.has(id));
  if (faltante) throw new Error("No pertenecés a una de las bandas seleccionadas.");
}

export async function crearEventoAction(input: NuevoEventoInput) {
  if (input.tipo === "gira" && input.bandaIds && input.bandaIds.length > 0) {
    await requerirMembresiaEnTodas(input.bandaIds);
  } else {
    await requerirMembresia(input.bandaId);
  }
  await crearEvento(input);
  revalidatePath("/inicio");
}

export async function actualizarEventoAction(eventoId: string, input: NuevoEventoInput) {
  if (input.tipo === "gira" && input.bandaIds && input.bandaIds.length > 0) {
    await requerirMembresiaEnTodas(input.bandaIds);
  } else {
    await requerirMembresia(input.bandaId);
  }
  await actualizarEvento(eventoId, input);
  revalidatePath("/inicio");
}

export async function eliminarEventoAction(eventoId: string, bandaId: string) {
  await requerirMembresia(bandaId);
  await eliminarEvento(eventoId);
  revalidatePath("/inicio");
}

export async function asignarGiraAction(eventoId: string, bandaId: string, giraId: string | null) {
  await requerirMembresia(bandaId);
  await asignarGiraEvento(eventoId, giraId);
  revalidatePath("/inicio");
}

export async function asignarSetlistAction(eventoId: string, bandaId: string, setlistId: string | null) {
  await requerirMembresia(bandaId);
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
  await requerirMembresiaEnTodas(bandaIds);
  const gira = await crearGira(bandaIds, nombre, desde, hasta, pais, ciudades);
  revalidatePath("/inicio");
  return gira;
}
