"use server";

import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import {
  crearSeteoParaCancion,
  actualizarValoresSeteo,
  actualizarHabilitadoDispositivo,
  type ControlDiseno,
  type Seteo,
} from "@/lib/dispositivosData";

export async function crearSeteoParaCancionAction(
  dispositivoId: string,
  bandaId: string,
  cancionId: string,
  controles: ControlDiseno[]
): Promise<Seteo> {
  await requerirMembresia(bandaId);
  const seteo = await crearSeteoParaCancion(dispositivoId, cancionId, controles);
  revalidatePath("/seteos");
  return seteo;
}

export async function actualizarValoresSeteoAction(
  seteoId: string,
  dispositivoId: string,
  bandaId: string,
  valores: Record<string, number>
): Promise<void> {
  await requerirMembresia(bandaId);
  await actualizarValoresSeteo(seteoId, valores);
  revalidatePath("/seteos");
}

export async function actualizarHabilitadoDispositivoAction(dispositivoId: string, bandaId: string, habilitado: boolean): Promise<void> {
  await requerirMembresia(bandaId);
  await actualizarHabilitadoDispositivo(dispositivoId, habilitado);
  revalidatePath("/seteos");
}
