"use client";

import { useState, useTransition } from "react";
import type { Membresia, TipoEvento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";
import { crearEventoAction } from "@/app/inicio/actions";

const TIPOS: TipoEvento[] = ["show", "ensayo", "cumpleanos", "gira"];

const inputCls = "w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "mb-1.5 block font-mono text-[10px] font-bold tracking-wide uppercase";
const labelStyle = { color: "oklch(0.55 0.02 55)" };

export function NuevoEventoForm({
  membresias,
  onCreado,
  onCancelar,
}: {
  membresias: Membresia[];
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoEvento>("show");
  const [titulo, setTitulo] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaValor, setHoraValor] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [bandaId, setBandaId] = useState(membresias[0]?.bandaId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!fecha) {
      setError("La fecha es obligatoria.");
      return;
    }
    if (!bandaId) {
      setError("Falta la banda.");
      return;
    }

    const fechaInicio = new Date(`${fecha}T${tipo === "cumpleanos" ? "00:00" : horaValor || "00:00"}`).toISOString();
    const fechaFinIso = tipo === "gira" && fechaFin ? new Date(`${fechaFin}T00:00`).toISOString() : null;

    startTransition(async () => {
      try {
        await crearEventoAction({
          bandaId,
          tipo,
          titulo: titulo.trim(),
          fechaInicio,
          fechaFin: fechaFinIso,
          ubicacion: tipo === "cumpleanos" ? null : ubicacion.trim() || null,
          ingresoEsperado: ingreso ? Number(ingreso) : null,
        });
        onCreado();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el evento.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancelar}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl"
        style={{ background: "oklch(0.99 0.008 82)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid oklch(0.89 0.013 78)" }}
        >
          <button type="button" onClick={onCancelar} className="text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Cancelar
          </button>
          <div
            className="font-mono text-[11px] font-bold tracking-wide uppercase"
            style={{ color: "oklch(0.5 0.02 55)" }}
          >
            Nuevo evento
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="text-sm font-bold disabled:opacity-50"
            style={{ color: "oklch(0.64 0.15 34)" }}
          >
            {pending ? "Creando…" : "Crear"}
          </button>
        </div>

        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 py-4">
          <div>
            <span className={labelCls} style={labelStyle}>
              Tipo
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold"
                  style={{
                    background: tipo === t ? COLOR_TIPO[t] : "oklch(0.93 0.016 78)",
                    color: tipo === t ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tipo === t ? "oklch(0.99 0.01 82)" : COLOR_TIPO[t] }} />
                  {ETIQUETA_TIPO[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls} style={labelStyle}>
              Título
            </span>
            <input
              className={inputCls}
              style={inputStyle}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={tipo === "cumpleanos" ? "Cumpleaños de…" : "Foro Escénico"}
            />
          </div>

          {tipo !== "cumpleanos" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Ubicación
              </span>
              <input className={inputCls} style={inputStyle} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} />
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <span className={labelCls} style={labelStyle}>
                {tipo === "gira" ? "Desde" : "Fecha"}
              </span>
              <input type="date" className={inputCls} style={inputStyle} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            {tipo === "gira" ? (
              <div className="flex-1">
                <span className={labelCls} style={labelStyle}>
                  Hasta
                </span>
                <input type="date" className={inputCls} style={inputStyle} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            ) : (
              <div className="flex-1">
                <span className={labelCls} style={labelStyle}>
                  Hora
                </span>
                <input type="time" className={inputCls} style={inputStyle} value={horaValor} onChange={(e) => setHoraValor(e.target.value)} />
              </div>
            )}
          </div>

          {membresias.length > 1 && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Banda
              </span>
              <select className={inputCls} style={inputStyle} value={bandaId} onChange={(e) => setBandaId(e.target.value)}>
                {membresias.map((m) => (
                  <option key={m.bandaId} value={m.bandaId}>
                    {m.bandaNombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === "show" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Ingreso esperado
              </span>
              <input
                type="number"
                min={0}
                className={inputCls}
                style={inputStyle}
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
                placeholder="$"
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
