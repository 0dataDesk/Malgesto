"use client";

import { useState, useTransition } from "react";
import { crearDispositivoAction } from "@/app/seteos/actions";
import type { Control, TipoControl } from "@/lib/dispositivosData";

type ControlLocal = Control & { key: string };

let contador = 0;
function nuevaKey() {
  contador += 1;
  return `c${contador}`;
}

// Alta de dispositivo (pantalla 12) — simple a propósito, sin necesidad de
// pulido visual todavía: nombre, tipo de control, y filas repetibles de
// controles (nombre/min/max/valor por defecto).
export function NuevoDispositivoForm({ bandaId }: { bandaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipoControl, setTipoControl] = useState<TipoControl>("perillas");
  const [controles, setControles] = useState<ControlLocal[]>([
    { key: nuevaKey(), id: "", nombre: "", min: 0, max: 10, valorDefault: 5 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const actualizarControl = (key: string, campo: keyof Control, valor: string) => {
    setControles((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (campo === "nombre" || campo === "id") return { ...c, [campo]: valor };
        return { ...c, [campo]: Number(valor) };
      })
    );
  };

  const agregarControl = () => {
    setControles((prev) => [...prev, { key: nuevaKey(), id: "", nombre: "", min: 0, max: 10, valorDefault: 5 }]);
  };

  const quitarControl = (key: string) => {
    setControles((prev) => prev.filter((c) => c.key !== key));
  };

  const guardar = () => {
    setError(null);
    if (!nombre.trim()) {
      setError("Ponele un nombre al dispositivo.");
      return;
    }
    const controlesValidos = controles.filter((c) => c.nombre.trim());
    if (controlesValidos.length === 0) {
      setError("Agregá al menos un control.");
      return;
    }
    const controlesFinal: Control[] = controlesValidos.map((c, i) => ({
      id: c.id.trim() || `control_${i}`,
      nombre: c.nombre.trim(),
      min: c.min,
      max: c.max,
      valorDefault: c.valorDefault,
    }));

    startTransition(async () => {
      try {
        await crearDispositivoAction(bandaId, nombre.trim(), tipoControl, controlesFinal);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el dispositivo.");
      }
    });
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
      >
        + Nuevo dispositivo
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
        Nuevo dispositivo
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre (ej. Preamp)"
        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
        style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
      />

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => setTipoControl("perillas")}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold"
          style={{
            background: tipoControl === "perillas" ? "oklch(0.24 0.02 55)" : "oklch(0.93 0.016 78)",
            color: tipoControl === "perillas" ? "oklch(0.96 0.012 82)" : "oklch(0.4 0.02 55)",
          }}
        >
          Perillas
        </button>
        <button
          type="button"
          onClick={() => setTipoControl("eq_grafico")}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold"
          style={{
            background: tipoControl === "eq_grafico" ? "oklch(0.24 0.02 55)" : "oklch(0.93 0.016 78)",
            color: tipoControl === "eq_grafico" ? "oklch(0.96 0.012 82)" : "oklch(0.4 0.02 55)",
          }}
        >
          EQ gráfico
        </button>
      </div>

      <div className="mt-3.5 text-xs font-bold" style={{ color: "oklch(0.5 0.02 55)" }}>
        Controles
      </div>
      <div className="mt-1.5 flex flex-col gap-2">
        {controles.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <input
              value={c.nombre}
              onChange={(e) => actualizarControl(c.key, "nombre", e.target.value)}
              placeholder="Nombre"
              className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              style={{ borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <input
              type="number"
              value={c.min}
              onChange={(e) => actualizarControl(c.key, "min", e.target.value)}
              placeholder="Mín"
              className="w-14 rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{ borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <input
              type="number"
              value={c.max}
              onChange={(e) => actualizarControl(c.key, "max", e.target.value)}
              placeholder="Máx"
              className="w-14 rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{ borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <input
              type="number"
              value={c.valorDefault}
              onChange={(e) => actualizarControl(c.key, "valorDefault", e.target.value)}
              placeholder="Def."
              className="w-14 rounded-lg border px-2 py-1.5 text-xs outline-none"
              style={{ borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <button
              type="button"
              onClick={() => quitarControl(c.key)}
              disabled={controles.length === 1}
              className="text-xs disabled:opacity-30"
              style={{ color: "oklch(0.55 0.15 25)" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={agregarControl} className="mt-2 text-xs font-bold" style={{ color: "oklch(0.64 0.15 34)" }}>
        + Agregar control
      </button>

      {error && (
        <p className="mt-3 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={pending}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {pending ? "Creando..." : "Crear dispositivo"}
        </button>
      </div>
    </div>
  );
}
