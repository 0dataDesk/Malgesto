import { NextResponse } from "next/server";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { resolverAccesoUsuario } from "@/lib/malgestoAccess";

// Intercambia el code de Google por una sesión y resuelve el acceso: ya
// miembro pasa directo, invitación pendiente se acepta, si no hay nada va a
// /sin-acceso. La lógica de matching vive en lib/malgestoAccess.ts porque
// también la usa el botón "Volver a intentar" de esa pantalla.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await supabaseServerAuth();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const destino = await resolverAccesoUsuario(user.id, user.email);
  return NextResponse.redirect(`${origin}/${destino}`);
}
