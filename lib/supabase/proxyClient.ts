import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

// Refresca la sesión de auth en cada request a una ruta del shell y protege
// /inicio, /canciones, /set-list, /seteos, /stage-plot y /gestion (ver
// matcher en proxy.ts). /gestion además exige rol superadmin, chequeado en
// la propia página — este proxy solo garantiza que haya sesión. /plot/[token]
// (share público de Stage Plot) es pública a propósito y nunca pasa por acá.
//
// Onboarding fecha de nacimiento: además, sobre esas mismas rutas de shell
// (no /sin-acceso, que ya está fuera de la app), exige que
// malgesto.personas.fecha_nacimiento esté cargada para el usuario — si no,
// redirige a /onboarding antes de dejar pasar. Corre en cada request (no
// solo en el login) a propósito: atrapa tanto un login nuevo como una
// sesión ya abierta que todavía no completó el dato.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const rutaAppShell =
    request.nextUrl.pathname.startsWith("/inicio") ||
    request.nextUrl.pathname.startsWith("/canciones") ||
    request.nextUrl.pathname.startsWith("/set-list") ||
    request.nextUrl.pathname.startsWith("/seteos") ||
    request.nextUrl.pathname.startsWith("/gestion") ||
    request.nextUrl.pathname.startsWith("/stage-plot") ||
    request.nextUrl.pathname.startsWith("/disponibilidad");

  const rutaProtegida =
    rutaAppShell ||
    request.nextUrl.pathname.startsWith("/sin-acceso") ||
    request.nextUrl.pathname.startsWith("/onboarding");

  if (!user && rutaProtegida) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && rutaAppShell) {
    const admin = supabaseMalgesto();
    const { data: persona } = await admin
      .from("personas")
      .select("fecha_nacimiento")
      .eq("usuario_id", user.sub as string)
      .maybeSingle();

    if (!persona?.fecha_nacimiento) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
