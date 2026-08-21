import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, obtenerEventoPorId, esSuperadminDeMembresias } from "@/lib/malgestoEventos";
import { obtenerPuntosLogistica, type MusicoLogistica } from "@/lib/logisticaData";
import { obtenerLugares } from "@/lib/lugaresData";
import { obtenerStagePlot } from "@/lib/stagePlotData";
import { construirRider, type CanalRider } from "@/lib/riderData";
import { LogisticaPantalla } from "@/components/logistica/LogisticaPantalla";
import { LogisticaSoloLectura } from "@/components/logistica/LogisticaSoloLectura";

// Brief "Logística: mejoras de interacción y vista de solo lectura" §5: el
// Input List del Rider distingue canal por canal a propósito (instrumento Y
// voz de la misma persona son dos filas de consola reales) -- acá se
// consolida por persona, uniendo sus roles en una sola línea, porque esta
// lista es "quién viene", no "cuántos canales de consola hacen falta".
function consolidarMusicos(canales: CanalRider[]): MusicoLogistica[] {
  const rolesPorPersona = new Map<string, string[]>();
  for (const c of canales) {
    const separador = c.fuente.lastIndexOf(" · ");
    const rol = separador === -1 ? null : c.fuente.slice(0, separador);
    const persona = separador === -1 ? c.fuente : c.fuente.slice(separador + 3);
    const roles = rolesPorPersona.get(persona) ?? [];
    if (rol) roles.push(rol);
    rolesPorPersona.set(persona, roles);
  }
  return [...rolesPorPersona.entries()].map(([persona, roles]) => ({ persona, roles: roles.join(", ") }));
}

export default async function LogisticaPage({
  params,
}: {
  params: Promise<{ eventoId: string }>;
}) {
  const { eventoId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  // Cumpleaños es un evento virtual (lib/cumpleanosVirtual.ts) -- nunca es
  // una fila real de `eventos`, así que no puede tener logística propia.
  const evento = await obtenerEventoPorId(eventoId);
  if (!evento || evento.tipo === "cumpleanos") notFound();

  const membresia = membresias.find((m) => m.bandaId === evento.bandaId);
  if (!membresia) notFound();

  // Brief §6: quien arma la logística (administrador/superadmin, mismo
  // corte de rol que el resto de la app -- ver requerirAccesoBloque en
  // malgestoAccess.ts) sigue viendo la pantalla de edición; un integrante
  // "miembro" pasa a una vista aparte 100% de solo lectura. Los server
  // actions (app/logistica/actions.ts) siguen gateados solo por membresía
  // -- este corte es de presentación, no reemplaza esa validación.
  const superadmin = esSuperadminDeMembresias(membresias);
  const puedeEditar = superadmin || membresia.rol === "administrador";

  const [puntos, lugares, stagePlot] = await Promise.all([
    obtenerPuntosLogistica(eventoId),
    puedeEditar ? obtenerLugares([evento.bandaId]) : Promise.resolve([]),
    // Lectura pura -- a diferencia de obtenerOCrearStagePlot (que usa la
    // pantalla de Stage Plot), acá no corresponde crear un stage plot vacío
    // como efecto secundario de solo mirar la lista de músicos.
    obtenerStagePlot(evento.bandaId),
  ]);

  const rider = stagePlot && stagePlot.items.length > 0 ? await construirRider(stagePlot, evento.bandaId, evento.bandaNombre, "oklch(0.6 0.02 55)") : null;
  const musicos = rider ? consolidarMusicos(rider.canales) : [];

  if (!puedeEditar) return <LogisticaSoloLectura evento={evento} puntos={puntos} musicos={musicos} />;

  return <LogisticaPantalla evento={evento} puntosIniciales={puntos} lugares={lugares} musicos={musicos} puedeEditar />;
}
