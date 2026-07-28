import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerCancionCompleta, obtenerCanciones } from "@/lib/cancionesData";
import { VistaFinal } from "@/components/canciones/VistaFinal";

export default async function CancionPage({
  params,
}: {
  params: Promise<{ cancionId: string }>;
}) {
  const { cancionId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const cancion = await obtenerCancionCompleta(cancionId);
  if (!cancion) notFound();

  const esMiembro = membresias.some((m) => m.bandaId === cancion.bandaId);
  if (!esMiembro) notFound();

  // Orden alfabético, igual que la lista — no hay Set List todavía para
  // definir un orden de repertorio real.
  const canciones = await obtenerCanciones([cancion.bandaId]);
  const indice = canciones.findIndex((c) => c.id === cancionId);
  const prevId = indice > 0 ? canciones[indice - 1].id : null;
  const nextId = indice >= 0 && indice < canciones.length - 1 ? canciones[indice + 1].id : null;

  return <VistaFinal cancion={cancion} prevId={prevId} nextId={nextId} />;
}
