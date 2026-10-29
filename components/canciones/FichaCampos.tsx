"use client";

import { useState } from "react";
import { NOTAS, colorRaizAcorde, colorContrasteTexto, type Nota, type Modo } from "@/lib/cancionTeoria";
import { formatoMMSS, parseMMSS } from "@/lib/duracion";
import { uriDeSpotify } from "@/lib/estudioSync";
import type { CancionCompleta, FichaInput } from "@/lib/cancionesData";

// Ficha de la canción: la comparten la ventana "Editar" del modo Estudio y la
// vista de Estructura. Arriba nombre y artista; en medio los datos sueltos;
// abajo (donde empieza la canción) tono y compases.

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), sans-serif";
const CARD = "oklch(0.99 0.005 85)";
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

export type FichaEstado = {
  titulo: string;
  autor: string;
  bpm: string;
  duracion: string;
  spotify: string;
  esCover: boolean;
  capo: number;
  esBorrador: boolean;
  raiz: Nota;
  modo: Modo;
  compases: string;
};

export function fichaDesdeCancion(c?: CancionCompleta): FichaEstado {
  return {
    titulo: c?.titulo ?? "",
    autor: c?.autor ?? "",
    bpm: c?.bpm ? String(c.bpm) : "",
    duracion: formatoMMSS(c?.duracionSegundos ?? null) ?? "",
    spotify: c?.spotifyUri ? `https://open.spotify.com/track/${c.spotifyUri.split(":").pop()}` : "",
    esCover: c?.esCover ?? false,
    capo: c?.capo ?? 0,
    esBorrador: c?.esBorrador ?? true,
    raiz: c?.tonalidadNota ?? "C",
    modo: c?.tonalidadModo ?? "mayor",
    compases: c?.numeroCompases ? String(c.numeroCompases) : "",
  };
}

// Valida y convierte lo escrito; devuelve el texto del error si algo no cuadra.
export function fichaAInput(f: FichaEstado): FichaInput | string {
  if (!f.titulo.trim()) return "El título es obligatorio.";
  const duracionSegundos = parseMMSS(f.duracion);
  if (f.duracion.trim() && duracionSegundos === null) return "La duración va como mm:ss (por ejemplo 3:24).";
  const spotifyUri = uriDeSpotify(f.spotify);
  if (f.spotify.trim() && !spotifyUri) return "La liga de Spotify no es de una canción (debe tener open.spotify.com/track/…).";
  const bpm = f.bpm.trim() ? Number(f.bpm) : null;
  if (bpm !== null && !(bpm >= 20 && bpm <= 300)) return "El BPM va entre 20 y 300.";
  const compases = f.compases.trim() ? Number(f.compases) : null;
  if (compases !== null && !(compases >= 1 && compases <= 2000)) return "Los compases van entre 1 y 2000.";
  return {
    titulo: f.titulo.trim(),
    tonalidadNota: f.raiz,
    tonalidadModo: f.modo,
    bpm,
    duracionSegundos,
    esCover: f.esCover,
    // El borrador solo aplica a canciones propias.
    esBorrador: f.esCover ? false : f.esBorrador,
    autor: f.autor.trim() || null,
    capo: f.capo,
    spotifyUri,
    numeroCompases: compases,
  };
}

const sinSostenido = (n: Nota) => n.replace("#", "") as Nota;
const conSostenido = (natural: string, sost: boolean): Nota => {
  const c = `${natural}${sost ? "#" : ""}`;
  return ((NOTAS as readonly string[]).includes(c) ? c : natural) as Nota;
};

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: FAINT }}>{children}</span>;
}

function Opcion({ activo, onClick, children, disabled }: { activo: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-30" style={{ ...(activo ? activoStyle : inactivoStyle), fontFamily: MONO }}>
      {children}
    </button>
  );
}

export function FichaCampos({
  ficha,
  onCambio,
  compasesCalculados,
}: {
  ficha: FichaEstado;
  onCambio: (patch: Partial<FichaEstado>) => void;
  compasesCalculados: number;
}) {
  const colorTono = colorRaizAcorde(ficha.raiz, ficha.modo === "menor" ? "menor" : "mayor");
  const conCapo = ficha.capo > 0;
  const [tonoAbierto, setTonoAbierto] = useState(false);
  return (
    <div className="flex flex-col gap-3" style={{ color: INK }}>
      {/* Nombre y artista */}
      <div className="flex flex-col gap-1.5">
        <input
          value={ficha.titulo}
          onChange={(e) => onCambio({ titulo: e.target.value })}
          placeholder="Nombre de la canción"
          aria-label="Nombre de la canción"
          className="w-full border-b-2 bg-transparent pb-1 text-2xl font-bold outline-none"
          style={{ borderColor: ACCENT, fontFamily: DISPLAY, color: INK }}
        />
        <input
          value={ficha.autor}
          onChange={(e) => onCambio({ autor: e.target.value })}
          placeholder={ficha.esCover ? "Artista o banda original" : "Artista o banda"}
          aria-label="Artista o banda"
          className="w-full border-b bg-transparent pb-0.5 text-sm outline-none"
          style={{ borderColor: LINE, color: MUTED }}
        />
      </div>

      {/* Datos sueltos */}
      <div className="grid grid-cols-[84px_84px_minmax(0,1fr)] gap-2">
        <label className="flex flex-col gap-1">
          <Etiqueta>BPM</Etiqueta>
          <input inputMode="numeric" value={ficha.bpm} placeholder="—" onChange={(e) => onCambio({ bpm: e.target.value.replace(/[^0-9]/g, "") })} className="rounded-lg border px-2 py-1.5 text-center text-sm outline-none" style={{ ...inputStyle, fontFamily: MONO }} />
        </label>
        <label className="flex flex-col gap-1">
          <Etiqueta>Duración</Etiqueta>
          <input value={ficha.duracion} maxLength={6} placeholder="m:ss" onChange={(e) => onCambio({ duracion: e.target.value })} className="rounded-lg border px-2 py-1.5 text-center text-sm outline-none" style={{ ...inputStyle, fontFamily: MONO }} />
        </label>
        <label className="flex flex-col gap-1">
          <Etiqueta>Liga de Spotify</Etiqueta>
          <input value={ficha.spotify} placeholder="open.spotify.com/track/…" onChange={(e) => onCambio({ spotify: e.target.value })} className="rounded-lg border px-2 py-1.5 text-sm outline-none" style={inputStyle} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-1">
          <Opcion activo={!ficha.esCover} onClick={() => onCambio({ esCover: false })}>Propia</Opcion>
          <Opcion activo={ficha.esCover} onClick={() => onCambio({ esCover: true })}>Cover</Opcion>
        </div>
        <div className="flex items-center gap-1">
          <Opcion activo={!conCapo} onClick={() => onCambio({ capo: 0 })}>Sin capo</Opcion>
          <Opcion activo={conCapo} onClick={() => onCambio({ capo: conCapo ? ficha.capo : 1 })}>Con capo</Opcion>
          {conCapo && (
            <select value={ficha.capo} onChange={(e) => onCambio({ capo: Number(e.target.value) })} aria-label="Traste del capo" className="rounded-lg border px-2 py-1 text-xs outline-none" style={{ ...inputStyle, fontFamily: MONO }}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>traste {i + 1}</option>
              ))}
            </select>
          )}
        </div>
        {!ficha.esCover && (
          <div className="flex gap-1">
            <button type="button" onClick={() => onCambio({ esBorrador: true })} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ ...(ficha.esBorrador ? { border: `1px dashed ${ACCENT}`, color: ACCENT } : inactivoStyle), fontFamily: MONO }}>
              Borrador
            </button>
            <Opcion activo={!ficha.esBorrador} onClick={() => onCambio({ esBorrador: false })}>Lista</Opcion>
          </div>
        )}
      </div>

      {/* Donde empieza la canción: tono y compases */}
      <div className="rounded-xl p-3" style={{ border: `1px solid ${LINE}`, background: "oklch(0.975 0.006 85)" }}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          <div className="flex items-center gap-2">
            <Etiqueta>Tono</Etiqueta>
            <button
              type="button"
              onClick={() => setTonoAbierto((v) => !v)}
              aria-expanded={tonoAbierto}
              title="Cambiar el tono"
              style={{ background: colorTono, color: colorContrasteTexto(colorTono), borderRadius: 8, padding: "3px 12px", fontFamily: MONO, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              {ficha.raiz}{ficha.modo === "menor" ? "m" : ""} <span style={{ fontSize: 9, opacity: 0.8 }}>{tonoAbierto ? "▴" : "▾"}</span>
            </button>
          </div>
          <label className="flex items-center gap-2">
            <Etiqueta>Compases</Etiqueta>
            <input
              inputMode="numeric"
              value={ficha.compases === "" && compasesCalculados > 0 ? String(compasesCalculados) : ficha.compases}
              placeholder="—"
              onChange={(e) => onCambio({ compases: e.target.value.replace(/[^0-9]/g, "") })}
              onBlur={() => {
                // Si queda igual a lo calculado, vuelve a "automático" para seguir a la estructura.
                if (ficha.compases !== "" && Number(ficha.compases) === compasesCalculados) onCambio({ compases: "" });
              }}
              title="Se calcula de la estructura; escribe otro número si quieres fijarlo"
              className="rounded-lg border px-2 py-1.5 text-center text-sm outline-none"
              style={{ ...inputStyle, width: "5em", fontFamily: MONO }}
            />
          </label>
        </div>
        {tonoAbierto && (
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t pt-3" style={{ borderColor: LINE }}>
            {NATURALES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onCambio({ raiz: conSostenido(n, ficha.raiz.includes("#") && (NOTAS as readonly string[]).includes(`${n}#`)) })}
                className="rounded-lg px-2 py-1 text-xs font-bold"
                style={{ ...(sinSostenido(ficha.raiz) === n ? activoStyle : inactivoStyle), fontFamily: MONO, minWidth: 28 }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={!(NOTAS as readonly string[]).includes(`${sinSostenido(ficha.raiz)}#`)}
              onClick={() => onCambio({ raiz: conSostenido(sinSostenido(ficha.raiz), !ficha.raiz.includes("#")) })}
              className="rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-30"
              style={{ ...(ficha.raiz.includes("#") ? activoStyle : inactivoStyle), fontFamily: MONO }}
              title="Sostenido"
            >
              ♯
            </button>
            <button type="button" onClick={() => onCambio({ modo: ficha.modo === "menor" ? "mayor" : "menor" })} className="rounded-lg px-2 py-1 text-xs font-bold" style={{ ...(ficha.modo === "menor" ? activoStyle : inactivoStyle), fontFamily: MONO }} title="Menor">
              m
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
