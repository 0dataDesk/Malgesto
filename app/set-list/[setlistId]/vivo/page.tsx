import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerSetlistCompleto } from "@/lib/setlistsData";
import { ETIQUETA_BLOQUE } from "@/lib/setlistCatalogo";

// En vivo (pantalla 11): canciones del Set List en su orden definido. Tocar
// una lleva a su vista final (Brief 4) pero con ?setlist= para que
// siguiente/anterior naveguen por este orden, no alfabético.
export default async function SetlistEnVivoPage({
  params,
}: {
  params: Promise<{ setlistId: string }>;
}) {
  const { setlistId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const setlist = await obtenerSetlistCompleto(setlistId);
  if (!setlist) notFound();

  const esMiembro = membresias.some((m) => m.bandaId === setlist.bandaId);
  if (!esMiembro) notFound();

  // Brief "Marcadores de sección": mismo criterio que el editor — los
  // marcadores no participan de la numeración de tomas.
  let contadorTomas = 0;
  const numeros = setlist.items.map((it) => (it.tipo === "marcador" ? null : ++contadorTomas));

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.22 0.02 52)" }}>
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <Link href={`/set-list/${setlistId}`} className="mb-4 inline-block text-sm no-underline" style={{ color: "oklch(0.7 0.03 60)" }}>
          ‹ {setlist.nombre}
        </Link>
        <h1
          className="mb-1 text-[28px] font-extrabold"
          style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          En vivo
        </h1>
        <div className="mb-6 font-mono text-xs" style={{ color: "oklch(0.7 0.03 60)" }}>
          {setlist.items.length} {setlist.items.length === 1 ? "canción" : "canciones"}
        </div>

        <div className="flex flex-col gap-2.5">
          {setlist.items.map((item, i) =>
            item.tipo === "marcador" ? (
              // Brief "Marcadores de sección": mismo divisor visual que el
              // editor, sin número (los marcadores no participan de la
              // numeración de tomas — ver `numeros` arriba).
              <div key={item.id} className="flex items-center gap-2.5 py-1">
                <div className="h-px flex-1" style={{ background: "oklch(0.4 0.03 60)" }} />
                <span
                  className="shrink-0 rounded-full px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide"
                  style={{ background: "oklch(0.34 0.03 55)", color: "oklch(0.85 0.08 80)" }}
                >
                  {item.etiqueta}
                </span>
                <div className="h-px flex-1" style={{ background: "oklch(0.4 0.03 60)" }} />
              </div>
            ) : item.tipo === "cancion" && item.cancion ? (
              <Link
                key={item.id}
                href={`/canciones/${item.cancion.id}?setlist=${setlistId}`}
                className="flex items-center gap-3 rounded-2xl p-3.5 no-underline"
                style={{ background: "oklch(0.28 0.025 55)", border: "1px solid oklch(0.34 0.03 55)" }}
              >
                <span className="font-mono text-sm font-bold" style={{ color: "oklch(0.74 0.12 78)" }}>
                  {numeros[i]}
                </span>
                <div className="flex-1">
                  <div
                    className="text-[16px] font-bold"
                    style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}
                  >
                    {item.cancion.titulo}
                  </div>
                  <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.72 0.03 60)" }}>
                    {item.cancion.tonalidadNota}
                    {item.cancion.tonalidadModo === "menor" ? "m" : ""}
                    {item.cancion.bpm ? ` · ${item.cancion.bpm} BPM` : ""}
                    {item.cancion.duracionAprox ? ` · ${item.cancion.duracionAprox}` : ""}
                  </div>
                  {item.notasTransicion && (
                    <div className="mt-1 text-xs italic" style={{ color: "oklch(0.6 0.05 70)" }}>
                      {item.notasTransicion}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl p-3.5"
                style={{ background: "oklch(0.24 0.02 55)", border: "1px dashed oklch(0.5 0.05 60)" }}
              >
                <span className="font-mono text-sm font-bold" style={{ color: "oklch(0.6 0.05 60)" }}>
                  {numeros[i]}
                </span>
                <div className="flex-1">
                  <span
                    className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: "oklch(0.34 0.03 55)", color: "oklch(0.8 0.03 60)" }}
                  >
                    {ETIQUETA_BLOQUE[item.tipo as "secuencia" | "interludio"]}
                  </span>
                  <div className="mt-1 text-[16px] font-bold italic" style={{ color: "oklch(0.9 0.02 60)" }}>
                    {item.etiqueta}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
