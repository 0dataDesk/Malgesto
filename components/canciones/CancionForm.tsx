"use client";

import { useState, useTransition } from "react";
import { NOTAS, type Nota, type Modo, type Calidad } from "@/lib/cancionTeoria";
import { NOMBRES_SECCION, colorPorTipoSeccion, type NombreSeccion } from "@/lib/seccionCatalogo";
import type { CancionCompleta, CancionInput } from "@/lib/cancionesData";
import { crearCancionAction, actualizarCancionAction } from "@/app/canciones/actions";
import { AcordeSelector } from "./AcordeSelector";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "flex flex-col gap-1 text-sm";
const labelColor = { color: "oklch(0.5 0.02 55)" };
const inactivoStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const activoStyle = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };

// Brief 19 §3: 7 notas naturales para la lista desplegable de tonalidad — el
// sostenido se decide aparte con el toggle "♯", no está en la lista.
const NATURALES = NOTAS.filter((n) => !n.includes("#")) as Nota[];

function esNota(natural: string, sostenido: boolean): Nota {
  const candidata = `${natural}${sostenido ? "#" : ""}`;
  return (NOTAS as readonly string[]).includes(candidata) ? (candidata as Nota) : (natural as Nota);
}

function puedeSostenido(natural: string): boolean {
  return (NOTAS as readonly string[]).includes(`${natural}#`);
}

type AcordeFS = { notaRaiz: Nota; calidad: Calidad; duracionCompases: number };
type SeccionFS = { nombre: NombreSeccion; acordes: AcordeFS[] };

function nuevaSeccion(): SeccionFS {
  return { nombre: "Intro", acordes: [] };
}

function IconoDuplicar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function IconoQuitar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SeccionNombreSelector({ valor, onCambio }: { valor: NombreSeccion; onCambio: (n: NombreSeccion) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-md px-2 py-1 text-xs font-semibold"
        style={{ background: colorPorTipoSeccion(valor), color: "oklch(0.99 0.01 82)" }}
      >
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
              style={n === valor ? { background: colorPorTipoSeccion(n), color: "oklch(0.99 0.01 82)" } : inactivoStyle}
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
      })),
    })) ?? [nuevaSeccion()]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tonalidad = { raiz, modo };

  // Brief 20 §1: se recalcula en cada render a partir de `secciones` — nunca
  // se guarda, así que no puede desincronizarse de lo que el usuario está
  // editando en este momento (no hace falta guardar primero).
  const compasesPorSeccion = (s: SeccionFS) => s.acordes.reduce((total, a) => total + a.duracionCompases, 0);
  const totalCompases = secciones.reduce((total, s) => total + compasesPorSeccion(s), 0);

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
        idx === si ? { ...s, acordes: [...s.acordes, { notaRaiz: raiz, calidad: "mayor", duracionCompases: 1 }] } : s
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
      <div className="mb-3 shrink-0 font-mono text-xs font-bold uppercase tracking-wide" style={labelColor}>
        Total: {totalCompases} {totalCompases === 1 ? "compás" : "compases"}
      </div>
      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto pb-4 pr-1">
        <div className="flex flex-col gap-4">
          <label className={labelCls} style={labelColor}>
            Título
            <input className={inputCls} style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <div className="flex gap-4">
            <label className={labelCls} style={labelColor}>
              Duración
              <input
                className={inputCls}
                style={{ ...inputStyle, width: "5.5em" }}
                maxLength={5}
                placeholder="3:24"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
            </label>
            <label className={labelCls} style={labelColor}>
              BPM
              <input
                type="number"
                min={0}
                max={999}
                className={inputCls}
                style={{ ...inputStyle, width: "4.5em" }}
                maxLength={3}
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm" style={labelColor}>
            Tonalidad
          </div>
          <div className="flex items-center gap-1.5">
            <select
              className={`${inputCls} w-auto`}
              style={inputStyle}
              value={raiz.replace("#", "")}
              onChange={(e) => setRaiz(esNota(e.target.value, raiz.includes("#")))}
            >
              {NATURALES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!puedeSostenido(raiz.replace("#", ""))}
              onClick={() => setRaiz(esNota(raiz.replace("#", ""), !raiz.includes("#")))}
              title="Sostenido"
              className="rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-30"
              style={raiz.includes("#") ? activoStyle : inactivoStyle}
            >
              ♯
            </button>
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
                <span className="font-mono text-xs" style={labelColor}>
                  {compasesPorSeccion(s)}c
                </span>
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
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: "oklch(0.93 0.016 78 / 0.9)", color: "oklch(0.45 0.02 55)", border: "1px solid oklch(0.85 0.016 78)" }}
                  aria-label="Duplicar sección"
                  title="Crea una copia idéntica de esta sección justo después"
                >
                  <IconoDuplicar />
                </button>
                {secciones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarSeccion(si)}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)", border: "1px solid oklch(0.6 0.15 25 / 0.35)" }}
                    aria-label="Quitar sección"
                    title="Quitar sección"
                  >
                    <IconoQuitar />
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
                    <input
                      type="text"
                      inputMode="numeric"
                      className="rounded-lg border text-center text-sm outline-none"
                      style={{ ...inputStyle, width: "2.75em", padding: "8px 2px" }}
                      value={a.duracionCompases}
                      onChange={(e) => {
                        const limpio = e.target.value.replace(/[^0-9.]/g, "");
                        actualizarAcorde(si, ai, { duracionCompases: Number(limpio) || 1 });
                      }}
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
                  + Acorde
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
            + Sección
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
