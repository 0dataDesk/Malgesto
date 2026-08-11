import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerDispositivoCompleto, crearSeteoGeneralConDefaults } from "@/lib/dispositivosData";
import { obtenerCanciones } from "@/lib/cancionesData";
import { DispositivoDetalle } from "@/components/dispositivos/DispositivoDetalle";

export default async function DispositivoPage({
  params,
}: {
  params: Promise<{ dispositivoId: string }>;
}) {
  const { dispositivoId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const dispositivo = await obtenerDispositivoCompleto(dispositivoId);
  if (!dispositivo || !dispositivo.diseno) notFound();

  const esMiembro = membresias.some((m) => m.bandaId === dispositivo.bandaId);
  if (!esMiembro) notFound();

  // Brief §4: seteo general obligatorio — si todavía no existe, se crea acá
  // mismo con los valor_default del diseño, antes de mostrar la pantalla.
  let seteos = dispositivo.seteos;
  if (!seteos.some((s) => s.esGeneral)) {
    const general = await crearSeteoGeneralConDefaults(dispositivoId, dispositivo.diseno.controles);
    seteos = [...seteos, general];
  }

  const canciones = await obtenerCanciones([dispositivo.bandaId]);

  return (
    <DispositivoDetalle
      bandaId={dispositivo.bandaId}
      dispositivoId={dispositivo.id}
      disenoMarca={dispositivo.diseno.marca}
      disenoModelo={dispositivo.diseno.modelo}
      apodo={dispositivo.apodo}
      controles={dispositivo.diseno.controles}
      seteosIniciales={seteos}
      cancionesDisponibles={canciones.map((c) => ({ id: c.id, titulo: c.titulo }))}
    />
  );
}
