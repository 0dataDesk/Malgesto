"use client";

import { useState, useTransition } from "react";
import type { CanalManual } from "@/lib/riderData";
import { agregarCanalManualAction, actualizarCanalManualAction, eliminarCanalManualAction } from "@/app/stage-plot/actions";

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ROJO = "oklch(0.55 0.15 25)";
const inputCls = "rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: TEXTO_OSCURO };

function FilaManualEditable({
  canal,
  bandaId,
  onActualizado,
  onEliminado,
}: {
  canal: CanalManual;
  bandaId: string;
  onActualizado: (canal: CanalManual) => void;
  onEliminado: (id: string) => void;
}) {
  const [numero, setNumero] = useState(String(canal.numeroCanal));
  const [descripcion, setDescripcion] = useState(canal.descripcion);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hayCambios = numero !== String(canal.numeroCanal) || descripcion !== canal.descripcion;

  const guardar = () => {
    setError(null);
    const num = Number(numero);
    if (!Number.isFinite(num)) {
      setError("El número de canal debe ser un número.");
      return;
    }
    startTransition(async () => {
      try {
        await actualizarCanalManualAction(bandaId, canal.id, num, descripcion);
        onActualizado({ ...canal, numeroCanal: num, descripcion });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const eliminar = () => {
    if (!confirm(`¿Quitar el canal ${canal.numeroCanal}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarCanalManualAction(bandaId, canal.id);
        onEliminado(canal.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  };

  return (
    <div className="flex items-start gap-2">
      <input
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        inputMode="numeric"
        className={`${inputCls} w-14 shrink-0 text-center font-mono`}
        style={inputStyle}
      />
      <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputCls} flex-1`} style={inputStyle} />
      {hayCambios && (
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold disabled:opacity-50"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          Guardar
        </button>
      )}
      <button
        type="button"
        onClick={eliminar}
        disabled={pending}
        aria-label="Quitar canal"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold disabled:opacity-50"
        style={{ background: "oklch(0.93 0.016 78)", color: TEXTO_GRIS }}
      >
        ×
      </button>
      {error && (
        <p className="w-full text-xs" style={{ color: ROJO }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AgregarCanalManual({
  bandaId,
  stagePlotId,
  siguienteNumero,
  onAgregado,
}: {
  bandaId: string;
  stagePlotId: string;
  siguienteNumero: number;
  onAgregado: (canal: CanalManual) => void;
}) {
  const [numero, setNumero] = useState(String(siguienteNumero));
  const [descripcion, setDescripcion] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    setError(null);
    const num = Number(numero);
    if (!Number.isFinite(num)) {
      setError("El número de canal debe ser un número.");
      return;
    }
    if (!descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    startTransition(async () => {
      try {
        const canal = await agregarCanalManualAction(bandaId, stagePlotId, num, descripcion);
        onAgregado(canal);
        setNumero(String(num + 1));
        setDescripcion("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar.");
      }
    });
  };

  return (
    <div className="flex items-start gap-2">
      <input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" className={`${inputCls} w-14 shrink-0 text-center font-mono`} style={inputStyle} />
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder='Ej. "KICK IN BETA 91"'
        className={`${inputCls} flex-1`}
        style={inputStyle}
        onKeyDown={(e) => e.key === "Enter" && agregar()}
      />
      <button
        type="button"
        onClick={agregar}
        disabled={pending}
        className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
      >
        {pending ? "…" : "+ Agregar"}
      </button>
      {error && (
        <p className="w-full text-xs" style={{ color: ROJO }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Brief "Input List manual (editable), aparte del cálculo automático":
// complemento al Input List calculado (ver InputListVista.tsx) -- captura
// libre de canal + descripción, sin depender de plazas ni del lienzo de
// Stage. Deliberadamente NO se mezcla ni se reconcilia con el automático
// (§3 del brief): coexisten como dos secciones separadas y rotuladas, cada
// una con su propio criterio de qué es "correcto".
export function InputListManualVista({
  bandaId,
  stagePlotId,
  canalesIniciales,
  puedeEscribir,
}: {
  bandaId: string;
  stagePlotId: string;
  canalesIniciales: CanalManual[];
  puedeEscribir: boolean;
}) {
  const [canales, setCanales] = useState(canalesIniciales);
  const siguienteNumero = canales.length > 0 ? Math.max(...canales.map((c) => c.numeroCanal)) + 1 : 1;

  if (canales.length === 0 && !puedeEscribir) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
          Input List manual
        </h3>
        <span className="text-[10px]" style={{ color: TEXTO_GRIS }}>
          — capturada a mano, independiente del automático de arriba
        </span>
      </div>
      {canales.length === 0 && (
        <p className="mb-2 text-sm" style={{ color: TEXTO_GRIS }}>
          Sin canales manuales todavía.
        </p>
      )}
      {puedeEscribir ? (
        <div className="flex flex-col gap-2">
          {canales
            .sort((a, b) => a.numeroCanal - b.numeroCanal)
            .map((c) => (
              <FilaManualEditable
                key={c.id}
                canal={c}
                bandaId={bandaId}
                onActualizado={(actualizado) => setCanales((prev) => prev.map((x) => (x.id === actualizado.id ? actualizado : x)))}
                onEliminado={(id) => setCanales((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          <AgregarCanalManual
            bandaId={bandaId}
            stagePlotId={stagePlotId}
            siguienteNumero={siguienteNumero}
            onAgregado={(canal) => setCanales((prev) => [...prev, canal])}
          />
        </div>
      ) : (
        canales.length > 0 && (
          <table className="w-full text-left text-sm">
            <tbody>
              {canales
                .sort((a, b) => a.numeroCanal - b.numeroCanal)
                .map((c) => (
                  <tr key={c.id} className="border-b" style={{ borderColor: "oklch(0.91 0.013 78)" }}>
                    <td className="w-10 py-1.5 font-mono font-bold" style={{ color: TEXTO_OSCURO }}>
                      {c.numeroCanal}
                    </td>
                    <td className="py-1.5" style={{ color: "oklch(0.3 0.02 55)" }}>
                      {c.descripcion}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
