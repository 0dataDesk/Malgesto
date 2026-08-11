"use server";

import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearItem, moverItem, actualizarEtiquetaItem, eliminarItem, obtenerTipoItem, type StagePlotItem } from "@/lib/stagePlotData";
import type { TipoItem } from "@/lib/stagePlotCatalogo";

// Mismo criterio que Canciones (requerirAccesoBloque: bloque activo +
// administrador/superadmin) — el stage plot es una plantilla única
// compartida por toda la banda, no algo personal como los dispositivos de
// Seteos, así que no cualquier miembro debería poder reordenarlo.
// Brief "Rediseño de Stage Plot — Entrega 1" §1: `plazaId` reemplaza a
// `etiqueta` en la creación -- ya no se captura texto libre al soltar
// (nunca se capturó de verdad, la paleta vieja siempre mandaba null acá
// también); musico/mic necesitan una plaza real, el resto no lleva ninguna
// (crearItem valida esto server-side, no confía en lo que mande el
// cliente).
export async function crearItemAction(
  bandaId: string,
  stagePlotId: string,
  tipo: TipoItem,
  plazaId: string | null,
  posX: number,
  posY: number
): Promise<StagePlotItem> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  const item = await crearItem(stagePlotId, tipo, plazaId, null, posX, posY);
  revalidatePath("/stage-plot");
  return item;
}

export async function moverItemAction(bandaId: string, itemId: string, posX: number, posY: number): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await moverItem(itemId, posX, posY);
  revalidatePath("/stage-plot");
}

// Brief §3: la etiqueta editable es solo para monitor/di/power/riser --
// musico/mic la resuelven desde la plaza, nunca texto libre. El cliente ya
// no muestra el campo para esos tipos, pero un server action es un
// endpoint como cualquier otro, así que se revalida acá también.
export async function actualizarEtiquetaItemAction(bandaId: string, itemId: string, etiqueta: string | null): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  const tipo = await obtenerTipoItem(itemId);
  if (tipo === "musico" || tipo === "mic") {
    throw new Error("Este ícono no lleva una etiqueta propia -- su nombre sale de la plaza asignada.");
  }
  await actualizarEtiquetaItem(itemId, etiqueta);
  revalidatePath("/stage-plot");
}

export async function eliminarItemAction(bandaId: string, itemId: string): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await eliminarItem(itemId);
  revalidatePath("/stage-plot");
}
