import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque, obtenerEventos } from "@/lib/malgestoEventos";
import { obtenerMovimientos, type Movimiento } from "@/lib/finanzasData";
import { formatoMoneda, eventoYaPaso } from "@/lib/eventoUI";
import { TabBar } from "@/components/shell/TabBar";
import { NuevoMovimientoForm } from "@/components/finanzas/NuevoMovimientoForm";
import { MovimientoFila } from "@/components/finanzas/MovimientoFila";

// Brief "Finanzas: ingresos automáticos de shows futuros...": un movimiento
// manual siempre cuenta (decisión explícita del usuario); uno automático
// (ingreso esperado de un show) solo cuenta una vez que el show ya pasó —
// se evalúa en vivo con eventoYaPaso() en cada lectura, sin cron ni estado
// persistido. Se usa tanto para el Balance grande como para el de cada
// banda en el selector, así ambos números nunca se contradicen entre sí.
function movimientoDisponible(m: Movimiento): boolean {
  if (!m.automatico) return true;
  if (!m.eventoFechaInicio) return true;
  return eventoYaPaso({ fechaInicio: m.eventoFechaInicio, fechaFin: m.eventoFechaFin });
}

// Pantalla de Finanzas (Brief 21 §3) — bloque opcional, mismo patrón de
// filtro por banda activa que Canciones/Set List/Seteos, con una excepción
// (Brief de corrección §1): acá maneja plata, así que un default silencioso
// a la primera banda es peligroso (así se guardó sin querer un movimiento en
// ODR). Sin ?banda= válido y con más de una banda con el bloque, se muestra
// un selector explícito antes de entrar — nunca se elige por el usuario.
export default async function FinanzasPage({
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
  const bandasConBloque = membresiasConBloque(membresias, "finanzas", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    // Brief de corrección §1: el balance de cada banda se ve acá mismo, antes
    // de entrar — para eso hace falta un solo fetch con TODOS los bandaIds
    // del selector (no uno por banda), agrupado en memoria.
    const movimientosTodas = await obtenerMovimientos(bandasConBloque.map((m) => m.bandaId));
    const balancePorBanda = new Map<string, number>();
    for (const m of movimientosTodas) {
      if (!movimientoDisponible(m)) continue;
      const signo = m.tipo === "entrada" ? 1 : -1;
      balancePorBanda.set(m.bandaId, (balancePorBanda.get(m.bandaId) ?? 0) + signo * m.monto);
    }

    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <div className="mx-auto max-w-2xl px-5 pt-5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Finanzas
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver sus movimientos.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {bandasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/finanzas?banda=${m.bandaId}`}
                className="flex items-center justify-between rounded-2xl p-4 text-base font-bold no-underline"
                style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", color: "oklch(0.24 0.02 55)" }}
              >
                <span>{m.bandaNombre}</span>
                <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
                  {formatoMoneda(balancePorBanda.get(m.bandaId) ?? 0)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <TabBar
          activa="finanzas"
          userEmail={user.email}
          esSuperadmin={superadmin}
          mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
          mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
          mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
        />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const [movimientos, eventos] = await Promise.all([obtenerMovimientos([bandaActiva]), obtenerEventos([bandaActiva])]);

  const movimientosDisponibles = movimientos.filter(movimientoDisponible);
  const totalEntradas = movimientosDisponibles.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.monto, 0);
  const totalSalidas = movimientosDisponibles.filter((m) => m.tipo === "salida").reduce((acc, m) => acc + m.monto, 0);
  const balance = totalEntradas - totalSalidas;

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
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
              href="/finanzas"
              className="font-mono text-[10px] font-bold tracking-wide no-underline"
              style={{ color: "oklch(0.5 0.02 55)" }}
            >
              · ‹ Cambiar de banda
            </Link>
          )}
        </div>
        <h2
          className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Finanzas
        </h2>

        <div className="mt-4 rounded-2xl p-4" style={{ background: "oklch(0.24 0.02 55)" }}>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.74 0.12 78)" }}>
            Balance
          </div>
          <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "oklch(0.96 0.012 82)" }}>
            {formatoMoneda(balance)}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {movimientos.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no hay movimientos para {nombreBandaActiva}.
            </p>
          )}
          {movimientos.map((m) => (
            <MovimientoFila key={m.id} movimiento={m} disponible={movimientoDisponible(m)} esSuperadmin={superadmin} />
          ))}
        </div>

        <NuevoMovimientoForm bandaId={bandaActiva} eventos={eventos.map((e) => ({ id: e.id, titulo: e.titulo }))} />
      </div>

      <TabBar
        activa="finanzas"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
        mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
        mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
      />
    </div>
  );
}
