import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerDispositivoCompleto } from "@/lib/dispositivosData";
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
  if (!dispositivo) notFound();

  const esMiembro = membresias.some((m) => m.bandaId === dispositivo.bandaId);
  if (!esMiembro) notFound();

  const canciones = await obtenerCanciones([dispositivo.bandaId]);

  return (
    <DispositivoDetalle
      bandaId={dispositivo.bandaId}
      dispositivoId={dispositivo.id}
      nombreDispositivo={dispositivo.nombre}
      tipoControl={dispositivo.tipoControl}
      controles={dispositivo.controles}
      seteosIniciales={dispositivo.seteos}
      cancionesDisponibles={canciones.map((c) => ({ id: c.id, titulo: c.titulo }))}
    />
  );
}
