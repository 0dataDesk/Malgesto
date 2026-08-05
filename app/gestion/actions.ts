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
  type RolInvitable,
} from "@/lib/gestionData";
import { crearLugar, actualizarLugar, actualizarLugarBandas, eliminarLugar } from "@/lib/lugaresData";

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

// Brief "Nuevo nivel de rol": rol elegible desde el formulario de invitar,
// pero acotado en runtime a los 2 niveles no sensibles — el tipo RolInvitable
// ya excluye "superadmin" en compilación, pero un server action es un
// endpoint de red como cualquier otro (alguien podría llamarlo directo con
// un payload armado a mano), así que igual se valida acá.
export async function invitarPersonaAction(email: string, bandaIds: string[], rol: RolInvitable): Promise<ResultadoInvitacion> {
  await requerirSuperadmin();
  if (rol !== "miembro" && rol !== "administrador") throw new Error("Rol inválido.");
  const resultado = await invitarPersona(email, bandaIds, rol);
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

export async function crearLugarAction(bandaIds: string[], nombre: string, linkMaps: string) {
  await requerirSuperadmin();
  const lugar = await crearLugar(bandaIds, nombre, linkMaps);
  revalidatePath("/gestion");
  return lugar;
}

export async function actualizarLugarAction(id: string, nombre: string, linkMaps: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarLugar(id, nombre, linkMaps);
  revalidatePath("/gestion");
}

export async function actualizarLugarBandasAction(id: string, bandaIds: string[]): Promise<void> {
  await requerirSuperadmin();
  await actualizarLugarBandas(id, bandaIds);
  revalidatePath("/gestion");
}

export async function eliminarLugarAction(id: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarLugar(id);
  revalidatePath("/gestion");
}

