"use server";

import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { agregarVersion, crearConexion, crearIdea, crearLetra, guardarIdea, guardarLetra, guardarRespuesta } from "@/lib/liricoData";

// Lírico cuelga del bloque Canciones: mismo permiso que Musical (administrador o superadmin de la banda).
// Devuelve un resultado como dato: en producción el texto de un error lanzado desde el servidor no llega a la pantalla.
export type Resultado = { ok: true; id?: string } | { ok: false; mensaje: string };

async function ejecutar(bandaId: string, f: () => Promise<string | void>): Promise<Resultado> {
  try {
    await requerirAccesoBloque(bandaId, "canciones");
    const id = await f();
    revalidatePath("/lirico");
    return id ? { ok: true, id } : { ok: true };
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

export async function crearIdeaAction(bandaId: string, titulo: string, texto: string): Promise<Resultado> {
  return ejecutar(bandaId, () => crearIdea(bandaId, titulo, texto));
}
export async function guardarIdeaAction(bandaId: string, ideaId: string, campos: { titulo?: string; texto?: string; estado?: string }): Promise<Resultado> {
  return ejecutar(bandaId, () => guardarIdea(bandaId, ideaId, campos));
}
export async function crearLetraAction(bandaId: string, ideaId: string, titulo: string, objetivo: string): Promise<Resultado> {
  return ejecutar(bandaId, () => crearLetra(bandaId, ideaId, titulo, objetivo));
}
export async function guardarLetraAction(bandaId: string, letraId: string, campos: { objetivo?: string; premisa?: string; angulo?: string; planoLiteral?: string; planoFigurado?: string; estado?: string }): Promise<Resultado> {
  return ejecutar(bandaId, () => guardarLetra(bandaId, letraId, campos));
}
export async function agregarVersionAction(bandaId: string, letraId: string, texto: string, nota: string): Promise<Resultado> {
  return ejecutar(bandaId, () => agregarVersion(bandaId, letraId, texto, nota));
}
export async function guardarRespuestaAction(bandaId: string, ejercicioId: string, respuesta: string, resultado: string): Promise<Resultado> {
  return ejecutar(bandaId, () => guardarRespuesta(bandaId, ejercicioId, respuesta, resultado));
}
export async function crearConexionAction(bandaId: string, ideaId: string, otraId: string, motivo: string): Promise<Resultado> {
  return ejecutar(bandaId, () => crearConexion(bandaId, ideaId, otraId, motivo));
}
