"use server";

import { revalidatePath } from "next/cache";
import { requerirMembresia } from "@/lib/malgestoAccess";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import {
  crearSeteoParaCancion,
  actualizarValoresSeteo,
  actualizarHabilitadoDispositivo,
  agregarInstrumentoEnCadena,
  quitarInstrumentoEnCadena,
  ocultarCancionEnSeteos,
  mostrarCancionEnSeteos,
  type ControlDiseno,
  type Seteo,
  type InstrumentoEnCadena,
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

// Brief "Instrumento como bloque agregable...": a diferencia de las acciones
// de arriba (que actúan sobre un dispositivo ya asignado, sin necesitar el
// usuario_id porque el dispositivo ya lo trae), acá el instrumento se agrega
// directo desde el usuario en sesión -- requerirMembresia solo valida
// pertenencia a la banda, no devuelve el id, así que se resuelve acá aparte.
export async function agregarInstrumentoEnCadenaAction(
  bandaId: string,
  instrumentoPropioId: string,
  cancionId: string | null
): Promise<InstrumentoEnCadena> {
  await requerirMembresia(bandaId);
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  const instrumento = await agregarInstrumentoEnCadena(bandaId, user.id, instrumentoPropioId, cancionId);
  revalidatePath("/seteos");
  return instrumento;
}

export async function quitarInstrumentoEnCadenaAction(id: string, bandaId: string): Promise<void> {
  await requerirMembresia(bandaId);
  await quitarInstrumentoEnCadena(id);
  revalidatePath("/seteos");
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

// Brief "Seteos: eliminar canción de la vista + contadores discretos" §1:
// mismo criterio que agregarInstrumentoEnCadenaAction -- la marca de
// oculta/visible es del usuario en sesión, no del dispositivo, así que se
// resuelve acá aparte en vez de venir ya implícito en algún id recibido.
export async function ocultarCancionEnSeteosAction(bandaId: string, cancionId: string): Promise<void> {
  await requerirMembresia(bandaId);
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  await ocultarCancionEnSeteos(bandaId, user.id, cancionId);
  revalidatePath("/seteos");
}

export async function mostrarCancionEnSeteosAction(bandaId: string, cancionId: string): Promise<void> {
  await requerirMembresia(bandaId);
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa.");

  await mostrarCancionEnSeteos(bandaId, user.id, cancionId);
  revalidatePath("/seteos");
}
