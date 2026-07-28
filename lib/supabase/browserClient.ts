import { createBrowserClient } from "@supabase/ssr";

// Cliente de sesión (auth) para Client Components — usa el publishable key,
// pensado para exponerse al navegador. No confundir con lib/supabase/server.ts
// (service role, bypassa RLS, solo para el módulo de Canciones).
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
