import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque } from "@/lib/malgestoEventos";
import { obtenerBandasTodas } from "@/lib/gestionData";
import { obtenerOCrearPresskit } from "@/lib/presskitData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";
import { EstadoBadge, VisitarCompartirPresskit } from "@/components/presskit/PresskitEstado";

// Pantalla "Presskit" de nivel superior (Brief "Presskit — vista propia,
// estatus, liga publicada" §1): mismo patrón de selector de banda que
// Canciones/Setlist/Seteos/Stage Plot, pero gateado a superadmin -- Presskit
// no es un bloque que cada banda activa/desactiva (no hay
// `presskit_habilitado` en `bandas`), es una consola de gestión, así que el
// universo de bandas es `obtenerBandasTodas()` (Gestión), no las membresías
// del usuario. El botón "Presskit" que antes vivía en Gestión > Bandas
// (DetalleBanda) se quitó de ahí -- este es ahora el único punto de entrada.
export default async function PresskitPage({
  searchParams,
}: {
  searchParams: Promise<{ banda?: string }>;
}) {
  const { banda: bandaParam } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const superadmin = esSuperadminDeMembresias(membresias);
  if (!superadmin) redirect("/inicio");

  const bandas = (await obtenerBandasTodas()).filter((b) => !b.archivada);
  if (bandas.length === 0) redirect("/inicio");

  const bandaValida = bandas.some((b) => b.id === bandaParam);

  const propsTabBar = {
    userEmail: user.email,
    esSuperadmin: superadmin,
    mostrarCanciones: algunaBandaConBloque(membresias, "canciones", superadmin),
    mostrarSetlist: algunaBandaConBloque(membresias, "set_list", superadmin),
    mostrarSeteos: algunaBandaConBloque(membresias, "seteos", superadmin),
    mostrarFinanzas: algunaBandaConBloque(membresias, "finanzas", superadmin),
    mostrarStagePlot: algunaBandaConBloque(membresias, "stage_plot", superadmin),
  };

  if (!bandaValida && bandas.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Presskit
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver su presskit.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandas.map((b) => (
              <TarjetaSeleccionarBanda
                key={b.id}
                membresia={{
                  bandaId: b.id,
                  bandaNombre: b.nombre,
                  color: b.color,
                  emoji: b.emoji,
                  genero: b.genero,
                  rol: "superadmin",
                  cancionesHabilitado: true,
                  setlistHabilitado: true,
                  seteosHabilitado: true,
                  finanzasHabilitado: true,
                  stagePlotHabilitado: true,
                  bloquesVisibles: null,
                }}
                href={`/presskit?banda=${b.id}`}
              />
            ))}
          </div>
        </EspacioSuperior>

        <TabBar activa="presskit" {...propsTabBar} />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandas[0].id;
  const banda = bandas.find((b) => b.id === bandaActiva)!;
  const presskit = await obtenerOCrearPresskit(bandaActiva);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <EspacioSuperior>
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {banda.nombre}
          </div>
          {bandas.length > 1 && (
            <Link href="/presskit" className="font-mono text-[10px] font-bold tracking-wide no-underline" style={{ color: "oklch(0.5 0.02 55)" }}>
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            Presskit
          </h2>
          <Link
            href={`/presskit-captura/${bandaActiva}`}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold no-underline"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            Editar
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                Estatus
              </span>
              <EstadoBadge presskit={presskit} />
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
            <VisitarCompartirPresskit liga={presskit.ligaPublicada} />
            {!presskit.ligaPublicada && (
              <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                Todavía no hay página publicada. La liga se pega desde &quot;Editar&quot;.
              </p>
            )}
          </div>
        </div>
      </EspacioSuperior>

      <TabBar activa="presskit" {...propsTabBar} />
    </div>
  );
}
