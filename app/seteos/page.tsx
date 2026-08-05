import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerDispositivos } from "@/lib/dispositivosData";
import { colorConAlpha } from "@/lib/eventoUI";
import { TabBar } from "@/components/shell/TabBar";
import { NuevoDispositivoForm } from "@/components/dispositivos/NuevoDispositivoForm";

function resumenSeteos(cantidadGeneral: number, cantidadPorCancion: number): string {
  if (cantidadGeneral === 0 && cantidadPorCancion === 0) return "Sin seteos todavía";
  const partes: string[] = [];
  if (cantidadGeneral > 0) partes.push("1 general");
  if (cantidadPorCancion > 0) partes.push(`${cantidadPorCancion} por canción`);
  return partes.join(" + ");
}

// Pantalla 12 "Mis dispositivos" (Brief 6) — solo los dispositivos del
// usuario actual en la banda activa, mismo patrón de filtro por banda que
// Canciones y Set List.
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
  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const dispositivos = await obtenerDispositivos([bandaActiva], user.id);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          {nombreBandaActiva}
        </div>
        <div className="flex items-end justify-between gap-3">
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            Mis dispositivos
          </h2>
          <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            {dispositivos.length}
          </span>
        </div>

        {bandasConBloque.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {bandasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/seteos?banda=${m.bandaId}`}
                className="rounded-2xl px-3.5 py-2 text-sm font-bold no-underline"
                style={
                  m.bandaId === bandaActiva
                    ? { background: m.color, color: "oklch(0.99 0.01 82)" }
                    : { background: colorConAlpha(m.color, 0.14), color: m.color }
                }
              >
                {m.bandaNombre}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {dispositivos.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no cargaste dispositivos en {nombreBandaActiva}.
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
                  {d.nombre}
                </div>
                <div className="mt-1 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                  {d.tipoControl === "eq_grafico" ? "EQ gráfico" : "Perillas"} · {resumenSeteos(d.cantidadGeneral, d.cantidadPorCancion)}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <NuevoDispositivoForm bandaId={bandaActiva} />
      </div>

      <TabBar
        activa="seteos"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
        mostrarSetlist={algunaBandaConBloque(membresias, "set_list", superadmin)}
        mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
      />
    </div>
  );
}
