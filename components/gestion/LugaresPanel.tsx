"use client";

import { useState, useTransition } from "react";
import type { BandaSimple } from "@/lib/gestionData";
import type { Lugar } from "@/lib/lugaresData";
import { crearLugarAction, actualizarLugarAction, eliminarLugarAction } from "@/app/gestion/actions";

const inputCls = "rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function FilaLugar({ lugar, onActualizado, onEliminado }: { lugar: Lugar; onActualizado: (l: Lugar) => void; onEliminado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(lugar.nombre);
  const [linkMaps, setLinkMaps] = useState(lugar.linkMaps);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    if (!nombre.trim() || !linkMaps.trim()) {
      setError("Nombre y link son obligatorios.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await actualizarLugarAction(lugar.id, nombre.trim(), linkMaps.trim());
        onActualizado({ ...lugar, nombre: nombre.trim(), linkMaps: linkMaps.trim() });
        setEditando(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const eliminar = () => {
    if (!confirm(`¿Eliminar "${lugar.nombre}"?`)) return;
    startTransition(async () => {
      try {
        await eliminarLugarAction(lugar.id);
        onEliminado();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  };

  if (editando) {
    return (
      <div className="rounded-xl p-3" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${inputCls} w-full`} style={inputStyle} placeholder="Nombre" />
        <input value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} className={`${inputCls} mt-2 w-full`} style={inputStyle} placeholder="Link de Maps" />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="flex-1 rounded-lg py-1.5 text-xs font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditando(false)} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
            Cancelar
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          {lugar.nombre}
        </div>
        <a href={lugar.linkMaps} target="_blank" rel="noopener noreferrer" className="truncate text-xs" style={{ color: "oklch(0.55 0.1 34)" }}>
          {lugar.linkMaps}
        </a>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" onClick={() => setEditando(true)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
          Editar
        </button>
        <button type="button" onClick={eliminar} disabled={pending} className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.6 0.15 25)" }}>
          Borrar
        </button>
      </div>
    </div>
  );
}

export function LugaresPanel({ bandas, lugares: lugaresIniciales }: { bandas: BandaSimple[]; lugares: Lugar[] }) {
  const [lugares, setLugares] = useState(lugaresIniciales);
  const [bandaId, setBandaId] = useState(bandas[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [linkMaps, setLinkMaps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lugaresDeLaBanda = lugares.filter((l) => l.bandaId === bandaId);

  const crear = () => {
    setError(null);
    if (!bandaId) {
      setError("Elegí una banda.");
      return;
    }
    if (!nombre.trim() || !linkMaps.trim()) {
      setError("Nombre y link son obligatorios.");
      return;
    }
    startTransition(async () => {
      try {
        const lugar = await crearLugarAction(bandaId, nombre.trim(), linkMaps.trim());
        setLugares((prev) => [...prev, lugar]);
        setNombre("");
        setLinkMaps("");
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
        <select value={bandaId} onChange={(e) => setBandaId(e.target.value)} className={`${inputCls} w-full`} style={inputStyle}>
          {bandas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>

        <div className="mt-3 flex flex-col gap-2">
          {lugaresDeLaBanda.length === 0 ? (
            <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no hay lugares para esta banda.
            </p>
          ) : (
            lugaresDeLaBanda.map((l) => (
              <FilaLugar
                key={l.id}
                lugar={l}
                onActualizado={(actualizado) => setLugares((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)))}
                onEliminado={() => setLugares((prev) => prev.filter((x) => x.id !== l.id))}
              />
            ))
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "oklch(0.9 0.012 78)" }}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del lugar" className={inputCls} style={inputStyle} />
          <input value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} placeholder="Link de Google Maps" className={inputCls} style={inputStyle} />
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
