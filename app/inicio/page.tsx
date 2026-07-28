import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, obtenerEventos } from "@/lib/malgestoEventos";
import { CalendarioShell } from "@/components/calendario/CalendarioShell";

// 1 banda -> directo al calendario de esa banda (hoy el único bloque que
// existe). Más de 1 banda -> selector (pantalla 01) + calendario mezclado —
// implementado pero sin poder probarse con datos reales todavía, Jorge solo
// tiene ODR.
export default async function InicioPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) {
    redirect("/sin-acceso");
  }

  const eventos = await obtenerEventos(membresias.map((m) => m.bandaId));

  return <CalendarioShell membresias={membresias} eventos={eventos} userEmail={user.email} />;
}
