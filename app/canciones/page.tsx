import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { puedeVerBorradores } from "@/lib/bloques";
import { obtenerCanciones, type Cancion } from "@/lib/cancionesData";
import { colorRaizAcorde } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { TabBar } from "@/components/shell/TabBar";
import { EspacioSuperior } from "@/components/shell/EspacioSuperior";
import { TarjetaSeleccionarBanda } from "@/components/ui/TarjetaSeleccionarBanda";

// Brief "Canciones: selector de banda previo" — mismo patrón que Finanzas
// (Brief de corrección §1 de Finanzas): sin ?banda= válido y con más de una
// banda con el bloque activo, se muestra un selector explícito antes de
// entrar, en vez de los chips-tab que había antes dentro de la misma vista.
// Con una sola banda con el bloque, se salta directo (mismo criterio).
//
// Brief "Fase 3: nueva vista de Canción" (Fase 1 §1 y §1.2):
//  - Las canciones en borrador solo las ven admins de la banda + integrantes
//    con el permiso "Ver borradores" (puedeVerBorradores).
//  - La lista se separa en dos secciones: Propias y Covers (es_cover).
function SeccionCanciones({
  titulo,
  canciones,
  puedeEscribir,
}: {
  titulo: string;
  canciones: Cancion[];
  puedeEscribir: boolean;
}) {
  if (canciones.length === 0) return null;
  return (
    <div className="mt-6 first:mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "oklch(0.5 0.02 55)" }}>
          {titulo}
        </h3>
        <span className="font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
          {canciones.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
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
                <span className="truncate">{c.titulo}</span>
                {c.esBorrador && (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: "oklch(0.55 0.15 70 / 0.16)", color: "oklch(0.5 0.13 70)" }}
                  >
                    Borrador
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-3 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                <span className="text-base font-extrabold" style={{ color: colorRaizAcorde(c.tonalidadNota, c.tonalidadModo) }}>
                  {c.tonalidadNota}
                  {c.tonalidadModo === "menor" ? "m" : ""}
                </span>
                {c.bpm && <span>{c.bpm} BPM</span>}
                {c.duracionSegundos !== null && <span>{formatoMMSS(c.duracionSegundos)}</span>}
                {c.totalSecciones > 0 && <span>{c.totalSecciones} {c.totalSecciones === 1 ? "sección" : "secciones"}</span>}
              </div>
            </Link>
            {puedeEscribir && (
              <Link
                href={`/canciones/${c.id}/editar`}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold no-underline"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                {c.esBorrador ? "Seguir" : "Editar"}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const bandasConBloque = membresiasConBloque(membresias, "canciones", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <EspacioSuperior>
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
        </EspacioSuperior>

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
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const membresiaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)!;
  const nombreBandaActiva = membresiaActiva.bandaNombre;
  // Crear/editar canciones es solo para administrador/superadmin (el servidor
  // igual lo exige en actions.ts, esto es solo UX).
  const puedeEscribir = membresiaActiva.rol === "administrador" || membresiaActiva.rol === "superadmin";
  const verBorradores = puedeVerBorradores(membresiaActiva, superadmin);

  const todas = await obtenerCanciones([bandaActiva]);
  const visibles = verBorradores ? todas : todas.filter((c) => !c.esBorrador);
  const propias = visibles.filter((c) => !c.esCover);
  const covers = visibles.filter((c) => c.esCover);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <EspacioSuperior>
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
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
            {visibles.length}
          </span>
        </div>

        {visibles.length === 0 ? (
          <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay canciones para {nombreBandaActiva}.
          </p>
        ) : (
          <>
            <SeccionCanciones titulo="Propias" canciones={propias} puedeEscribir={puedeEscribir} />
            <SeccionCanciones titulo="Covers" canciones={covers} puedeEscribir={puedeEscribir} />
          </>
        )}
      </EspacioSuperior>

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
        mostrarPresskit={algunaBandaConBloque(membresias, "presskit", superadmin)}
      />
    </div>
  );
}
