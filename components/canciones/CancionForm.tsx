"use client";

import { useState, useTransition } from "react";
import { NOTAS, type Nota, type Modo, type Calidad, simboloAcorde, colorRaizAcorde, colorContrasteTexto, colorExtension, tonosDelAcorde } from "@/lib/cancionTeoria";
import { NOMBRES_SECCION, colorPorTipoSeccion, type NombreSeccion } from "@/lib/seccionCatalogo";
import { segundosPorCompas } from "@/lib/cancionTiempo";
import type { CancionCompleta, CancionInput, SeccionInput, SeccionBaseInput, LetraLineaInput } from "@/lib/cancionesData";
import { formatoMMSS, parseMMSS } from "@/lib/duracion";
import { crearCancionAction, actualizarCancionAction, subirAudioAction, quitarAudioAction } from "@/app/canciones/actions";
import { AcordeSelector } from "./AcordeSelector";

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), sans-serif";
const BG = "oklch(0.965 0.007 85)";
const CARD = "oklch(0.99 0.005 85)";
const CARD2 = "oklch(0.975 0.006 85)";
const LINE = "oklch(0.89 0.008 85)";
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";
const FAINT = "oklch(0.62 0.044 262)";
const CHIP = "oklch(0.93 0.010 85)";
const ACCENT = "oklch(0.64 0.170 28)";

const inputStyle = { background: CARD, borderColor: LINE, color: INK } as const;
const activoStyle = { background: ACCENT, color: "oklch(0.99 0.006 85)" } as const;
const inactivoStyle = { background: CHIP, color: "oklch(0.4 0.044 262)" } as const;

const NATURALES = NOTAS.filter((n) => !n.includes("#")) as Nota[];
function esNota(natural: string, sostenido: boolean): Nota {
  const c = `${natural}${sostenido ? "#" : ""}`;
  return (NOTAS as readonly string[]).includes(c) ? (c as Nota) : (natural as Nota);
}
function puedeSostenido(natural: string): boolean {
  return (NOTAS as readonly string[]).includes(`${natural}#`);
}

type AcordeFS = { notaRaiz: Nota; calidad: Calidad; duracionCompases: number };
type LetraFS = { texto: string; acordes: { posicion: number; notaRaiz: Nota; calidad: Calidad }[] };
type CuerpoFS = {
  acordes: AcordeFS[];
  letra: LetraFS[];
  tonalidadPropia: boolean;
  tonRaiz: Nota;
  tonModo: Modo;
  numeroCompases: string;
  bpm: string;
};
type RepeticionFS = CuerpoFS & { repeticionIndice: number };
type SeccionFS = CuerpoFS & { nombre: NombreSeccion; repiteVeces: number; repeticiones: RepeticionFS[] };

function cuerpoVacio(): CuerpoFS {
  return { acordes: [], letra: [], tonalidadPropia: false, tonRaiz: "C", tonModo: "mayor", numeroCompases: "", bpm: "" };
}
function nuevaSeccion(): SeccionFS {
  return { ...cuerpoVacio(), nombre: "Intro", repiteVeces: 1, repeticiones: [] };
}

function SeccionNombreSelector({ valor, onCambio }: { valor: NombreSeccion; onCambio: (n: NombreSeccion) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: colorPorTipoSeccion(valor), color: "oklch(0.99 0.006 85)", fontFamily: DISPLAY }}>
        {valor}
      </button>
      {abierto && (
        <div className="absolute z-20 mt-1 flex w-56 flex-wrap gap-1.5 rounded-xl p-2.5" style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" }}>
          {NOMBRES_SECCION.map((n) => (
            <button key={n} type="button" onClick={() => { onCambio(n); setAbierto(false); }} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={n === valor ? { background: colorPorTipoSeccion(n), color: "oklch(0.99 0.006 85)" } : inactivoStyle}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Chip de acorde proporcional al número de compases (diseño Fase 2).
function AcordeChip({
  acorde,
  tonalidad,
  onSeleccionar,
  onDuracion,
  onQuitar,
}: {
  acorde: AcordeFS;
  tonalidad: { raiz: Nota; modo: Modo };
  onSeleccionar: (n: Nota, c: Calidad) => void;
  onDuracion: (n: number) => void;
  onQuitar: () => void;
}) {
  const color = colorRaizAcorde(acorde.notaRaiz, acorde.calidad);
  const ink = colorContrasteTexto(color);
  const tonos = tonosDelAcorde(acorde.notaRaiz, acorde.calidad);
  return (
    <div style={{ flex: Math.max(1, acorde.duracionCompases), minWidth: 92, borderRadius: 10, padding: "8px 7px", background: color, border: "1px solid rgba(0,0,0,.14)" }}>
      <div className="flex items-start justify-between gap-1">
        <AcordeSelector
          tonalidad={tonalidad}
          notaRaiz={acorde.notaRaiz}
          calidad={acorde.calidad}
          onSeleccionar={onSeleccionar}
        />
        <span style={{ borderRadius: 5, padding: "1px 4px", background: "rgba(0,0,0,.2)", color: ink, fontFamily: MONO, fontSize: 9 }}>{acorde.duracionCompases}c</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {tonos.acompanantes.map((t, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 3, borderRadius: 999, padding: "1px 5px", background: "oklch(0.97 0.006 85)", fontFamily: MONO, fontWeight: 700, fontSize: 9, color: "oklch(0.3 0.044 262)" }}>
            <span style={{ color: colorExtension(t.nota) }}>{t.intervalo.replace("ª", "")}</span>
            {t.nota}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <input
          inputMode="numeric"
          value={acorde.duracionCompases}
          onChange={(e) => {
            const limpio = e.target.value.replace(/[^0-9.]/g, "");
            onDuracion(limpio === "" ? 0 : Number(limpio));
          }}
          style={{ width: "2.4em", textAlign: "center", borderRadius: 6, padding: "3px 2px", background: "rgba(255,255,255,.85)", border: "1px solid rgba(0,0,0,.1)", fontFamily: MONO, fontSize: 11, color: INK }}
        />
        <span style={{ fontFamily: MONO, fontSize: 9, color: ink }}>comp.</span>
        <button type="button" onClick={onQuitar} className="ml-auto" style={{ color: ink, fontFamily: MONO, fontSize: 10 }}>
          ×
        </button>
      </div>
    </div>
  );
}

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
    <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: LINE }}>
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>Letra + acordes</span>
        <div className="flex-1" />
        <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>pon el acorde donde está el cursor</span>
      </div>
      <div className="mt-2 flex flex-col gap-2.5">
        {letra.map((l, li) => (
          <div key={li} className="rounded-lg p-2" style={{ background: CARD2, border: `1px solid ${LINE}` }}>
            {l.acordes.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1.5">
                {[...l.acordes].sort((a, b) => a.posicion - b.posicion).map((ac, idx) => (
                  <span key={idx} style={{ display: "flex", alignItems: "center", gap: 3, borderRadius: 6, padding: "1px 5px", background: CHIP, fontFamily: MONO, fontWeight: 700, fontSize: 11, color: colorRaizAcorde(ac.notaRaiz, ac.calidad) }}>
                    {simboloAcorde(ac.notaRaiz, ac.calidad)}
                    <span style={{ color: FAINT }}>@{ac.posicion}</span>
                    <button type="button" onClick={() => setLinea(li, { acordes: l.acordes.filter((x) => x !== ac) })} style={{ color: "oklch(0.6 0.15 25)" }}>
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
                onFocus={(e) => setFoco({ linea: li, pos: e.target.selectionStart ?? 0 })}
                onSelect={(e) => setFoco({ linea: li, pos: (e.target as HTMLInputElement).selectionStart ?? 0 })}
                className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                style={{ ...inputStyle, fontFamily: MONO }}
              />
              <button type="button" onClick={() => onCambio(letra.filter((_, i) => i !== li))} className="text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>
                Quitar
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", color: MUTED }}>Acorde en el cursor</span>
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
        <button type="button" onClick={() => onCambio([...letra, { texto: "", acordes: [] }])} className="w-fit rounded-lg px-3 py-1.5 text-xs font-bold" style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}>
          + Línea
        </button>
      </div>
    </div>
  );
}

function AjustesCuerpo({ cuerpo, onCambio }: { cuerpo: CuerpoFS; onCambio: (patch: Partial<CuerpoFS>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" style={{ fontFamily: MONO }}>
      <button type="button" onClick={() => onCambio({ tonalidadPropia: !cuerpo.tonalidadPropia })} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={cuerpo.tonalidadPropia ? activoStyle : inactivoStyle}>
        Tono propio
      </button>
      {cuerpo.tonalidadPropia && (
        <>
          <select className="rounded-lg border px-2 py-1 text-xs outline-none" style={inputStyle} value={cuerpo.tonRaiz.replace("#", "")} onChange={(e) => onCambio({ tonRaiz: esNota(e.target.value, cuerpo.tonRaiz.includes("#")) })}>
            {NATURALES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button type="button" disabled={!puedeSostenido(cuerpo.tonRaiz.replace("#", ""))} onClick={() => onCambio({ tonRaiz: esNota(cuerpo.tonRaiz.replace("#", ""), !cuerpo.tonRaiz.includes("#")) })} className="rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-30" style={cuerpo.tonRaiz.includes("#") ? activoStyle : inactivoStyle}>
            ♯
          </button>
          {(["mayor", "menor"] as const).map((m) => (
            <button key={m} type="button" onClick={() => onCambio({ tonModo: m })} className="rounded-lg px-2 py-1 text-xs font-bold" style={m === cuerpo.tonModo ? activoStyle : inactivoStyle}>
              {m}
            </button>
          ))}
        </>
      )}
      <label className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
        Compases
        <input inputMode="numeric" placeholder="auto" value={cuerpo.numeroCompases} onChange={(e) => onCambio({ numeroCompases: e.target.value.replace(/[^0-9]/g, "") })} className="rounded-lg border text-center text-xs outline-none" style={{ ...inputStyle, width: "3.5em", padding: "4px 2px" }} />
      </label>
      <label className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
        BPM
        <input inputMode="numeric" placeholder="hereda" value={cuerpo.bpm} onChange={(e) => onCambio({ bpm: e.target.value.replace(/[^0-9]/g, "") })} className="rounded-lg border text-center text-xs outline-none" style={{ ...inputStyle, width: "4em", padding: "4px 2px" }} />
      </label>
    </div>
  );
}

function AudioCampo({
  cancionId,
  bandaId,
  tipo,
  titulo,
  chip,
  descripcion,
  urlInicial,
}: {
  cancionId: string;
  bandaId: string;
  tipo: "referencia" | "secuencia";
  titulo: string;
  chip: string;
  descripcion: string;
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
        setUrl(await subirAudioAction(cancionId, bandaId, tipo, form));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir.");
      }
    });
  };

  return (
    <div className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: INK }}>{titulo}</span>
        <span style={{ borderRadius: 6, padding: "2px 5px", background: tipo === "secuencia" ? ACCENT : CHIP, color: tipo === "secuencia" ? "oklch(0.99 0.006 85)" : MUTED, fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>{chip}</span>
      </div>
      <div className="mt-1 text-[11px] leading-snug" style={{ color: FAINT }}>{descripcion}</div>
      {url ? (
        <>
          <audio controls preload="none" src={url} className="mt-2 w-full" style={{ height: 34 }} />
          <div className="mt-2 flex gap-1.5">
            <label className="flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-center text-[10px] font-bold uppercase" style={{ borderColor: LINE, color: MUTED, fontFamily: MONO }}>
              {pending ? "Subiendo…" : "Reemplazar"}
              <input type="file" accept="audio/*" className="hidden" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
            </label>
            <button
              type="button"
              onClick={() => startTransition(async () => { await quitarAudioAction(cancionId, bandaId, tipo); setUrl(null); })}
              className="rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase"
              style={{ borderColor: LINE, color: MUTED, fontFamily: MONO }}
            >
              Quitar
            </button>
          </div>
        </>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed p-3.5 text-center" style={{ borderColor: LINE }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>
            {tipo === "secuencia" ? "Sin secuencia todavía" : "Sin audio todavía"}
          </div>
          {tipo === "secuencia" && <div className="mt-1 text-[11px]" style={{ color: FAINT }}>Sin ella, el modo lista corre igual con el BPM.</div>}
          <label className="mt-2.5 inline-block cursor-pointer rounded-lg px-3.5 py-2 text-[10px] font-bold uppercase" style={{ ...activoStyle, fontFamily: MONO }}>
            {pending ? "Subiendo…" : tipo === "secuencia" ? "Subir secuencia" : "Subir audio"}
            <input type="file" accept="audio/*" className="hidden" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
          </label>
        </div>
      )}
      {error && <p className="mt-1 text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>{error}</p>}
    </div>
  );
}

export function CancionForm({ bandaId, cancionExistente }: { bandaId: string; cancionExistente?: CancionCompleta }) {
  const [esCover, setEsCover] = useState(cancionExistente?.esCover ?? false);
  const [autor, setAutor] = useState(cancionExistente?.autor ?? "");
  const [esBorrador, setEsBorrador] = useState(cancionExistente?.esBorrador ?? true);
  const [titulo, setTitulo] = useState(cancionExistente?.titulo ?? "");
  const [bpm, setBpm] = useState(cancionExistente?.bpm ?? 92);
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
  const [seccionAbierta, setSeccionAbierta] = useState(0);
  const [vueltaSel, setVueltaSel] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tonGeneral = { raiz, modo };
  const tonDe = (c: CuerpoFS) => (c.tonalidadPropia ? { raiz: c.tonRaiz, modo: c.tonModo } : tonGeneral);
  const compasesDe = (c: CuerpoFS) => (c.numeroCompases ? Number(c.numeroCompases) : c.acordes.reduce((t, a) => t + a.duracionCompases, 0));
  const totalCompases = secciones.reduce((total, s) => {
    let sec = 0;
    for (let v = 1; v <= s.repiteVeces; v++) {
      const rep = s.repeticiones.find((r) => r.repeticionIndice === v);
      sec += rep ? compasesDe(rep) : compasesDe(s);
    }
    return total + sec;
  }, 0);
  const totalVueltas = secciones.reduce((t, s) => t + s.repiteVeces, 0);
  const duracionCalc = bpm > 0 ? totalCompases * segundosPorCompas(bpm) : 0;

  const patchSeccion = (i: number, patch: Partial<SeccionFS>) => setSecciones((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moverSeccion = (i: number, dir: -1 | 1) =>
    setSecciones((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const c = [...prev];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const quitarSeccion = (i: number) => setSecciones((prev) => prev.filter((_, idx) => idx !== i));

  const toggleDesprender = (si: number, vuelta: number) =>
    setSecciones((prev) =>
      prev.map((s, idx) => {
        if (idx !== si) return s;
        const existe = s.repeticiones.some((r) => r.repeticionIndice === vuelta);
        if (existe) return { ...s, repeticiones: s.repeticiones.filter((r) => r.repeticionIndice !== vuelta) };
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
  const patchRepeticion = (si: number, vuelta: number, patch: Partial<CuerpoFS>) =>
    setSecciones((prev) => prev.map((s, idx) => (idx === si ? { ...s, repeticiones: s.repeticiones.map((r) => (r.repeticionIndice === vuelta ? { ...r, ...patch } : r)) } : s)));

  const construirCuerpo = (c: CuerpoFS): Omit<SeccionBaseInput, "nombre" | "repiteVeces"> => ({
    tonalidadNota: c.tonalidadPropia ? c.tonRaiz : null,
    tonalidadModo: c.tonalidadPropia ? c.tonModo : null,
    numeroCompases: c.numeroCompases ? Number(c.numeroCompases) : null,
    bpm: c.bpm ? Number(c.bpm) : null,
    acordes: c.acordes,
    letra: c.letra.map((l): LetraLineaInput => ({ texto: l.texto, acordes: l.acordes })),
  });

  const onSubmit = (borradorFinal: boolean) => {
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
      bpm: bpm || null,
      duracionSegundos,
      esCover,
      autor: esCover ? autor.trim() || null : null,
      esBorrador: borradorFinal,
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

  const statCard = (label: string, valor: React.ReactNode, color?: string) => (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "6px 8px" }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>{label}</div>
      <div style={{ marginTop: 3, fontFamily: MONO, fontWeight: 700, fontSize: 15, color: color ?? INK }}>{valor}</div>
    </div>
  );

  return (
    <div className="flex h-full flex-col" style={{ maxWidth: 640, fontFamily: "var(--font-dm-sans), sans-serif", color: INK }}>
      {/* Cabecera fija con datos calculados */}
      <div className="flex-none border-b pb-3" style={{ borderColor: LINE }}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la canción"
            className="min-w-0 flex-1 border-b-2 bg-transparent pb-1 text-2xl font-bold outline-none"
            style={{ borderColor: ACCENT, fontFamily: DISPLAY, color: INK }}
          />
          <div className="flex gap-1">
            <button type="button" onClick={() => setEsBorrador(true)} className="rounded-md px-2 py-1 text-[10px] font-bold uppercase" style={{ ...(esBorrador ? { border: `1px dashed ${ACCENT}`, color: ACCENT } : inactivoStyle), fontFamily: MONO }}>
              Borrador
            </button>
            <button type="button" onClick={() => setEsBorrador(false)} className="rounded-md px-2 py-1 text-[10px] font-bold uppercase" style={{ ...(!esBorrador ? activoStyle : inactivoStyle), fontFamily: MONO }}>
              Lista
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {statCard("Tono", `${raiz}${modo === "menor" ? "m" : ""}`, colorRaizAcorde(raiz, modo === "menor" ? "menor" : "mayor"))}
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: "6px 8px" }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>BPM</div>
            <div className="mt-0.5 flex items-center justify-between">
              <button type="button" onClick={() => setBpm((b) => Math.max(20, b - 1))} style={{ width: 18, height: 18, borderRadius: 5, background: CHIP, color: MUTED, fontFamily: MONO }}>−</button>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15 }}>{bpm}</span>
              <button type="button" onClick={() => setBpm((b) => Math.min(300, b + 1))} style={{ width: 18, height: 18, borderRadius: 5, background: CHIP, color: MUTED, fontFamily: MONO }}>+</button>
            </div>
          </div>
          {statCard("Compases", totalCompases)}
          {statCard("Dura", mmssLocal(duracionCalc))}
        </div>
        <div className="mt-1.5 text-[10px] leading-snug" style={{ color: FAINT }}>
          La duración se calcula sola: {totalCompases} compases × 4 tiempos a {bpm} BPM.
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2" style={{ fontFamily: MONO }}>
          <button type="button" onClick={() => setEsCover(false)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={!esCover ? activoStyle : inactivoStyle}>Propia</button>
          <button type="button" onClick={() => setEsCover(true)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={esCover ? activoStyle : inactivoStyle}>Cover</button>
          {esCover && (
            <input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Autor original" className="rounded-lg border px-2 py-1 text-xs outline-none" style={inputStyle} />
          )}
          <div className="flex-1" />
          <input value={duracion} onChange={(e) => setDuracion(e.target.value)} maxLength={5} placeholder="dur. manual" className="rounded-lg border px-2 py-1 text-center text-xs outline-none" style={{ ...inputStyle, width: "6em" }} />
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <select className="rounded-lg border px-2 py-1 text-xs outline-none" style={inputStyle} value={raiz.replace("#", "")} onChange={(e) => setRaiz(esNota(e.target.value, raiz.includes("#")))}>
            {NATURALES.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
          <button type="button" disabled={!puedeSostenido(raiz.replace("#", ""))} onClick={() => setRaiz(esNota(raiz.replace("#", ""), !raiz.includes("#")))} className="rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-30" style={raiz.includes("#") ? activoStyle : inactivoStyle}>♯</button>
          {(["mayor", "menor"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setModo(m)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={m === modo ? activoStyle : inactivoStyle}>{m}</button>
          ))}
        </div>
      </div>

      {/* Cuerpo scrolleable */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-4 pt-3 pr-1">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK }}>Estructura</span>
          <div className="h-px flex-1" style={{ background: LINE }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{totalVueltas} vueltas</span>
        </div>

        <PaletaColor />

        {secciones.map((s, si) => {
          const abierta = seccionAbierta === si;
          const sel = Math.min(vueltaSel[si] ?? 1, s.repiteVeces);
          const primerAcorde = s.acordes[0];
          const numColor = primerAcorde ? colorRaizAcorde(primerAcorde.notaRaiz, primerAcorde.calidad) : CHIP;
          const compasesSel = compasesDe(s);
          const esVariante = s.repeticiones.some((r) => r.repeticionIndice === sel);
          const cuerpoSel: CuerpoFS = s.repeticiones.find((r) => r.repeticionIndice === sel) ?? s;
          // Aplica un cambio al cuerpo activo: la plantilla, o la vuelta
          // desprendida si la que está seleccionada lo es.
          const aplicar = (patch: Partial<CuerpoFS>) => {
            if (esVariante) patchRepeticion(si, sel, patch);
            else patchSeccion(si, patch as Partial<SeccionFS>);
          };
          return (
            <div key={si} className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${abierta ? ACCENT : LINE}` }}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSeccionAbierta(abierta ? -1 : si)} className="flex flex-1 items-center gap-2 text-left">
                  <span style={{ width: 20, height: 20, flex: "none", borderRadius: 6, background: numColor, color: primerAcorde ? colorContrasteTexto(numColor) : MUTED, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 10 }}>
                    {si + 1}
                  </span>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: INK }}>{s.nombre}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{compasesSel}c</span>
                  {s.tonalidadPropia && (
                    <span style={{ background: CHIP, borderRadius: 6, padding: "1px 5px", fontFamily: MONO, fontWeight: 700, fontSize: 10, color: colorRaizAcorde(s.tonRaiz, s.tonModo) }}>
                      {s.tonRaiz}{s.tonModo === "menor" ? "m" : ""}
                    </span>
                  )}
                </button>
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => moverSeccion(si, -1)} disabled={si === 0} style={{ color: MUTED, opacity: si === 0 ? 0.3 : 1 }}>↑</button>
                  <button type="button" onClick={() => moverSeccion(si, 1)} disabled={si === secciones.length - 1} style={{ color: MUTED, opacity: si === secciones.length - 1 ? 0.3 : 1 }}>↓</button>
                </div>
              </div>

              {abierta && (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <SeccionNombreSelector valor={s.nombre} onCambio={(nombre) => patchSeccion(si, { nombre })} />
                    <div className="flex items-center" style={{ fontFamily: MONO }}>
                      <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT, marginRight: 6 }}>Se repite</span>
                      <div className="flex items-center overflow-hidden rounded-lg border" style={{ borderColor: LINE }}>
                        <button type="button" onClick={() => patchSeccion(si, { repiteVeces: Math.max(1, s.repiteVeces - 1), repeticiones: s.repeticiones.filter((r) => r.repeticionIndice <= s.repiteVeces - 1) })} style={{ width: 22, height: 22, background: CHIP, color: MUTED, fontFamily: MONO }}>−</button>
                        <span style={{ width: 34, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 12 }}>×{s.repiteVeces}</span>
                        <button type="button" onClick={() => patchSeccion(si, { repiteVeces: s.repiteVeces + 1 })} style={{ width: 22, height: 22, background: CHIP, color: MUTED, fontFamily: MONO }}>+</button>
                      </div>
                    </div>
                    <div className="flex-1" />
                    <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>
                      {compasesSel * s.repiteVeces} compases · {mmssLocal(compasesSel * s.repiteVeces * segundosPorCompas(Number(cuerpoSel.bpm) || bpm))}
                    </span>
                    {secciones.length > 1 && (
                      <button type="button" onClick={() => quitarSeccion(si)} style={{ color: "oklch(0.55 0.15 25)", fontFamily: MONO, fontSize: 11 }}>Quitar</button>
                    )}
                  </div>

                  {s.repiteVeces > 1 && (
                    <div className="flex gap-1">
                      {Array.from({ length: s.repiteVeces }).map((_, idx) => {
                        const n = idx + 1;
                        const variante = s.repeticiones.some((r) => r.repeticionIndice === n);
                        const activo = n === sel;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setVueltaSel((p) => ({ ...p, [si]: n }))}
                            style={{
                              flex: 1,
                              border: `1px solid ${variante ? ACCENT : LINE}`,
                              background: activo ? (variante ? ACCENT : CHIP) : "transparent",
                              color: activo ? (variante ? "oklch(0.99 0.006 85)" : INK) : MUTED,
                              borderRadius: 9,
                              padding: "6px 4px",
                              fontFamily: MONO,
                              fontWeight: 700,
                              fontSize: 10,
                              textAlign: "center",
                            }}
                          >
                            <div>Vuelta {n}</div>
                            <div style={{ marginTop: 3, fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.85 }}>{variante ? "desprendida" : "igual"}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <AjustesCuerpo cuerpo={cuerpoSel} onCambio={aplicar} />

                  <div className="flex flex-wrap gap-1.5">
                    {cuerpoSel.acordes.map((a, ai) => (
                      <AcordeChip
                        key={ai}
                        acorde={a}
                        tonalidad={tonDe(cuerpoSel)}
                        onSeleccionar={(notaRaiz, calidad) => aplicar({ acordes: cuerpoSel.acordes.map((x, i) => (i === ai ? { ...x, notaRaiz, calidad } : x)) })}
                        onDuracion={(n) => aplicar({ acordes: cuerpoSel.acordes.map((x, i) => (i === ai ? { ...x, duracionCompases: n } : x)) })}
                        onQuitar={() => aplicar({ acordes: cuerpoSel.acordes.filter((_, i) => i !== ai) })}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => aplicar({ acordes: [...cuerpoSel.acordes, { notaRaiz: tonDe(cuerpoSel).raiz, calidad: "mayor" as Calidad, duracionCompases: 1 }] })}
                      className="rounded-lg px-3 py-2 text-sm font-bold"
                      style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}
                    >
                      + Acorde
                    </button>
                  </div>

                  {s.repiteVeces > 1 && !esVariante && (
                    <button type="button" onClick={() => toggleDesprender(si, sel)} className="w-full rounded-lg border border-dashed py-2 text-[10px] font-bold uppercase tracking-[0.06em]" style={{ borderColor: LINE, color: MUTED, fontFamily: MONO }}>
                      Desprender vuelta {sel} y editarla aparte
                    </button>
                  )}
                  {esVariante && (
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: CHIP }}>
                      <span className="flex-1 text-[10px] leading-snug" style={{ color: MUTED }}>
                        Vuelta {sel} desprendida: cambia solo esta vez, las otras vueltas siguen igual.
                      </span>
                      <button type="button" onClick={() => toggleDesprender(si, sel)} className="text-[10px] font-bold uppercase" style={{ color: ACCENT, fontFamily: MONO }}>
                        Reunir
                      </button>
                    </div>
                  )}

                  <LetraEditor
                    letra={cuerpoSel.letra}
                    tonalidad={tonDe(cuerpoSel)}
                    raizDefault={tonDe(cuerpoSel).raiz}
                    onCambio={(letra) => aplicar({ letra })}
                  />
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={() => { setSecciones((p) => [...p, nuevaSeccion()]); setSeccionAbierta(secciones.length); }} className="rounded-2xl border border-dashed p-3 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ borderColor: LINE, color: MUTED, fontFamily: MONO }}>
          + Agregar sección
        </button>

        {cancionExistente && (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK }}>Audios</span>
              <div className="h-px flex-1" style={{ background: LINE }} />
            </div>
            <AudioCampo
              cancionId={cancionExistente.id}
              bandaId={bandaId}
              tipo="referencia"
              titulo="Audio de referencia"
              chip="Ensayo"
              descripcion="Se reemplaza: solo vive la última versión. Sirve para sacar la línea encima."
              urlInicial={cancionExistente.audioReferenciaUrl}
            />
            <AudioCampo
              cancionId={cancionExistente.id}
              bandaId={bandaId}
              tipo="secuencia"
              titulo="Secuencia final"
              chip="En vivo"
              descripcion="Es la que suena en show. Manda el conteo del modo lista."
              urlInicial={cancionExistente.audioSecuenciaUrl}
            />
          </>
        )}

        {error && <div className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>{error}</div>}
      </div>

      {/* Pie: guardar */}
      <div className="flex-none border-t pt-3" style={{ borderColor: LINE }}>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => onSubmit(esBorrador)} className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50" style={{ ...activoStyle, fontFamily: "var(--font-dm-sans), sans-serif" }}>
            {pending ? "Guardando…" : cancionExistente ? "Guardar cambios" : "Guardar"}
          </button>
          {esBorrador && (
            <button type="button" disabled={pending} onClick={() => onSubmit(false)} className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50" style={{ background: INK, color: BG, fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Marcar lista y pasar a modo lista →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function mmssLocal(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Tira de referencia de color por nota (diseño Fase 2): 12 notas, arriba
// mayor, abajo menor — la misma que aparece en la app para que el color se
// vuelva memoria.
function PaletaColor() {
  return (
    <div style={{ background: CARD2, border: `1px solid ${LINE}`, borderRadius: 12, padding: "9px 10px" }}>
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>Color por nota</span>
        <div className="flex-1" />
        <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>arriba mayor · abajo menor</span>
      </div>
      <div className="mt-1.5 grid gap-0.5" style={{ gridTemplateColumns: "repeat(12,1fr)" }}>
        {NOTAS.map((n) => (
          <div key={n} style={{ borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: 16, background: colorRaizAcorde(n, "mayor"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 8, color: colorContrasteTexto(colorRaizAcorde(n, "mayor")) }}>{n}</div>
            <div style={{ height: 9, background: colorRaizAcorde(n, "menor") }} />
          </div>
        ))}
      </div>
    </div>
  );
}
