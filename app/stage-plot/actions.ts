"use server";

import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearItem, moverItem, actualizarEtiquetaItem, eliminarItem, obtenerTipoItem, type StagePlotItem } from "@/lib/stagePlotData";
import { tieneEtiquetaEditable, type TipoItem } from "@/lib/stagePlotCatalogo";

// Mismo criterio que Canciones (requerirAccesoBloque: bloque activo +
// administrador/superadmin) — el stage plot es una plantilla única
// compartida por toda la banda, no algo personal como los dispositivos de
// Seteos, así que no cualquier miembro debería poder reordenarlo.
// Brief "Rediseño de Stage Plot — Entrega 1" §1: `plazaId` reemplaza a
// `etiqueta` en la creación -- ya no se captura texto libre al soltar
// (nunca se capturó de verdad, la paleta vieja siempre mandaba null acá
// también). Brief "Stage Plot — Entrega 2" §4: `dispositivoId` se suma para
// amplificador -- musico/mic/teclado/pedalera necesitan una plaza real,
// amplificador necesita un dispositivo real, el resto no lleva ninguno
// (crearItem valida esto server-side, no confía en lo que mande el
// cliente).
// Brief "Stage Plot — ajustes visuales" §11: `etiqueta` se suma para las
// variantes Side Fill L/R de la paleta -- precargan "L"/"R" al crear el
// ítem (editable después igual que cualquier etiqueta de escenario).
// crearItem ya ignora este valor para tipos con plaza/dispositivo, así que
// no hace falta un guard extra acá.
export async function crearItemAction(
  bandaId: string,
  stagePlotId: string,
  tipo: TipoItem,
  plazaId: string | null,
  dispositivoId: string | null,
  etiqueta: string | null,
  posX: number,
  posY: number
): Promise<StagePlotItem> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  const item = await crearItem(bandaId, stagePlotId, tipo, plazaId, dispositivoId, etiqueta, posX, posY);
  revalidatePath("/stage-plot");
  return item;
}

export async function moverItemAction(bandaId: string, itemId: string, posX: number, posY: number): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await moverItem(itemId, posX, posY);
  revalidatePath("/stage-plot");
}

// Brief §3: la etiqueta editable es solo para mix/side_fill/di/power/riser
// -- el resto resuelve su identidad desde una plaza o dispositivo real,
// nunca texto libre (ver tieneEtiquetaEditable en stagePlotCatalogo.ts). El
// cliente ya no muestra el campo para esos tipos, pero un server action es
// un endpoint como cualquier otro, así que se revalida acá también.
export async function actualizarEtiquetaItemAction(bandaId: string, itemId: string, etiqueta: string | null): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  const tipo = await obtenerTipoItem(itemId);
  if (tipo && !tieneEtiquetaEditable(tipo)) {
    throw new Error("Este ícono no lleva una etiqueta propia -- su nombre sale de la plaza o dispositivo asignado.");
  }
  await actualizarEtiquetaItem(itemId, etiqueta);
  revalidatePath("/stage-plot");
}

export async function eliminarItemAction(bandaId: string, itemId: string): Promise<void> {
  await requerirAccesoBloque(bandaId, "stage_plot");
  await eliminarItem(itemId);
  revalidatePath("/stage-plot");
}
