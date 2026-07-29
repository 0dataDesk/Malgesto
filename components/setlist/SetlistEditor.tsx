"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CancionEnSetlist } from "@/lib/setlistsData";
import { actualizarSetlistAction } from "@/app/set-list/actions";

type ItemLocal = { cancionId: string; notasTransicion: string | null; cancion: CancionEnSetlist };

function metaCancion(c: CancionEnSetlist) {
  const partes = [`${c.tonalidadNota}${c.tonalidadModo === "menor" ? "m" : ""}`];
  if (c.bpm) partes.push(`${c.bpm} BPM`);
  if (c.duracionAprox) partes.push(c.duracionAprox);
  return partes.join(" · ");
}

// Armar & ordenar (pantalla 10): agregar canciones del catálogo de la
// banda, reordenar con botones (Design permite drag o botones — se eligió
// botones, mismo lenguaje que Canciones/Calendario en el resto de la app),
// guardar.
export function SetlistEditor({
  setlistId,
  bandaId,
  nombre,
  itemsIniciales,
  cancionesDisponibles,
}: {
  setlistId: string;
  bandaId: string;
  nombre: string;
  itemsIniciales: ItemLocal[];
  cancionesDisponibles: CancionEnSetlist[];
}) {
  const [items, setItems] = useState<ItemLocal[]>(itemsIniciales);
  const [guardado, setGuardado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const idsEnSet = new Set(items.map((i) => i.cancionId));
  const disponibles = cancionesDisponibles.filter((c) => !idsEnSet.has(c.id));

  const agregar = (c: CancionEnSetlist) => {
    setItems((prev) => [...prev, { cancionId: c.id, notasTransicion: null, cancion: c }]);
    setGuardado(false);
  };

  const quitar = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setGuardado(false);
  };

  const mover = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
    setGuardado(false);
  };

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarSetlistAction(
          setlistId,
          bandaId,
          items.map((i) => ({ cancionId: i.cancionId, notasTransicion: i.notasTransicion }))
        );
        setGuardado(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <div className="mb-1 flex items-center justify-between">
        <Link href="/set-list" className="text-sm no-underline" style={{ color: "oklch(0.6 0.01 260)" }}>
          ‹ Set Lists
        </Link>
        <Link href={`/set-list/${setlistId}/vivo`} className="text-sm font-bold no-underline" style={{ color: "oklch(0.64 0.15 34)" }}>
          Ver en vivo ›
        </Link>
      </div>
      <h1 className="mb-6 text-[28px] font-extrabold" style={{ color: "oklch(0.95 0.005 260)" }}>
        {nombre}
      </h1>

      <div className="mb-2 text-sm font-bold" style={{ color: "oklch(0.75 0.01 260)" }}>
        Orden del set
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>
            Sin canciones todavía — agregá del catálogo abajo.
          </p>
        )}
        {items.map((it, i) => (
          <div
            key={it.cancionId}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "oklch(0.185 0.008 260)", border: "1px solid oklch(0.28 0.01 260)" }}
          >
            <span className="font-mono text-sm font-bold" style={{ color: "oklch(0.64 0.15 34)" }}>
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: "oklch(0.95 0.005 260)" }}>
                {it.cancion.titulo}
              </div>
              <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>
                {metaCancion(it.cancion)}
              </div>
            </div>
            <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="text-sm disabled:opacity-30" style={{ color: "oklch(0.7 0.01 260)" }}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => mover(i, 1)}
              disabled={i === items.length - 1}
              className="text-sm disabled:opacity-30"
              style={{ color: "oklch(0.7 0.01 260)" }}
            >
              ↓
            </button>
            <button type="button" onClick={() => quitar(i)} className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-8 text-sm font-bold" style={{ color: "oklch(0.75 0.01 260)" }}>
        Agregar del catálogo
      </div>
      <div className="flex flex-col gap-2">
        {disponibles.length === 0 && (
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 260)" }}>
            No hay más canciones para agregar.
          </p>
        )}
        {disponibles.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => agregar(c)}
            className="flex items-center justify-between gap-3 rounded-xl p-3 text-left"
            style={{ border: "1px dashed oklch(0.4 0.02 260)" }}
          >
            <div>
              <div className="text-sm font-bold" style={{ color: "oklch(0.9 0.005 260)" }}>
                {c.titulo}
              </div>
              <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.55 0.01 260)" }}>
                {metaCancion(c)}
              </div>
            </div>
            <span className="text-lg" style={{ color: "oklch(0.7 0.01 260)" }}>
              +
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={guardar}
        disabled={pending || guardado}
        className="mt-6 w-fit rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "oklch(0.5 0.13 148)" }}
      >
        {pending ? "Guardando..." : guardado ? "Sin cambios" : "Guardar cambios"}
      </button>
    </div>
  );
}
