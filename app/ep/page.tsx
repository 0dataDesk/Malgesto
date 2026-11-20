import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { listarProyectos, obtenerProyecto } from "@/lib/epData";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";
import { MapaEP } from "@/components/ep/MapaEP";
import { NuevoProyecto } from "@/components/ep/NuevoProyecto";

// Mapa del EP: planeación de un proyecto musical (curva de emoción por canción y sección).
// Vive aparte de Canciones (no mezcla armonía de canciones reales); usa el mismo permiso del bloque Canciones.
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";

export default async function EpPage({ searchParams }: { searchParams: Promise<{ banda?: string; proyecto?: string }> }) {
  const { banda: bandaParam, proyecto: proyectoParam } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");
  const superadmin = esSuperadminDeMembresias(membresias);

  const bandasConBloque = membresiasConBloque(membresias, "canciones", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);
  const tabBar = (
    <TabBar
      activa="canciones"
      userEmail={user.email}
      esSuperadmin={superadmin}
      mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
      mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
      mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
      mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
      mostrarPresskit={algunaBandaConBloque(membresias, "presskit", superadmin)}
    />
  );

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>Mapa del EP</div>
          <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>¿Qué banda?</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/ep?banda=${m.bandaId}`} />
            ))}
          </div>
        </EspacioSuperior>
        {tabBar}
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)!;
  const puedeEscribir = membresiaActiva.rol === "administrador" || membresiaActiva.rol === "superadmin";

  const proyectos = await listarProyectos(bandaActiva);
  const proyecto = proyectos.length > 0 ? await obtenerProyecto(bandaActiva, proyectos.some((p) => p.id === proyectoParam) ? proyectoParam : proyectos[0].id) : null;

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
      <EspacioSuperior maxWidth="max-w-none">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/canciones?banda=${bandaActiva}`} className="font-mono text-[10px] font-bold tracking-wide no-underline" style={{ color: MUTED }}>
            ‹ Canciones
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>· {membresiaActiva.bandaNombre}</span>
        </div>
        <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>
          Mapa del EP
        </h2>

        {proyectos.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {proyectos.map((p) => (
              <Link
                key={p.id}
                href={`/ep?banda=${bandaActiva}&proyecto=${p.id}`}
                className="rounded-full px-3 py-1 text-[11px] font-bold no-underline"
                style={{ background: p.id === proyecto?.id ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85)", color: p.id === proyecto?.id ? "oklch(0.99 0.006 85)" : MUTED }}
              >
                {p.nombre}
              </Link>
            ))}
          </div>
        )}

        {proyecto ? (
          <MapaEP key={proyecto.id} inicial={proyecto} puedeEscribir={puedeEscribir} />
        ) : (
          <div className="mt-6">
            <p className="text-sm" style={{ color: MUTED }}>
              Todavía no hay un proyecto para {membresiaActiva.bandaNombre}.
            </p>
            {puedeEscribir && <NuevoProyecto bandaId={bandaActiva} />}
          </div>
        )}

        {puedeEscribir && proyecto && (
          <div className="mt-8">
            <NuevoProyecto bandaId={bandaActiva} compacto />
          </div>
        )}
      </EspacioSuperior>
      {tabBar}
    </div>
  );
}
