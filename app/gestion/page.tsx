import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas, obtenerPersonasPendientes, obtenerMiembrosDeBandas } from "@/lib/gestionData";
import { GestionShell } from "@/components/gestion/GestionShell";

// Pantalla 15 "Escritorio · Gestión" (Brief 7) — solo accesible para
// usuarios con rol superadmin en al menos una banda. Cualquier otro
// usuario autenticado se manda de vuelta a /inicio (no 404: no es un
// recurso que no existe, es una sección a la que no tiene acceso).
export default async function GestionPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  const [bandas, personasPendientes, bandasConMiembros] = await Promise.all([
    obtenerBandasTodas(),
    obtenerPersonasPendientes(),
    obtenerMiembrosDeBandas(),
  ]);

  return <GestionShell bandas={bandas} personasPendientes={personasPendientes} bandasConMiembros={bandasConMiembros} />;
}
