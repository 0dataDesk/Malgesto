import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, bloqueVisible } from "@/lib/malgestoEventos";
import { puedeVerBorradores } from "@/lib/bloques";
import { obtenerCancionCompleta, obtenerCanciones, obtenerPrioridadMusico } from "@/lib/cancionesData";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { obtenerSeteosParaCancion } from "@/lib/dispositivosData";
import { VistaFinal } from "@/components/canciones/VistaFinal";
import { VistaEstudio } from "@/components/canciones/VistaEstudio";

export default async function CancionPage({
  params,
  searchParams,
}: {
  params: Promise<{ cancionId: string }>;
  searchParams: Promise<{ setlist?: string; vista?: string }>;
}) {
  const { cancionId } = await params;
  const { setlist: setlistId, vista } = await searchParams;
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

  const superadmin = esSuperadminDeMembresias(membresias);
  if (!bloqueVisible(membresia, "canciones", superadmin)) notFound();

  const puedeEscribir = membresia.rol === "administrador" || membresia.rol === "superadmin";

  // Brief "Fase 3: nueva vista de Canción" (Fase 1 §1):
  //  - Un borrador solo lo ven admins + integrantes con "Ver borradores".
  //  - Modo de vista según es_borrador: borrador = edición vertical (para
  //    quien puede escribir, es el editor); no-borrador = lista horizontal,
  //    no editable.
  if (cancion.esBorrador && !puedeVerBorradores(membresia, superadmin)) notFound();

  // Modo Estudio (aprender tocando): por defecto en la banda personal
  // "Malgesto"; en las demás bandas se entra con ?vista=estudio. Con
  // ?vista=escenario se fuerza la vista de siempre, y desde un Set List
  // (?setlist=) siempre se abre la vista de escenario.
  const usarEstudio = vista === "estudio" || (vista !== "escenario" && !setlistId && membresia.bandaNombre === "Malgesto");
  if (usarEstudio) {
    return (
      <VistaEstudio
        cancion={cancion}
        volverHref={`/canciones?banda=${cancion.bandaId}`}
        puedeEditar={puedeEscribir}
        bandaNombre={membresia.bandaNombre}
      />
    );
  }

  if (cancion.esBorrador && puedeEscribir) redirect(`/canciones/${cancionId}/editar`);

  const seteosVisible = bloqueVisible(membresia, "seteos", superadmin);

  let prevId: string | null = null;
  let nextId: string | null = null;
  let setlistValido: { id: string; nombre: string } | null = null;

  if (setlistId) {
    const setlist = await obtenerSetlistCompleto(setlistId);
    if (setlist && setlist.bandaId === cancion.bandaId) {
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
    const listas = canciones.filter((c) => !c.esBorrador || puedeVerBorradores(membresia, superadmin));
    const indice = listas.findIndex((c) => c.id === cancionId);
    prevId = indice > 0 ? listas[indice - 1].id : null;
    nextId = indice >= 0 && indice < listas.length - 1 ? listas[indice + 1].id : null;
  }

  const [seteosContexto, prioridad] = await Promise.all([
    seteosVisible ? obtenerSeteosParaCancion(cancion.bandaId, cancionId) : Promise.resolve([]),
    obtenerPrioridadMusico(user.id, cancion.bandaId),
  ]);

  return (
    <VistaFinal
      cancion={cancion}
      prevId={prevId}
      nextId={nextId}
      setlist={setlistValido}
      seteosContexto={seteosContexto}
      modo={cancion.esBorrador ? "vertical" : "horizontal"}
      prioridad={prioridad}
      soloLectura={cancion.esBorrador}
      puedeEditar={puedeEscribir}
    />
  );
}
