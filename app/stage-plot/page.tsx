import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerOCrearStagePlot } from "@/lib/stagePlotData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { StagePlotLienzo } from "@/components/stagePlot/StagePlotLienzo";
import { BotonCopiarLink } from "@/components/stagePlot/StagePlotAcciones";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";

// Vista de solo lectura, pensada para compartir con el sonidista del venue
// sin pasar por el editor (Brief Stage Plot §4) — mismo patrón de selector
// de banda ?banda= que Canciones/Seteos (una plantilla por banda, se
// reusa en todos sus shows, sin selector por show en esta primera versión).
export default async function StagePlotPage({
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
  const bandasConBloque = membresiasConBloque(membresias, "stage_plot", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Stage Plot
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver su stage plot.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/stage-plot?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>

        <TabBar
          activa="stage_plot"
          userEmail={user.email}
          esSuperadmin={superadmin}
          mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
          mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
          mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
          mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
        />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva);
  const nombreBandaActiva = membresiaActiva?.bandaNombre ?? "";
  const colorBandaActiva = membresiaActiva?.color ?? "oklch(0.6 0.02 55)";
  const puedeEscribir = membresiaActiva?.rol === "administrador" || membresiaActiva?.rol === "superadmin";

  const stagePlot = await obtenerOCrearStagePlot(bandaActiva);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <EspacioSuperior maxWidth="max-w-3xl">
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
            <Link href="/stage-plot" className="font-mono text-[10px] font-bold tracking-wide no-underline" style={{ color: "oklch(0.5 0.02 55)" }}>
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            Stage Plot
          </h2>
          {puedeEscribir && (
            <Link
              href={`/stage-plot/editar?banda=${bandaActiva}`}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold no-underline"
              style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
            >
              Editar
            </Link>
          )}
        </div>

        <div className="mt-4">
          {stagePlot.items.length === 0 ? (
            <p className="mb-3 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              {puedeEscribir
                ? `Todavía no armaste el stage plot de ${nombreBandaActiva}.`
                : `${nombreBandaActiva} todavía no tiene un stage plot armado.`}
            </p>
          ) : null}
          <StagePlotLienzo items={stagePlot.items} bandaColor={colorBandaActiva} />
        </div>

        {/* Brief "Rediseño de Stage Plot — Entrega 1" §5: "Copiar link
            público" es la única acción de esta vista además de "Editar" --
            la descarga se corrió al link público (app/plot/[token]). */}
        <div className="mt-4">
          <BotonCopiarLink shareToken={stagePlot.shareToken} />
        </div>
      </EspacioSuperior>

      <TabBar
        activa="stage_plot"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
        mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
        mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
        mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
      />
    </div>
  );
}
