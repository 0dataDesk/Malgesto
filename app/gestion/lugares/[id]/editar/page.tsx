import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas } from "@/lib/gestionData";
import { obtenerLugarPorId } from "@/lib/lugaresData";
import { LugarForm } from "@/components/gestion/LugarForm";

// Brief "Rediseño de Gestión > Lugares" (v2) §2: Editar navega a una
// pantalla aparte en vez de expandir la tarjeta inline (mismo criterio de
// ruteo que ya usa Canciones para su pantalla de edición).
export default async function EditarLugarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  const [lugar, bandas] = await Promise.all([obtenerLugarPorId(id), obtenerBandasTodas()]);
  if (!lugar) notFound();

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
      <LugarForm lugar={lugar} bandas={bandas} />
    </div>
  );
}
