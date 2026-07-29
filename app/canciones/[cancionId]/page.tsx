import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerCancionCompleta, obtenerCanciones } from "@/lib/cancionesData";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { VistaFinal } from "@/components/canciones/VistaFinal";

export default async function CancionPage({
  params,
  searchParams,
}: {
  params: Promise<{ cancionId: string }>;
  searchParams: Promise<{ setlist?: string }>;
}) {
  const { cancionId } = await params;
  const { setlist: setlistId } = await searchParams;
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

  // Con Set List de por medio, siguiente/anterior siguen su orden — tiene
  // prioridad sobre el alfabético, que era la solución temporal del Brief 4
  // para cuando no hay ningún Set List asociado a esta sesión de tocar.
  let prevId: string | null = null;
  let nextId: string | null = null;
  let setlistValido: { id: string; nombre: string } | null = null;

  if (setlistId) {
    const setlist = await obtenerSetlistCompleto(setlistId);
    if (setlist && setlist.bandaId === cancion.bandaId) {
      const indice = setlist.items.findIndex((it) => it.cancion.id === cancionId);
      if (indice !== -1) {
        prevId = indice > 0 ? setlist.items[indice - 1].cancion.id : null;
        nextId = indice < setlist.items.length - 1 ? setlist.items[indice + 1].cancion.id : null;
        setlistValido = { id: setlist.id, nombre: setlist.nombre };
      }
    }
  }

  if (!setlistValido) {
    const canciones = await obtenerCanciones([cancion.bandaId]);
    const indice = canciones.findIndex((c) => c.id === cancionId);
    prevId = indice > 0 ? canciones[indice - 1].id : null;
    nextId = indice >= 0 && indice < canciones.length - 1 ? canciones[indice + 1].id : null;
  }

  return (
    <VistaFinal
      cancion={cancion}
      prevId={prevId}
      nextId={nextId}
      setlist={setlistValido}
    />
  );
}
