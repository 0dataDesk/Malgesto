"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BandaSimple } from "@/lib/gestionData";
import type { Lugar } from "@/lib/lugaresData";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { actualizarLugarAction, actualizarLugarBandasAction, eliminarLugarAction } from "@/app/gestion/actions";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "flex flex-col gap-1.5 text-sm";
const labelColor = { color: "oklch(0.5 0.02 55)" };

// Mismo ícono/patrón que "Eliminar cuenta" en IntegrantesPanel.
function IconoEliminar() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function toggleEnSet(set: Set<string>, valor: string): Set<string> {
  const next = new Set(set);
  if (next.has(valor)) next.delete(valor);
  else next.add(valor);
  return next;
}

// Brief "Rediseño de Gestión > Lugares" (v2) §2: pantalla de edición aparte
// (antes era una fila que se expandía inline) -- acá se ve todo: nombre,
// link, bandas asignadas, borrar. Nombre/link/bandas se juntan en un solo
// Guardar (antes cada chip de banda pegaba al servidor en cada click); si no
// se guarda, Cancelar/volver atrás no persiste nada.
export function LugarForm({ lugar, bandas }: { lugar: Lugar; bandas: BandaSimple[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(lugar.nombre);
  const [linkMaps, setLinkMaps] = useState(lugar.linkMaps);
  const [bandaIds, setBandaIds] = useState<Set<string>>(new Set(lugar.bandaIds));
  const [pending, startTransition] = useTransition();
  const [pendingEliminar, setPendingEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const volver = () => router.push("/gestion?tab=lugares");

  const guardar = () => {
    if (!nombre.trim() || !linkMaps.trim()) {
      setError("Nombre y link son obligatorios.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await actualizarLugarAction(lugar.id, nombre.trim(), linkMaps.trim());
        await actualizarLugarBandasAction(lugar.id, Array.from(bandaIds));
        volver();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  // Mismo patrón de confirm() que "Eliminar cuenta" en IntegrantesPanel --
  // borrado real e irreversible, aviso explícito antes de disparar.
  const eliminar = () => {
    if (!confirm(`¿Eliminar "${lugar.nombre}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    setPendingEliminar(true);
    eliminarLugarAction(lugar.id)
      .then(() => volver())
      .catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
        setPendingEliminar(false);
      });
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}>
          Editar lugar
        </h2>
        <button
          type="button"
          onClick={eliminar}
          disabled={pendingEliminar}
          aria-label="Eliminar lugar"
          title="Eliminar lugar (borrado permanente)"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
          style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)" }}
        >
          <IconoEliminar />
        </button>
      </div>

      <label className={labelCls} style={labelColor}>
        Nombre
        <input className={inputCls} style={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>

      <label className={labelCls} style={labelColor}>
        Link de Maps
        <input className={inputCls} style={inputStyle} value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} />
      </label>

      <div>
        <span className="mb-1.5 block font-mono text-[10px] uppercase" style={labelColor}>
          Bandas asignadas
        </span>
        <div className="flex flex-wrap gap-1.5">
          {bandas.map((b) => (
            <ToggleChip key={b.id} label={b.nombre} active={bandaIds.has(b.id)} onClick={() => setBandaIds((prev) => toggleEnSet(prev, b.id))} color={b.color} />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={volver}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
