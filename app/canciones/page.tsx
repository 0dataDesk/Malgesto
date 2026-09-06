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
// Diseño Fase 2 (Vista de Cancion.dc.html, pantalla "Lista"): dos secciones
// con encabezado tipo "PROPIAS ──── 7". Tarjeta de canción: título + badge
// "Borrador" (borde punteado acento) o chip de autor en covers; fila de
// datos en mono con la tonalidad coloreada. Los borradores usan fondo y
// borde punteados para leerse "en obra" antes de abrirlos.
const MONO = "var(--font-space-mono), ui-monospace, monospace";

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
    <div className="mt-5 first:mt-4">
      <div className="flex items-baseline gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: "oklch(0.24 0.02 55)" }}>
          {titulo}
        </h3>
        <div className="h-px flex-1" style={{ background: "oklch(0.89 0.013 78)" }} />
        <span className="text-[10px]" style={{ fontFamily: MONO, color: "oklch(0.5 0.02 55)" }}>
          {canciones.length}
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-2">
        {canciones.map((c) => (
          <div key={c.id} className="flex items-stretch gap-2">
            <Link
              href={`/canciones/${c.id}`}
              className="min-w-0 flex-1 rounded-2xl p-3.5 no-underline"
              style={{
                background: c.esBorrador ? "oklch(0.975 0.01 82)" : "oklch(0.99 0.008 82)",
                border: c.esBorrador ? "1px dashed oklch(0.85 0.016 78)" : "1px solid oklch(0.89 0.013 78)",
              }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[17px] font-bold" style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}>
                  {c.titulo}
                </span>
                {c.esCover && c.autor && (
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: MONO, background: "oklch(0.93 0.016 78)", color: "oklch(0.5 0.02 55)" }}>
                    {c.autor}
                  </span>
                )}
                {c.esBorrador && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                    style={{ fontFamily: MONO, border: "1px dashed oklch(0.64 0.15 34)", color: "oklch(0.64 0.15 34)" }}
                  >
                    Borrador
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px]" style={{ fontFamily: MONO, color: "oklch(0.5 0.02 55)" }}>
                <span className="text-[15px] font-bold" style={{ color: colorRaizAcorde(c.tonalidadNota, c.tonalidadModo) }}>
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
                className="flex shrink-0 items-center rounded-2xl px-3 text-xs font-bold no-underline"
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
            <div className="mt-5 flex items-start gap-2 text-[11px] leading-snug" style={{ color: "oklch(0.6 0.02 55)" }}>
              <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ border: "1px dashed oklch(0.64 0.15 34)" }} />
              <span>Los borradores solo los ven administradores de la banda y quien tenga el permiso &ldquo;Ver borradores&rdquo;.</span>
            </div>
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
