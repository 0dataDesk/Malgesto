import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client para el esquema malgesto. Bypassa RLS — nunca importar
// desde un Client Component. Usado para resolver invitaciones y membresías,
// que no deben quedar expuestas al usuario final vía la API pública.
export function supabaseMalgesto() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno (.env.local)."
    );
  }

  return createClient(url, key, {
    db: { schema: "malgesto_app" },
    auth: { persistSession: false },
  });
}
