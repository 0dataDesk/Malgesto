import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas, obtenerPersonasPendientes, obtenerIntegrantes, obtenerPlazas } from "@/lib/gestionData";
import { obtenerLugares } from "@/lib/lugaresData";
import { GestionShell } from "@/components/gestion/GestionShell";

// Pantalla 15 "Escritorio · Gestión" (Brief 7, reseccionada en Brief 8/9) —
// solo accesible para usuarios con rol superadmin en al menos una banda.
// Cualquier otro usuario autenticado se manda de vuelta a /inicio (no 404:
// no es un recurso que no existe, es una sección a la que no tiene acceso).
export default async function GestionPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  const [bandas, personasPendientes, integrantes] = await Promise.all([
    obtenerBandasTodas(),
    obtenerPersonasPendientes(),
    obtenerIntegrantes(),
  ]);
  const bandaIds = bandas.map((b) => b.id);
  const [lugares, plazas] = await Promise.all([obtenerLugares(bandaIds), obtenerPlazas(bandaIds)]);

  return (
    <GestionShell
      bandas={bandas}
      personasPendientes={personasPendientes}
      integrantes={integrantes}
      lugares={lugares}
      plazas={plazas}
      usuarioActualId={user.id}
    />
  );
}
