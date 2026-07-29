import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import { ChordBlock } from "./ChordBlock";

// Vista final / tocar (brief §7 del Brief 4). Los botones flotantes pasan a
// la canción siguiente/anterior de la banda por orden alfabético — salvo
// que se entre acá desde un Set List (Brief 5), en cuyo caso el orden del
// Set List tiene prioridad, y el link de volver apunta a su vista "En vivo"
// en vez de al catálogo general de Canciones.
export function VistaFinal({
  cancion,
  prevId,
  nextId,
  setlist,
}: {
  cancion: CancionCompleta;
  prevId: string | null;
  nextId: string | null;
  setlist: { id: string; nombre: string } | null;
}) {
  const sufijo = setlist ? `?setlist=${setlist.id}` : "";

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.22 0.02 52)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-6 text-center">
        <Link
          href={setlist ? `/set-list/${setlist.id}/vivo` : "/canciones"}
          className="mb-3 inline-block text-sm no-underline"
          style={{ color: "oklch(0.7 0.03 60)" }}
        >
          ‹ {setlist ? setlist.nombre : "Canciones"}
        </Link>
        <div
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "oklch(0.7 0.03 60)" }}
        >
          {cancion.titulo} · {cancion.tonalidadNota}
          {cancion.tonalidadModo === "menor" ? "m" : ""} · {cancion.bpm ?? "—"} BPM
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5">
        {cancion.secciones.map((seccion) => (
          <div key={seccion.id} className="flex min-h-[70vh] flex-col justify-center py-8">
            <h2
              className="mb-4 text-[32px] font-extrabold tracking-tight"
              style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}
            >
              {seccion.nombre}
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {seccion.acordes.slice(0, 8).map((acorde) => (
                <ChordBlock key={acorde.id} acorde={acorde} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-between px-6">
        <Link
          href={prevId ? `/canciones/${prevId}${sufijo}` : "#"}
          aria-disabled={!prevId}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
          style={{
            background: "oklch(0.3 0.025 55)",
            color: "oklch(0.9 0.012 82)",
            border: "1px solid oklch(0.36 0.03 55)",
            opacity: prevId ? 1 : 0.35,
            pointerEvents: prevId ? "auto" : "none",
          }}
        >
          ‹
        </Link>
        <Link
          href={nextId ? `/canciones/${nextId}${sufijo}` : "#"}
          aria-disabled={!nextId}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
          style={{
            background: "oklch(0.64 0.15 34)",
            color: "oklch(0.99 0.01 82)",
            boxShadow: "0 12px 24px -10px oklch(0.5 0.15 30)",
            opacity: nextId ? 1 : 0.35,
            pointerEvents: nextId ? "auto" : "none",
          }}
        >
          ›
        </Link>
      </div>
    </div>
  );
}
