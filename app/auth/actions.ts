"use server";

import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { resolverAccesoUsuario } from "@/lib/malgestoAccess";

// "Volver a intentar" en /sin-acceso: por si el administrador acaba de
// crear la invitación mientras el usuario tenía la pantalla abierta.
export async function reintentarAcceso() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const destino = await resolverAccesoUsuario(user.id, user.email);
  redirect(`/${destino}`);
}

export async function cerrarSesion() {
  const supabase = await supabaseServerAuth();
  await supabase.auth.signOut();
  redirect("/login");
}
