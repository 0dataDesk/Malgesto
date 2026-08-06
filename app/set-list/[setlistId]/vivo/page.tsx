import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { SetlistEnVivoCliente } from "@/components/setlist/SetlistEnVivoCliente";

// En vivo (pantalla 11): canciones del Set List en su orden definido. Tocar
// una lleva a su vista final (Brief 4) pero con ?setlist= para que
// siguiente/anterior naveguen por este orden, no alfabético.
//
// Brief "Cronómetro sincronizado en vivo": toda la interactividad (reloj,
// Iniciar/Detener, resaltado de item actual, corrección manual) vive en
// SetlistEnVivoCliente ("use client") — esta página solo resuelve auth +
// carga los datos, igual que antes.
export default async function SetlistEnVivoPage({
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

  return (
    <SetlistEnVivoCliente
      setlistId={setlist.id}
      bandaId={setlist.bandaId}
      nombre={setlist.nombre}
      items={setlist.items}
      enVivoIniciadoEnInicial={setlist.enVivoIniciadoEn}
    />
  );
}
