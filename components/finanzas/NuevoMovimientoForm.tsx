"use client";

import { useState, useTransition } from "react";
import { crearMovimientoAction } from "@/app/finanzas/actions";
import type { TipoMovimiento } from "@/lib/finanzasData";

type EventoOpcion = { id: string; titulo: string };

function hoyISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Alta de movimiento manual (Brief 21 §3) — mismo patrón "botón que se abre
// en un card" que NuevoDispositivoForm, sin modal a pantalla completa: tipo,
// concepto, monto, fecha, y opcionalmente un evento existente de la banda.
export function NuevoMovimientoForm({ bandaId, eventos }: { bandaId: string; eventos: EventoOpcion[] }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoMovimiento>("entrada");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => hoyISO());
  const [eventoId, setEventoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const guardar = () => {
    setError(null);
    if (!concepto.trim()) {
      setError("Ponele un concepto al movimiento.");
      return;
    }
    const montoNum = Number(monto);
    if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
      setError("Cargá un monto válido.");
      return;
    }
    if (!fecha) {
      setError("Falta la fecha.");
      return;
    }

    startTransition(async () => {
      try {
        await crearMovimientoAction(bandaId, {
          tipo,
          concepto: concepto.trim(),
          monto: montoNum,
          fecha,
          eventoId: eventoId || null,
        });
        setConcepto("");
        setMonto("");
        setFecha(hoyISO());
        setEventoId("");
        setAbierto(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el movimiento.");
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
        + Nuevo movimiento
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
        Nuevo movimiento
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipo("entrada")}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold"
          style={{
            background: tipo === "entrada" ? "oklch(0.5 0.13 148)" : "oklch(0.93 0.016 78)",
            color: tipo === "entrada" ? "oklch(0.98 0.01 148)" : "oklch(0.4 0.02 55)",
          }}
        >
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipo("salida")}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold"
          style={{
            background: tipo === "salida" ? "oklch(0.55 0.15 25)" : "oklch(0.93 0.016 78)",
            color: tipo === "salida" ? "oklch(0.98 0.01 25)" : "oklch(0.4 0.02 55)",
          }}
        >
          Salida
        </button>
      </div>

      <input
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        placeholder="Concepto"
        className="mt-2.5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
        style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
      />

      <div className="mt-2.5 flex gap-2">
        <input
          type="number"
          min={0}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto"
          className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
          style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
          style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
        />
      </div>

      {eventos.length > 0 && (
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className="mt-2.5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
          style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
        >
          <option value="">Sin evento vinculado</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </select>
      )}

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
          {pending ? "Guardando..." : "Guardar movimiento"}
        </button>
      </div>
    </div>
  );
}
