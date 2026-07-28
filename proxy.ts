import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxyClient";

// Solo corre sobre las rutas nuevas del shell (login/invitaciones). El
// módulo de Canciones (/, /artistas/*) no pasa por acá — sigue sin auth,
// tal como estaba antes de este brief.
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/inicio", "/inicio/:path*", "/login", "/sin-acceso", "/auth/callback"],
};
