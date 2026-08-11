import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerCanciones } from "@/lib/cancionesData";
import { colorRaizAcorde } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { TabBar } from "@/components/shell/TabBar";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";

// Brief "Canciones: selector de banda previo" — mismo patrón que Finanzas
// (Brief de corrección §1 de Finanzas): sin ?banda= válido y con más de una
// banda con el bloque activo, se muestra un selector explícito antes de
// entrar, en vez de los chips-tab que había antes dentro de la misma vista.
// Con una sola banda con el bloque, se salta directo (mismo criterio).
export default async function CancionesPage({
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

  // El bloque Canciones puede estar desactivado por banda, o restringido
  // por persona (Brief 21 §1) — si ninguna banda del usuario lo hace
  // efectivamente visible, la sección entera no es accesible.
  const bandasConBloque = membresiasConBloque(membresias, "canciones", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <div className="mx-auto max-w-2xl px-5 pt-20">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Canciones
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver su repertorio.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {bandasConBloque.map((m) => (
              <TarjetaSeleccionarBanda key={m.bandaId} membresia={m} href={`/canciones?banda=${m.bandaId}`} />
            ))}
          </div>
        </div>

        <TabBar
          activa="canciones"
          userEmail={user.email}
          esSuperadmin={superadmin}
          mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
          mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
          mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
          mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
        />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";
  // Brief "Nuevo nivel de rol": crear/editar canciones es ahora solo para
  // administrador/superadmin — un miembro simple ve la lista pero no estos
  // controles (el servidor igual lo exige en actions.ts, esto es solo UX).
  const rolEnBanda = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.rol;
  const puedeEscribir = rolEnBanda === "administrador" || rolEnBanda === "superadmin";

  const canciones = await obtenerCanciones([bandaActiva]);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-20">
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
            // Brief de corrección "Reposicionar Cambiar de banda": antes vivía
            // a la derecha (justify-between) y se encimaba con los botones
            // flotantes de Gestión/Cerrar sesión (top-right, fixed) — ahora
            // vive junto al nombre de banda, a la izquierda.
            <Link
              href="/canciones"
              className="font-mono text-[10px] font-bold tracking-wide no-underline"
              style={{ color: "oklch(0.5 0.02 55)" }}
            >
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            Canciones
          </h2>
          <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            {canciones.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {canciones.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no hay canciones para {nombreBandaActiva}.
            </p>
          )}
          {canciones.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl p-3.5"
              style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
            >
              <Link href={`/canciones/${c.id}`} className="min-w-0 flex-1 no-underline">
                <div
                  className="flex items-center gap-2 text-[17px] font-bold"
                  style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  {c.titulo}
                  {c.esCover && (
                    <span
                      className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.5 0.02 55)" }}
                    >
                      Cover
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-3 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                  {/* Brief de refinamiento §1: la nota usa el mismo color por
                      tonalidad que ya existe para acordes (colorRaizAcorde) —
                      Modo ("mayor"/"menor") entra tal cual como Calidad,
                      mismas dos categorías de color que ya usa ChordBlock. */}
                  <span className="text-base font-extrabold" style={{ color: colorRaizAcorde(c.tonalidadNota, c.tonalidadModo) }}>
                    {c.tonalidadNota}
                    {c.tonalidadModo === "menor" ? "m" : ""}
                  </span>
                  {c.bpm && <span>{c.bpm} BPM</span>}
                  {c.duracionSegundos !== null && <span>{formatoMMSS(c.duracionSegundos)}</span>}
                  {c.totalCompases > 0 && <span>{c.totalCompases} compases</span>}
                </div>
              </Link>
              {puedeEscribir && (
                <Link
                  href={`/canciones/${c.id}/editar`}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold no-underline"
                  style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
                >
                  Editar
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {puedeEscribir && (
        <Link
          href={`/canciones/nueva?banda=${bandaActiva}`}
          className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
        >
          +
        </Link>
      )}

      <TabBar
        activa="canciones"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
        mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
        mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
        mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
      />
    </div>
  );
}
