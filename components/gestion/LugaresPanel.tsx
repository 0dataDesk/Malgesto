"use client";

import Link from "next/link";
import type { BandaSimple } from "@/lib/gestionData";
import type { Lugar } from "@/lib/lugaresData";
import { EmojiOPunto } from "@/components/ui/EmojiOPunto";

function IconoMaps() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-7.05-7-12a7 7 0 0 1 14 0c0 4.95-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

// Brief "Rediseño de Gestión > Lugares" (v2): la tarjeta colapsada muestra
// SOLO 4 cosas -- nombre, emojis/puntos de las bandas asignadas, enlace a
// Maps y Editar. Borrar, los chips de banda editables y la URL como texto
// se mudaron por completo a la pantalla de edición aparte (LugarForm).
function TarjetaLugar({ lugar, bandas }: { lugar: Lugar; bandas: BandaSimple[] }) {
  const bandasDelLugar = bandas.filter((b) => lugar.bandaIds.includes(b.id));
  return (
    <div className="flex flex-col rounded-xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
        {lugar.nombre}
      </div>

      {/* min-h evita que el mosaico "salte" cuando un lugar todavía no tiene
          bandas asignadas -- la fila de emojis/puntos queda vacía pero
          ocupa el mismo alto que si tuviera al menos una. */}
      <div className="mt-2 flex min-h-[20px] flex-wrap items-center gap-1">
        {bandasDelLugar.map((b) => (
          <EmojiOPunto key={b.id} emoji={b.emoji} color={b.color} size={20} fontSize={13} />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1.5">
        <a
          href={lugar.linkMaps}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir en Maps"
          title="Abrir en Maps"
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          <IconoMaps />
        </a>
        <Link
          href={`/gestion/lugares/${lugar.id}/editar`}
          className="rounded-lg px-2.5 py-1.5 text-xs font-bold no-underline"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Editar
        </Link>
      </div>
    </div>
  );
}

// Brief "Lugares — FAB para crear": mismo estilo/posición que el FAB de
// Bandas (commit 82ebfa0), pero acá navega directo a una pantalla completa
// en vez de expandirse in-place -- Lugares captura nombre + link + bandas
// de una sola vez, no entra en el mismo campito inline que un nombre solo.
function BotonCrearLugar() {
  return (
    <Link
      href="/gestion/lugares/nuevo"
      aria-label="Crear lugar nuevo"
      className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold no-underline"
      style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
    >
      +
    </Link>
  );
}

export function LugaresPanel({ bandas, lugares }: { bandas: BandaSimple[]; lugares: Lugar[] }) {
  return (
    <div className="flex flex-col gap-3 pb-20">
      <section className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Lugares
        </h3>

        {lugares.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay lugares.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lugares.map((l) => (
              <TarjetaLugar key={l.id} lugar={l} bandas={bandas} />
            ))}
          </div>
        )}
      </section>

      <BotonCrearLugar />
    </div>
  );
}
