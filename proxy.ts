import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxyClient";

// Corre sobre todas las rutas autenticadas del shell — Calendario, Canciones
// y Set List, todas construidas desde cero dentro de este mismo repo.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/inicio", "/inicio/:path*",
    "/canciones", "/canciones/:path*",
    "/set-list", "/set-list/:path*",
    "/login", "/sin-acceso", "/auth/callback",
  ],
};
