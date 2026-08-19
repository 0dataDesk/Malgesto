import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { esSuperadmin, obtenerBandasTodas } from "@/lib/gestionData";
import { obtenerOCrearPresskit, obtenerFotos, obtenerRedes } from "@/lib/presskitData";
import { obtenerPlazasConPersonaDeBanda } from "@/lib/stagePlotData";
import { PresskitCaptura } from "@/components/presskit/PresskitCaptura";

// Pantalla de captura de datos del presskit (Brief "Presskit — vista de
// captura de datos"): solo construye ESTA pantalla -- ni vista pública ni
// diseño visual, eso lo resuelve Design por separado usando el resumen que
// exporta el botón "Enviar a Presskit". Mismo gate que /gestion (solo
// superadmin), porque el único punto de entrada es el botón "Presskit" en
// la edición de banda dentro de Gestión > Bandas.
export default async function PresskitCapturaPage({
  params,
}: {
  params: Promise<{ bandaId: string }>;
}) {
  const { bandaId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const puedeAcceder = await esSuperadmin(user.id);
  if (!puedeAcceder) redirect("/inicio");

  const bandas = await obtenerBandasTodas();
  const banda = bandas.find((b) => b.id === bandaId);
  if (!banda) redirect("/gestion?tab=bandas");

  const presskit = await obtenerOCrearPresskit(bandaId);
  const [fotos, redes, integrantes] = await Promise.all([
    obtenerFotos(presskit.id),
    obtenerRedes(presskit.id),
    obtenerPlazasConPersonaDeBanda(bandaId),
  ]);

  return (
    <div className="min-h-screen box-border px-6 py-8 md:px-16 md:py-11" style={{ background: "oklch(0.965 0.012 82)", color: "oklch(0.24 0.02 55)" }}>
      <Link href="/gestion?tab=bandas" className="mb-6 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ {banda.nombre} · Presskit
        </span>
      </Link>
      <PresskitCaptura
        banda={{ id: banda.id, nombre: banda.nombre, genero: banda.genero }}
        presskit={presskit}
        fotosIniciales={fotos}
        redesIniciales={redes}
        integrantes={integrantes}
      />
    </div>
  );
}
