import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxyClient";

// Corre sobre todas las rutas autenticadas del shell — Calendario, Canciones,
// Set List y Seteos, todas construidas desde cero dentro de este mismo repo.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/inicio", "/inicio/:path*",
    "/canciones", "/canciones/:path*",
    "/set-list", "/set-list/:path*",
    "/seteos", "/seteos/:path*",
    "/login", "/sin-acceso", "/auth/callback",
  ],
};
