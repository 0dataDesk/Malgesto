"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NOTAS, colorRaizAcorde, type Modo, type Nota } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";

// Lista de Canciones a todo lo ancho, con filtros (tipo, género, tono, compases) y orden.
// Un foco rojo en la tarjeta marca las canciones a las que aún no se les asignan compases.

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const NUM = "var(--font-dm-sans), sans-serif";
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";
const LINE = "oklch(0.89 0.008 85)";
const CARD = "oklch(0.99 0.005 85)";
const CHIP = "oklch(0.93 0.010 85)";
const ACCENT = "oklch(0.64 0.170 28)";

export type CancionLista = {
  id: string;
  titulo: string;
  autor: string | null;
  genero: string | null;
  esCover: boolean;
  esBorrador: boolean;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionSegundos: number | null;
  totalCompases: number;
};

type Tipo = "todas" | "covers" | "propias";
type Orden = "titulo" | "tono" | "genero" | "compases";

const tonoEtiqueta = (c: CancionLista) => `${c.tonalidadNota}${c.tonalidadModo === "menor" ? "m" : ""}`;
const claveTono = (c: CancionLista) => NOTAS.indexOf(c.tonalidadNota) * 2 + (c.tonalidadModo === "menor" ? 1 : 0);

const selectStyle = { background: CARD, border: `1px solid ${LINE}`, color: INK, borderRadius: 9, padding: "4px 8px", fontSize: 12, fontWeight: 600 } as const;

function Grupo({ titulo, canciones, puedeEscribir }: { titulo: string | null; canciones: CancionLista[]; puedeEscribir: boolean }) {
  if (canciones.length === 0) return null;
  return (
    <div className="mt-5 first:mt-4">
      {titulo && (
        <div className="flex items-baseline gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>{titulo}</h3>
          <div className="h-px flex-1" style={{ background: LINE }} />
          <span className="text-[10px]" style={{ fontFamily: MONO, color: MUTED }}>{canciones.length}</span>
        </div>
      )}
      <div className="mt-2.5 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {canciones.map((c) => (
          <div key={c.id} className="flex items-stretch gap-2">
            <Link
              href={`/canciones/${c.id}`}
              className="relative min-w-0 flex-1 rounded-2xl p-3.5 no-underline"
              style={{ background: c.esBorrador ? "oklch(0.975 0.006 85)" : CARD, border: c.esBorrador ? "1px dashed oklch(0.85 0.010 85)" : `1px solid ${LINE}` }}
            >
              {c.totalCompases === 0 && (
                <span aria-label="Sin compases" title="Sin compases asignados" style={{ position: "absolute", top: 10, right: 10, width: 9, height: 9, borderRadius: 99, background: "oklch(0.58 0.22 25)" }} />
              )}
              <div className="flex flex-wrap items-center gap-1.5 pr-4">
                <span className="text-[17px] font-bold" style={{ color: INK, fontFamily: "var(--font-fraunces), sans-serif" }}>{c.titulo}</span>
                {c.esCover && c.autor && (
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: MONO, background: CHIP, color: MUTED }}>{c.autor}</span>
                )}
                {c.esBorrador && (
                  <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: MONO, border: `1px dashed ${ACCENT}`, color: ACCENT }}>Borrador</span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px]" style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: MUTED }}>
                <span className="text-[15px] font-bold" style={{ color: colorRaizAcorde(c.tonalidadNota, c.tonalidadModo) }}>{tonoEtiqueta(c)}</span>
                {c.bpm && <span>{c.bpm} BPM</span>}
                {c.duracionSegundos !== null && <span>{formatoMMSS(c.duracionSegundos)}</span>}
                {c.totalCompases > 0 && <span>{c.totalCompases} compases</span>}
                {c.genero && <span className="ml-auto rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: CHIP }}>{c.genero}</span>}
              </div>
            </Link>
            {puedeEscribir && (
              <Link href={`/canciones/${c.id}/editar`} className="flex shrink-0 items-center rounded-2xl px-3 text-xs font-bold no-underline" style={{ background: CHIP, color: "oklch(0.4 0.044 262)" }}>
                {c.esBorrador ? "Seguir" : "Editar"}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListaCanciones({ canciones, puedeEscribir }: { canciones: CancionLista[]; puedeEscribir: boolean }) {
  const [tipo, setTipo] = useState<Tipo>("todas");
  const [orden, setOrden] = useState<Orden>("titulo");
  const [genero, setGenero] = useState("");
  const [tono, setTono] = useState("");
  const [soloSinCompases, setSoloSinCompases] = useState(false);

  const generos = useMemo(() => [...new Set(canciones.map((c) => c.genero).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, "es")), [canciones]);
  const tonos = useMemo(() => [...canciones].sort((a, b) => claveTono(a) - claveTono(b)).map(tonoEtiqueta).filter((t, i, todos) => todos.indexOf(t) === i), [canciones]);

  const lista = useMemo(() => {
    const filtradas = canciones.filter(
      (c) =>
        (tipo === "todas" || (tipo === "covers" ? c.esCover : !c.esCover)) &&
        (!genero || (genero === "__sin" ? !c.genero : c.genero === genero)) &&
        (!tono || tonoEtiqueta(c) === tono) &&
        (!soloSinCompases || c.totalCompases === 0)
    );
    const porTitulo = (a: CancionLista, b: CancionLista) => a.titulo.localeCompare(b.titulo, "es");
    return [...filtradas].sort((a, b) => {
      if (orden === "tono") return claveTono(a) - claveTono(b) || porTitulo(a, b);
      if (orden === "genero") return (a.genero ?? "￿").localeCompare(b.genero ?? "￿", "es") || porTitulo(a, b);
      if (orden === "compases") return Number(b.totalCompases === 0) - Number(a.totalCompases === 0) || porTitulo(a, b);
      return porTitulo(a, b);
    });
  }, [canciones, tipo, orden, genero, tono, soloSinCompases]);

  const propias = lista.filter((c) => !c.esCover);
  const covers = lista.filter((c) => c.esCover);
  const hayFiltro = tipo !== "todas" || !!genero || !!tono || soloSinCompases;

  return (
    <div>
      {/* Filtros y orden */}
      <div className="mt-4 flex flex-wrap items-center gap-2" style={{ fontFamily: NUM }}>
        <div role="group" aria-label="Tipo" className="flex items-center">
          {(["todas", "covers", "propias"] as Tipo[]).map((t, n) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              style={{ ...selectStyle, padding: "4px 11px", borderRadius: n === 0 ? "9px 0 0 9px" : n === 2 ? "0 9px 9px 0" : 0, marginLeft: n === 0 ? 0 : -1, background: tipo === t ? INK : CARD, color: tipo === t ? "white" : INK, textTransform: "capitalize" }}
            >
              {t}
            </button>
          ))}
        </div>
        <select aria-label="Género" value={genero} onChange={(e) => setGenero(e.target.value)} style={selectStyle}>
          <option value="">Todos los géneros</option>
          {generos.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="__sin">Sin género</option>
        </select>
        <select aria-label="Tono" value={tono} onChange={(e) => setTono(e.target.value)} style={selectStyle}>
          <option value="">Todos los tonos</option>
          {tonos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          aria-pressed={soloSinCompases}
          onClick={() => setSoloSinCompases((v) => !v)}
          title="Solo las canciones a las que aún no se les asignan compases"
          className="flex items-center gap-1.5"
          style={{ ...selectStyle, background: soloSinCompases ? INK : CARD, color: soloSinCompases ? "white" : INK }}
        >
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 99, background: "oklch(0.58 0.22 25)" }} />
          Sin compases
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-[12px]" style={{ color: MUTED }}>
          Ordenar
          <select aria-label="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value as Orden)} style={selectStyle}>
            <option value="titulo">Título</option>
            <option value="tono">Tono</option>
            <option value="genero">Género</option>
            <option value="compases">Sin compases primero</option>
          </select>
        </span>
        {hayFiltro && (
          <button type="button" onClick={() => { setTipo("todas"); setGenero(""); setTono(""); setSoloSinCompases(false); }} className="text-[12px] underline" style={{ color: MUTED }}>
            Quitar filtros
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="mt-6 text-center text-sm" style={{ color: MUTED }}>Ninguna canción cumple esos filtros.</p>
      ) : tipo === "todas" ? (
        <>
          <Grupo titulo="Propias" canciones={propias} puedeEscribir={puedeEscribir} />
          <Grupo titulo="Covers" canciones={covers} puedeEscribir={puedeEscribir} />
        </>
      ) : (
        <Grupo titulo={null} canciones={lista} puedeEscribir={puedeEscribir} />
      )}
    </div>
  );
}
