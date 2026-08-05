import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, bloqueVisible } from "@/lib/malgestoEventos";
import { obtenerCancionCompleta, obtenerCanciones } from "@/lib/cancionesData";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { obtenerSeteosParaCancion } from "@/lib/dispositivosData";
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

  const membresia = membresias.find((m) => m.bandaId === cancion.bandaId);
  if (!membresia) notFound();

  // Brief de corrección §3: la vista final debe respetar el mismo toggle de
  // banda (seteos_habilitado + restricción por persona) que ya aplica en la
  // barra de navegación — antes se mostraba sin importar el bloque.
  const superadmin = esSuperadminDeMembresias(membresias);
  const seteosVisible = bloqueVisible(membresia, "seteos", superadmin);

  // Con Set List de por medio, siguiente/anterior siguen su orden — tiene
  // prioridad sobre el alfabético, que era la solución temporal del Brief 4
  // para cuando no hay ningún Set List asociado a esta sesión de tocar.
  let prevId: string | null = null;
  let nextId: string | null = null;
  let setlistValido: { id: string; nombre: string } | null = null;

  if (setlistId) {
    const setlist = await obtenerSetlistCompleto(setlistId);
    if (setlist && setlist.bandaId === cancion.bandaId) {
      // Los bloques libres (sample/diálogo) no son canciones navegables — se
      // saltan al calcular anterior/siguiente, que solo avanza entre items
      // tipo "cancion".
      const cancionItems = setlist.items.filter((it) => it.tipo === "cancion" && it.cancion);
      const indice = cancionItems.findIndex((it) => it.cancion!.id === cancionId);
      if (indice !== -1) {
        prevId = indice > 0 ? cancionItems[indice - 1].cancion!.id : null;
        nextId = indice < cancionItems.length - 1 ? cancionItems[indice + 1].cancion!.id : null;
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

  const seteosContexto = seteosVisible ? await obtenerSeteosParaCancion(cancion.bandaId, cancionId) : [];

  return (
    <VistaFinal
      cancion={cancion}
      prevId={prevId}
      nextId={nextId}
      setlist={setlistValido}
      seteosContexto={seteosContexto}
    />
  );
}
