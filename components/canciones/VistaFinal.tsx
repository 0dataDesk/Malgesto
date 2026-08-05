"use client";

import { useState } from "react";
import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import type { SeteoEnContexto } from "@/lib/dispositivosData";
import { ChordBlock, type Densidad } from "./ChordBlock";

// Brief de corrección §6: la cuadrícula se adapta a cuánto contenido tiene
// la canción entera (no una tarjeta de tamaño fijo siempre) — pocas
// tarjetas se ven grandes y cómodas (2 por fila, hasta ~4 filas antes de
// necesitar scroll), y a medida que hay más acordes la densidad sube (3,
// luego 4 por fila) para que quepan sin perder legibilidad. Umbrales
// elegidos a criterio, sin un número exacto pedido por el brief.
function densidadPorCantidadDeAcordes(totalAcordes: number): Densidad {
  if (totalAcordes <= 8) return "grande";
  if (totalAcordes <= 24) return "media";
  return "compacta";
}

const COLUMNAS_POR_DENSIDAD: Record<Densidad, string> = {
  grande: "grid-cols-2",
  media: "grid-cols-3",
  compacta: "grid-cols-4",
};

// Vista final / tocar (Brief 4 §7, tema claro + layout denso desde Brief
// 12). Los botones flotantes pasan a la canción siguiente/anterior de la
// banda por orden alfabético — salvo que se entre acá desde un Set List
// (Brief 5), en cuyo caso el orden del Set List tiene prioridad, y el link
// de volver apunta a su vista "En vivo" en vez de al catálogo general de
// Canciones.
//
// Brief 12 §2: antes cada sección forzaba min-h-[70vh] sin importar cuánto
// contenido tuviera — en canciones con muchas secciones cortas ("Retrasada",
// 13 secciones de 1-4 acordes) eso dejaba pantallas casi vacías entre
// bloques de contenido real. Ahora cada sección es una tarjeta del alto que
// necesita su contenido, apiladas con un espaciado modesto, y arriba hay una
// fila de accesos directos (uno por sección, numerado) para saltar
// directo a cualquier punto de la canción sin tener que scrollear por todas
// las anteriores — imprescindible en canciones largas.
//
// seteosContexto (Brief 6, pantalla 14): un dispositivo por miembro de la
// banda que tenga algo relevante para esta canción — vinculado si existe,
// si no el general del dispositivo. Componente compartido con Set List "En
// vivo", así que esta sección aparece en ambos flujos sin duplicar vista.
export function VistaFinal({
  cancion,
  prevId,
  nextId,
  setlist,
  seteosContexto,
}: {
  cancion: CancionCompleta;
  prevId: string | null;
  nextId: string | null;
  setlist: { id: string; nombre: string } | null;
  seteosContexto: SeteoEnContexto[];
}) {
  const sufijo = setlist ? `?setlist=${setlist.id}` : "";
  // Brief 20 §2: apagado por defecto — un músico que ya lee la nota no
  // necesita el número de función encima; se prende solo cuando hace falta
  // (aprender/confirmar el acorde). No persiste entre sesiones a propósito.
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false);
  const totalAcordes = cancion.secciones.reduce((total, s) => total + s.acordes.length, 0);
  const densidad = densidadPorCantidadDeAcordes(totalAcordes);

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={setlist ? `/set-list/${setlist.id}/vivo` : "/canciones"}
            className="mb-3 inline-block text-sm no-underline"
            style={{ color: "oklch(0.55 0.02 55)" }}
          >
            ‹ {setlist ? setlist.nombre : "Canciones"}
          </Link>
          <button
            type="button"
            onClick={() => setMostrarEtiquetas((v) => !v)}
            className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide"
            style={
              mostrarEtiquetas
                ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
                : { background: "oklch(0.93 0.016 78)", color: "oklch(0.5 0.02 55)" }
            }
            title="Mostrar/ocultar el número de función (1, 3, 5, 7, 9) sobre cada nota"
          >
            1 3 5 7 9
          </button>
        </div>

        <h1
          className="flex items-center gap-2.5 text-[28px] font-extrabold tracking-tight"
          style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {cancion.titulo}
          {cancion.esCover && (
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.5 0.02 55)" }}
            >
              Cover
            </span>
          )}
        </h1>
        <div className="mt-1 font-mono text-xs uppercase tracking-[0.1em]" style={{ color: "oklch(0.5 0.02 55)" }}>
          {cancion.tonalidadNota}
          {cancion.tonalidadModo === "menor" ? "m" : ""} · {cancion.bpm ?? "—"} BPM
        </div>

        {cancion.secciones.length > 1 && (
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {cancion.secciones.map((s, i) => (
              <a
                key={s.id}
                href={`#seccion-${s.id}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold no-underline"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                {i + 1} · {s.nombre}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-3 px-5">
        {cancion.secciones.map((seccion, i) => (
          <div
            key={seccion.id}
            id={`seccion-${seccion.id}`}
            className="scroll-mt-4 rounded-2xl p-4"
            style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
          >
            <div className="mb-3 flex items-baseline gap-2">
              <span className="font-mono text-xs" style={{ color: "oklch(0.6 0.02 55)" }}>
                {i + 1}
              </span>
              <h2
                className="text-xl font-extrabold tracking-tight"
                style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
              >
                {seccion.nombre}
              </h2>
            </div>
            <div className={`grid ${COLUMNAS_POR_DENSIDAD[densidad]} gap-2`}>
              {seccion.acordes.map((acorde) => (
                <ChordBlock key={acorde.id} acorde={acorde} mostrarEtiquetas={mostrarEtiquetas} densidad={densidad} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {seteosContexto.length > 0 && (
        <div className="mx-auto max-w-2xl px-5 pb-8 pt-5">
          <h3
            className="mb-3 text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: "oklch(0.5 0.02 55)" }}
          >
            Seteos
          </h3>
          <div className="flex flex-col gap-2">
            {seteosContexto.map((s) => (
              <div
                key={s.seteo.id}
                className="flex items-center justify-between gap-3 rounded-xl p-3"
                style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                    {s.usuarioNombre} · {s.dispositivo.nombre}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                    {Object.entries(s.seteo.valores)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{
                    background: s.etiqueta === "Vinculado" ? "oklch(0.64 0.15 34)" : "oklch(0.93 0.016 78)",
                    color: s.etiqueta === "Vinculado" ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)",
                  }}
                >
                  {s.etiqueta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-8 left-0 right-0 flex justify-between px-6">
        <Link
          href={prevId ? `/canciones/${prevId}${sufijo}` : "#"}
          aria-disabled={!prevId}
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl no-underline"
          style={{
            background: "oklch(0.93 0.016 78)",
            color: "oklch(0.4 0.02 55)",
            boxShadow: "0 10px 20px -12px rgba(0,0,0,0.25)",
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
