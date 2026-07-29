import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias } from "@/lib/malgestoEventos";
import { obtenerCanciones } from "@/lib/cancionesData";
import { TabBar } from "@/components/shell/TabBar";

// Lista de canciones filtrada por banda activa, igual que el Calendario. Con
// más de una banda, el filtro es por link con ?banda=id (server-rendered,
// sin JS de cliente) — sin poder probarse con datos reales todavía, Jorge
// solo tiene ODR.
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

  // El bloque Canciones puede estar desactivado por banda (Brief 8 §2) — si
  // ninguna de las bandas del usuario lo tiene habilitado, la sección entera
  // no es accesible.
  const membresiasConBloque = membresias.filter((m) => m.cancionesHabilitado);
  if (membresiasConBloque.length === 0) redirect("/inicio");

  const bandaValida = membresiasConBloque.some((m) => m.bandaId === bandaParam);
  const bandaActiva = bandaValida ? bandaParam! : membresiasConBloque[0].bandaId;
  const nombreBandaActiva = membresiasConBloque.find((m) => m.bandaId === bandaActiva)?.bandaNombre ?? "";

  const canciones = await obtenerCanciones([bandaActiva]);

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div
          className="font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: "oklch(0.5 0.02 55)" }}
        >
          {nombreBandaActiva}
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

        {membresiasConBloque.length > 1 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {membresiasConBloque.map((m) => (
              <Link
                key={m.bandaId}
                href={`/canciones?banda=${m.bandaId}`}
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
                  className="text-[17px] font-bold"
                  style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  {c.titulo}
                </div>
                <div className="mt-1 flex gap-3 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                  <span>
                    {c.tonalidadNota}
                    {c.tonalidadModo === "menor" ? "m" : ""}
                  </span>
                  {c.bpm && <span>{c.bpm} BPM</span>}
                  {c.duracionAprox && <span>{c.duracionAprox}</span>}
                </div>
              </Link>
              <Link
                href={`/canciones/${c.id}/editar`}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold no-underline"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                Editar
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Link
        href={`/canciones/nueva?banda=${bandaActiva}`}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
      >
        +
      </Link>

      <TabBar
        activa="canciones"
        esSuperadmin={esSuperadminDeMembresias(membresias)}
        mostrarSetlist={membresias.some((m) => m.setlistHabilitado)}
        mostrarSeteos={membresias.some((m) => m.seteosHabilitado)}
      />
    </div>
  );
}
