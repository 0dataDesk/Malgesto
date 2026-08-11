import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas, obtenerPersonasPendientes, obtenerIntegrantes, obtenerPlazas, obtenerPlazasReservadas } from "@/lib/gestionData";
import { obtenerLugaresTodos } from "@/lib/lugaresData";
import { obtenerDisenosPorCategoria } from "@/lib/dispositivosData";
import { GestionShell } from "@/components/gestion/GestionShell";
import { SECCIONES, type Seccion } from "@/lib/gestionSecciones";

// Pantalla 15 "Escritorio · Gestión" (Brief 7, reseccionada en Brief 8/9) —
// solo accesible para usuarios con rol superadmin en al menos una banda.
// Cualquier otro usuario autenticado se manda de vuelta a /inicio (no 404:
// no es un recurso que no existe, es una sección a la que no tiene acceso).
export default async function GestionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  // Fix de corrección "recargar en Integrantes regresa a Bandas": la pestaña
  // activa vivía solo en useState de GestionShell, así que un reload siempre
  // volvía a "bandas". Ahora se refleja en ?tab= (mismo patrón que ?banda=
  // en Canciones/Finanzas) y se lee acá al montar.
  const seccionInicial: Seccion = SECCIONES.includes(tab as Seccion) ? (tab as Seccion) : "bandas";

  const [bandas, personasPendientes, integrantes] = await Promise.all([
    obtenerBandasTodas(),
    obtenerPersonasPendientes(),
    obtenerIntegrantes(),
  ]);
  const bandaIds = bandas.map((b) => b.id);
  const [lugares, plazas, plazasReservadas, disenosAmplificador, disenosPedal] = await Promise.all([
    obtenerLugaresTodos(),
    obtenerPlazas(bandaIds),
    obtenerPlazasReservadas(),
    obtenerDisenosPorCategoria("amplificador"),
    obtenerDisenosPorCategoria("pedal"),
  ]);

  return (
    <GestionShell
      seccionInicial={seccionInicial}
      bandas={bandas}
      personasPendientes={personasPendientes}
      integrantes={integrantes}
      lugares={lugares}
      plazas={plazas}
      plazasReservadas={plazasReservadas}
      disenosAmplificador={disenosAmplificador}
      disenosPedal={disenosPedal}
    />
  );
}
