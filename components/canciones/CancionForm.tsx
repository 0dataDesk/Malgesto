"use client";

import { useState, useTransition } from "react";
import { NOTAS, type Nota, type Modo, type Calidad } from "@/lib/cancionTeoria";
import { NOMBRES_SECCION, colorPorTipoSeccion, type NombreSeccion } from "@/lib/seccionCatalogo";
import type {
  CancionCompleta,
  CancionInput,
  SeccionInput,
  SeccionBaseInput,
  LetraLineaInput,
} from "@/lib/cancionesData";
import { formatoMMSS, parseMMSS } from "@/lib/duracion";
import {
  crearCancionAction,
  actualizarCancionAction,
  subirAudioAction,
  quitarAudioAction,
} from "@/app/canciones/actions";
import { AcordeSelector } from "./AcordeSelector";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "flex flex-col gap-1 text-sm";
const labelColor = { color: "oklch(0.5 0.02 55)" };
const inactivoStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const activoStyle = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };

const NATURALES = NOTAS.filter((n) => !n.includes("#")) as Nota[];

function esNota(natural: string, sostenido: boolean): Nota {
  const candidata = `${natural}${sostenido ? "#" : ""}`;
  return (NOTAS as readonly string[]).includes(candidata) ? (candidata as Nota) : (natural as Nota);
}
function puedeSostenido(natural: string): boolean {
  return (NOTAS as readonly string[]).includes(`${natural}#`);
}

type AcordeFS = { notaRaiz: Nota; calidad: Calidad; duracionCompases: number };
type LetraFS = { texto: string; acordes: { posicion: number; notaRaiz: Nota; calidad: Calidad }[] };
type SeccionCuerpoFS = {
  acordes: AcordeFS[];
  letra: LetraFS[];
  tonalidadPropia: boolean;
  tonRaiz: Nota;
  tonModo: Modo;
  numeroCompases: string;
  bpm: string;
};
type RepeticionFS = SeccionCuerpoFS & { repeticionIndice: number };
type SeccionFS = SeccionCuerpoFS & {
  nombre: NombreSeccion;
  repiteVeces: number;
  repeticiones: RepeticionFS[];
};

function cuerpoVacio(): SeccionCuerpoFS {
  return { acordes: [], letra: [], tonalidadPropia: false, tonRaiz: "C", tonModo: "mayor", numeroCompases: "", bpm: "" };
}
function nuevaSeccion(): SeccionFS {
  return { ...cuerpoVacio(), nombre: "Intro", repiteVeces: 1, repeticiones: [] };
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

// -------- Editor de acordes de una sección/vuelta --------
function AcordesEditor({
  acordes,
  tonalidad,
  raizDefault,
  onCambio,
}: {
  acordes: AcordeFS[];
  tonalidad: { raiz: Nota; modo: Modo };
  raizDefault: Nota;
  onCambio: (acordes: AcordeFS[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {acordes.map((a, ai) => (
        <div key={ai} className="flex items-center gap-2">
          <AcordeSelector
            tonalidad={tonalidad}
            notaRaiz={a.notaRaiz}
            calidad={a.calidad}
            onSeleccionar={(notaRaiz, calidad) => onCambio(acordes.map((x, i) => (i === ai ? { ...x, notaRaiz, calidad } : x)))}
          />
          <input
            type="text"
            inputMode="numeric"
            className="rounded-lg border text-center text-sm outline-none"
            style={{ ...inputStyle, width: "2.75em", padding: "8px 2px" }}
            value={a.duracionCompases}
            onChange={(e) => {
              const limpio = e.target.value.replace(/[^0-9.]/g, "");
              onCambio(acordes.map((x, i) => (i === ai ? { ...x, duracionCompases: limpio === "" ? 0 : Number(limpio) } : x)));
            }}
          />
          <span className="text-xs" style={labelColor}>
            comp.
          </span>
          <button type="button" onClick={() => onCambio(acordes.filter((_, i) => i !== ai))} className="ml-auto text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onCambio([...acordes, { notaRaiz: raizDefault, calidad: "mayor", duracionCompases: 1 }])}
        className="mt-1 w-fit rounded-lg px-3 py-1.5 text-sm font-bold"
        style={{ border: "1px dashed oklch(0.75 0.02 78)", color: "oklch(0.5 0.02 55)" }}
      >
        + Acorde
      </button>
    </div>
  );
}

// -------- Editor de letra alineada a acordes (Fase 1 §5) --------
function LetraEditor({
  letra,
  tonalidad,
  raizDefault,
  onCambio,
}: {
  letra: LetraFS[];
  tonalidad: { raiz: Nota; modo: Modo };
  raizDefault: Nota;
  onCambio: (letra: LetraFS[]) => void;
}) {
  const [foco, setFoco] = useState<{ linea: number; pos: number } | null>(null);

  const setLinea = (i: number, patch: Partial<LetraFS>) => onCambio(letra.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="flex flex-col gap-2.5">
      {letra.map((l, li) => (
        <div key={li} className="rounded-lg p-2" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.9 0.012 78)" }}>
          {l.acordes.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {[...l.acordes]
                .sort((a, b) => a.posicion - b.posicion)
                .map((ac, idx) => (
                  <span key={idx} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.3 0.02 55)" }}>
                    {ac.notaRaiz}
                    {ac.calidad === "menor" ? "m" : ac.calidad === "mayor" ? "" : ac.calidad}
                    <span style={{ color: "oklch(0.55 0.02 55)" }}>@{ac.posicion}</span>
                    <button
                      type="button"
                      onClick={() => setLinea(li, { acordes: l.acordes.filter((_, i) => i !== l.acordes.indexOf(ac)) })}
                      className="ml-0.5"
                      style={{ color: "oklch(0.6 0.15 25)" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={l.texto}
              placeholder="Línea de letra…"
              onChange={(e) => setLinea(li, { texto: e.target.value })}
              onSelect={(e) => setFoco({ linea: li, pos: (e.target as HTMLInputElement).selectionStart ?? 0 })}
              onFocus={(e) => setFoco({ linea: li, pos: e.target.selectionStart ?? 0 })}
              className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={inputStyle}
            />
            <button type="button" onClick={() => onCambio(letra.filter((_, i) => i !== li))} className="text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>
              Quitar
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase" style={labelColor}>
              Acorde en el cursor
            </span>
            <AcordeSelector
              tonalidad={tonalidad}
              notaRaiz={raizDefault}
              calidad="mayor"
              onSeleccionar={(notaRaiz, calidad) => {
                const pos = foco && foco.linea === li ? foco.pos : l.texto.length;
                setLinea(li, { acordes: [...l.acordes, { posicion: pos, notaRaiz, calidad }] });
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onCambio([...letra, { texto: "", acordes: [] }])}
        className="w-fit rounded-lg px-3 py-1.5 text-sm font-bold"
        style={{ border: "1px dashed oklch(0.75 0.02 78)", color: "oklch(0.5 0.02 55)" }}
      >
        + Línea de letra
      </button>
    </div>
  );
}

// -------- Ajustes tonalidad/compases/BPM de una sección o vuelta --------
function CuerpoAjustes({ cuerpo, onCambio }: { cuerpo: SeccionCuerpoFS; onCambio: (patch: Partial<SeccionCuerpoFS>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onCambio({ tonalidadPropia: !cuerpo.tonalidadPropia })}
        className="rounded-lg px-2.5 py-1 text-xs font-bold"
        style={cuerpo.tonalidadPropia ? activoStyle : inactivoStyle}
      >
        Tonalidad propia
      </button>
      {cuerpo.tonalidadPropia && (
        <>
          <select
            className="rounded-lg border px-2 py-1 text-xs outline-none"
            style={inputStyle}
            value={cuerpo.tonRaiz.replace("#", "")}
            onChange={(e) => onCambio({ tonRaiz: esNota(e.target.value, cuerpo.tonRaiz.includes("#")) })}
          >
            {NATURALES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!puedeSostenido(cuerpo.tonRaiz.replace("#", ""))}
            onClick={() => onCambio({ tonRaiz: esNota(cuerpo.tonRaiz.replace("#", ""), !cuerpo.tonRaiz.includes("#")) })}
            className="rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-30"
            style={cuerpo.tonRaiz.includes("#") ? activoStyle : inactivoStyle}
          >
            ♯
          </button>
          {(["mayor", "menor"] as const).map((m) => (
            <button key={m} type="button" onClick={() => onCambio({ tonModo: m })} className="rounded-lg px-2 py-1 text-xs font-bold" style={m === cuerpo.tonModo ? activoStyle : inactivoStyle}>
              {m}
            </button>
          ))}
        </>
      )}
      <label className="flex items-center gap-1 text-xs" style={labelColor}>
        Compases
        <input
          type="text"
          inputMode="numeric"
          placeholder="auto"
          value={cuerpo.numeroCompases}
          onChange={(e) => onCambio({ numeroCompases: e.target.value.replace(/[^0-9]/g, "") })}
          className="rounded-lg border text-center text-xs outline-none"
          style={{ ...inputStyle, width: "3.5em", padding: "5px 2px" }}
        />
      </label>
      <label className="flex items-center gap-1 text-xs" style={labelColor}>
        BPM
        <input
          type="text"
          inputMode="numeric"
          placeholder="hereda"
          value={cuerpo.bpm}
          onChange={(e) => onCambio({ bpm: e.target.value.replace(/[^0-9]/g, "") })}
          className="rounded-lg border text-center text-xs outline-none"
          style={{ ...inputStyle, width: "4em", padding: "5px 2px" }}
        />
      </label>
    </div>
  );
}

// -------- Audio (Fase 1 §4) --------
function AudioCampo({
  cancionId,
  bandaId,
  tipo,
  titulo,
  urlInicial,
}: {
  cancionId: string;
  bandaId: string;
  tipo: "referencia" | "secuencia";
  titulo: string;
  urlInicial: string | null;
}) {
  const [url, setUrl] = useState(urlInicial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subir = (archivo: File) => {
    setError(null);
    const form = new FormData();
    form.set("archivo", archivo);
    startTransition(async () => {
      try {
        const nueva = await subirAudioAction(cancionId, bandaId, tipo, form);
        setUrl(nueva);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir.");
      }
    });
  };

  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={labelColor}>
          {titulo}
        </span>
        {url && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await quitarAudioAction(cancionId, bandaId, tipo);
                setUrl(null);
              })
            }
            className="text-xs"
            style={{ color: "oklch(0.6 0.15 25)" }}
          >
            Quitar
          </button>
        )}
      </div>
      {url && <audio controls preload="none" src={url} className="mb-2 w-full" style={{ height: 34 }} />}
      <label className="inline-block cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold" style={inactivoStyle}>
        {pending ? "Subiendo…" : url ? "Reemplazar archivo" : "Subir archivo"}
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="mt-1 text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// -------- Componente principal --------
export function CancionForm({ bandaId, cancionExistente }: { bandaId: string; cancionExistente?: CancionCompleta }) {
  const [esCover, setEsCover] = useState(cancionExistente?.esCover ?? false);
  const [esBorrador, setEsBorrador] = useState(cancionExistente?.esBorrador ?? true);
  const [titulo, setTitulo] = useState(cancionExistente?.titulo ?? "");
  const [bpm, setBpm] = useState(cancionExistente?.bpm?.toString() ?? "");
  const [duracion, setDuracion] = useState(formatoMMSS(cancionExistente?.duracionSegundos ?? null) ?? "");
  const [raiz, setRaiz] = useState<Nota>(cancionExistente?.tonalidadNota ?? "C");
  const [modo, setModo] = useState<Modo>(cancionExistente?.tonalidadModo ?? "mayor");
  const [secciones, setSecciones] = useState<SeccionFS[]>(
    cancionExistente?.secciones.map((s) => ({
      nombre: s.nombre,
      repiteVeces: s.repiteVeces,
      acordes: s.acordes.map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, duracionCompases: a.duracionCompases })),
      letra: s.letra.map((l) => ({ texto: l.texto, acordes: l.acordes.map((a) => ({ posicion: a.posicion, notaRaiz: a.notaRaiz, calidad: a.calidad })) })),
      tonalidadPropia: s.tonalidadNota !== null,
      tonRaiz: s.tonalidadNota ?? "C",
      tonModo: s.tonalidadModo ?? "mayor",
      numeroCompases: s.numeroCompases?.toString() ?? "",
      bpm: s.bpm?.toString() ?? "",
      repeticiones: s.repeticiones.map((r) => ({
        repeticionIndice: r.repeticionIndice,
        acordes: r.acordes.map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, duracionCompases: a.duracionCompases })),
        letra: r.letra.map((l) => ({ texto: l.texto, acordes: l.acordes.map((a) => ({ posicion: a.posicion, notaRaiz: a.notaRaiz, calidad: a.calidad })) })),
        tonalidadPropia: r.tonalidadNota !== null,
        tonRaiz: r.tonalidadNota ?? "C",
        tonModo: r.tonalidadModo ?? "mayor",
        numeroCompases: r.numeroCompases?.toString() ?? "",
        bpm: r.bpm?.toString() ?? "",
      })),
    })) ?? [nuevaSeccion()]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tonalidadGeneral = { raiz, modo };
  const tonalidadDe = (c: SeccionCuerpoFS) => (c.tonalidadPropia ? { raiz: c.tonRaiz, modo: c.tonModo } : tonalidadGeneral);

  const compasesDe = (c: SeccionCuerpoFS) =>
    c.numeroCompases ? Number(c.numeroCompases) : c.acordes.reduce((t, a) => t + a.duracionCompases, 0);
  const totalCompases = secciones.reduce((total, s) => {
    let sec = 0;
    for (let v = 1; v <= s.repiteVeces; v++) {
      const rep = s.repeticiones.find((r) => r.repeticionIndice === v);
      sec += rep ? compasesDe(rep) : compasesDe(s);
    }
    return total + sec;
  }, 0);

  const patchSeccion = (i: number, patch: Partial<SeccionFS>) => setSecciones((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moverSeccion = (i: number, dir: -1 | 1) =>
    setSecciones((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  const quitarSeccion = (i: number) => setSecciones((prev) => prev.filter((_, idx) => idx !== i));

  const toggleDesprender = (si: number, vuelta: number) =>
    setSecciones((prev) =>
      prev.map((s, idx) => {
        if (idx !== si) return s;
        const existe = s.repeticiones.some((r) => r.repeticionIndice === vuelta);
        if (existe) return { ...s, repeticiones: s.repeticiones.filter((r) => r.repeticionIndice !== vuelta) };
        // Copia ligada: arranca como clon del cuerpo actual de la plantilla.
        const clon: RepeticionFS = {
          repeticionIndice: vuelta,
          acordes: s.acordes.map((a) => ({ ...a })),
          letra: s.letra.map((l) => ({ texto: l.texto, acordes: l.acordes.map((a) => ({ ...a })) })),
          tonalidadPropia: s.tonalidadPropia,
          tonRaiz: s.tonRaiz,
          tonModo: s.tonModo,
          numeroCompases: s.numeroCompases,
          bpm: s.bpm,
        };
        return { ...s, repeticiones: [...s.repeticiones, clon].sort((a, b) => a.repeticionIndice - b.repeticionIndice) };
      })
    );

  const patchRepeticion = (si: number, vuelta: number, patch: Partial<SeccionCuerpoFS>) =>
    setSecciones((prev) =>
      prev.map((s, idx) =>
        idx === si ? { ...s, repeticiones: s.repeticiones.map((r) => (r.repeticionIndice === vuelta ? { ...r, ...patch } : r)) } : s
      )
    );

  const construirCuerpo = (c: SeccionCuerpoFS): Omit<SeccionBaseInput, "nombre" | "repiteVeces"> => ({
    tonalidadNota: c.tonalidadPropia ? c.tonRaiz : null,
    tonalidadModo: c.tonalidadPropia ? c.tonModo : null,
    numeroCompases: c.numeroCompases ? Number(c.numeroCompases) : null,
    bpm: c.bpm ? Number(c.bpm) : null,
    acordes: c.acordes,
    letra: c.letra.map((l): LetraLineaInput => ({ texto: l.texto, acordes: l.acordes })),
  });

  const onSubmit = () => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    const duracionSegundos = parseMMSS(duracion);
    if (duracion.trim() && duracionSegundos === null) {
      setError("Duración inválida — usá el formato mm:ss (ej. 3:24).");
      return;
    }

    const seccionesInput: SeccionInput[] = secciones.map((s) => ({
      nombre: s.nombre,
      repiteVeces: Math.max(1, s.repiteVeces),
      ...construirCuerpo(s),
      repeticiones: s.repeticiones
        .filter((r) => r.repeticionIndice >= 1 && r.repeticionIndice <= Math.max(1, s.repiteVeces))
        .map((r) => ({ nombre: s.nombre, repiteVeces: 1, repeticionIndice: r.repeticionIndice, ...construirCuerpo(r) })),
    }));

    const input: CancionInput = {
      bandaId,
      titulo: titulo.trim(),
      tonalidadNota: raiz,
      tonalidadModo: modo,
      bpm: bpm ? Number(bpm) : null,
      duracionSegundos,
      esCover,
      esBorrador,
      secciones: seccionesInput,
    };

    startTransition(async () => {
      try {
        if (cancionExistente) await actualizarCancionAction(cancionExistente.id, input);
        else await crearCancionAction(input);
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError(e.message);
        else if (!(e instanceof Error)) throw e;
      }
    });
  };

  return (
    <div className="flex h-full max-w-3xl flex-col">
      <div className="mb-3 flex shrink-0 items-center gap-3 font-mono text-xs font-bold uppercase tracking-wide" style={labelColor}>
        <span>Total: {totalCompases} {totalCompases === 1 ? "compás" : "compases"}</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setEsBorrador(true)} className="rounded-md px-2 py-1 text-[11px]" style={esBorrador ? activoStyle : inactivoStyle}>
            Borrador
          </button>
          <button type="button" onClick={() => setEsBorrador(false)} className="rounded-md px-2 py-1 text-[11px]" style={!esBorrador ? activoStyle : inactivoStyle}>
            Lista
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto pb-4 pr-1">
        <div className="flex flex-col gap-4">
          <label className={labelCls} style={labelColor}>
            Tipo de canción
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setEsCover(false)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={!esCover ? activoStyle : inactivoStyle}>
                Propia
              </button>
              <button type="button" onClick={() => setEsCover(true)} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={esCover ? activoStyle : inactivoStyle}>
                Cover
              </button>
            </div>
          </label>
          <label className={labelCls} style={labelColor}>
            Título
            <input className={inputCls} style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
          <div className="flex gap-4">
            <label className={labelCls} style={labelColor}>
              Duración
              <input className={inputCls} style={{ ...inputStyle, width: "5.5em" }} maxLength={5} placeholder="3:24" value={duracion} onChange={(e) => setDuracion(e.target.value)} />
            </label>
            <label className={labelCls} style={labelColor}>
              BPM
              <input type="number" min={0} max={999} className={inputCls} style={{ ...inputStyle, width: "4.5em" }} maxLength={3} value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </label>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm" style={labelColor}>
            Tonalidad general
          </div>
          <div className="flex items-center gap-1.5">
            <select className={`${inputCls} w-auto`} style={inputStyle} value={raiz.replace("#", "")} onChange={(e) => setRaiz(esNota(e.target.value, raiz.includes("#")))}>
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

        {cancionExistente && (
          <div className="flex flex-col gap-2">
            <div className="text-sm" style={labelColor}>
              Audio
            </div>
            <AudioCampo cancionId={cancionExistente.id} bandaId={bandaId} tipo="referencia" titulo="Referencia (ensayo)" urlInicial={cancionExistente.audioReferenciaUrl} />
            <AudioCampo cancionId={cancionExistente.id} bandaId={bandaId} tipo="secuencia" titulo="Secuencia (uso en vivo)" urlInicial={cancionExistente.audioSecuenciaUrl} />
          </div>
        )}

        <div className="flex flex-col gap-4">
          {secciones.map((s, si) => (
            <div key={si} className="rounded-xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <SeccionNombreSelector valor={s.nombre} onCambio={(nombre) => patchSeccion(si, { nombre })} />
                <span className="font-mono text-xs" style={labelColor}>
                  {compasesDe(s)}c
                </span>
                <label className="flex items-center gap-1 font-mono text-xs" style={labelColor}>
                  ×
                  <input
                    type="text"
                    inputMode="numeric"
                    value={s.repiteVeces}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value.replace(/[^0-9]/g, "")) || 1);
                      patchSeccion(si, { repiteVeces: n, repeticiones: s.repeticiones.filter((r) => r.repeticionIndice <= n) });
                    }}
                    className="rounded-lg border text-center text-xs outline-none"
                    style={{ ...inputStyle, width: "3em", padding: "5px 2px" }}
                  />
                  vueltas
                </label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moverSeccion(si, -1)} disabled={si === 0} className="text-sm disabled:opacity-30" style={labelColor}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moverSeccion(si, 1)} disabled={si === secciones.length - 1} className="text-sm disabled:opacity-30" style={labelColor}>
                    ↓
                  </button>
                </div>
                {secciones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarSeccion(si)}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)", border: "1px solid oklch(0.6 0.15 25 / 0.35)" }}
                    aria-label="Quitar sección"
                  >
                    <IconoQuitar />
                  </button>
                )}
              </div>

              <div className="mb-3">
                <CuerpoAjustes cuerpo={s} onCambio={(patch) => patchSeccion(si, patch)} />
              </div>

              <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide" style={labelColor}>
                Progresión
              </div>
              <AcordesEditor acordes={s.acordes} tonalidad={tonalidadDe(s)} raizDefault={tonalidadDe(s).raiz} onCambio={(acordes) => patchSeccion(si, { acordes })} />

              <div className="mb-1.5 mt-4 font-mono text-[10px] font-bold uppercase tracking-wide" style={labelColor}>
                Letra
              </div>
              <LetraEditor letra={s.letra} tonalidad={tonalidadDe(s)} raizDefault={tonalidadDe(s).raiz} onCambio={(letra) => patchSeccion(si, { letra })} />

              {s.repiteVeces > 1 && (
                <div className="mt-4">
                  <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide" style={labelColor}>
                    Vueltas — desprender una para editarla aparte
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: s.repiteVeces }).map((_, idx) => {
                      const vuelta = idx + 1;
                      const desprendida = s.repeticiones.some((r) => r.repeticionIndice === vuelta);
                      return (
                        <button
                          key={vuelta}
                          type="button"
                          onClick={() => toggleDesprender(si, vuelta)}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold"
                          style={desprendida ? activoStyle : inactivoStyle}
                        >
                          Vuelta {vuelta}
                          {desprendida ? " · aparte" : ""}
                        </button>
                      );
                    })}
                  </div>
                  {s.repeticiones.map((r) => (
                    <div key={r.repeticionIndice} className="mt-2 rounded-lg p-3" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.64 0.15 34 / 0.5)" }}>
                      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.13 34)" }}>
                        Vuelta {r.repeticionIndice} (aparte)
                      </div>
                      <CuerpoAjustes cuerpo={r} onCambio={(patch) => patchRepeticion(si, r.repeticionIndice, patch)} />
                      <div className="mt-2">
                        <AcordesEditor
                          acordes={r.acordes}
                          tonalidad={tonalidadDe(r)}
                          raizDefault={tonalidadDe(r).raiz}
                          onCambio={(acordes) => patchRepeticion(si, r.repeticionIndice, { acordes })}
                        />
                      </div>
                      <div className="mt-2">
                        <LetraEditor
                          letra={r.letra}
                          tonalidad={tonalidadDe(r)}
                          raizDefault={tonalidadDe(r).raiz}
                          onCambio={(letra) => patchRepeticion(si, r.repeticionIndice, { letra })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        <button type="button" disabled={pending} onClick={onSubmit} className="w-fit rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50" style={activoStyle}>
          {pending ? "Guardando..." : cancionExistente ? "Guardar cambios" : "Guardar canción"}
        </button>
      </div>
    </div>
  );
}
