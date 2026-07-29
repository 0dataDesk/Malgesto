import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias } from "@/lib/malgestoEventos";
import { obtenerSetlists } from "@/lib/setlistsData";
import { crearSetlistAction } from "@/app/set-list/actions";
import { TabBar } from "@/components/shell/TabBar";

// Sets guardados (pantalla 09), filtrado por banda activa igual que
// Canciones y Calendario.
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

  const membresiasConBloque = membresias.filter((m) => m.setlistHabilitado);
  if (membresiasConBloque.length === 0) redirect("/inicio");

  const bandaValida = membresiasConBloque.some((m) => m.bandaId === bandaParam);
  const bandaActiva = bandaValida ? bandaParam! : membresiasConBloque[0].bandaId;
  const nombreBandaActiva = membresiasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const setlists = await obtenerSetlists([bandaActiva]);
  const crear = crearSetlistAction.bind(null, bandaActiva);

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          {nombreBandaActiva}
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

        {membresiasConBloque.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {membresiasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/set-list?banda=${m.bandaId}`}
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
        esSuperadmin={esSuperadminDeMembresias(membresias)}
        mostrarCanciones={membresias.some((m) => m.cancionesHabilitado)}
        mostrarSeteos={membresias.some((m) => m.seteosHabilitado)}
      />
    </div>
  );
}
