"use client";

import { useState, useTransition } from "react";
import { NOTAS, type Nota, type Modo, type Calidad } from "@/lib/cancionTeoria";
import { NOMBRES_SECCION, type NombreSeccion } from "@/lib/seccionCatalogo";
import type { CancionCompleta, CancionInput } from "@/lib/cancionesData";
import { crearCancionAction, actualizarCancionAction } from "@/app/canciones/actions";
import { AcordeSelector } from "./AcordeSelector";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "flex flex-col gap-1 text-sm";
const labelColor = { color: "oklch(0.5 0.02 55)" };
const inactivoStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const activoStyle = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };

type AcordeFS = { notaRaiz: Nota; calidad: Calidad; duracionCompases: number; incluirNovena: boolean };
type SeccionFS = { nombre: NombreSeccion; acordes: AcordeFS[] };

function nuevaSeccion(): SeccionFS {
  return { nombre: "Intro", acordes: [] };
}

function SeccionNombreSelector({ valor, onCambio }: { valor: NombreSeccion; onCambio: (n: NombreSeccion) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={activoStyle}>
        {valor}
      </button>
      {abierto && (
        <div
          className="absolute z-20 mt-1 flex w-56 flex-wrap gap-1.5 rounded-xl p-2.5"
          style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" }}
        >
          {NOMBRES_SECCION.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onCambio(n);
                setAbierto(false);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
              style={n === valor ? activoStyle : inactivoStyle}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CancionForm({
  bandaId,
  cancionExistente,
}: {
  bandaId: string;
  cancionExistente?: CancionCompleta;
}) {
  const [titulo, setTitulo] = useState(cancionExistente?.titulo ?? "");
  const [bpm, setBpm] = useState(cancionExistente?.bpm?.toString() ?? "");
  const [duracion, setDuracion] = useState(cancionExistente?.duracionAprox ?? "");
  const [raiz, setRaiz] = useState<Nota>(cancionExistente?.tonalidadNota ?? "C");
  const [modo, setModo] = useState<Modo>(cancionExistente?.tonalidadModo ?? "mayor");
  const [secciones, setSecciones] = useState<SeccionFS[]>(
    cancionExistente?.secciones.map((s) => ({
      nombre: s.nombre,
      acordes: s.acordes.map((a) => ({
        notaRaiz: a.notaRaiz,
        calidad: a.calidad,
        duracionCompases: a.duracionCompases,
        incluirNovena: a.incluirNovena,
      })),
    })) ?? [nuevaSeccion()]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tonalidad = { raiz, modo };

  const actualizarSeccion = (i: number, patch: Partial<SeccionFS>) =>
    setSecciones((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const moverSeccion = (i: number, dir: -1 | 1) =>
    setSecciones((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });

  const quitarSeccion = (i: number) => setSecciones((prev) => prev.filter((_, idx) => idx !== i));

  const duplicarSeccion = (i: number) =>
    setSecciones((prev) => {
      const copia = { nombre: prev[i].nombre, acordes: prev[i].acordes.map((a) => ({ ...a })) };
      const siguiente = [...prev];
      siguiente.splice(i + 1, 0, copia);
      return siguiente;
    });

  const agregarAcorde = (si: number) =>
    setSecciones((prev) =>
      prev.map((s, idx) =>
        idx === si ? { ...s, acordes: [...s.acordes, { notaRaiz: raiz, calidad: "mayor", duracionCompases: 1, incluirNovena: false }] } : s
      )
    );

  const actualizarAcorde = (si: number, ai: number, patch: Partial<AcordeFS>) =>
    setSecciones((prev) =>
      prev.map((s, idx) =>
        idx === si ? { ...s, acordes: s.acordes.map((a, aidx) => (aidx === ai ? { ...a, ...patch } : a)) } : s
      )
    );

  const quitarAcorde = (si: number, ai: number) =>
    setSecciones((prev) =>
      prev.map((s, idx) => (idx === si ? { ...s, acordes: s.acordes.filter((_, aidx) => aidx !== ai) } : s))
    );

  const onSubmit = () => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    const input: CancionInput = {
      bandaId,
      titulo: titulo.trim(),
      tonalidadNota: raiz,
      tonalidadModo: modo,
      bpm: bpm ? Number(bpm) : null,
      duracionAprox: duracion.trim() || null,
      secciones,
    };

    startTransition(async () => {
      try {
        if (cancionExistente) {
          await actualizarCancionAction(cancionExistente.id, input);
        } else {
          await crearCancionAction(input);
        }
      } catch (e) {
        // redirect() lanza internamente una excepción de control de flujo de
        // Next.js que no debe tratarse como error de la app.
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
        } else if (!(e instanceof Error)) {
          throw e;
        }
      }
    });
  };

  return (
    <div className="flex h-full max-w-3xl flex-col">
      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto pb-4 pr-1">
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls} style={labelColor}>
            Título
            <input className={inputCls} style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <label className={labelCls} style={labelColor}>
            BPM
            <input
              type="number"
              min={0}
              max={999}
              className={inputCls}
              style={inputStyle}
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
            />
          </label>
          <label className={labelCls} style={labelColor}>
            Duración
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="3:24"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />
          </label>
        </div>

        <div>
          <div className="mb-1.5 text-sm" style={labelColor}>
            Tonalidad
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {NOTAS.map((n) => (
              <button key={n} type="button" onClick={() => setRaiz(n)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={n === raiz ? activoStyle : inactivoStyle}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(["mayor", "menor"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModo(m)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={m === modo ? activoStyle : inactivoStyle}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {secciones.map((s, si) => (
            <div key={si} className="rounded-xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
              <div className="mb-3 flex items-center gap-3">
                <SeccionNombreSelector valor={s.nombre} onCambio={(nombre) => actualizarSeccion(si, { nombre })} />
                <div className="flex gap-1">
                  <button type="button" onClick={() => moverSeccion(si, -1)} disabled={si === 0} className="text-sm disabled:opacity-30" style={labelColor}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverSeccion(si, 1)}
                    disabled={si === secciones.length - 1}
                    className="text-sm disabled:opacity-30"
                    style={labelColor}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => duplicarSeccion(si)}
                  className="rounded-lg px-3 py-1.5 text-sm font-bold"
                  style={inactivoStyle}
                  title="Crea una copia idéntica de esta sección justo después"
                >
                  Duplicar
                </button>
                {secciones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarSeccion(si)}
                    className="ml-auto rounded-lg px-3 py-1.5 text-sm"
                    style={{ color: "oklch(0.6 0.15 25)" }}
                  >
                    Quitar sección
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {s.acordes.map((a, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <AcordeSelector
                      tonalidad={tonalidad}
                      notaRaiz={a.notaRaiz}
                      calidad={a.calidad}
                      onSeleccionar={(notaRaiz, calidad) => actualizarAcorde(si, ai, { notaRaiz, calidad })}
                    />
                    <button
                      type="button"
                      title="Agrega la novena al acorde"
                      onClick={() => actualizarAcorde(si, ai, { incluirNovena: !a.incluirNovena })}
                      className="whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-bold"
                      style={a.incluirNovena ? activoStyle : inactivoStyle}
                    >
                      Agregar 9ª
                    </button>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      className={inputCls}
                      style={{ ...inputStyle, width: 90 }}
                      value={a.duracionCompases}
                      onChange={(e) => actualizarAcorde(si, ai, { duracionCompases: Number(e.target.value) || 1 })}
                    />
                    <span className="text-xs" style={labelColor}>
                      compases
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarAcorde(si, ai)}
                      className="ml-auto text-sm"
                      style={{ color: "oklch(0.6 0.15 25)" }}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => agregarAcorde(si)}
                  className="mt-1 w-fit rounded-lg px-3 py-1.5 text-sm font-bold"
                  style={{ border: "1px dashed oklch(0.75 0.02 78)", color: "oklch(0.5 0.02 55)" }}
                >
                  + Agregar acorde
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setSecciones((prev) => [...prev, nuevaSeccion()])}
            className="w-fit rounded-lg px-4 py-2 text-sm font-bold"
            style={{ border: "1px dashed oklch(0.75 0.02 78)", color: "oklch(0.5 0.02 55)" }}
          >
            + Agregar sección
          </button>
        </div>

        {error && (
          <div className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-4" style={{ borderTop: "1px solid oklch(0.89 0.013 78)" }}>
        <button
          type="button"
          disabled={pending}
          onClick={onSubmit}
          className="w-fit rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
          style={activoStyle}
        >
          {pending ? "Guardando..." : cancionExistente ? "Guardar cambios" : "Guardar canción"}
        </button>
      </div>
    </div>
  );
}
