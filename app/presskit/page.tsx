import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerOCrearPresskit } from "@/lib/presskitData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";
import { EstadoBadge, VisitarCompartirPresskit } from "@/components/presskit/PresskitEstado";

// Pantalla "Presskit" de nivel superior (Brief "Presskit — vista propia,
// estatus, liga publicada" §1, revisado por Brief "Presskit como bloque,
// Liga publicada en Bandas, acordeón de bloques" §1): mismo patrón de
// selector de banda ?banda= que Canciones/Setlist/Seteos/Stage Plot --
// Presskit dejó de ser una consola siempre-accesible para superadmin y pasa
// a depender de `presskit_habilitado` por banda, igual que el resto de los
// bloques (bloqueVisible/membresiasConBloque, misma excepción de
// bloques_visibles por integrante puntual). "Editar" (que lleva a
// /presskit-captura) se muestra a superadmin y también a quien sea
// administrador de ESTA banda (Brief "Presskit: el botón 'Editar' también
// para admin de banda") -- mismo criterio rol-based que ya usa Stage Plot
// para su botón de edición.
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
  const bandasConBloque = membresiasConBloque(membresias, "presskit", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  const propsTabBar = {
    userEmail: user.email,
    esSuperadmin: superadmin,
    mostrarCanciones: algunaBandaConBloque(membresias, "canciones", superadmin),
    mostrarSetlist: algunaBandaConBloque(membresias, "set_list", superadmin),
    mostrarSeteos: algunaBandaConBloque(membresias, "seteos", superadmin),
    mostrarFinanzas: algunaBandaConBloque(membresias, "finanzas", superadmin),
    mostrarStagePlot: algunaBandaConBloque(membresias, "stage_plot", superadmin),
  };

  if (!bandaValida && bandasConBloque.length > 1) {
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
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/presskit?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>

        <TabBar activa="presskit" {...propsTabBar} />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)!;
  const presskit = await obtenerOCrearPresskit(bandaActiva);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <EspacioSuperior>
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {membresiaActiva.bandaNombre}
          </div>
          {bandasConBloque.length > 1 && (
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
          {(superadmin || membresiaActiva.rol === "administrador") && (
            <Link
              href={`/presskit-captura/${bandaActiva}`}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold no-underline"
              style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
            >
              Editar
            </Link>
          )}
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
                Todavía no hay página publicada.
              </p>
            )}
          </div>
        </div>
      </EspacioSuperior>

      <TabBar activa="presskit" {...propsTabBar} />
    </div>
  );
}
