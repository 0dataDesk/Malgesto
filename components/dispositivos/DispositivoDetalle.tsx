"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ControlDiseno, Seteo } from "@/lib/dispositivosData";
import { actualizarValoresSeteoAction, crearSeteoParaCancionAction } from "@/app/seteos/actions";
import { PanelDispositivo } from "./PanelDispositivo";

type CancionOpcion = { id: string; titulo: string };

// Detalle de dispositivo (Seteos, brief "Seteos — catálogo de diseños") — el
// panel se dibuja a partir del diseño real (PanelDispositivo) y se edita el
// seteo actualmente elegido: "General" (siempre existe, creado con defaults
// por el server antes de llegar acá) o uno por canción (opcional, se crea al
// elegir una canción que todavía no tiene seteo propio). Guarda solo, sin
// botón: cada cambio de perilla/botón persiste con un debounce corto.
export function DispositivoDetalle({
  bandaId,
  dispositivoId,
  disenoMarca,
  disenoModelo,
  apodo,
  controles,
  seteosIniciales,
  cancionesDisponibles,
}: {
  bandaId: string;
  dispositivoId: string;
  disenoMarca: string;
  disenoModelo: string;
  apodo: string | null;
  controles: ControlDiseno[];
  seteosIniciales: Seteo[];
  cancionesDisponibles: CancionOpcion[];
}) {
  const [seteos, setSeteos] = useState<Seteo[]>(seteosIniciales);
  const general = seteos.find((s) => s.esGeneral) ?? null;
  const [seteoActualId, setSeteoActualId] = useState<string | null>(general?.id ?? null);
  const seteoActual = seteos.find((s) => s.id === seteoActualId) ?? null;

  const [valoresBuffer, setValoresBuffer] = useState<Record<string, number>>(seteoActual?.valores ?? {});
  const [estadoGuardado, setEstadoGuardado] = useState<"guardado" | "guardando" | "error">("guardado");
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [pendingCrear, startCrear] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seleccionarSeteo = (seteo: Seteo) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSeteoActualId(seteo.id);
    setValoresBuffer(seteo.valores);
    setEstadoGuardado("guardado");
  };

  const guardarValores = (seteoId: string, valores: Record<string, number>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEstadoGuardado("guardando");
    debounceRef.current = setTimeout(() => {
      actualizarValoresSeteoAction(seteoId, dispositivoId, bandaId, valores)
        .then(() => {
          setEstadoGuardado("guardado");
          setSeteos((prev) => prev.map((s) => (s.id === seteoId ? { ...s, valores } : s)));
        })
        .catch(() => setEstadoGuardado("error"));
    }, 400);
  };

  const cambiarValor = (controlId: string, v: number) => {
    if (!seteoActualId) return;
    const nuevo = { ...valoresBuffer, [controlId]: v };
    setValoresBuffer(nuevo);
    guardarValores(seteoActualId, nuevo);
  };

  const elegirGeneral = () => {
    if (general) seleccionarSeteo(general);
  };

  const elegirCancion = (cancion: CancionOpcion) => {
    setErrorCrear(null);
    const existente = seteos.find((s) => s.cancionId === cancion.id);
    if (existente) {
      seleccionarSeteo(existente);
      return;
    }
    startCrear(async () => {
      try {
        const nuevo = await crearSeteoParaCancionAction(dispositivoId, bandaId, cancion.id, controles);
        const seteoCreado = { ...nuevo, cancionTitulo: cancion.titulo };
        setSeteos((prev) => [...prev, seteoCreado]);
        seleccionarSeteo(seteoCreado);
      } catch (e) {
        setErrorCrear(e instanceof Error ? e.message : "No se pudo crear el seteo para esta canción.");
      }
    });
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.22 0.02 52)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <Link href="/seteos" className="mb-3 inline-block text-sm no-underline" style={{ color: "oklch(0.7 0.03 60)" }}>
          ‹ Seteos
        </Link>
        <h1
          className="text-[26px] font-extrabold tracking-tight"
          style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {apodo || `${disenoMarca} ${disenoModelo}`}
        </h1>
        <div className="mt-1 font-mono text-xs uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
          {disenoMarca} {disenoModelo}
        </div>

        <div className="mt-6">
          <PanelDispositivo controles={controles} valores={valoresBuffer} onChange={cambiarValor} />
        </div>

        <div
          className="mt-3 text-right font-mono text-[10px] uppercase tracking-wide"
          style={{ color: estadoGuardado === "error" ? "oklch(0.68 0.15 25)" : "oklch(0.6 0.03 60)" }}
        >
          {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "error" ? "No se pudo guardar" : "Guardado"}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.7 0.03 60)" }}>
            Seteo
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={elegirGeneral}
              className="rounded-2xl px-3.5 py-2 text-sm font-bold"
              style={{
                background: seteoActual?.esGeneral ? "oklch(0.64 0.15 34)" : "oklch(0.3 0.025 55)",
                color: seteoActual?.esGeneral ? "oklch(0.99 0.01 82)" : "oklch(0.85 0.012 82)",
              }}
            >
              General
            </button>
            {cancionesDisponibles.map((c) => {
              const existente = seteos.find((s) => s.cancionId === c.id);
              const activo = existente && existente.id === seteoActualId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => elegirCancion(c)}
                  disabled={pendingCrear}
                  className="rounded-2xl px-3.5 py-2 text-sm font-bold disabled:opacity-60"
                  style={{
                    background: activo ? "oklch(0.64 0.15 34)" : "oklch(0.3 0.025 55)",
                    color: activo ? "oklch(0.99 0.01 82)" : "oklch(0.85 0.012 82)",
                  }}
                >
                  {c.titulo}
                  {!existente && " +"}
                </button>
              );
            })}
          </div>
          {errorCrear && (
            <p className="mt-2 text-sm" style={{ color: "oklch(0.68 0.15 25)" }}>
              {errorCrear}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
