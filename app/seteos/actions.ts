"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import {
  crearDispositivo,
  crearSeteo,
  actualizarSeteo,
  type Control,
  type TipoControl,
  type ActualizarSeteoInput,
} from "@/lib/dispositivosData";

async function usuarioActualId(): Promise<string> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");
  return user.id;
}

export async function crearDispositivoAction(
  bandaId: string,
  nombre: string,
  tipoControl: TipoControl,
  controles: Control[]
) {
  await requerirMembresia(bandaId);
  const usuarioId = await usuarioActualId();
  const dispositivoId = await crearDispositivo({ bandaId, usuarioId, nombre, tipoControl, controles });
  revalidatePath("/seteos");
  redirect(`/seteos/${dispositivoId}`);
}

export async function crearSeteoAction(dispositivoId: string, bandaId: string, controles: Control[]): Promise<string> {
  await requerirMembresia(bandaId);
  const valoresDefault = Object.fromEntries(controles.map((c) => [c.id, c.valorDefault]));
  const seteoId = await crearSeteo(dispositivoId, "Nuevo seteo", valoresDefault);
  revalidatePath(`/seteos/${dispositivoId}`);
  revalidatePath("/seteos");
  return seteoId;
}

export async function actualizarSeteoAction(
  seteoId: string,
  dispositivoId: string,
  bandaId: string,
  input: ActualizarSeteoInput
) {
  await requerirMembresia(bandaId);
  await actualizarSeteo(seteoId, dispositivoId, input);
  revalidatePath(`/seteos/${dispositivoId}`);
  revalidatePath("/seteos");
}
