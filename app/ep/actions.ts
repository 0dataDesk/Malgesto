"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearProyecto, guardarProyecto, eliminarProyecto } from "@/lib/epData";

// El mapa del EP cuelga del bloque Canciones: mismo permiso (administrador o superadmin de la banda).
export async function crearProyectoAction(bandaId: string, nombre: string, tipo: "ep" | "album") {
  await requerirAccesoBloque(bandaId, "canciones");
  const id = await crearProyecto(bandaId, nombre, tipo === "album" ? "album" : "ep");
  revalidatePath("/ep");
  redirect(`/ep?banda=${bandaId}&proyecto=${id}`);
}

export async function guardarMapaAction(bandaId: string, proyectoId: string, proyecto: unknown) {
  await requerirAccesoBloque(bandaId, "canciones");
  await guardarProyecto(bandaId, proyectoId, proyecto);
}

export async function eliminarProyectoAction(bandaId: string, proyectoId: string) {
  await requerirAccesoBloque(bandaId, "canciones");
  await eliminarProyecto(bandaId, proyectoId);
  revalidatePath("/ep");
  redirect(`/ep?banda=${bandaId}`);
}
