import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas } from "@/lib/gestionData";
import { LugarForm } from "@/components/gestion/LugarForm";

// Brief "Lugares — FAB para crear": mismo criterio de ruteo que
// /gestion/lugares/[id]/editar -- LugarForm sin `lugar` arranca en modo
// creación.
export default async function NuevoLugarPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  const bandas = await obtenerBandasTodas();

  return (
    <div
      className="min-h-screen box-border px-6 py-8 md:px-16 md:py-11"
      style={{ background: "oklch(0.965 0.012 82)", color: "oklch(0.24 0.02 55)" }}
    >
      <Link href="/gestion?tab=lugares" className="mb-6 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ Lugares
        </span>
      </Link>
      <LugarForm bandas={bandas} />
    </div>
  );
}
