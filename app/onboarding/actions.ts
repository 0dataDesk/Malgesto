"use server";

import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

function destinoSeguro(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/inicio";
}

export async function guardarFechaNacimientoAction(fecha: string, next?: string) {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No hay sesión activa.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Fecha inválida.");
  if (new Date(fecha) > new Date()) throw new Error("La fecha no puede ser futura.");

  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("personas")
    .upsert({ usuario_id: user.id, fecha_nacimiento: fecha }, { onConflict: "usuario_id" });
  if (error) throw new Error(error.message);

  redirect(destinoSeguro(next));
}
