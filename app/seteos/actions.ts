"use server";

import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import {
  crearSeteoParaCancion,
  crearSeteoGeneralConDefaults,
  actualizarValoresSeteo,
  actualizarHabilitadoDispositivo,
  type ControlDiseno,
  type Seteo,
} from "@/lib/dispositivosData";

export async function crearSeteoParaCancionAction(
  dispositivoId: string,
  bandaId: string,
  cancionId: string,
  instrumentoPropioId: string | null,
  controles: ControlDiseno[]
): Promise<Seteo> {
  await requerirMembresia(bandaId);
  const seteo = await crearSeteoParaCancion(dispositivoId, cancionId, instrumentoPropioId, controles);
  revalidatePath("/seteos");
  return seteo;
}

// Brief "Instrumentos propios + selector de instrumento activo en Seteos"
// §2: a diferencia del general "de siempre" (instrumento null, creado eager
// en el server component de la página), el general de un instrumento puntual
// se crea on-demand desde el cliente al activarlo — mismo criterio que ya
// usaba crearSeteoParaCancionAction para canciones.
export async function crearSeteoGeneralAction(
  dispositivoId: string,
  bandaId: string,
  instrumentoPropioId: string | null,
  controles: ControlDiseno[]
): Promise<Seteo> {
  await requerirMembresia(bandaId);
  const seteo = await crearSeteoGeneralConDefaults(dispositivoId, controles, instrumentoPropioId);
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
