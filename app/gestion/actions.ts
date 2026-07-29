"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import {
  crearBanda,
  actualizarBanda,
  invitarPersona,
  ignorarPersonaPendiente,
  actualizarNombreMostrar,
  removerDeBanda,
  asignarABanda,
  actualizarInstrumentos,
  type ResultadoInvitacion,
  type ActualizacionBanda,
} from "@/lib/gestionData";
import { obtenerCuartosEnsayo, crearCuartoEnsayo, actualizarCuartoEnsayo, eliminarCuartoEnsayo } from "@/lib/cuartosEnsayoData";

export async function crearBandaAction(nombre: string): Promise<string> {
  const usuarioId = await requerirSuperadmin();
  const bandaId = await crearBanda(nombre, usuarioId);
  revalidatePath("/gestion");
  return bandaId;
}

export async function actualizarBandaAction(bandaId: string, cambios: ActualizacionBanda): Promise<void> {
  await requerirSuperadmin();
  await actualizarBanda(bandaId, cambios);
  revalidatePath("/gestion");
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

export async function actualizarNombreMostrarAction(usuarioId: string, nombreMostrar: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarNombreMostrar(usuarioId, nombreMostrar);
  revalidatePath("/gestion");
}

export async function removerDeBandaAction(usuarioId: string, bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await removerDeBanda(usuarioId, bandaId);
  revalidatePath("/gestion");
}

export async function asignarABandaAction(usuarioId: string, bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await asignarABanda(usuarioId, bandaId);
  revalidatePath("/gestion");
}

export async function actualizarInstrumentosAction(usuarioId: string, bandaId: string, instrumentos: string[]): Promise<void> {
  await requerirSuperadmin();
  await actualizarInstrumentos(usuarioId, bandaId, instrumentos);
  revalidatePath("/gestion");
}

export async function crearCuartoEnsayoAction(bandaId: string, nombre: string, linkMaps: string) {
  await requerirSuperadmin();
  const cuarto = await crearCuartoEnsayo(bandaId, nombre, linkMaps);
  revalidatePath("/gestion");
  return cuarto;
}

export async function actualizarCuartoEnsayoAction(id: string, nombre: string, linkMaps: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarCuartoEnsayo(id, nombre, linkMaps);
  revalidatePath("/gestion");
}

export async function eliminarCuartoEnsayoAction(id: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarCuartoEnsayo(id);
  revalidatePath("/gestion");
}

export async function obtenerCuartosEnsayoAction(bandaId: string) {
  await requerirSuperadmin();
  return obtenerCuartosEnsayo([bandaId]);
}
