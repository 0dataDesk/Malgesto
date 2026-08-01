"use server";

import { revalidatePath } from "next/cache";
import { requerirAccesoBloque } from "@/lib/malgestoAccess";
import { crearMovimiento, type NuevoMovimientoInput } from "@/lib/finanzasData";

// Brief 21 §3: cualquier persona que ve el bloque Finanzas puede cargar
// movimientos manuales, no solo superadmin — mismo criterio que
// Canciones/Set List/Seteos (requerirAccesoBloque ya valida banda activa +
// persona no restringida).
export async function crearMovimientoAction(bandaId: string, input: NuevoMovimientoInput): Promise<void> {
  const usuarioId = await requerirAccesoBloque(bandaId, "finanzas");
  await crearMovimiento(bandaId, usuarioId, input);
  revalidatePath("/finanzas");
}
