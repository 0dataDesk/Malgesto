import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerOCrearStagePlot, obtenerPlazasConPersonaDeBanda, obtenerAmplificadoresDeBanda } from "@/lib/stagePlotData";
import { construirRider, obtenerRiderInfo, obtenerInputListManual } from "@/lib/riderData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { RiderTecnicoModulo } from "@/components/stagePlot/RiderTecnicoModulo";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider":
// el bloque pasa de "Stage Plot" a "Rider Técnico" en todo texto visible
// (acá, TabBar, Gestión > Bandas) -- la clave interna del bloque
// (`"stage_plot"`, la ruta `/stage-plot`, la columna `stage_plot_habilitado`)
// se queda igual a propósito, es una decisión de scope más chica y de
// mucho más blast radius (6+ archivos, migración) que renombrar el rótulo
// que ve la gente. Ya no hay una ruta aparte para editar el plot
// (/stage-plot/editar, redirige acá) -- las tres secciones (Rider/Stage/
// Input) viven en un solo módulo (RiderTecnicoModulo), Paso 5 "coherencia
// visual": antes se sentía como pantallas sueltas pegadas.
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

  const propsTabBar = {
    userEmail: user.email,
    esSuperadmin: superadmin,
    mostrarCanciones: algunaBandaConBloque(membresias, "canciones", superadmin),
    mostrarSetlist: algunaBandaConBloque(membresias, "set_list", superadmin),
    mostrarSeteos: algunaBandaConBloque(membresias, "seteos", superadmin),
    mostrarFinanzas: algunaBandaConBloque(membresias, "finanzas", superadmin),
    // Fix: esta página nunca pasaba mostrarStagePlot a TabBar (a diferencia
    // de Canciones/Finanzas/Seteos/Set List/Presskit, que sí lo calculan) --
    // quedaba en el default `true` de TabBar sin importar bloques_visibles
    // por integrante puntual. Inofensivo en la práctica (no se puede llegar
    // acá sin acceso a este bloque en al menos una banda, ver el redirect de
    // arriba), pero inconsistente con el resto; se corrige de paso.
    mostrarStagePlot: algunaBandaConBloque(membresias, "stage_plot", superadmin),
    mostrarPresskit: algunaBandaConBloque(membresias, "presskit", superadmin),
  };

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Rider Técnico
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver su rider técnico.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/stage-plot?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>

        <TabBar activa="stage_plot" {...propsTabBar} />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva);
  const nombreBandaActiva = membresiaActiva?.bandaNombre ?? "";
  const colorBandaActiva = membresiaActiva?.color ?? "oklch(0.6 0.02 55)";
  const puedeEditar = membresiaActiva?.rol === "administrador" || membresiaActiva?.rol === "superadmin";

  // obtenerOCrearStagePlot va primero y sola (no en el Promise.all de abajo):
  // crea la fila si no existe, y correrla dos veces en paralelo arriesgaría
  // una carrera contra el UNIQUE(banda_id) si ambas ven "no existe" antes de
  // que la primera termine de insertar.
  const stagePlot = await obtenerOCrearStagePlot(bandaActiva);
  const [rider, infoRider, inputListManual, plazas, amplificadores] = await Promise.all([
    construirRider(stagePlot, bandaActiva, nombreBandaActiva, colorBandaActiva),
    obtenerRiderInfo(stagePlot.id),
    obtenerInputListManual(stagePlot.id),
    puedeEditar ? obtenerPlazasConPersonaDeBanda(bandaActiva) : Promise.resolve([]),
    puedeEditar ? obtenerAmplificadoresDeBanda(bandaActiva) : Promise.resolve([]),
  ]);

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
        <h2
          className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Rider Técnico
        </h2>

        <div className="mt-4">
          <RiderTecnicoModulo
            bandaId={bandaActiva}
            bandaColor={colorBandaActiva}
            puedeEditar={puedeEditar}
            stagePlotId={stagePlot.id}
            itemsIniciales={stagePlot.items}
            rider={rider}
            riderInfo={infoRider}
            inputListManual={inputListManual}
            plazas={plazas}
            amplificadores={amplificadores}
            shareToken={stagePlot.shareToken}
          />
        </div>
      </EspacioSuperior>

      <TabBar activa="stage_plot" {...propsTabBar} />
    </div>
  );
}
