"use client";

import { Fragment, useState, useTransition } from "react";
import { type Nota, type Modo, type Calidad, simboloAcorde, colorRaizAcorde, colorContrasteTexto } from "@/lib/cancionTeoria";
import { PARTES_SECCION, colorPorTipoSeccion, tintaPorTipoSeccion, etiquetasSecciones, parteDe, type NombreSeccion } from "@/lib/seccionCatalogo";
import { segundosPorCompas } from "@/lib/cancionTiempo";
import type { CancionCompleta, CancionInput, SeccionInput, SeccionBaseInput, LetraLineaInput } from "@/lib/cancionesData";
import { crearCancionAction, actualizarCancionAction, eliminarCancionAction, subirAudioAction, quitarAudioAction } from "@/app/canciones/actions";
import { AcordeSelector, type AcordeRef } from "./AcordeSelector";
import Link from "next/link";
import { PaletaColor } from "./PaletaColor";
import { filaDesdeAcordes, expandirFila, agruparUltimos, deshacerCiclo, sincronizarLetra, moverFrontera, cambiarTexto, moverPosicion, sinSilencios, type AcordeFila, type ItemEdicion, type LineaLetra } from "@/lib/cancionLetra";
import { colorOSilencio, simboloOSilencio, SIMBOLO_SILENCIO } from "@/lib/acordeSilencio";
import { FichaCampos, fichaAInput, fichaDesdeCancion, type FichaEstado } from "./FichaCampos";

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), sans-serif";
// Cifras (compases, tiempos, repeticiones): sans con números de ancho parejo; en la mono un 6 se confundía con un 8.
const NUM = "var(--font-dm-sans), sans-serif";
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

type AcordeFS = { notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null; duracionCompases: number; silencio?: boolean };
type LetraFS = { texto: string; tipo: "letra" | "tab"; acordes: { posicion: number; notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null }[] };
type CuerpoFS = {
  acordes: AcordeFS[];
  // La fila tal como se arma (acordes sueltos y ciclos); `acordes` es esa fila expandida.
  fila: ItemEdicion[];
  letra: LetraFS[];
  tonalidadPropia: boolean;
  tonRaiz: Nota;
  tonModo: Modo;
  numeroCompases: string;
  bpm: string;
};
type RepeticionFS = CuerpoFS & { repeticionIndice: number };
// `nombre` aquí es solo la PARTE («Verso»); el número lo calcula etiquetasSecciones.
type SeccionFS = CuerpoFS & { nombre: NombreSeccion; repiteVeces: number; repeticiones: RepeticionFS[] };

function cuerpoVacio(): CuerpoFS {
  return { acordes: [], fila: [], letra: [], tonalidadPropia: false, tonRaiz: "C", tonModo: "mayor", numeroCompases: "", bpm: "" };
}
function nuevaSeccion(): SeccionFS {
  return { ...cuerpoVacio(), nombre: "Intro", repiteVeces: 1, repeticiones: [] };
}

function SeccionNombreSelector({ valor, etiqueta, onCambio }: { valor: NombreSeccion; etiqueta: string; onCambio: (n: NombreSeccion) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: colorPorTipoSeccion(valor), color: tintaPorTipoSeccion(valor), border: "1px solid oklch(0.8 0.01 85)", fontFamily: DISPLAY }}>
        {etiqueta}
      </button>
      {abierto && (
        <div className="absolute z-20 mt-1 flex w-56 flex-wrap gap-1.5 rounded-xl p-2.5" style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" }}>
          {PARTES_SECCION.map((n) => (
            <button key={n} type="button" onClick={() => { onCambio(n); setAbierto(false); }} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: colorPorTipoSeccion(n), color: tintaPorTipoSeccion(n), border: "1px solid oklch(0.8 0.01 85)", outline: n === valor ? "2px solid oklch(0.64 0.17 28)" : "none", outlineOffset: 1 }}>
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
  acordesCancion,
  esCover,
  onSeleccionar,
  onDuracion,
  onQuitar,
}: {
  acorde: AcordeFS;
  tonalidad: { raiz: Nota; modo: Modo };
  acordesCancion: AcordeRef[];
  esCover: boolean;
  onSeleccionar: (n: Nota, c: Calidad, b: Nota | null) => void;
  onDuracion: (n: number) => void;
  onQuitar: () => void;
}) {
  const color = colorOSilencio(acorde);
  const ink = colorContrasteTexto(color);
  // Si dura menos de un compás se muestra en tiempos (4 tiempos = 1 compás); la unidad se cambia tocando la letra.
  const [enTiempos, setEnTiempos] = useState(acorde.duracionCompases > 0 && acorde.duracionCompases < 1);
  return (
    <div className="flex items-center gap-1.5" style={{ borderRadius: 10, padding: "3px 6px 3px 3px", background: color, border: "1px solid rgba(0,0,0,.14)" }}>
      {acorde.silencio ? (
        <span title="Silencio" style={{ padding: "1px 5px", fontFamily: MONO, fontWeight: 700, fontSize: 11, color: INK }}>{SIMBOLO_SILENCIO} silencio</span>
      ) : (
        <AcordeSelector compacto tonalidad={tonalidad} acordesCancion={acordesCancion} esCover={esCover} notaRaiz={acorde.notaRaiz} calidad={acorde.calidad} notaBajo={acorde.notaBajo} onSeleccionar={onSeleccionar} />
      )}
      <input
        inputMode="decimal"
        value={enTiempos ? Number((acorde.duracionCompases * 4).toFixed(2)) : acorde.duracionCompases}
        title={enTiempos ? "Tiempos que dura (4 tiempos = 1 compás)" : "Compases que dura"}
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^0-9.]/g, "");
          const n = limpio === "" ? 0 : Number(limpio);
          onDuracion(enTiempos ? n / 4 : n);
        }}
        style={{ width: "2.3em", textAlign: "center", borderRadius: 6, padding: "2px 0", background: "rgba(255,255,255,.9)", border: "1px solid rgba(0,0,0,.12)", fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 13, color: INK }}
      />
      <button
        type="button"
        onClick={() => setEnTiempos((v) => !v)}
        title={enTiempos ? "Tiempos: toca para cambiar a compases" : "Compases: toca para cambiar a tiempos (menos de un compás)"}
        style={{ fontFamily: NUM, fontWeight: 800, fontSize: 13, lineHeight: 1, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: enTiempos ? "oklch(0.15 0 0)" : "rgba(255,255,255,.9)", color: enTiempos ? "white" : INK, border: "1px solid rgba(0,0,0,.3)" }}
      >
        {enTiempos ? "t" : "c"}
      </button>
      <button type="button" onClick={onQuitar} aria-label="Quitar acorde" style={{ color: ink, fontFamily: MONO, fontSize: 13, lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}

// Si la lista de acordes es un ciclo que se toca varias veces seguidas (A B C D A B C D), devuelve el ciclo y cuántas veces.
function cicloRepetido(acordes: { notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null; silencio?: boolean }[]): { largo: number; veces: number } | null {
  const n = acordes.length;
  for (let largo = 1; largo <= n / 2; largo++) {
    if (n % largo !== 0) continue;
    let igual = true;
    for (let i = largo; i < n && igual; i++) igual = acordes[i].notaRaiz === acordes[i % largo].notaRaiz && acordes[i].calidad === acordes[i % largo].calidad && acordes[i].notaBajo === acordes[i % largo].notaBajo && !!acordes[i].silencio === !!acordes[i % largo].silencio;
    if (igual) return { largo, veces: n / largo };
  }
  return null;
}

// Letra: solo texto. Cada línea toma sus acordes, en orden, de la fila de arriba (una sola captura) y los pone sobre
// el texto según su duración; se pueden pasar acordes de una línea a otra (− / +) y mover cada uno por sílabas (◂ ▸).
function LetraEditor({
  letra,
  progresion,
  onCambio,
}: {
  letra: LetraFS[];
  progresion: AcordeFila[];
  onCambio: (letra: LetraFS[]) => void;
}) {
  const m = progresion.length;
  const enLetra = letra.reduce((n, l) => n + (l.tipo === "letra" ? l.acordes.length : 0), 0);
  // Una parte sin líneas de letra (instrumental) no tiene nada que cruzar con la fila de acordes.
  const hayLetra = letra.some((l) => l.tipo === "letra");
  const setLinea = (i: number, patch: Partial<LetraFS>) => onCambio(letra.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const nueva = (tipo: "letra" | "tab") => {
    const con = [...letra, { texto: "", tipo, acordes: [] } as LetraFS];
    // Si el reparto estaba parejo, con la línea nueva se vuelve a repartir parejo; si no, la línea nueva queda sin acordes.
    const parejo = m > 0 && tipo === "letra" && sincronizarLetra(letra as LineaLetra[], progresion, true).every((l, i) => l.acordes.length === letra[i].acordes.length);
    onCambio((parejo ? sincronizarLetra(con as LineaLetra[], progresion, true) : con) as LetraFS[]);
  };
  const mover = (li: number, idx: number, dir: -1 | 1) => {
    const l = letra[li];
    const orden = [...l.acordes].sort((a, b) => a.posicion - b.posicion);
    const objetivo = orden[idx];
    setLinea(li, { acordes: l.acordes.map((x) => (x === objetivo ? { ...x, posicion: moverPosicion(l.texto, x.posicion, dir) } : x)) });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>Letra</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: FAINT }}>{hayLetra ? "· los acordes salen de la fila de arriba, en orden" : "· esta parte no lleva letra (instrumental); agrega una línea si la tiene"}</span>
        {hayLetra && m > 0 && (
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: enLetra === m ? "oklch(0.45 0.12 150)" : "oklch(0.5 0.18 25)" }}>
            {enLetra === m ? `✓ ${m} acordes en la letra` : `${enLetra} de ${m} acordes en la letra`}
          </span>
        )}
        {hayLetra && m > 0 && (
          <button type="button" onClick={() => onCambio(sincronizarLetra(letra as LineaLetra[], progresion, true) as LetraFS[])} title="Reparte parejo los acordes entre las líneas" className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}>
            Acomodar
          </button>
        )}
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
              {[...l.acordes].sort((a, b) => a.posicion - b.posicion).map((ac, idx) => {
                const color = colorRaizAcorde(ac.notaRaiz, ac.calidad);
                return (
                  <span key={idx} style={{ display: "flex", alignItems: "center", gap: 2, borderRadius: 5, padding: "0 3px", background: color, fontFamily: MONO, fontWeight: 700, fontSize: 10, color: colorContrasteTexto(color) }}>
                    <button type="button" aria-label="Mover a la sílaba anterior" title="Una sílaba atrás (o la coma)" onClick={() => mover(li, idx, -1)} style={{ opacity: 0.75 }}>◂</button>
                    {simboloAcorde(ac.notaRaiz, ac.calidad, ac.notaBajo)}
                    <button type="button" aria-label="Mover a la sílaba siguiente" title="Una sílaba adelante (o la coma)" onClick={() => mover(li, idx, 1)} style={{ opacity: 0.75 }}>▸</button>
                  </span>
                );
              })}
              <span className="ml-auto flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 9, color: FAINT }} title="Acordes de esta línea: pasa uno a la línea vecina">
                acordes
                <button type="button" aria-label="Quitar un acorde a esta línea" onClick={() => onCambio(moverFrontera(letra as LineaLetra[], progresion, li, -1) as LetraFS[])} style={{ width: 18, height: 18, borderRadius: 5, background: CHIP, color: MUTED }}>−</button>
                <b style={{ fontSize: 11, color: INK }}>{l.acordes.length}</b>
                <button type="button" aria-label="Darle un acorde más a esta línea" onClick={() => onCambio(moverFrontera(letra as LineaLetra[], progresion, li, 1) as LetraFS[])} style={{ width: 18, height: 18, borderRadius: 5, background: CHIP, color: MUTED }}>+</button>
              </span>
            </div>
            <div style={{ position: "relative", height: 15, marginTop: 2, marginLeft: 9, fontFamily: MONO, fontSize: 13 }} aria-hidden>
              {l.acordes.map((ac, idx) => {
                const color = colorRaizAcorde(ac.notaRaiz, ac.calidad);
                return (
                  <span key={idx} style={{ position: "absolute", left: `${ac.posicion}ch`, top: 0, fontSize: 13, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: color, color: colorContrasteTexto(color), borderRadius: 4, padding: "0 3px" }}>{simboloAcorde(ac.notaRaiz, ac.calidad, ac.notaBajo)}</span>
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={l.texto}
                placeholder="Línea de letra…"
                onChange={(e) => onCambio(cambiarTexto(letra as LineaLetra[], progresion, li, e.target.value) as LetraFS[])}
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
        <button type="button" onClick={() => nueva("letra")} className="w-fit rounded-md px-2.5 py-1 text-[11px] font-bold" style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}>
          + Línea
        </button>
        <button type="button" onClick={() => nueva("tab")} className="w-fit rounded-md px-2.5 py-1 text-[11px] font-bold" style={{ border: `1px dashed ${ACCENT}`, color: ACCENT, fontFamily: MONO }}>
          + Arreglo / solo
        </button>
      </div>
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
export function CancionForm({ bandaId, cancionExistente, volverHref }: { bandaId: string; cancionExistente?: CancionCompleta; volverHref?: string }) {
  const [ficha, setFicha] = useState<FichaEstado>(() => fichaDesdeCancion(cancionExistente));
  const [fichaAbierta, setFichaAbierta] = useState(!cancionExistente);
  const [secciones, setSecciones] = useState<SeccionFS[]>(
    cancionExistente?.secciones.map((s) => ({
      nombre: parteDe(s.nombre),
      repiteVeces: s.repiteVeces,
      acordes: s.acordes.map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo, duracionCompases: a.duracionCompases, silencio: a.silencio })),
      letra: s.letra.map((l) => ({ texto: l.texto, tipo: l.tipo, acordes: l.acordes.map((a) => ({ posicion: a.posicion, notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo })) })),
      tonalidadPropia: s.tonalidadNota !== null,
      tonRaiz: s.tonalidadNota ?? "C",
      tonModo: s.tonalidadModo ?? "mayor",
      numeroCompases: s.numeroCompases?.toString() ?? "",
      bpm: s.bpm?.toString() ?? "",
      repeticiones: [],
    })).map((x) => {
      // Una parte con acordes solo sobre la letra: se pasan a la fila (1 compás cada uno) para que haya una sola captura.
      if (x.acordes.length > 0) return x;
      const delTexto = x.letra.flatMap((l) => [...l.acordes].sort((a, b) => a.posicion - b.posicion).map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo, duracionCompases: 1 })));
      return delTexto.length > 0 ? { ...x, acordes: delTexto } : x;
    }).map((x) => ({ ...x, fila: filaDesdeAcordes(x.acordes as AcordeFila[]) })) ?? [nuevaSeccion()]
  );
  const [seccionAbierta, setSeccionAbierta] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [repetir, setRepetir] = useState<{ n: number; veces: number } | null>(null);

  const bpm = Number(ficha.bpm) || 0;
  const tonGeneral = { raiz: ficha.raiz, modo: ficha.modo };
  const tonDe = (c: CuerpoFS) => (c.tonalidadPropia ? { raiz: c.tonRaiz, modo: c.tonModo } : tonGeneral);
  // Los compases son siempre la suma de lo capturado (acordes y silencios).
  const compasesDe = (c: CuerpoFS) => c.acordes.reduce((t, a) => t + a.duracionCompases, 0);
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
  // Nombre final de cada parada («Verso 1», «Verso 2»): lo asigna el sistema según el orden.
  const etiquetas = etiquetasSecciones(secciones.map((s) => s.nombre));
  // Acordes de la canción (sin repetir, en orden de aparición): los que se ofrecen primero en el selector.
  const acordesCancion = (() => {
    const vistos = new Set<string>();
    const lista: AcordeRef[] = [];
    const agregar = (a: AcordeRef) => {
      const k = `${a.notaRaiz}|${a.calidad}|${a.notaBajo ?? ""}`;
      if (vistos.has(k)) return;
      vistos.add(k);
      lista.push({ notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo });
    };
    const delCuerpo = (c: CuerpoFS) => {
      c.acordes.filter((a) => !a.silencio).forEach(agregar);
      c.letra.forEach((l) => l.acordes.forEach(agregar));
    };
    for (const s of secciones) {
      delCuerpo(s);
      s.repeticiones.forEach(delCuerpo);
    }
    return lista;
  })();

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

  const construirCuerpo = (c: CuerpoFS): Omit<SeccionBaseInput, "nombre" | "repiteVeces"> => ({
    tonalidadNota: c.tonalidadPropia ? c.tonRaiz : null,
    tonalidadModo: c.tonalidadPropia ? c.tonModo : null,
    numeroCompases: null,
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
    const seccionesInput: SeccionInput[] = secciones.map((s, i) => ({
      nombre: etiquetas[i],
      repiteVeces: Math.max(1, s.repiteVeces),
      ...construirCuerpo(s),
      repeticiones: [],
    }));
    const input: CancionInput = { bandaId, ...base, esBorrador: marcarLista ? false : base.esBorrador, secciones: seccionesInput };
    startTransition(async () => {
      try {
        if (cancionExistente) {
          // «Guardar cambios» se queda en la pantalla; «Marcar lista» sí sale a la canción.
          await actualizarCancionAction(cancionExistente.id, input, !marcarLista);
          if (!marcarLista) {
            setGuardado(true);
            window.setTimeout(() => setGuardado(false), 3500);
          }
        } else await crearCancionAction(input);
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError(e.message);
        else if (!(e instanceof Error)) throw e;
      }
    });
  };

  const chip = (txt: React.ReactNode, titulo: string) => (
    <span title={titulo} style={{ background: CHIP, borderRadius: 8, padding: "3px 9px", fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 12, color: MUTED }}>
      {txt}
    </span>
  );

  // Parada elegida
  const si = Math.min(seccionAbierta, secciones.length - 1);
  const sec = secciones[si];
  // Una parte que se repite es la misma: se captura una sola vez y las vueltas suenan igual.
  const cuerpoSel: CuerpoFS | null = sec ?? null;
  const aplicar = (patch: Partial<CuerpoFS>) => patchSeccion(si, patch as Partial<SeccionFS>);
  // Cambia la fila de acordes y deja la letra acorde con ella (una sola captura).
  const aplicarFila = (fila: ItemEdicion[]) => {
    const acordes = expandirFila(fila) as AcordeFS[];
    const letra = cuerpoSel ? (sincronizarLetra(cuerpoSel.letra as LineaLetra[], sinSilencios(acordes as AcordeFila[])) as LetraFS[]) : [];
    aplicar({ fila, acordes, letra });
  };

  const boton = { border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 9, padding: "4px 10px", fontFamily: MONO, fontWeight: 700, fontSize: 11 } as const;

  return (
    <div className="flex items-start gap-4" style={{ fontFamily: "var(--font-dm-sans), sans-serif", color: INK }}>
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Ficha, con el botón naranja angosto para volver a su izquierda (el mismo de la ejecución) */}
      <div className="flex items-stretch gap-1.5">
      {volverHref && (
        <Link
          href={volverHref}
          title="Volver"
          aria-label="Volver"
          className="flex w-7 flex-none items-center justify-center rounded-2xl no-underline"
          style={{ background: ACCENT, color: "white", fontSize: 22, fontWeight: 800, lineHeight: 1 }}
        >
          ‹
        </Link>
      )}
      <section className="min-w-0 flex-1 rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 3 }} title={ficha.esCover ? "Cover" : "Canción propia"}>
              {ficha.esCover ? "Cover" : `Propia${ficha.esBorrador ? " · borrador" : ""}`}
            </div>
            <div className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>{ficha.titulo || "Canción nueva"}</div>
            {ficha.autor && <div className="truncate text-sm" style={{ color: MUTED }}>{ficha.autor}</div>}
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <PaletaColor tonica={{ raiz: ficha.raiz, modo: ficha.modo }} />
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {chip(ficha.bpm ? `${ficha.bpm} BPM` : "— BPM", "Tempo")}
              {chip(ficha.duracion || "—", "Duración")}
              {chip(`${ficha.compases || totalCompases} compases`, "Compases")}
              {ficha.capo > 0 && <span style={{ background: ACCENT, color: "white", borderRadius: 8, padding: "3px 9px", fontFamily: MONO, fontWeight: 700, fontSize: 11 }}>capo {ficha.capo}</span>}
              <button type="button" onClick={() => setFichaAbierta((v) => !v)} title={fichaAbierta ? "Cerrar ficha" : "Editar ficha"} aria-label={fichaAbierta ? "Cerrar ficha" : "Editar ficha"} style={{ ...boton, padding: "2px 9px", marginLeft: 4 }}>
                {fichaAbierta ? "✕" : "✏️"}
              </button>
            </div>
          </div>
        </div>
        {fichaAbierta && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: LINE, maxWidth: 640 }}>
            <FichaCampos ficha={ficha} onCambio={patchFicha} compasesCalculados={totalCompases} />
          </div>
        )}
      </section>
      </div>

      {/* Recorrido: una sola pieza, de izquierda a derecha, en el orden en que suena */}
      <section>
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: INK }}>El recorrido</span>
          <div className="h-px flex-1" style={{ background: LINE }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{secciones.length} partes · {totalVueltas} vueltas</span>
        </div>
        <div className="mt-2 flex items-stretch overflow-x-auto" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          {secciones.map((s, i) => {
            const color = colorPorTipoSeccion(s.nombre);
            const tinta = tintaPorTipoSeccion(s.nombre);
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
                    <path d="M4 2l5 5-5 5" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <button
                  type="button"
                  onClick={() => setSeccionAbierta(i)}
                  className="flex min-w-[104px] flex-col text-left"
                  style={{ flex: `${Math.max(1, Math.min(compases, 20))} 1 0`, background: color, color: tinta, boxShadow: activa ? "inset 0 0 0 3px oklch(0.08 0 0)" : "none", padding: "8px 8px 6px", borderRight: i < secciones.length - 1 ? `1px solid ${LINE}` : "none" }}
                >
                  <span className="flex items-center gap-1.5">
                    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 9, opacity: 0.6 }}>{i + 1}</span>
                    <span className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13 }}>{etiquetas[i]}</span>
                    {veces > 1 && <span className="ml-auto flex-none" style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 11 }}>↻×{veces}</span>}
                  </span>
                  <span className="mt-1 flex gap-px" style={{ minHeight: 18 }}>
                    {visibles.length === 0 && <span style={{ fontFamily: MONO, fontSize: 9, opacity: 0.6 }}>sin acordes</span>}
                    {visibles.map((a, k) => {
                      const c = colorOSilencio(a);
                      return (
                        <span key={k} style={{ flex: 1, minWidth: 0, background: c, color: colorContrasteTexto(c), borderRadius: 3, padding: "2px 0", textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 8.5, overflow: "hidden" }}>
                          {simboloOSilencio(a)}
                        </span>
                      );
                    })}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5" style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 10, opacity: 0.8 }}>
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
            <SeccionNombreSelector valor={sec.nombre} etiqueta={etiquetas[si]} onCambio={(nombre) => patchSeccion(si, { nombre })} />
            <span style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 12, color: MUTED }}>
              {compasesSeccionTotal(sec)} compases{bpm > 0 ? ` · ${mmssLocal(compasesSeccionTotal(sec) * segundosPorCompas(Number(cuerpoSel.bpm) || bpm))}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => moverSeccion(si, -1)} disabled={si === 0} title="Mover antes" style={{ ...boton, padding: "2px 8px", opacity: si === 0 ? 0.3 : 1 }}>←</button>
              <button type="button" onClick={() => moverSeccion(si, 1)} disabled={si === secciones.length - 1} title="Mover después" style={{ ...boton, padding: "2px 8px", opacity: si === secciones.length - 1 ? 0.3 : 1 }}>→</button>
              {secciones.length > 1 && (
                <button type="button" onClick={() => quitarSeccion(si)} title="Quitar parte" aria-label="Quitar parte" style={{ ...boton, padding: "2px 8px", borderColor: "oklch(0.6 0.15 25 / 0.45)" }}>🗑️</button>
              )}
            </div>
          </div>

          {/* Acordes de la parte: la única captura de acordes (cuentan los compases). Un ciclo ↻ ×N se arma a propósito (nunca se agrupa solo) */}
          {(() => {
            const fila = cuerpoSel.fila;
            const tonal = tonDe(cuerpoSel);
            const chipDe = (a: AcordeFS, key: string, alSeleccionar: (n: Nota, c: Calidad, b: Nota | null) => void, alDuracion: (d: number) => void, alQuitar: () => void) => (
              <AcordeChip key={key} acorde={a} tonalidad={tonal} acordesCancion={acordesCancion} esCover={ficha.esCover} onSeleccionar={alSeleccionar} onDuracion={alDuracion} onQuitar={alQuitar} />
            );
            const botonMini = { width: 18, height: 18, borderRadius: 5, background: CHIP, color: MUTED, fontFamily: MONO } as const;
            const nuevoAcorde = (silencio: boolean): ItemEdicion => ({ tipo: "acorde", a: { notaRaiz: tonal.raiz, calidad: "mayor" as Calidad, notaBajo: null, duracionCompases: 1, ...(silencio ? { silencio: true } : {}) } });
            const sueltosAlFinal = (() => {
              let n = 0;
              while (n < fila.length && fila[fila.length - 1 - n].tipo === "acorde") n++;
              return n;
            })();
            return (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT, marginRight: 4 }}>Acordes</span>
                {fila.map((it, i) =>
                  it.tipo === "acorde" ? (
                    chipDe(
                      it.a,
                      `a${i}`,
                      (notaRaiz, calidad, notaBajo) => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "acorde" ? { tipo: "acorde", a: { ...x.a, notaRaiz, calidad, notaBajo } } : x))),
                      (n) => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "acorde" ? { tipo: "acorde", a: { ...x.a, duracionCompases: n } } : x))),
                      () => aplicarFila(fila.filter((_, j) => j !== i))
                    )
                  ) : (
                    <span key={`c${i}`} className="flex flex-wrap items-center gap-1 rounded-xl px-1.5 py-1" style={{ border: `1.5px dashed ${ACCENT}` }} title="Ciclo: lo que cambies en un acorde vale para todas sus repeticiones">
                      {it.bloque.map((a, o) =>
                        chipDe(
                          a,
                          `c${i}-${o}`,
                          (notaRaiz, calidad, notaBajo) => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "ciclo" ? { ...x, bloque: x.bloque.map((y, k) => (k === o ? { ...y, notaRaiz, calidad, notaBajo } : y)) } : x))),
                          (n) => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "ciclo" ? { ...x, bloque: x.bloque.map((y, k) => (k === o ? { ...y, duracionCompases: n } : y)) } : x))),
                          () => aplicarFila(fila.flatMap((x, j) => (j !== i || x.tipo !== "ciclo" ? [x] : x.bloque.length <= 1 ? [] : [{ ...x, bloque: x.bloque.filter((_, k) => k !== o) }])))
                        )
                      )}
                      <span className="flex items-center gap-1" style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 12, color: ACCENT }}>
                        ↻
                        <button type="button" aria-label="Una repetición menos" onClick={() => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "ciclo" ? { ...x, veces: Math.max(1, x.veces - 1) } : x)))} style={botonMini}>−</button>
                        ×{it.veces}
                        <button type="button" aria-label="Una repetición más" onClick={() => aplicarFila(fila.map((x, j) => (j === i && x.tipo === "ciclo" ? { ...x, veces: x.veces + 1 } : x)))} style={botonMini}>+</button>
                        <button type="button" aria-label="Deshacer el ciclo" title="Deshacer el ciclo (deja los acordes sueltos)" onClick={() => aplicarFila(deshacerCiclo(fila, i))} style={{ ...botonMini, marginLeft: 2 }}>✕</button>
                      </span>
                    </span>
                  )
                )}
                <button
                  type="button"
                  onClick={() => aplicarFila([...fila, nuevoAcorde(false)])}
                  className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                  style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}
                >
                  + acorde
                </button>
                <button
                  type="button"
                  onClick={() => aplicarFila([...fila, nuevoAcorde(true)])}
                  className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                  style={{ border: `1px dashed ${LINE}`, color: MUTED, fontFamily: MONO }}
                  title="Compases o tiempos sin acorde"
                >
                  + silencio
                </button>
                {sueltosAlFinal > 0 && (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => setRepetir((r) => (r ? null : { n: Math.min(4, sueltosAlFinal), veces: 2 }))} className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ border: `1px dashed ${ACCENT}`, color: ACCENT, fontFamily: MONO }} title="Agrupar los últimos acordes sueltos en un ciclo que se repite">
                      ↻ repetir
                    </button>
                    {repetir && (
                      <span className="flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>
                        los últimos
                        <input inputMode="numeric" value={repetir.n} onChange={(e) => setRepetir({ ...repetir, n: Number(e.target.value.replace(/[^0-9]/g, "")) || 1 })} style={{ ...inputStyle, width: 34, textAlign: "center", borderRadius: 6, border: `1px solid ${LINE}`, padding: "1px 2px" }} />
                        acordes, en total
                        <input inputMode="numeric" value={repetir.veces} onChange={(e) => setRepetir({ ...repetir, veces: Number(e.target.value.replace(/[^0-9]/g, "")) || 2 })} style={{ ...inputStyle, width: 34, textAlign: "center", borderRadius: 6, border: `1px solid ${LINE}`, padding: "1px 2px" }} />
                        veces
                        <button type="button" onClick={() => { aplicarFila(agruparUltimos(fila, repetir.n, repetir.veces)); setRepetir(null); }} className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={activoStyle}>Listo</button>
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })()}

          <div className="mt-3 border-t pt-2.5" style={{ borderColor: LINE }}>
            <LetraEditor letra={cuerpoSel.letra} progresion={sinSilencios(cuerpoSel.acordes)} onCambio={(letra) => aplicar({ letra })} />
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
        {guardado && !pending && <span role="status" style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, color: "oklch(0.45 0.12 150)" }}>✓ Guardado</span>}
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
    </div>
  );
}

// Acordes de una parada para dibujarla: los de la sección o, si solo están sobre la letra, esos en orden.
function acordesDeParada(c: CuerpoFS): { notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null; duracionCompases: number }[] {
  if (c.acordes.length > 0) return c.acordes;
  return c.letra.flatMap((l) => [...l.acordes].sort((a, b) => a.posicion - b.posicion).map((a) => ({ notaRaiz: a.notaRaiz, calidad: a.calidad, notaBajo: a.notaBajo, duracionCompases: 1 })));
}

function mmssLocal(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
