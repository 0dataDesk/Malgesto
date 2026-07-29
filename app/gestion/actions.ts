"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import { crearBanda, invitarPersona, ignorarPersonaPendiente, type ResultadoInvitacion } from "@/lib/gestionData";

export async function crearBandaAction(nombre: string): Promise<string> {
  const usuarioId = await requerirSuperadmin();
  const bandaId = await crearBanda(nombre, usuarioId);
  revalidatePath("/gestion");
  return bandaId;
}

export async function invitarPersonaAction(email: string, bandaId: string, rol: string): Promise<ResultadoInvitacion> {
  await requerirSuperadmin();
  const resultado = await invitarPersona(email, bandaId, rol);
  revalidatePath("/gestion");
  return resultado;
}

export async function ignorarPersonaPendienteAction(usuarioId: string): Promise<void> {
  await requerirSuperadmin();
  await ignorarPersonaPendiente(usuarioId);
  revalidatePath("/gestion");
}
