import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { obtenerCanciones } from "@/lib/cancionesData";
import { SetlistEditor } from "@/components/setlist/SetlistEditor";

export default async function ArmarSetlistPage({
  params,
}: {
  params: Promise<{ setlistId: string }>;
}) {
  const { setlistId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const setlist = await obtenerSetlistCompleto(setlistId);
  if (!setlist) notFound();

  const esMiembro = membresias.some((m) => m.bandaId === setlist.bandaId);
  if (!esMiembro) notFound();

  const canciones = await obtenerCanciones([setlist.bandaId]);

  return (
    <SetlistEditor
      setlistId={setlist.id}
      bandaId={setlist.bandaId}
      nombre={setlist.nombre}
      itemsIniciales={setlist.items.map((i) => ({
        cancionId: i.cancion.id,
        notasTransicion: i.notasTransicion,
        cancion: i.cancion,
      }))}
      cancionesDisponibles={canciones}
    />
  );
}
