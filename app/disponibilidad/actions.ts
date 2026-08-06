"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { crearIncidencia, eliminarIncidencia, type Ausencia } from "@/lib/ausenciasData";

async function usuarioActualId(): Promise<string> {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");
  return user.id;
}

// Brief "Disponibilidad de integrantes" §1: cualquier integrante (sin
// importar rol) puede marcar sus propias fechas -- sin requerirMembresia ni
// chequeo de rol/bloque, esto no es específico de una banda. La única
// validación es la fecha en sí.
export async function crearIncidenciaAction(fechaInicio: string, fechaFin: string): Promise<Ausencia> {
  const usuarioId = await usuarioActualId();
  if (!fechaInicio || !fechaFin) throw new Error("Completá las dos fechas.");
  if (fechaFin < fechaInicio) throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
  const incidencia = await crearIncidencia(usuarioId, fechaInicio, fechaFin);
  revalidatePath("/inicio");
  return incidencia;
}

export async function eliminarIncidenciaAction(incidenciaId: string): Promise<void> {
  const usuarioId = await usuarioActualId();
  await eliminarIncidencia(usuarioId, incidenciaId);
  revalidatePath("/inicio");
}
