"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Control, Seteo, TipoControl } from "@/lib/dispositivosData";
import { actualizarSeteoAction, crearSeteoAction } from "@/app/seteos/actions";
import { Knob } from "./Knob";
import { SliderVertical } from "./SliderVertical";

type CancionOpcion = { id: string; titulo: string };

function etiquetaSeteo(s: Seteo): string {
  if (s.esGeneral) return "General";
  if (s.cancionId) return s.cancionTitulo ?? "Vinculado";
  return s.nombre || "Sin vincular";
}

// Detalle de dispositivo (pantalla 13, Brief 6): controles interactivos
// (perillas o EQ gráfico según tipoControl), selector de seteo, indicador
// de cambios sin guardar, vincular a canción / marcar general (mutuamente
// excluyente) y alta de seteo nuevo para el mismo dispositivo.
export function DispositivoDetalle({
  bandaId,
  dispositivoId,
  nombreDispositivo,
  tipoControl,
  controles,
  seteosIniciales,
  cancionesDisponibles,
}: {
  bandaId: string;
  dispositivoId: string;
  nombreDispositivo: string;
  tipoControl: TipoControl;
  controles: Control[];
  seteosIniciales: Seteo[];
  cancionesDisponibles: CancionOpcion[];
}) {
  const [seteos, setSeteos] = useState<Seteo[]>(seteosIniciales);
  const [seteoActualId, setSeteoActualId] = useState<string | null>(seteosIniciales[0]?.id ?? null);
  const seteoGuardado = seteos.find((s) => s.id === seteoActualId) ?? null;

  const [nombreBuffer, setNombreBuffer] = useState(seteoGuardado?.nombre ?? "");
  const [valoresBuffer, setValoresBuffer] = useState<Record<string, number>>(seteoGuardado?.valores ?? {});
  const [cancionIdBuffer, setCancionIdBuffer] = useState<string | null>(seteoGuardado?.cancionId ?? null);
  const [esGeneralBuffer, setEsGeneralBuffer] = useState(seteoGuardado?.esGeneral ?? false);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seleccionarSeteo = (id: string) => {
    const s = seteos.find((x) => x.id === id);
    if (!s) return;
    setSeteoActualId(id);
    setNombreBuffer(s.nombre);
    setValoresBuffer(s.valores);
    setCancionIdBuffer(s.cancionId);
    setEsGeneralBuffer(s.esGeneral);
    setError(null);
  };

  const dirty = useMemo(() => {
    if (!seteoGuardado) return false;
    if (nombreBuffer !== seteoGuardado.nombre) return true;
    if (cancionIdBuffer !== seteoGuardado.cancionId) return true;
    if (esGeneralBuffer !== seteoGuardado.esGeneral) return true;
    return controles.some((c) => (valoresBuffer[c.id] ?? c.valorDefault) !== (seteoGuardado.valores[c.id] ?? c.valorDefault));
  }, [seteoGuardado, nombreBuffer, valoresBuffer, cancionIdBuffer, esGeneralBuffer, controles]);

  const cambiarValor = (controlId: string, v: number) => {
    setValoresBuffer((prev) => ({ ...prev, [controlId]: v }));
  };

  const marcarGeneral = () => {
    setEsGeneralBuffer(true);
    setCancionIdBuffer(null);
  };

  const vincularCancion = (cancionId: string) => {
    if (!cancionId) {
      setCancionIdBuffer(null);
      return;
    }
    setCancionIdBuffer(cancionId);
    setEsGeneralBuffer(false);
  };

  const guardar = () => {
    if (!seteoActualId) return;
    setError(null);
    startTransition(async () => {
      try {
        await actualizarSeteoAction(seteoActualId, dispositivoId, bandaId, {
          nombre: nombreBuffer.trim() || "Seteo",
          valores: valoresBuffer,
          cancionId: cancionIdBuffer,
          esGeneral: esGeneralBuffer,
        });

        const cancionTitulo = cancionIdBuffer
          ? (cancionesDisponibles.find((c) => c.id === cancionIdBuffer)?.titulo ?? null)
          : null;

        setSeteos((prev) =>
          prev.map((s) => {
            if (s.id === seteoActualId) {
              return { ...s, nombre: nombreBuffer.trim() || "Seteo", valores: valoresBuffer, cancionId: cancionIdBuffer, esGeneral: esGeneralBuffer, cancionTitulo };
            }
            // Mismo efecto colateral que el server: si este seteo pasó a
            // general, o se vinculó a una canción que otro ya tenía, ese
            // otro pierde la marca.
            let siguiente = s;
            if (esGeneralBuffer && s.esGeneral) siguiente = { ...siguiente, esGeneral: false };
            if (cancionIdBuffer && s.cancionId === cancionIdBuffer) siguiente = { ...siguiente, cancionId: null };
            return siguiente;
          })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const crearNuevo = () => {
    setError(null);
    startTransition(async () => {
      try {
        const nuevoId = await crearSeteoAction(dispositivoId, bandaId, controles);
        const valoresDefault = Object.fromEntries(controles.map((c) => [c.id, c.valorDefault]));
        const nuevoSeteo: Seteo = {
          id: nuevoId,
          dispositivoId,
          nombre: "Nuevo seteo",
          valores: valoresDefault,
          cancionId: null,
          cancionTitulo: null,
          esGeneral: false,
        };
        setSeteos((prev) => [...prev, nuevoSeteo]);
        seleccionarSeteo(nuevoId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el seteo.");
      }
    });
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.22 0.02 52)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <Link href="/seteos" className="mb-3 inline-block text-sm no-underline" style={{ color: "oklch(0.7 0.03 60)" }}>
          ‹ Mis dispositivos
        </Link>
        <h1
          className="text-[28px] font-extrabold tracking-tight"
          style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {nombreDispositivo}
        </h1>
        <div className="mt-1 font-mono text-xs uppercase tracking-wide" style={{ color: "oklch(0.65 0.03 60)" }}>
          {tipoControl === "eq_grafico" ? "EQ gráfico" : "Perillas"}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {seteos.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => seleccionarSeteo(s.id)}
              className="rounded-2xl px-3.5 py-2 text-sm font-bold"
              style={{
                background: s.id === seteoActualId ? "oklch(0.64 0.15 34)" : "oklch(0.3 0.025 55)",
                color: s.id === seteoActualId ? "oklch(0.99 0.01 82)" : "oklch(0.85 0.012 82)",
              }}
            >
              {etiquetaSeteo(s)}
            </button>
          ))}
        </div>

        {seteoGuardado && (
          <>
            <div className="mt-7 flex flex-wrap justify-center gap-6">
              {controles.map((c) =>
                tipoControl === "perillas" ? (
                  <Knob key={c.id} control={c} valor={valoresBuffer[c.id] ?? c.valorDefault} onChange={(v) => cambiarValor(c.id, v)} />
                ) : (
                  <SliderVertical key={c.id} control={c} valor={valoresBuffer[c.id] ?? c.valorDefault} onChange={(v) => cambiarValor(c.id, v)} />
                )
              )}
            </div>

            <div className="mt-8 rounded-2xl p-4" style={{ background: "oklch(0.26 0.02 52)", border: "1px solid oklch(0.34 0.025 55)" }}>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.7 0.03 60)" }}>
                Nombre del seteo
              </div>
              <input
                value={nombreBuffer}
                onChange={(e) => setNombreBuffer(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                style={{ background: "oklch(0.22 0.02 52)", borderColor: "oklch(0.4 0.03 55)", color: "oklch(0.95 0.012 82)" }}
              />

              <div className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.7 0.03 60)" }}>
                Uso
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={marcarGeneral}
                  className="rounded-xl px-3.5 py-2.5 text-left text-sm font-bold"
                  style={{
                    background: esGeneralBuffer ? "oklch(0.64 0.15 34)" : "oklch(0.3 0.025 55)",
                    color: esGeneralBuffer ? "oklch(0.99 0.01 82)" : "oklch(0.85 0.012 82)",
                  }}
                >
                  {esGeneralBuffer ? "✓ Marcado como general" : "Marcar como general"}
                </button>

                <select
                  value={!esGeneralBuffer ? (cancionIdBuffer ?? "") : ""}
                  onChange={(e) => vincularCancion(e.target.value)}
                  className="rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{ background: "oklch(0.22 0.02 52)", borderColor: "oklch(0.4 0.03 55)", color: "oklch(0.95 0.012 82)" }}
                >
                  <option value="">— sin vincular a canción —</option>
                  {cancionesDisponibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm" style={{ color: "oklch(0.68 0.15 25)" }}>
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={guardar}
                disabled={pending || !dirty}
                className="rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "oklch(0.5 0.13 148)" }}
              >
                {pending ? "Guardando..." : dirty ? "Guardar cambios" : "Sin cambios"}
              </button>
              <button
                type="button"
                onClick={crearNuevo}
                disabled={pending}
                className="rounded-xl px-4 py-3 text-sm font-bold"
                style={{ background: "oklch(0.3 0.025 55)", color: "oklch(0.85 0.012 82)" }}
              >
                + Crear seteo nuevo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
