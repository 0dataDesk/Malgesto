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
  type NuevoEventoInput,
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

export async function crearEventoAction(input: NuevoEventoInput) {
  await requerirMembresia(input.bandaId);
  await crearEvento(input);
  revalidatePath("/inicio");
}

export async function actualizarEventoAction(eventoId: string, input: NuevoEventoInput) {
  await requerirMembresia(input.bandaId);
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
