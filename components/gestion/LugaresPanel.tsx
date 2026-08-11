"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BandaSimple } from "@/lib/gestionData";
import type { Lugar } from "@/lib/lugaresData";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { EmojiOPunto } from "@/components/ui/EmojiOPunto";
import { crearLugarAction } from "@/app/gestion/actions";

const inputCls = "rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function toggleEnSet(set: Set<string>, valor: string): Set<string> {
  const next = new Set(set);
  if (next.has(valor)) next.delete(valor);
  else next.add(valor);
  return next;
}

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

export function LugaresPanel({ bandas, lugares: lugaresIniciales }: { bandas: BandaSimple[]; lugares: Lugar[] }) {
  const [lugares, setLugares] = useState(lugaresIniciales);
  const [nombre, setNombre] = useState("");
  const [linkMaps, setLinkMaps] = useState("");
  const [bandaIdsNuevo, setBandaIdsNuevo] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const crear = () => {
    setError(null);
    if (!nombre.trim() || !linkMaps.trim()) {
      setError("Nombre y link son obligatorios.");
      return;
    }
    if (bandaIdsNuevo.size === 0) {
      setError("Elegí al menos una banda.");
      return;
    }
    startTransition(async () => {
      try {
        const lugar = await crearLugarAction(Array.from(bandaIdsNuevo), nombre.trim(), linkMaps.trim());
        setLugares((prev) => [...prev, lugar]);
        setNombre("");
        setLinkMaps("");
        setBandaIdsNuevo(new Set());
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
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

        <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "oklch(0.9 0.012 78)" }}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del lugar" className={inputCls} style={inputStyle} />
          <input value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} placeholder="Link de Google Maps" className={inputCls} style={inputStyle} />
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Bandas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {bandas.map((b) => (
                <ToggleChip key={b.id} label={b.nombre} active={bandaIdsNuevo.has(b.id)} onClick={() => setBandaIdsNuevo((prev) => toggleEnSet(prev, b.id))} color={b.color} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={crear}
            disabled={pending}
            className="rounded-lg py-2 text-sm font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Creando…" : "+ Nuevo lugar"}
          </button>
          {error && (
            <p className="text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
