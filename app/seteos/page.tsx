import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerDispositivosCompletosDeUsuario, crearSeteoGeneralConDefaults, type Seteo } from "@/lib/dispositivosData";
import { obtenerCanciones } from "@/lib/cancionesData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";
import { DispositivoPanel } from "@/components/dispositivos/DispositivoPanel";

// Pantalla "Seteos" (brief "Seteos — rediseño de navegación, layout agrupado
// y selector de canción"): sin pantalla intermedia de lista — aterriza
// directo en el panel completo de cada dispositivo asignado al usuario
// actual, ya en modo General. Selector de banda con el mismo patrón de
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

  const [dispositivos, canciones] = await Promise.all([
    obtenerDispositivosCompletosDeUsuario([bandaActiva], user.id),
    obtenerCanciones([bandaActiva]),
  ]);

  // Brief §4 (Seteo general obligatorio): si un dispositivo todavía no tiene
  // uno, se crea acá mismo con los valor_default del diseño, antes de
  // mostrar la pantalla — así siempre aterriza directo en modo General.
  const dispositivosConGeneral = await Promise.all(
    dispositivos.map(async (d) => {
      if (!d.diseno || d.seteos.some((s) => s.esGeneral)) return d;
      const general = await crearSeteoGeneralConDefaults(d.id, d.diseno.controles);
      const seteos: Seteo[] = [...d.seteos, general];
      return { ...d, seteos };
    })
  );

  const cancionesOpciones = canciones.map((c) => ({ id: c.id, titulo: c.titulo }));

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
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {dispositivosConGeneral.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no tenés dispositivos asignados en {nombreBandaActiva}. Pedile a un administrador que te asigne uno desde
              Gestión &gt; Integrantes.
            </p>
          )}
          {dispositivosConGeneral.map(
            (d) =>
              d.diseno && (
                <DispositivoPanel
                  key={d.id}
                  bandaId={bandaActiva}
                  dispositivoId={d.id}
                  disenoMarca={d.diseno.marca}
                  disenoModelo={d.diseno.modelo}
                  apodo={d.apodo}
                  controles={d.diseno.controles}
                  seteosIniciales={d.seteos}
                  cancionesDisponibles={cancionesOpciones}
                />
              )
          )}
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
