"use client";

import { useRef, useState, useTransition } from "react";
import type { ControlDiseno, Seteo } from "@/lib/dispositivosData";
import { actualizarValoresSeteoAction, crearSeteoParaCancionAction } from "@/app/seteos/actions";
import { PanelDispositivo } from "./PanelDispositivo";

type CancionOpcion = { id: string; titulo: string };

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ACENTO = "oklch(0.64 0.15 34)";
const ROJO = "oklch(0.55 0.15 25)";
const PILL_INACTIVO = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const PILL_ACTIVO = { background: ACENTO, color: "oklch(0.99 0.01 82)" };

// Un dispositivo asignado, renderizado directo en /seteos (brief "Seteos —
// rediseño de navegación...", §1/§2): sin pantalla de detalle aparte, el
// panel completo vive acá, en modo "General" por defecto. El selector es
// compacto (General / + / Canciones) en vez de la fila larga de chips de
// antes — "+" busca entre las canciones de la banda que todavía no tienen
// seteo propio para crear uno nuevo, "Canciones" (solo si ya hay al menos
// un seteo por canción) elige entre los que ya existen. Guarda solo, sin
// botón: cada cambio de perilla/botón persiste con un debounce corto.
export function DispositivoPanel({
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [picker, setPicker] = useState<"nueva" | "canciones" | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const cancionesConSeteo = cancionesDisponibles.filter((c) => seteos.some((s) => s.cancionId === c.id));
  const cancionesSinSeteo = cancionesDisponibles.filter((c) => !seteos.some((s) => s.cancionId === c.id));
  const cancionesFiltradas = cancionesSinSeteo.filter((c) => c.titulo.toLowerCase().includes(busqueda.trim().toLowerCase()));

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
    setPicker(null);
  };

  const toggleNueva = () => {
    setError(null);
    setBusqueda("");
    setPicker((p) => (p === "nueva" ? null : "nueva"));
  };

  const toggleCanciones = () => {
    setPicker((p) => (p === "canciones" ? null : "canciones"));
  };

  const crearParaCancion = (cancion: CancionOpcion) => {
    setError(null);
    startTransition(async () => {
      try {
        const nuevo = await crearSeteoParaCancionAction(dispositivoId, bandaId, cancion.id, controles);
        const seteoCreado = { ...nuevo, cancionTitulo: cancion.titulo };
        setSeteos((prev) => [...prev, seteoCreado]);
        seleccionarSeteo(seteoCreado);
        setPicker(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear el seteo para esta canción.");
      }
    });
  };

  const elegirCancionExistente = (cancion: CancionOpcion) => {
    const existente = seteos.find((s) => s.cancionId === cancion.id);
    if (existente) seleccionarSeteo(existente);
    setPicker(null);
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[19px] font-bold" style={{ color: TEXTO_OSCURO, fontFamily: "var(--font-bricolage), sans-serif" }}>
            {apodo || `${disenoMarca} ${disenoModelo}`}
          </div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
            {disenoMarca} {disenoModelo}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase" style={{ color: estadoGuardado === "error" ? ROJO : TEXTO_GRIS }}>
          {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "error" ? "No se pudo guardar" : "Guardado"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={elegirGeneral}
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={seteoActual?.esGeneral ? PILL_ACTIVO : PILL_INACTIVO}
        >
          General
        </button>
        <button
          type="button"
          onClick={toggleNueva}
          aria-label="Crear seteo para una canción"
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
          style={picker === "nueva" ? PILL_ACTIVO : PILL_INACTIVO}
        >
          +
        </button>
        {cancionesConSeteo.length > 0 && (
          <button
            type="button"
            onClick={toggleCanciones}
            className="rounded-full px-3 py-1.5 text-xs font-bold"
            style={seteoActual && !seteoActual.esGeneral ? PILL_ACTIVO : PILL_INACTIVO}
          >
            Canciones
          </button>
        )}
        {seteoActual && !seteoActual.esGeneral && (
          <span className="font-mono text-xs" style={{ color: TEXTO_GRIS }}>
            {seteoActual.cancionTitulo ?? seteoActual.nombre}
          </span>
        )}
      </div>

      {picker === "nueva" && (
        <div className="mt-2 rounded-xl p-2.5" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar canción…"
            autoFocus
            className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
            style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: TEXTO_OSCURO }}
          />
          <div className="mt-1.5 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {cancionesFiltradas.length === 0 ? (
              <p className="px-1 py-1 text-xs" style={{ color: TEXTO_GRIS }}>
                {cancionesDisponibles.length === 0
                  ? "Todavía no hay canciones en esta banda."
                  : cancionesSinSeteo.length === 0
                    ? "Todas las canciones ya tienen seteo propio."
                    : "Sin resultados."}
              </p>
            ) : (
              cancionesFiltradas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => crearParaCancion(c)}
                  disabled={pending}
                  className="rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold disabled:opacity-60"
                  style={{ color: TEXTO_OSCURO }}
                >
                  {c.titulo}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {picker === "canciones" && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl p-2.5" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          {cancionesConSeteo.map((c) => {
            const activo = seteos.find((s) => s.cancionId === c.id)?.id === seteoActualId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => elegirCancionExistente(c)}
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={activo ? PILL_ACTIVO : PILL_INACTIVO}
              >
                {c.titulo}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm" style={{ color: ROJO }}>
          {error}
        </p>
      )}

      <div className="mt-4">
        <PanelDispositivo controles={controles} valores={valoresBuffer} onChange={cambiarValor} />
      </div>
    </div>
  );
}
