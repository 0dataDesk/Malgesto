"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NOTAS, type Modo, type Nota } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { parseGeneros } from "@/lib/generos";
import { PaletaColor } from "./PaletaColor";

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
  // Ya entró a arreglar sus compases (se marca al guardar su estructura).
  compasesRevisados: boolean;
};

type Tipo = "todas" | "covers" | "propias";
type Orden = "titulo" | "tono" | "genero" | "compases";

const tonoEtiqueta = (c: CancionLista) => `${c.tonalidadNota}${c.tonalidadModo === "menor" ? "m" : ""}`;
const claveTono = (c: CancionLista) => NOTAS.indexOf(c.tonalidadNota) * 2 + (c.tonalidadModo === "menor" ? 1 : 0);

const selectStyle = { background: CARD, border: `1px solid ${LINE}`, color: INK, borderRadius: 9, padding: "4px 8px", fontSize: 12, fontWeight: 600, height: 30 } as const;

function Grupo({ titulo, canciones }: { titulo: string | null; canciones: CancionLista[] }) {
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
      {/* Todas las tarjetas del mismo tamaño; toda la tarjeta abre la canción */}
      <div className="mt-2.5 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gridAutoRows: 120 }}>
        {canciones.map((c) => {
          const dato = (etiqueta: string, valor: string | null) => (
            <div className="flex flex-col" style={{ minWidth: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, opacity: 0.8, lineHeight: 1.2 }}>{etiqueta}</span>
              <span style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: 15, color: valor ? INK : MUTED, lineHeight: 1.25 }}>{valor ?? "—"}</span>
            </div>
          );
          return (
            <Link
              key={c.id}
              href={`/canciones/${c.id}`}
              className="flex h-full min-w-0 flex-col justify-between rounded-2xl px-3.5 py-3 no-underline"
              style={{ background: c.esBorrador ? "oklch(0.975 0.006 85)" : CARD, border: c.esBorrador ? "1px dashed oklch(0.85 0.010 85)" : `1px solid ${LINE}` }}
            >
              <div className="flex min-w-0 items-center gap-2">
                {!c.compasesRevisados && (
                  <span aria-label="Compases por revisar" title="Aún no revisas sus compases" className="flex-none" style={{ width: 8, height: 8, borderRadius: 99, background: "oklch(0.58 0.22 25)" }} />
                )}
                <span className="truncate text-[17px] font-bold" style={{ color: INK, fontFamily: "var(--font-fraunces), sans-serif" }}>{c.titulo}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1.5" style={{ minHeight: 18 }}>
                {c.esCover && c.autor && (
                  <span className="truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: MONO, background: CHIP, color: MUTED }}>{c.autor}</span>
                )}
                {c.esBorrador && (
                  <span className="flex-none rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: MONO, border: `1px dashed ${ACCENT}`, color: ACCENT }}>Borrador</span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="grid gap-x-4" style={{ gridTemplateColumns: "auto auto auto" }}>
                  {dato("BPM", c.bpm ? String(c.bpm) : null)}
                  {dato("Duración", c.duracionSegundos !== null ? formatoMMSS(c.duracionSegundos) : null)}
                  {dato("Compases", c.totalCompases > 0 ? String(c.totalCompases) : null)}
                </div>
                <PaletaColor mini tonica={{ raiz: c.tonalidadNota, modo: c.tonalidadModo }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ListaCanciones({ canciones }: { canciones: CancionLista[] }) {
  const [tipo, setTipo] = useState<Tipo>("todas");
  const [orden, setOrden] = useState<Orden>("titulo");
  const [genero, setGenero] = useState("");
  const [tono, setTono] = useState("");
  const [soloSinCompases, setSoloSinCompases] = useState(false);

  const generos = useMemo(() => [...new Set(canciones.flatMap((c) => parseGeneros(c.genero)))].sort((a, b) => a.localeCompare(b, "es")), [canciones]);
  const tonos = useMemo(() => [...canciones].sort((a, b) => claveTono(a) - claveTono(b)).map(tonoEtiqueta).filter((t, i, todos) => todos.indexOf(t) === i), [canciones]);

  const lista = useMemo(() => {
    const filtradas = canciones.filter(
      (c) =>
        (tipo === "todas" || (tipo === "covers" ? c.esCover : !c.esCover)) &&
        (!genero || (genero === "__sin" ? parseGeneros(c.genero).length === 0 : parseGeneros(c.genero).includes(genero))) &&
        (!tono || tonoEtiqueta(c) === tono) &&
        (!soloSinCompases || !c.compasesRevisados)
    );
    const porTitulo = (a: CancionLista, b: CancionLista) => a.titulo.localeCompare(b.titulo, "es");
    return [...filtradas].sort((a, b) => {
      if (orden === "tono") return claveTono(a) - claveTono(b) || porTitulo(a, b);
      if (orden === "genero") return (parseGeneros(a.genero)[0] ?? "~~~").localeCompare(parseGeneros(b.genero)[0] ?? "~~~", "es") || porTitulo(a, b);
      if (orden === "compases") return Number(!b.compasesRevisados) - Number(!a.compasesRevisados) || porTitulo(a, b);
      return porTitulo(a, b);
    });
  }, [canciones, tipo, orden, genero, tono, soloSinCompases]);

  const propias = lista.filter((c) => !c.esCover);
  const covers = lista.filter((c) => c.esCover);
  const hayFiltro = tipo !== "todas" || !!genero || !!tono || soloSinCompases;

  return (
    <div>
      {/* Filtros y orden: todos del mismo tipo (desplegable con su título dentro) */}
      <div className="mt-4 flex flex-wrap items-center gap-2" style={{ fontFamily: NUM }}>
        <select aria-label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} style={selectStyle}>
          <option value="todas">Todas las canciones</option>
          <option value="covers">Covers</option>
          <option value="propias">Propias</option>
        </select>
        <select aria-label="Género" value={genero} onChange={(e) => setGenero(e.target.value)} style={selectStyle}>
          <option value="">Género: todos</option>
          {generos.map((g) => <option key={g} value={g}>{g}</option>)}
          <option value="__sin">Sin género</option>
        </select>
        <select aria-label="Tono" value={tono} onChange={(e) => setTono(e.target.value)} style={selectStyle}>
          <option value="">Tono: todos</option>
          {tonos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Compases" value={soloSinCompases ? "revisar" : ""} onChange={(e) => setSoloSinCompases(e.target.value === "revisar")} style={selectStyle}>
          <option value="">Compases: todas</option>
          <option value="revisar">Compases: por revisar</option>
        </select>
        <select aria-label="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value as Orden)} style={selectStyle}>
          <option value="titulo">Orden: título</option>
          <option value="tono">Orden: tono</option>
          <option value="genero">Orden: género</option>
          <option value="compases">Orden: por revisar primero</option>
        </select>
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
          <Grupo titulo="Propias" canciones={propias} />
          <Grupo titulo="Covers" canciones={covers} />
        </>
      ) : (
        <Grupo titulo={null} canciones={lista} />
      )}
    </div>
  );
}
