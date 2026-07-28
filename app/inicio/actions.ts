"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, crearEvento, type NuevoEventoInput } from "@/lib/malgestoEventos";

export async function crearEventoAction(input: NuevoEventoInput) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  // El usuario solo puede crear eventos para una banda de la que es miembro.
  const membresias = await obtenerMembresias(user.id);
  const esMiembro = membresias.some((m) => m.bandaId === input.bandaId);
  if (!esMiembro) throw new Error("No pertenecés a esa banda.");

  await crearEvento(input);
  revalidatePath("/inicio");
}
