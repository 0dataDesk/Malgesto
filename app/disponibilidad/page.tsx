import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerMisIncidencias } from "@/lib/ausenciasData";
import { DisponibilidadEditor } from "@/components/disponibilidad/DisponibilidadEditor";

// Brief "Disponibilidad de integrantes" §1: accesible para CUALQUIER
// integrante, sin importar rol -- por eso vive fuera de /gestion (esa ruta
// entera es superadmin-only) como una sección propia, no gateada por rol ni
// por el permiso de bloque Calendario (que de por sí nunca restringe, ver
// lib/bloques.ts).
export default async function DisponibilidadPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const incidencias = await obtenerMisIncidencias(user.id);

  return <DisponibilidadEditor incidenciasIniciales={incidencias} />;
}
