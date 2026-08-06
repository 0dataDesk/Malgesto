import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, algunaBandaConBloque, membresiasConBloque } from "@/lib/malgestoEventos";
import { obtenerSetlists } from "@/lib/setlistsData";
import { crearSetlistAction } from "@/app/set-list/actions";
import { TabBar } from "@/components/shell/TabBar";

// Brief "Set List: selector de banda previo": mismo patrón que Canciones y
// Finanzas — reemplaza los chips de filtro que vivían dentro de la vista por
// una pantalla "¿Qué banda?" previa, sin ?banda= válido y con más de una
// banda con el bloque activo. Con una sola banda, se salta directo.
export default async function SetListPage({
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
  const bandasConBloque = membresiasConBloque(membresias, "set_list", superadmin);
  if (bandasConBloque.length === 0) redirect("/inicio");

  const bandaValida = bandasConBloque.some((m) => m.bandaId === bandaParam);

  if (!bandaValida && bandasConBloque.length > 1) {
    return (
      <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
        <div className="mx-auto max-w-2xl px-5 pt-20">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Set List
          </div>
          <h2
            className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
          >
            ¿Qué banda?
          </h2>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Elegí la banda antes de ver sus Set Lists.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {bandasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/set-list?banda=${m.bandaId}`}
                className="flex items-center justify-between rounded-2xl p-4 text-base font-bold no-underline"
                style={{ background: m.color, color: "oklch(0.99 0.01 82)" }}
              >
                <span>{m.bandaNombre}</span>
              </Link>
            ))}
          </div>
        </div>

        <TabBar
          activa="setlist"
          userEmail={user.email}
          esSuperadmin={superadmin}
          mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
          mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
          mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
          mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
        />
      </div>
    );
  }

  const bandaActiva = bandaValida ? bandaParam! : bandasConBloque[0].bandaId;
  const nombreBandaActiva = bandasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const setlists = await obtenerSetlists([bandaActiva]);
  const crear = crearSetlistAction.bind(null, bandaActiva);

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-20">
        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {nombreBandaActiva}
          </div>
          {bandasConBloque.length > 1 && (
            <Link
              href="/set-list"
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
            Set Lists
          </h2>
          <span className="font-mono text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            {setlists.length}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {setlists.length === 0 && (
            <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no hay Set Lists para {nombreBandaActiva}.
            </p>
          )}
          {setlists.map((s) => (
            <Link
              key={s.id}
              href={`/set-list/${s.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl p-4 no-underline"
              style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
            >
              <div
                className="text-[19px] font-bold"
                style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {s.nombre}
              </div>
              <div className="font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                {s.cantidadCanciones} {s.cantidadCanciones === 1 ? "canción" : "canciones"}
              </div>
            </Link>
          ))}
        </div>

        <form action={crear} className="mt-5 flex gap-2">
          <input
            name="nombre"
            required
            placeholder="Nombre del Set List"
            className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
            style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            + Nuevo set
          </button>
        </form>
      </div>

      <TabBar
        activa="setlist"
        userEmail={user.email}
        esSuperadmin={superadmin}
        mostrarCanciones={algunaBandaConBloque(membresias, "canciones", superadmin)}
        mostrarSeteos={algunaBandaConBloque(membresias, "seteos", superadmin)}
        mostrarFinanzas={algunaBandaConBloque(membresias, "finanzas", superadmin)}
        mostrarStagePlot={algunaBandaConBloque(membresias, "stage_plot", superadmin)}
      />
    </div>
  );
}
