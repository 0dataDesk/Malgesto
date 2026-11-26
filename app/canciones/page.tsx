import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { puedeVerBorradores } from "@/lib/bloques";
import { obtenerCanciones, type Cancion } from "@/lib/cancionesData";
import { ListaCanciones } from "@/components/canciones/ListaCanciones";
import { TabBar } from "@/components/shell/TabBar";
import { CopiarInstruccion } from "@/components/canciones/CopiarInstruccion";
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
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
        <EspacioSuperior>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.044 262)" }}>
            Canciones
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-fraunces), sans-serif", color: "oklch(0.24 0.044 262)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.044 262)" }}>
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
  const paraLista = visibles.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    autor: c.autor,
    genero: c.genero,
    esCover: c.esCover,
    esBorrador: c.esBorrador,
    tonalidadNota: c.tonalidadNota,
    tonalidadModo: c.tonalidadModo,
    bpm: c.bpm,
    duracionSegundos: c.duracionSegundos,
    totalCompases: c.totalCompases,
  }));

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.007 85)" }}>
      <EspacioSuperior maxWidth="max-w-[1800px]">
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.044 262)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
            <Link
              href="/canciones"
              className="font-mono text-[10px] font-bold tracking-wide no-underline"
              style={{ color: "oklch(0.5 0.044 262)" }}
            >
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-fraunces), sans-serif", color: "oklch(0.24 0.044 262)" }}
          >
            Canciones
          </h2>
          <span className="flex items-center gap-2.5">
            {puedeEscribir && <CopiarInstruccion />}
            <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.044 262)" }}>
              {visibles.length}
            </span>
          </span>
        </div>

        {visibles.length === 0 ? (
          <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.044 262)" }}>
            Todavía no hay canciones para {nombreBandaActiva}.
          </p>
        ) : (
          <ListaCanciones canciones={paraLista} puedeEscribir={puedeEscribir} />
        )}
      </EspacioSuperior>

      {puedeEscribir && (
        <Link
          href={`/canciones/nueva?banda=${bandaActiva}`}
          className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
          style={{ background: "oklch(0.64 0.170 28)", color: "oklch(0.99 0.006 85)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
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
