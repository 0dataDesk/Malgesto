import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerDispositivosDeUsuario } from "@/lib/dispositivosData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";

function resumenSeteos(cantidadGeneral: number, cantidadPorCancion: number): string {
  const partes: string[] = [];
  if (cantidadGeneral > 0) partes.push("1 general");
  if (cantidadPorCancion > 0) partes.push(`${cantidadPorCancion} por canción`);
  return partes.join(" + ");
}

const ETIQUETA_CATEGORIA: Record<string, string> = { amplificador: "Amplificador", pedal: "Pedal" };

// Pantalla "Seteos" (brief "Seteos — catálogo de diseños"): ya no es donde se
// dan de alta dispositivos (eso pasó a Gestión > Integrantes) — acá solo se
// listan los ya asignados al usuario actual en la banda activa y se entra a
// su detalle a editar seteos. Selector de banda con el mismo patrón de
// tarjetas que Canciones/Finanzas/Set List/Stage Plot.
export default async function SeteosPage({
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
  const bandasConBloque = membresiasConBloque(membresias, "seteos", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Seteos
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver tus dispositivos.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/seteos?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>

        <TabBar
          activa="seteos"
          userEmail={user.email}
          esSuperadmin={superadmin}
          mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
          mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
          mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
          mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
        />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const dispositivos = await obtenerDispositivosDeUsuario([bandaActiva], user.id);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <EspacioSuperior>
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
            <Link href="/seteos" className="font-mono text-[10px] font-bold tracking-wide no-underline" style={{ color: "oklch(0.5 0.02 55)" }}>
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            Seteos
          </h2>
          <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            {dispositivos.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {dispositivos.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no tenés dispositivos asignados en {nombreBandaActiva}. Pedile a un administrador que te asigne uno desde
              Gestión &gt; Integrantes.
            </p>
          )}
          {dispositivos.map((d) => (
            <Link
              key={d.id}
              href={`/seteos/${d.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl p-4 no-underline"
              style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
            >
              <div>
                <div
                  className="text-[19px] font-bold"
                  style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  {d.apodo || `${d.disenoMarca} ${d.disenoModelo}`}
                </div>
                <div className="mt-1 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                  {ETIQUETA_CATEGORIA[d.categoria] ?? d.categoria} · {d.disenoMarca} {d.disenoModelo}
                  {resumenSeteos(d.cantidadGeneral, d.cantidadPorCancion) && ` · ${resumenSeteos(d.cantidadGeneral, d.cantidadPorCancion)}`}
                </div>
              </div>
              {d.cantidadGeneral === 0 && (
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase"
                  style={{ background: "oklch(0.6 0.15 40 / 0.15)", color: "oklch(0.5 0.18 40)" }}
                >
                  Falta seteo general
                </span>
              )}
            </Link>
          ))}
        </div>
      </EspacioSuperior>

      <TabBar
        activa="seteos"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
        mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
        mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
        mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
      />
    </div>
  );
}
