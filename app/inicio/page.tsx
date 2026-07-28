import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { cerrarSesion } from "@/app/auth/actions";

// Placeholder temporal: solo confirma que el acceso funcionó. El selector de
// banda / vista de bloques real se construye en el Brief 2.
export default async function InicioPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const admin = supabaseMalgesto();
  const { data: membresias } = await admin
    .from("miembros_banda")
    .select("rol, bandas(nombre)")
    .eq("usuario_id", user.id);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
      <div
        className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase"
        style={{ background: "oklch(0.3 0.13 148 / 0.2)", color: "oklch(0.7 0.15 148)" }}
      >
        Placeholder · Brief 2 construye el selector real
      </div>
      <h1 className="text-2xl font-extrabold">Sesión iniciada</h1>
      <p style={{ color: "oklch(0.7 0.01 260)" }}>{user.email}</p>
      <div className="mt-2 flex flex-col gap-2">
        {(membresias ?? []).map((m, i) => (
          <div key={i} className="text-sm" style={{ color: "oklch(0.85 0.005 260)" }}>
            {m.bandas?.[0]?.nombre ?? "Banda"} · {m.rol}
          </div>
        ))}
      </div>
      <form action={cerrarSesion} className="mt-6">
        <button type="submit" className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
