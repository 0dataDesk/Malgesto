"use server";

import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearItem, moverItem, actualizarEtiquetaItem, eliminarItem, type StagePlotItem } from "@/lib/stagePlotData";
import type { TipoItem } from "@/lib/stagePlotCatalogo";

// Mismo criterio que Canciones (requerirAccesoBloque: bloque activo +
// administrador/superadmin) — el stage plot es una plantilla única
// compartida por toda la banda, no algo personal como los dispositivos de
// Seteos, así que no cualquier miembro debería poder reordenarlo.
export async function crearItemAction(
  bandaId: string,
  stagePlotId: string,
  tipo: TipoItem,
  etiqueta: string | null,
  posX: number,
  posY: number
): Promise<StagePlotItem> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  const item = await crearItem(stagePlotId, tipo, etiqueta, posX, posY);
  revalidatePath("/stage-plot");
  return item;
}

export async function moverItemAction(bandaId: string, itemId: string, posX: number, posY: number): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await moverItem(itemId, posX, posY);
  revalidatePath("/stage-plot");
}

export async function actualizarEtiquetaItemAction(bandaId: string, itemId: string, etiqueta: string | null): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await actualizarEtiquetaItem(itemId, etiqueta);
  revalidatePath("/stage-plot");
}

export async function eliminarItemAction(bandaId: string, itemId: string): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await eliminarItem(itemId);
  revalidatePath("/stage-plot");
}
