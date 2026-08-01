import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque, obtenerEventos } from "@/lib/malgestoEventos";
import { obtenerMovimientos } from "@/lib/finanzasData";
import { formatoMoneda } from "@/lib/eventoUI";
import { TabBar } from "@/components/shell/TabBar";
import { NuevoMovimientoForm } from "@/components/finanzas/NuevoMovimientoForm";

function formatearFecha(iso: string): string {
  // "fecha" es date puro (YYYY-MM-DD) — parsear como local, no como UTC, para
  // que no se corra un día por la zona horaria del servidor.
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// Pantalla de Finanzas (Brief 21 §3) — bloque opcional, mismo patrón de
// filtro por banda activa que Canciones/Set List/Seteos.
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
  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const [movimientos, eventos] = await Promise.all([obtenerMovimientos([bandaActiva]), obtenerEventos([bandaActiva])]);

  const totalEntradas = movimientos.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.monto, 0);
  const totalSalidas = movimientos.filter((m) => m.tipo === "salida").reduce((acc, m) => acc + m.monto, 0);
  const balance = totalEntradas - totalSalidas;

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          {nombreBandaActiva}
        </div>
        <h2
          className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Finanzas
        </h2>

        {bandasConBloque.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {bandasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/finanzas?banda=${m.bandaId}`}
                className="rounded-2xl px-3.5 py-2 text-sm font-bold no-underline"
                style={{
                  background: m.bandaId === bandaActiva ? "oklch(0.24 0.02 55)" : "oklch(0.93 0.016 78)",
                  color: m.bandaId === bandaActiva ? "oklch(0.96 0.012 82)" : "oklch(0.4 0.02 55)",
                }}
              >
                {m.bandaNombre}
              </Link>
            ))}
          </div>
        )}

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
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-2xl p-3.5"
              style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
            >
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                  {m.concepto}
                </div>
                <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                  {formatearFecha(m.fecha)}
                  {m.eventoTitulo && ` · ${m.eventoTitulo}`}
                </div>
              </div>
              <span
                className="shrink-0 font-mono text-sm font-bold"
                style={{ color: m.tipo === "entrada" ? "oklch(0.5 0.13 148)" : "oklch(0.55 0.15 25)" }}
              >
                {m.tipo === "entrada" ? "+" : "−"}
                {formatoMoneda(m.monto)}
              </span>
            </div>
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
