"use client";

import { Fragment, useState, useTransition } from "react";
import { NOTAS, type Nota, type Modo, type Calidad, simboloAcorde, colorRaizAcorde, colorContrasteTexto, colorExtension, tonosDelAcorde } from "@/lib/cancionTeoria";
import { NOMBRES_SECCION, colorPorTipoSeccion, type NombreSeccion } from "@/lib/seccionCatalogo";
import { segundosPorCompas } from "@/lib/cancionTiempo";
import type { CancionCompleta, CancionInput, SeccionInput, SeccionBaseInput, LetraLineaInput } from "@/lib/cancionesData";
import { crearCancionAction, actualizarCancionAction, eliminarCancionAction, subirAudioAction, quitarAudioAction } from "@/app/canciones/actions";
import { AcordeSelector } from "./AcordeSelector";
import { FichaCampos, fichaAInput, fichaDesdeCancion, type FichaEstado } from "./FichaCampos";

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
type LetraFS = { texto: string; tipo: "letra" | "tab"; acordes: { posicion: number; notaRaiz: Nota; calidad: Calidad }[] };
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

// Chip de acorde compacto: el acorde (toca para cambiarlo), sus compases y quitar.
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
  return (
    <div className="flex items-center gap-1" style={{ borderRadius: 9, padding: "2px 5px 2px 2px", background: color, border: "1px solid rgba(0,0,0,.14)" }}>
      <AcordeSelector compacto tonalidad={tonalidad} notaRaiz={acorde.notaRaiz} calidad={acorde.calidad} onSeleccionar={onSeleccionar} />
      <input
        inputMode="numeric"
        value={acorde.duracionCompases}
        title="Compases que dura"
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^0-9.]/g, "");
          onDuracion(limpio === "" ? 0 : Number(limpio));
        }}
        style={{ width: "2em", textAlign: "center", borderRadius: 5, padding: "1px 0", background: "rgba(255,255,255,.85)", border: "1px solid rgba(0,0,0,.1)", fontFamily: MONO, fontSize: 10, color: INK }}
      />
      <span style={{ fontFamily: MONO, fontSize: 9, color: ink }}>c</span>
      <button type="button" onClick={onQuitar} aria-label="Quitar acorde" style={{ color: ink, fontFamily: MONO, fontSize: 11, lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}

// Si la lista de acordes es un ciclo que se toca varias veces seguidas (A B C D A B C D), devuelve el ciclo y cuántas veces.
function cicloRepetido(acordes: { notaRaiz: Nota; calidad: Calidad }[]): { largo: number; veces: number } | null {
  const n = acordes.length;
  for (let largo = 1; largo <= n / 2; largo++) {
    if (n % largo !== 0) continue;
    let igual = true;
    for (let i = largo; i < n && igual; i++) igual = acordes[i].notaRaiz === acordes[i % largo].notaRaiz && acordes[i].calidad === acordes[i % largo].calidad;
    if (igual) return { largo, veces: n / largo };
  }
  return null;
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
    <div>
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>Letra + acordes</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>· el acorde se pone donde dejaste el cursor en la línea</span>
      </div>
      <div className="mt-1.5 grid gap-1.5 2xl:grid-cols-2">
        {letra.map((l, li) => l.tipo === "tab" ? (
          <div key={li} className="rounded-lg px-2 py-1 2xl:col-span-2" style={{ background: CARD2, border: `1px solid ${LINE}`, borderLeft: `4px solid ${ACCENT}` }}>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT }}>Arreglo / solo</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>pega la tablatura tal cual; se muestra en monoespaciado</span>
              <button type="button" onClick={() => onCambio(letra.filter((_, i) => i !== li))} className="ml-auto text-[11px]" style={{ color: "oklch(0.6 0.15 25)" }} aria-label="Quitar arreglo">×</button>
            </div>
            <textarea
              value={l.texto}
              rows={Math.min(12, Math.max(4, l.texto.split("\n").length))}
              spellCheck={false}
              onChange={(e) => setLinea(li, { texto: e.target.value })}
              className="mt-1 w-full rounded-md border px-2 py-1 text-[12px] outline-none"
              style={{ ...inputStyle, fontFamily: MONO, whiteSpace: "pre", overflowX: "auto", lineHeight: 1.25 }}
            />
          </div>
        ) : (
          <div key={li} className="rounded-lg px-2 py-1" style={{ background: CARD2, border: `1px solid ${LINE}` }}>
            <div className="flex flex-wrap items-center gap-1">
              {[...l.acordes].sort((a, b) => a.posicion - b.posicion).map((ac, idx) => (
                <span key={idx} style={{ display: "flex", alignItems: "center", gap: 3, borderRadius: 5, padding: "0 4px", background: colorRaizAcorde(ac.notaRaiz, ac.calidad), fontFamily: MONO, fontWeight: 700, fontSize: 10, color: colorContrasteTexto(colorRaizAcorde(ac.notaRaiz, ac.calidad)) }}>
                  {simboloAcorde(ac.notaRaiz, ac.calidad)}
                  <span style={{ opacity: 0.7, fontWeight: 500 }}>@{ac.posicion}</span>
                  <button type="button" aria-label="Quitar acorde" onClick={() => setLinea(li, { acordes: l.acordes.filter((x) => x !== ac) })}>×</button>
                </span>
              ))}
              <AcordeSelector
                compacto
                etiqueta="+ acorde"
                tonalidad={tonalidad}
                notaRaiz={raizDefault}
                calidad="mayor"
                onSeleccionar={(notaRaiz, calidad) => {
                  const pos = foco && foco.linea === li ? foco.pos : l.texto.length;
                  setLinea(li, { acordes: [...l.acordes, { posicion: pos, notaRaiz, calidad }] });
                }}
              />
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                value={l.texto}
                placeholder="Línea de letra…"
                onChange={(e) => setLinea(li, { texto: e.target.value })}
                onFocus={(e) => setFoco({ linea: li, pos: e.target.selectionStart ?? 0 })}
                onSelect={(e) => setFoco({ linea: li, pos: (e.target as HTMLInputElement).selectionStart ?? 0 })}
                className="min-w-0 flex-1 rounded-md border px-2 py-0.5 text-[13px] outline-none"
                style={{ ...inputStyle, fontFamily: MONO }}
              />
              <button type="button" onClick={() => onCambio(letra.filter((_, i) => i !== li))} className="text-[11px]" style={{ color: "oklch(0.6 0.15 25)" }} aria-label="Quitar línea">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button type="button" onClick={() => onCambio([...letra, { texto: "", tipo: "letra", acordes: [] }])} className="w-fit rounded-md px-2.5 py-1 text-[11px] font-bold" style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}>
          + Línea
        </button>
        <button type="button" onClick={() => onCambio([...letra, { texto: "", tipo: "tab", acordes: [] }])} className="w-fit rounded-md px-2.5 py-1 text-[11px] font-bold" style={{ border: `1px dashed ${ACCENT}`, color: ACCENT, fontFamily: MONO }}>
          + Arreglo / solo
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

// Vista de Estructura: arriba la ficha de la canción; en medio el recorrido
// (cada sección es una parada, de izquierda a derecha, en el orden en que suena);
// abajo el detalle de la parada elegida: sus acordes y su letra.
export function CancionForm({ bandaId, cancionExistente }: { bandaId: string; cancionExistente?: CancionCompleta }) {
  const [ficha, setFicha] = useState<FichaEstado>(() => fichaDesdeCancion(cancionExistente));
  const [fichaAbierta, setFichaAbierta] = useState(!cancionExistente);
  const [secciones, setSecciones] = useState<SeccionFS[]>(
    cancionExistente?.secciones.map((s) => ({
      nombre: s.nombre,
      repiteVeces: s.repiteVeces,
      acordes: s.acordes.map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, duracionCompases: a.duracionCompases })),
      letra: s.letra.map((l) => ({ texto: l.texto, tipo: l.tipo, acordes: l.acordes.map((a) => ({ posicion: a.posicion, notaRaiz: a.notaRaiz, calidad: a.calidad })) })),
      tonalidadPropia: s.tonalidadNota !== null,
      tonRaiz: s.tonalidadNota ?? "C",
      tonModo: s.tonalidadModo ?? "mayor",
      numeroCompases: s.numeroCompases?.toString() ?? "",
      bpm: s.bpm?.toString() ?? "",
      repeticiones: s.repeticiones.map((r) => ({
        repeticionIndice: r.repeticionIndice,
        acordes: r.acordes.map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, duracionCompases: a.duracionCompases })),
        letra: r.letra.map((l) => ({ texto: l.texto, tipo: l.tipo, acordes: l.acordes.map((a) => ({ posicion: a.posicion, notaRaiz: a.notaRaiz, calidad: a.calidad })) })),
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

  const bpm = Number(ficha.bpm) || 0;
  const tonGeneral = { raiz: ficha.raiz, modo: ficha.modo };
  const tonDe = (c: CuerpoFS) => (c.tonalidadPropia ? { raiz: c.tonRaiz, modo: c.tonModo } : tonGeneral);
  const compasesDe = (c: CuerpoFS) => (c.numeroCompases ? Number(c.numeroCompases) : c.acordes.reduce((t, a) => t + a.duracionCompases, 0));
  const compasesSeccionTotal = (s: SeccionFS) => {
    let sec = 0;
    for (let v = 1; v <= s.repiteVeces; v++) {
      const rep = s.repeticiones.find((r) => r.repeticionIndice === v);
      sec += rep ? compasesDe(rep) : compasesDe(s);
    }
    return sec;
  };
  const totalCompases = secciones.reduce((total, s) => total + compasesSeccionTotal(s), 0);
  const totalVueltas = secciones.reduce((t, s) => t + s.repiteVeces, 0);

  const patchFicha = (patch: Partial<FichaEstado>) => setFicha((f) => ({ ...f, ...patch }));
  const patchSeccion = (i: number, patch: Partial<SeccionFS>) => setSecciones((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const moverSeccion = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= secciones.length) return;
    setSecciones((prev) => {
      const c = [...prev];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
    setSeccionAbierta(j);
  };
  const quitarSeccion = (i: number) => {
    setSecciones((prev) => prev.filter((_, idx) => idx !== i));
    setSeccionAbierta(Math.max(0, i - 1));
  };

  const toggleDesprender = (si: number, vuelta: number) =>
    setSecciones((prev) =>
      prev.map((s, idx) => {
        if (idx !== si) return s;
        const existe = s.repeticiones.some((r) => r.repeticionIndice === vuelta);
        if (existe) return { ...s, repeticiones: s.repeticiones.filter((r) => r.repeticionIndice !== vuelta) };
        const clon: RepeticionFS = {
          repeticionIndice: vuelta,
          acordes: s.acordes.map((a) => ({ ...a })),
          letra: s.letra.map((l) => ({ texto: l.texto, tipo: l.tipo, acordes: l.acordes.map((a) => ({ ...a })) })),
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
    letra: c.letra.map((l): LetraLineaInput => ({ texto: l.texto, tipo: l.tipo, acordes: l.tipo === "tab" ? [] : l.acordes })),
  });

  const onSubmit = (marcarLista = false) => {
    setError(null);
    const base = fichaAInput(ficha);
    if (typeof base === "string") {
      setFichaAbierta(true);
      setError(base);
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
    const input: CancionInput = { bandaId, ...base, esBorrador: marcarLista ? false : base.esBorrador, secciones: seccionesInput };
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

  const colorTono = colorRaizAcorde(ficha.raiz, ficha.modo === "menor" ? "menor" : "mayor");
  const chip = (txt: React.ReactNode, titulo: string) => (
    <span title={titulo} style={{ background: CHIP, borderRadius: 8, padding: "3px 9px", fontFamily: MONO, fontWeight: 700, fontSize: 11, color: MUTED }}>
      {txt}
    </span>
  );

  // Parada elegida
  const si = Math.min(seccionAbierta, secciones.length - 1);
  const sec = secciones[si];
  const sel = sec ? Math.min(vueltaSel[si] ?? 1, sec.repiteVeces) : 1;
  const esVariante = !!sec && sec.repeticiones.some((r) => r.repeticionIndice === sel);
  const cuerpoSel: CuerpoFS | null = sec ? sec.repeticiones.find((r) => r.repeticionIndice === sel) ?? sec : null;
  // Aplica un cambio al cuerpo activo: la plantilla, o la vuelta desprendida si la elegida lo es.
  const aplicar = (patch: Partial<CuerpoFS>) => {
    if (esVariante) patchRepeticion(si, sel, patch);
    else patchSeccion(si, patch as Partial<SeccionFS>);
  };

  const boton = { border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 9, padding: "4px 10px", fontFamily: MONO, fontWeight: 700, fontSize: 11 } as const;

  return (
    <div className="flex items-start gap-4" style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: INK }}>
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Ficha */}
      <section className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>{ficha.titulo || "Canción nueva"}</div>
            {ficha.autor && <div className="truncate text-sm" style={{ color: MUTED }}>{ficha.autor}</div>}
          </div>
          <span title="Tono" style={{ background: colorTono, color: colorContrasteTexto(colorTono), borderRadius: 8, padding: "3px 10px", fontFamily: MONO, fontWeight: 800, fontSize: 14 }}>
            {ficha.raiz}{ficha.modo === "menor" ? "m" : ""}
          </span>
          {chip(ficha.bpm ? `${ficha.bpm} BPM` : "— BPM", "Tempo")}
          {chip(ficha.duracion || "—", "Duración")}
          {chip(`${ficha.compases || totalCompases} compases`, "Compases")}
          {ficha.capo > 0 && <span style={{ background: ACCENT, color: "white", borderRadius: 8, padding: "3px 9px", fontFamily: MONO, fontWeight: 700, fontSize: 11 }}>capo {ficha.capo}</span>}
          {chip(ficha.esCover ? "Cover" : ficha.esBorrador ? "Propia · borrador" : "Propia", "Tipo")}
          <button type="button" onClick={() => setFichaAbierta((v) => !v)} style={boton}>
            {fichaAbierta ? "Cerrar ficha ▴" : "Editar ficha ▾"}
          </button>
        </div>
        {fichaAbierta && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: LINE, maxWidth: 640 }}>
            <FichaCampos ficha={ficha} onCambio={patchFicha} compasesCalculados={totalCompases} />
          </div>
        )}
      </section>

      {/* Recorrido: una sola pieza, de izquierda a derecha, en el orden en que suena */}
      <section>
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK }}>El recorrido</span>
          <div className="h-px flex-1" style={{ background: LINE }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{secciones.length} partes · {totalVueltas} vueltas</span>
        </div>
        <div className="mt-2 flex items-stretch overflow-x-auto rounded-2xl" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          {secciones.map((s, i) => {
            const color = colorPorTipoSeccion(s.nombre);
            const activa = i === si;
            const compases = compasesSeccionTotal(s);
            const lista = acordesDeParada(s);
            const ciclo = cicloRepetido(lista);
            const visibles = ciclo ? lista.slice(0, ciclo.largo) : lista;
            const veces = s.repiteVeces * (ciclo?.veces ?? 1);
            return (
              <Fragment key={i}>
                {i > 0 && (
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden style={{ alignSelf: "center", flex: "none", margin: "0 -3px", zIndex: 1 }}>
                    <path d="M4 2l5 5-5 5" fill="none" stroke={FAINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <button
                  type="button"
                  onClick={() => setSeccionAbierta(i)}
                  className="flex min-w-[104px] flex-col text-left"
                  style={{ flex: `${Math.max(1, Math.min(compases, 20))} 1 0`, background: activa ? "oklch(0.96 0.03 28)" : "transparent", borderTop: `4px solid ${color}`, padding: "6px 8px 6px", borderRight: i < secciones.length - 1 ? `1px solid ${LINE}` : "none" }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 9, color: FAINT }}>{i + 1}</span>
                    <span className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: INK }}>{s.nombre}</span>
                    {veces > 1 && <span className="ml-auto flex-none" style={{ fontFamily: MONO, fontWeight: 800, fontSize: 10, color: ACCENT }}>↻×{veces}</span>}
                  </span>
                  <span className="mt-1 flex gap-px" style={{ minHeight: 18 }}>
                    {visibles.length === 0 && <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>sin acordes</span>}
                    {visibles.map((a, k) => {
                      const c = colorRaizAcorde(a.notaRaiz, a.calidad);
                      return (
                        <span key={k} style={{ flex: 1, minWidth: 0, background: c, color: colorContrasteTexto(c), borderRadius: 3, padding: "2px 0", textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 8.5, overflow: "hidden" }}>
                          {simboloAcorde(a.notaRaiz, a.calidad)}
                        </span>
                      );
                    })}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5" style={{ fontFamily: MONO, fontSize: 9, color: MUTED }}>
                    <span>{compases}c</span>
                    {bpm > 0 && <span>{mmssLocal(compases * segundosPorCompas(Number(s.bpm) || bpm))}</span>}
                    {s.letra.length > 0 && <span className="ml-auto">♪{s.letra.length}</span>}
                  </span>
                </button>
              </Fragment>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setSecciones((p) => [...p, nuevaSeccion()]);
              setSeccionAbierta(secciones.length);
            }}
            title="Agregar otra parte"
            className="flex w-14 flex-none flex-col items-center justify-center"
            style={{ borderLeft: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO, fontWeight: 700, fontSize: 18 }}
          >
            +
          </button>
        </div>
      </section>

      {/* Detalle de la parada elegida */}
      {sec && cuerpoSel && (
        <section className="rounded-2xl px-3 py-2.5" style={{ background: CARD, border: `2px solid ${ACCENT}` }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <SeccionNombreSelector valor={sec.nombre} onCambio={(nombre) => patchSeccion(si, { nombre })} />
            <div className="flex items-center" style={{ fontFamily: MONO }}>
              <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT, marginRight: 5 }}>Se repite</span>
              <div className="flex items-center overflow-hidden rounded-md border" style={{ borderColor: LINE }}>
                <button type="button" onClick={() => patchSeccion(si, { repiteVeces: Math.max(1, sec.repiteVeces - 1), repeticiones: sec.repeticiones.filter((r) => r.repeticionIndice <= sec.repiteVeces - 1) })} style={{ width: 20, height: 20, background: CHIP, color: MUTED, fontFamily: MONO }}>−</button>
                <span style={{ width: 30, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 11 }}>×{sec.repiteVeces}</span>
                <button type="button" onClick={() => patchSeccion(si, { repiteVeces: sec.repiteVeces + 1 })} style={{ width: 20, height: 20, background: CHIP, color: MUTED, fontFamily: MONO }}>+</button>
              </div>
            </div>
            <AjustesCuerpo cuerpo={cuerpoSel} onCambio={aplicar} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT }}>
              {compasesSeccionTotal(sec)} compases{bpm > 0 ? ` · ${mmssLocal(compasesSeccionTotal(sec) * segundosPorCompas(Number(cuerpoSel.bpm) || bpm))}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => moverSeccion(si, -1)} disabled={si === 0} title="Mover antes" style={{ ...boton, padding: "2px 8px", opacity: si === 0 ? 0.3 : 1 }}>←</button>
              <button type="button" onClick={() => moverSeccion(si, 1)} disabled={si === secciones.length - 1} title="Mover después" style={{ ...boton, padding: "2px 8px", opacity: si === secciones.length - 1 ? 0.3 : 1 }}>→</button>
              {secciones.length > 1 && (
                <button type="button" onClick={() => quitarSeccion(si)} style={{ ...boton, padding: "2px 8px", color: "oklch(0.5 0.18 25)", borderColor: "oklch(0.6 0.15 25 / 0.45)" }}>Quitar parte</button>
              )}
            </div>
          </div>

          {sec.repiteVeces > 1 && (
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: sec.repiteVeces }).map((_, idx) => {
                const n = idx + 1;
                const variante = sec.repeticiones.some((r) => r.repeticionIndice === n);
                const activo = n === sel;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVueltaSel((p) => ({ ...p, [si]: n }))}
                    title={variante ? "Vuelta desprendida" : "Igual que la plantilla"}
                    style={{
                      border: `1px solid ${variante ? ACCENT : LINE}`,
                      background: activo ? (variante ? ACCENT : CHIP) : "transparent",
                      color: activo ? (variante ? "oklch(0.99 0.006 85)" : INK) : MUTED,
                      borderRadius: 7,
                      padding: "2px 9px",
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  >
                    Vuelta {n}{variante ? " · aparte" : ""}
                  </button>
                );
              })}
              {!esVariante && (
                <button type="button" onClick={() => toggleDesprender(si, sel)} className="rounded-md border border-dashed px-2 py-0.5 text-[10px] font-bold" style={{ borderColor: LINE, color: MUTED, fontFamily: MONO }}>
                  Editar vuelta {sel} aparte
                </button>
              )}
              {esVariante && (
                <button type="button" onClick={() => toggleDesprender(si, sel)} className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: CHIP, color: ACCENT, fontFamily: MONO }}>
                  Reunir con las demás
                </button>
              )}
            </div>
          )}

          {/* Acordes de la parte (cuentan los compases); si un ciclo se toca varias veces seguidas, una raya los separa */}
          {(() => {
            const ac = cuerpoSel.acordes;
            const ciclo = cicloRepetido(ac);
            return (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT, marginRight: 4 }}>Acordes</span>
                {ac.map((a, ai) => (
                  <Fragment key={ai}>
                    {ciclo && ai > 0 && ai % ciclo.largo === 0 && <span aria-hidden style={{ width: 2, alignSelf: "stretch", background: ACCENT, borderRadius: 1, margin: "0 3px" }} />}
                    <AcordeChip
                      acorde={a}
                      tonalidad={tonDe(cuerpoSel)}
                      onSeleccionar={(notaRaiz, calidad) => aplicar({ acordes: ac.map((x, i) => (i === ai ? { ...x, notaRaiz, calidad } : x)) })}
                      onDuracion={(n) => aplicar({ acordes: ac.map((x, i) => (i === ai ? { ...x, duracionCompases: n } : x)) })}
                      onQuitar={() => aplicar({ acordes: ac.filter((_, i) => i !== ai) })}
                    />
                  </Fragment>
                ))}
                <button
                  type="button"
                  onClick={() => aplicar({ acordes: [...ac, { notaRaiz: tonDe(cuerpoSel).raiz, calidad: "mayor" as Calidad, duracionCompases: 1 }] })}
                  className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                  style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}
                >
                  + acorde
                </button>
                {ciclo && (
                  <span style={{ fontFamily: MONO, fontSize: 10, color: ACCENT, marginLeft: 4 }}>
                    ↻ un ciclo de {ciclo.largo} acordes se toca {ciclo.veces} veces
                  </span>
                )}
              </div>
            );
          })()}

          <div className="mt-3 border-t pt-2.5" style={{ borderColor: LINE }}>
            <LetraEditor letra={cuerpoSel.letra} tonalidad={tonDe(cuerpoSel)} raizDefault={tonDe(cuerpoSel).raiz} onCambio={(letra) => aplicar({ letra })} />
          </div>
        </section>
      )}

      {cancionExistente && (
        <details className="rounded-2xl" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <summary className="cursor-pointer select-none px-4 py-2.5" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>
            Audios · referencia y secuencia
          </summary>
          <div className="grid gap-3 p-3 pt-0 md:grid-cols-2">
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
          </div>
        </details>
      )}

      {error && <div className="text-sm" style={{ color: "oklch(0.55 0.18 25)" }}>{error}</div>}

      {/* Pie fijo: guardar y eliminar, siempre a la mano */}
      <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t px-6 py-3 md:-mx-16 md:px-16" style={{ borderColor: LINE, background: "oklch(0.965 0.007 85 / 0.96)" }}>
        <button type="button" disabled={pending} onClick={() => onSubmit()} className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50" style={activoStyle}>
          {pending ? "Guardando…" : cancionExistente ? "Guardar cambios" : "Guardar"}
        </button>
        {!ficha.esCover && ficha.esBorrador && (
          <button type="button" disabled={pending} onClick={() => onSubmit(true)} className="rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50" style={{ background: INK, color: BG }}>
            Marcar lista →
          </button>
        )}
        {cancionExistente && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Eliminar «${cancionExistente.titulo}»? No se puede deshacer.`)) return;
              startTransition(() => {
                void eliminarCancionAction(cancionExistente.id, bandaId);
              });
            }}
            className="ml-auto rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50"
            style={{ border: "1px solid oklch(0.6 0.15 25 / 0.45)", color: "oklch(0.5 0.18 25)", background: "transparent" }}
          >
            Eliminar canción
          </button>
        )}
      </div>
    </div>
    <PaletaColor />
    </div>
  );
}

// Acordes de una parada para dibujarla: los de la sección o, si solo están sobre la letra, esos en orden.
function acordesDeParada(c: CuerpoFS): { notaRaiz: Nota; calidad: Calidad; duracionCompases: number }[] {
  if (c.acordes.length > 0) return c.acordes;
  return c.letra.flatMap((l) => [...l.acordes].sort((a, b) => a.posicion - b.posicion).map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, duracionCompases: 1 })));
}

function mmssLocal(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Referencia de color por nota (solo para mirar), en vertical a un lado: 12 notas;
// cada fila trae el color mayor (ancho) y el menor (franja).
function PaletaColor() {
  return (
    <aside className="sticky top-4 hidden w-[58px] flex-none rounded-xl p-1.5 md:block" style={{ background: CARD2, border: `1px solid ${LINE}` }} aria-label="Color por nota">
      <div className="mb-1 text-center" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 7, letterSpacing: "0.08em", textTransform: "uppercase", color: FAINT }}>Color</div>
      <div className="flex flex-col gap-0.5">
        {NOTAS.map((n) => (
          <div key={n} className="flex overflow-hidden rounded" title={`${n}: mayor (ancho) y menor (franja)`} style={{ height: 22 }}>
            <div className="flex flex-1 items-center justify-center" style={{ background: colorRaizAcorde(n, "mayor"), fontFamily: MONO, fontWeight: 700, fontSize: 9, color: colorContrasteTexto(colorRaizAcorde(n, "mayor")) }}>{n}</div>
            <div style={{ width: 9, background: colorRaizAcorde(n, "menor") }} />
          </div>
        ))}
      </div>
      <div className="mt-1 text-center" style={{ fontFamily: MONO, fontSize: 7, color: FAINT }}>mayor · menor</div>
    </aside>
  );
}
