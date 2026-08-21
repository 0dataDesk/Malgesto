"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperadmin } from "@/lib/malgestoAccess";
import {
  crearBanda,
  actualizarBanda,
  archivarBanda,
  eliminarBanda,
  crearPlaza,
  eliminarPlaza,
  asignarPersonaAPlaza,
  quitarPersonaDePlaza,
  invitarPersona,
  ignorarPersonaPendiente,
  actualizarNombreMostrar,
  actualizarFechaNacimiento,
  removerDeBanda,
  asignarABanda,
  actualizarRol,
  actualizarVoz,
  actualizarBloquesVisibles,
  inactivarPersona,
  eliminarPersona,
  crearInstrumentoPropio,
  actualizarInstrumentoPropio,
  eliminarInstrumentoPropio,
  type ResultadoInvitacion,
  type ActualizacionBanda,
  type RolInvitable,
  type InvitacionPorBanda,
  type Voz,
  type InstrumentoPropio,
} from "@/lib/gestionData";
import { crearLugar, actualizarLugar, actualizarLugarBandas, eliminarLugar } from "@/lib/lugaresData";
import { asignarDiseno, sincronizarConsola, quitarDispositivo, type CategoriaCatalogo, type DispositivoAsignado } from "@/lib/dispositivosData";

export async function crearBandaAction(nombre: string): Promise<string> {
  const usuarioId = await requerirSuperadmin();
  const bandaId = await crearBanda(nombre, usuarioId);
  revalidatePath("/gestion");
  return bandaId;
}

export async function actualizarBandaAction(bandaId: string, cambios: ActualizacionBanda): Promise<void> {
  await requerirSuperadmin();
  await actualizarBanda(bandaId, cambios);
  revalidatePath("/gestion");
}

export async function archivarBandaAction(bandaId: string, archivada: boolean): Promise<void> {
  await requerirSuperadmin();
  await archivarBanda(bandaId, archivada);
  revalidatePath("/gestion");
}

export async function eliminarBandaAction(bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarBanda(bandaId);
  revalidatePath("/gestion");
}

export async function crearPlazaAction(bandaId: string, instrumento: string, etiqueta: string | null) {
  await requerirSuperadmin();
  const plaza = await crearPlaza(bandaId, instrumento, etiqueta);
  revalidatePath("/gestion");
  return plaza;
}

export async function eliminarPlazaAction(plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarPlaza(plazaId);
  revalidatePath("/gestion");
}

export async function asignarPersonaAPlazaAction(usuarioId: string, plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await asignarPersonaAPlaza(usuarioId, plazaId);
  revalidatePath("/gestion");
}

export async function quitarPersonaDePlazaAction(usuarioId: string, plazaId: string): Promise<void> {
  await requerirSuperadmin();
  await quitarPersonaDePlaza(usuarioId, plazaId);
  revalidatePath("/gestion");
}

// Brief "Nuevo nivel de rol": rol elegible desde el formulario de invitar,
// pero acotado en runtime a los 2 niveles no sensibles — el tipo RolInvitable
// ya excluye "superadmin" en compilación, pero un server action es un
// endpoint de red como cualquier otro (alguien podría llamarlo directo con
// un payload armado a mano), así que igual se valida acá. Brief "Rediseño de
// Gestión > Integrantes" §2: el rol ahora viaja por banda dentro de cada
// InvitacionPorBanda, así que se valida cada una por separado.
export async function invitarPersonaAction(
  email: string,
  nombreMostrarPropuesto: string | null,
  invitacionesPorBanda: InvitacionPorBanda[]
): Promise<ResultadoInvitacion> {
  await requerirSuperadmin();
  for (const item of invitacionesPorBanda) {
    if (item.rol !== "miembro" && item.rol !== "administrador") throw new Error("Rol inválido.");
  }
  const resultado = await invitarPersona(email, nombreMostrarPropuesto, invitacionesPorBanda);
  revalidatePath("/gestion");
  return resultado;
}

export async function ignorarPersonaPendienteAction(usuarioId: string): Promise<void> {
  await requerirSuperadmin();
  await ignorarPersonaPendiente(usuarioId);
  revalidatePath("/gestion");
}

export async function actualizarNombreMostrarAction(usuarioId: string, nombreMostrar: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarNombreMostrar(usuarioId, nombreMostrar);
  revalidatePath("/gestion");
}

export async function actualizarFechaNacimientoAction(usuarioId: string, fecha: string | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarFechaNacimiento(usuarioId, fecha);
  revalidatePath("/gestion");
}

// Brief 10 §5: nombre para mostrar y fecha de nacimiento comparten un único
// botón "Guardar" en la ficha del integrante en vez de dos sueltos.
export async function actualizarDatosPersonaAction(usuarioId: string, nombreMostrar: string, fechaNacimiento: string | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarNombreMostrar(usuarioId, nombreMostrar);
  await actualizarFechaNacimiento(usuarioId, fechaNacimiento);
  revalidatePath("/gestion");
}

export async function removerDeBandaAction(usuarioId: string, bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await removerDeBanda(usuarioId, bandaId);
  revalidatePath("/gestion");
}

export async function asignarABandaAction(usuarioId: string, bandaId: string): Promise<void> {
  await requerirSuperadmin();
  await asignarABanda(usuarioId, bandaId);
  revalidatePath("/gestion");
}

// Brief "3 pendientes" §2: cambiar el rol de un integrante ya activo, por
// banda. Mismo par de guards que invitarPersonaAction — requerirSuperadmin
// más la validación en runtime de que el rol pedido es uno de los 2 no
// sensibles (actualizarRol además rechaza tocar una fila que ya sea
// superadmin, doble candado).
export async function actualizarRolAction(usuarioId: string, bandaId: string, rol: RolInvitable): Promise<void> {
  await requerirSuperadmin();
  if (rol !== "miembro" && rol !== "administrador") throw new Error("Rol inválido.");
  await actualizarRol(usuarioId, bandaId, rol);
  revalidatePath("/gestion");
}

// Brief "Voz — nuevo botón cíclico en la fila de Rol, fuera de
// Instrumentos" §2: mismo par de guards que actualizarRolAction --
// requerirSuperadmin más la validación en runtime de que el valor pedido es
// uno de los 3 estados válidos (actualizarVoz no lo revalida, confía en
// este candado).
export async function actualizarVozAction(usuarioId: string, bandaId: string, voz: Voz): Promise<void> {
  await requerirSuperadmin();
  if (voz !== "sin_voz" && voz !== "principal" && voz !== "coro") throw new Error("Voz inválida.");
  await actualizarVoz(usuarioId, bandaId, voz);
  revalidatePath("/gestion");
}

export async function actualizarBloquesVisiblesAction(usuarioId: string, bandaId: string, bloques: string[] | null): Promise<void> {
  await requerirSuperadmin();
  await actualizarBloquesVisibles(usuarioId, bandaId, bloques);
  revalidatePath("/gestion");
}

export async function inactivarPersonaAction(usuarioId: string): Promise<void> {
  await requerirSuperadmin();
  await inactivarPersona(usuarioId);
  revalidatePath("/gestion");
}

// Brief "Eliminar integrante": borrado real, no reversible — el gate de
// confirmación explícita vive en la UI (mismo patrón que ya usan
// LugaresPanel/MovimientoFila/EventoDetalle: confirm() nativo con aviso de
// "no se puede deshacer"), acá solo el guard de rol + la verificación
// conservadora de eliminarPersona (bloquea si hay movimientos financieros).
export async function eliminarPersonaAction(usuarioId: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarPersona(usuarioId);
  revalidatePath("/gestion");
}

// Brief "Seteos — catálogo de diseños" §1: asignar un diseño existente del
// catálogo (amplificador o pedal) a un integrante en una banda, desde
// Gestión > Integrantes — reemplaza el alta libre que antes vivía en Seteos.
//
// Brief "Gestión > Integrantes — acordeones anidados, orden, consola
// automática" §2: "va directo a consola" ya no se controla a mano — cada
// alta/baja de dispositivo sincroniza la fila de consola en la misma
// operación (sincronizarConsola es idempotente, corre siempre sin importar
// la categoría) y devuelve su estado resultante para que el cliente
// actualice su vista sin adivinar.
export async function asignarDisenoDispositivoAction(
  usuarioId: string,
  bandaId: string,
  categoria: CategoriaCatalogo,
  disenoId: string
): Promise<{ dispositivo: DispositivoAsignado; consola: DispositivoAsignado | null }> {
  await requerirSuperadmin();
  const dispositivo = await asignarDiseno(bandaId, usuarioId, categoria, disenoId);
  const consola = await sincronizarConsola(bandaId, usuarioId);
  revalidatePath("/gestion");
  return { dispositivo, consola };
}

// Quita una asignación (amplificador/pedal) — usado para "×" en
// Amplificador(es)/Pedal(es). Sincroniza consola después (ver arriba).
export async function quitarDispositivoAction(
  usuarioId: string,
  bandaId: string,
  dispositivoId: string
): Promise<{ consola: DispositivoAsignado | null }> {
  await requerirSuperadmin();
  await quitarDispositivo(dispositivoId);
  const consola = await sincronizarConsola(bandaId, usuarioId);
  revalidatePath("/gestion");
  return { consola };
}

// Instrumentos propios (brief "Instrumentos propios + selector de
// instrumento activo en Seteos" §1): CRUD simple desde Gestión > Integrantes,
// sin banda_id -- es del integrante, no de una membresía.
export async function crearInstrumentoPropioAction(
  usuarioId: string,
  instrumento: string,
  marca: string | null,
  modelo: string | null
): Promise<InstrumentoPropio> {
  await requerirSuperadmin();
  const instrumentoPropio = await crearInstrumentoPropio(usuarioId, instrumento, marca, modelo);
  revalidatePath("/gestion");
  return instrumentoPropio;
}

export async function actualizarInstrumentoPropioAction(
  id: string,
  instrumento: string,
  marca: string | null,
  modelo: string | null
): Promise<void> {
  await requerirSuperadmin();
  await actualizarInstrumentoPropio(id, instrumento, marca, modelo);
  revalidatePath("/gestion");
}

export async function eliminarInstrumentoPropioAction(id: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarInstrumentoPropio(id);
  revalidatePath("/gestion");
}

export async function crearLugarAction(bandaIds: string[], nombre: string, linkMaps: string) {
  await requerirSuperadmin();
  const lugar = await crearLugar(bandaIds, nombre, linkMaps);
  revalidatePath("/gestion");
  return lugar;
}

export async function actualizarLugarAction(id: string, nombre: string, linkMaps: string): Promise<void> {
  await requerirSuperadmin();
  await actualizarLugar(id, nombre, linkMaps);
  revalidatePath("/gestion");
}

export async function actualizarLugarBandasAction(id: string, bandaIds: string[]): Promise<void> {
  await requerirSuperadmin();
  await actualizarLugarBandas(id, bandaIds);
  revalidatePath("/gestion");
}

export async function eliminarLugarAction(id: string): Promise<void> {
  await requerirSuperadmin();
  await eliminarLugar(id);
  revalidatePath("/gestion");
}

