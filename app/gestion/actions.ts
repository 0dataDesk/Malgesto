"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import {
  crearBanda,
  actualizarBanda,
  archivarBanda,
  eliminarBanda,
  crearPlaza,
  eliminarPlaza,
  asignarPersonaAPlaza,
  quitarPersonaDePlaza,
  invitarPersona,
  ignorarPersonaPendiente,
  actualizarNombreMostrar,
  actualizarFechaNacimiento,
  removerDeBanda,
  asignarABanda,
  establecerSuperadmin,
  actualizarBloquesVisibles,
  type ResultadoInvitacion,
  type ActualizacionBanda,
} from "@/lib/gestionData";
import { crearLugar, actualizarLugar, eliminarLugar } from "@/lib/lugaresData";

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

export async function archivarBandaAction(bandaId: string, archivada: boolean): Promise<void> {
  await requerirSuperadmin();
  await archivarBanda(bandaId, archivada);
  revalidatePath("/gestion");
}

export async function eliminarBandaAction(bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarBanda(bandaId);
  revalidatePath("/gestion");
}

export async function crearPlazaAction(bandaId: string, instrumento: string, etiqueta: string | null) {
  await requerirSuperadmin();
  const plaza = await crearPlaza(bandaId, instrumento, etiqueta);
  revalidatePath("/gestion");
  return plaza;
}

export async function eliminarPlazaAction(plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarPlaza(plazaId);
  revalidatePath("/gestion");
}

export async function asignarPersonaAPlazaAction(usuarioId: string, plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await asignarPersonaAPlaza(usuarioId, plazaId);
  revalidatePath("/gestion");
}

export async function quitarPersonaDePlazaAction(usuarioId: string, plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await quitarPersonaDePlaza(usuarioId, plazaId);
  revalidatePath("/gestion");
}

export async function invitarPersonaAction(email: string, bandaIds: string[]): Promise<ResultadoInvitacion> {
  await requerirSuperadmin();
  const resultado = await invitarPersona(email, bandaIds);
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

export async function actualizarFechaNacimientoAction(usuarioId: string, fecha: string | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarFechaNacimiento(usuarioId, fecha);
  revalidatePath("/gestion");
}

// Brief 10 §5: nombre para mostrar y fecha de nacimiento comparten un único
// botón "Guardar" en la ficha del integrante en vez de dos sueltos.
export async function actualizarDatosPersonaAction(usuarioId: string, nombreMostrar: string, fechaNacimiento: string | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarNombreMostrar(usuarioId, nombreMostrar);
  await actualizarFechaNacimiento(usuarioId, fechaNacimiento);
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

export async function establecerSuperadminAction(usuarioId: string, activar: boolean): Promise<void> {
  await requerirSuperadmin();
  await establecerSuperadmin(usuarioId, activar);
  revalidatePath("/gestion");
}

export async function actualizarBloquesVisiblesAction(usuarioId: string, bandaId: string, bloques: string[] | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarBloquesVisibles(usuarioId, bandaId, bloques);
  revalidatePath("/gestion");
}

export async function crearLugarAction(bandaId: string, nombre: string, linkMaps: string) {
  await requerirSuperadmin();
  const lugar = await crearLugar(bandaId, nombre, linkMaps);
  revalidatePath("/gestion");
  return lugar;
}

export async function actualizarLugarAction(id: string, nombre: string, linkMaps: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarLugar(id, nombre, linkMaps);
  revalidatePath("/gestion");
}

export async function eliminarLugarAction(id: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarLugar(id);
  revalidatePath("/gestion");
}

