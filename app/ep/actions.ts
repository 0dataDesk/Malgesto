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

// Devuelve la nueva versión; con una pantalla desactualizada (otra versión se guardó antes) no pisa nada y lo avisa.
// El resultado va como dato porque en producción el texto de un error lanzado desde el servidor no llega a la pantalla.
export async function guardarMapaAction(bandaId: string, proyectoId: string, proyecto: unknown, version: string): Promise<{ ok: true; version: string } | { ok: false; desactualizado: boolean; mensaje: string }> {
  await requerirAccesoBloque(bandaId, "canciones");
  try {
    return { ok: true, version: await guardarProyecto(bandaId, proyectoId, proyecto, version) };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se pudo guardar.";
    return { ok: false, desactualizado: mensaje === "DESACTUALIZADO", mensaje: mensaje === "DESACTUALIZADO" ? "Pantalla desactualizada" : mensaje };
  }
}

export async function eliminarProyectoAction(bandaId: string, proyectoId: string) {
  await requerirAccesoBloque(bandaId, "canciones");
  await eliminarProyecto(bandaId, proyectoId);
  revalidatePath("/ep");
  redirect(`/ep?banda=${bandaId}`);
}
