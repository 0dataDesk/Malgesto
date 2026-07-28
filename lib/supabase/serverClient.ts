import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de sesión (auth) para Server Components, Server Actions y Route
// Handlers — lee/escribe la sesión desde las cookies del request. Usa el
// publishable key: los permisos reales los da la sesión del usuario (RLS),
// no esta clave.
export async function supabaseServerAuth() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll llamado desde un Server Component — se puede ignorar
            // porque proxy.ts refresca la sesión en cada request.
          }
        },
      },
    }
  );
}
