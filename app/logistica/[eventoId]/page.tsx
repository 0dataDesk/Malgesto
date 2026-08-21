import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, obtenerEventoPorId } from "@/lib/malgestoEventos";
import { obtenerPuntosLogistica } from "@/lib/logisticaData";
import { obtenerLugares } from "@/lib/lugaresData";
import { obtenerStagePlot } from "@/lib/stagePlotData";
import { construirRider } from "@/lib/riderData";
import { LogisticaPantalla } from "@/components/logistica/LogisticaPantalla";

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

  const esMiembro = membresias.some((m) => m.bandaId === evento.bandaId);
  if (!esMiembro) notFound();

  const [puntos, lugares, stagePlot] = await Promise.all([
    obtenerPuntosLogistica(eventoId),
    obtenerLugares([evento.bandaId]),
    // Lectura pura -- a diferencia de obtenerOCrearStagePlot (que usa la
    // pantalla de Stage Plot), acá no corresponde crear un stage plot vacío
    // como efecto secundario de solo mirar la lista de músicos.
    obtenerStagePlot(evento.bandaId),
  ]);

  const rider = stagePlot && stagePlot.items.length > 0 ? await construirRider(stagePlot, evento.bandaId, evento.bandaNombre, "oklch(0.6 0.02 55)") : null;
  const musicos = rider ? rider.canales.map((c) => c.fuente) : [];

  return <LogisticaPantalla evento={evento} puntosIniciales={puntos} lugares={lugares} musicos={musicos} />;
}
