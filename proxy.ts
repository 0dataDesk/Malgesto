import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxyClient";

// Corre sobre todas las rutas autenticadas del shell — Calendario, Canciones,
// Set List, Seteos, Stage Plot y Gestión, todas construidas desde cero
// dentro de este mismo repo. /plot/[token] (share público de Stage Plot)
// queda deliberadamente fuera de este matcher: es la única ruta pensada
// para abrirse sin sesión.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/inicio", "/inicio/:path*",
    "/canciones", "/canciones/:path*",
    "/set-list", "/set-list/:path*",
    "/seteos", "/seteos/:path*",
    "/gestion", "/gestion/:path*",
    "/stage-plot", "/stage-plot/:path*",
    "/disponibilidad", "/disponibilidad/:path*",
    "/login", "/sin-acceso", "/auth/callback",
    "/onboarding",
  ],
};
