"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import { eliminarCancionAction } from "@/app/canciones/actions";
import { NOTAS, simboloAcorde, colorRaizAcorde, colorContrasteTexto, colorExtension, tonosDelAcorde, type Calidad, type Nota } from "@/lib/cancionTeoria";
import { colorPorTipoSeccion } from "@/lib/seccionCatalogo";
import {
  INSTRUMENTOS_ESTUDIO,
  formaDeAcorde,
  posicionesEnMastil,
  notasDelAcorde,
  type Afinacion,
  type Forma,
  type NombreInstrumento,
} from "@/lib/estudioInstrumentos";
import {
  transponerNota,
  gradoEnTonalidad,
  posicionEnCirculo,
  etiquetaCirculo,
  centroTonal,
  patronEnSecuencia,
  distanciaEnSemitonos,
} from "@/lib/estudioArmonia";

// Modo Estudio (escritorio): aprender tocando una canción. Tres columnas:
// acordes de la canción (izquierda), letra con acordes (centro) y panel con
// "qué estoy tocando" y dónde estoy (derecha). Teclas ← → recorren los acordes.

const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";
const LINE = "oklch(0.89 0.008 85)";
const CARD = "oklch(0.99 0.006 85)";
const BG = "oklch(0.965 0.007 85)";
const CORAL = "oklch(0.64 0.170 28)";
const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), serif";

type Evento = { sec: number; linea: number | null; nota: Nota; calidad: Calidad; clave: string };

const claveDe = (n: Nota, c: Calidad) => `${n}|${c}`;

function tinta(n: Nota, c: Calidad) {
  return colorContrasteTexto(colorRaizAcorde(n, c));
}

// ---- Diagrama de acorde ------------------------------------------------
function Diagrama({ forma, afinacion, raiz, mini = false }: { forma: Forma; afinacion: Afinacion; raiz: Nota; mini?: boolean }) {
  const n = afinacion.cuerdas.length;
  const ancho = mini ? 54 : 150;
  const alto = mini ? 62 : 150;
  const izq = mini ? 8 : 20;
  const arriba = mini ? 14 : 26;
  const filas = 5;
  const sx = (ancho - izq * 2) / (n - 1);
  const sy = (alto - arriba - 6) / filas;
  const pisados = forma.trastes.filter((t): t is number => t !== null && t > 0);
  const inicio = pisados.length && Math.max(...pisados) > 4 ? Math.min(...pisados) : 1;
  const idxRaiz = NOTAS.indexOf(raiz);
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
      <g stroke={INK} strokeWidth={mini ? 0.8 : 1.3}>
        {Array.from({ length: filas + 1 }, (_, i) => (
          <line key={i} x1={izq} x2={ancho - izq} y1={arriba + i * sy} y2={arriba + i * sy} strokeWidth={i === 0 && inicio === 1 ? (mini ? 2.5 : 4) : undefined} />
        ))}
        {Array.from({ length: n }, (_, i) => (
          <line key={i} x1={izq + i * sx} x2={izq + i * sx} y1={arriba} y2={arriba + filas * sy} />
        ))}
      </g>
      {forma.trastes.map((t, i) => {
        const x = izq + i * sx;
        if (t === null) return <text key={i} x={x} y={arriba - 5} textAnchor="middle" fontSize={mini ? 8 : 12} fill={MUTED}>×</text>;
        if (t === 0) return <circle key={i} cx={x} cy={arriba - 7} r={mini ? 2.6 : 4.5} fill="none" stroke={INK} strokeWidth={1.2} />;
        const esRaiz = (afinacion.cuerdas[i] + t) % 12 === idxRaiz;
        return <circle key={i} cx={x} cy={arriba + (t - inicio + 0.5) * sy} r={mini ? 3.6 : 8} fill={esRaiz ? CORAL : INK} />;
      })}
      {inicio > 1 && (
        <text x={ancho - 1} y={arriba + sy * 0.7} fontSize={mini ? 8 : 11} fill={MUTED} textAnchor="end" fontFamily={MONO}>{inicio}</text>
      )}
    </svg>
  );
}

// ---- Mástil: dónde están las notas del acorde -----------------------------
function Mastil({ afinacion, raiz, calidad }: { afinacion: Afinacion; raiz: Nota; calidad: Calidad }) {
  const trastes = 12;
  const n = afinacion.cuerdas.length;
  const izq = 22;
  const wf = 26;
  const sy = 20;
  const alto = 14 + (n - 1) * sy + 22;
  const ancho = izq + trastes * wf + 8;
  const pos = posicionesEnMastil(afinacion, raiz, calidad, trastes);
  const y = (cuerda: number) => 10 + (n - 1 - cuerda) * sy;
  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
      {Array.from({ length: trastes + 1 }, (_, i) => (
        <line key={i} x1={izq + i * wf} x2={izq + i * wf} y1={10} y2={10 + (n - 1) * sy} stroke={INK} strokeWidth={i === 0 ? 3 : 0.8} opacity={i === 0 ? 1 : 0.55} />
      ))}
      {afinacion.cuerdas.map((_, c) => (
        <g key={c}>
          <line x1={izq} x2={izq + trastes * wf} y1={y(c)} y2={y(c)} stroke={INK} strokeWidth={0.9} opacity={0.7} />
          <text x={6} y={y(c) + 3} fontSize={9} fill={MUTED} fontFamily={MONO}>{afinacion.nombres[c]}</text>
        </g>
      ))}
      {[3, 5, 7, 9, 12].map((f) => (
        <text key={f} x={izq + (f - 0.5) * wf} y={alto - 4} fontSize={8} textAnchor="middle" fill={MUTED} fontFamily={MONO}>{f}</text>
      ))}
      {pos.map((p, i) => (
        <circle
          key={i}
          cx={p.traste === 0 ? izq - 8 : izq + (p.traste - 0.5) * wf}
          cy={y(p.cuerda)}
          r={p.esRaiz ? 7 : 5}
          fill={p.esRaiz ? CORAL : colorExtension(p.nota)}
          opacity={p.esRaiz ? 1 : 0.85}
        />
      ))}
    </svg>
  );
}

// ---- Círculo de quintas -----------------------------------------------------
function Circulo({
  tonalidad,
  usados,
  actual,
  siguiente,
}: {
  tonalidad: { raiz: Nota; modo: "mayor" | "menor" };
  usados: Set<string>;
  actual: { pos: number; anillo: "mayor" | "menor" } | null;
  siguiente: { pos: number; anillo: "mayor" | "menor" } | null;
}) {
  const c = 120;
  const radio = { mayor: 95, menor: 58 };
  const centro = centroTonal(tonalidad);
  const punto = (pos: number, anillo: "mayor" | "menor") => {
    const a = ((pos * 30 - 90) * Math.PI) / 180;
    return { x: c + radio[anillo] * Math.cos(a), y: c + radio[anillo] * Math.sin(a) };
  };
  const diatonico = (pos: number) => [centro - 1, centro, centro + 1].map((p) => (p + 12) % 12).includes(pos);
  const a = actual ? punto(actual.pos, actual.anillo) : null;
  const s = siguiente ? punto(siguiente.pos, siguiente.anillo) : null;
  return (
    <svg width="100%" viewBox="0 0 240 240" aria-hidden>
      <circle cx={c} cy={c} r={radio.mayor + 20} fill="none" stroke={LINE} />
      <circle cx={c} cy={c} r={radio.menor + 17} fill="none" stroke={LINE} />
      {a && s && <line x1={a.x} y1={a.y} x2={s.x} y2={s.y} stroke={CORAL} strokeWidth={2} strokeDasharray="4 3" />}
      {(["mayor", "menor"] as const).flatMap((anillo) =>
        Array.from({ length: 12 }, (_, pos) => {
          const { x, y } = punto(pos, anillo);
          const etiqueta = etiquetaCirculo(pos, anillo);
          const enCancion = usados.has(`${pos}|${anillo}`);
          const esActual = actual?.pos === pos && actual.anillo === anillo;
          const esSig = siguiente?.pos === pos && siguiente.anillo === anillo;
          return (
            <g key={`${anillo}${pos}`}>
              <circle
                cx={x}
                cy={y}
                r={anillo === "mayor" ? 16 : 13}
                fill={esActual ? CORAL : diatonico(pos) ? "oklch(0.93 0.03 262)" : CARD}
                stroke={esSig ? CORAL : enCancion ? INK : LINE}
                strokeWidth={esSig || enCancion ? 2 : 1}
                strokeDasharray={esSig && !esActual ? "3 2" : undefined}
              />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize={anillo === "mayor" ? 11 : 9.5} fontWeight={700} fontFamily={MONO} fill={esActual ? "white" : INK} opacity={enCancion || esActual || diatonico(pos) ? 1 : 0.45}>
                {etiqueta}
              </text>
            </g>
          );
        })
      )}
      <text x={c} y={c - 2} textAnchor="middle" fontSize={9} fill={MUTED} fontFamily={MONO}>CASA</text>
      <text x={c} y={c + 10} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK} fontFamily={MONO}>
        {tonalidad.raiz}{tonalidad.modo === "menor" ? "m" : ""}
      </text>
    </svg>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "12px 14px" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>{titulo}</div>
      {children}
    </section>
  );
}

const PREF = "malgesto-estudio";

export function VistaEstudio({
  cancion,
  volverHref,
  puedeEditar,
  escenarioHref,
}: {
  cancion: CancionCompleta;
  volverHref: string;
  puedeEditar: boolean;
  escenarioHref: string;
}) {
  const [semi, setSemi] = useState(0);
  const [instrumento, setInstrumento] = useState<NombreInstrumento>("guitarra");
  const [afinId, setAfinId] = useState("estandar");
  const [idx, setIdx] = useState(0);
  const [eliminando, iniciarEliminar] = useTransition();
  const prefsLeidas = useRef(false);

  useEffect(() => {
    // Se lee después del primer pintado para no desfasar el HTML del servidor.
    const t = setTimeout(() => {
      try {
        const g = JSON.parse(localStorage.getItem(PREF) ?? "null");
        if (g?.instrumento in INSTRUMENTOS_ESTUDIO) {
          setInstrumento(g.instrumento);
          if (INSTRUMENTOS_ESTUDIO[g.instrumento as NombreInstrumento].afinaciones.some((a) => a.id === g.afinId)) setAfinId(g.afinId);
        }
      } catch {
        /* sin almacenamiento: se usan los valores por defecto */
      }
      prefsLeidas.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!prefsLeidas.current) return;
    try {
      localStorage.setItem(PREF, JSON.stringify({ instrumento, afinId }));
    } catch {
      /* ignorar */
    }
  }, [instrumento, afinId]);

  const tonalidad = useMemo(
    () => ({ raiz: transponerNota(cancion.tonalidadNota, semi), modo: cancion.tonalidadModo }),
    [cancion.tonalidadNota, cancion.tonalidadModo, semi]
  );
  const afinaciones = INSTRUMENTOS_ESTUDIO[instrumento].afinaciones;
  const afinacion = afinaciones.find((a) => a.id === afinId) ?? afinaciones[0];

  // Todos los acordes de la canción en orden, y a qué línea/sección pertenece cada uno.
  const { eventos, indicesPorLinea, indicesPorSeccion } = useMemo(() => {
    const ev: Evento[] = [];
    const porLinea = new Map<string, number[]>();
    const porSec: number[][] = [];
    cancion.secciones.forEach((s, si) => {
      porSec[si] = [];
      const conLetra = s.letra.some((l) => l.acordes.length > 0);
      if (conLetra) {
        s.letra.forEach((l, li) => {
          const lista: number[] = [];
          [...l.acordes]
            .sort((a, b) => a.posicion - b.posicion || a.orden - b.orden)
            .forEach((a) => {
              const nota = transponerNota(a.notaRaiz, semi);
              lista.push(ev.length);
              porSec[si].push(ev.length);
              ev.push({ sec: si, linea: li, nota, calidad: a.calidad, clave: claveDe(nota, a.calidad) });
            });
          porLinea.set(`${si}-${li}`, lista);
        });
      } else {
        [...s.acordes]
          .sort((a, b) => a.orden - b.orden)
          .forEach((a) => {
            const nota = transponerNota(a.notaRaiz, semi);
            porSec[si].push(ev.length);
            ev.push({ sec: si, linea: null, nota, calidad: a.calidad, clave: claveDe(nota, a.calidad) });
          });
      }
    });
    return { eventos: ev, indicesPorLinea: porLinea, indicesPorSeccion: porSec };
  }, [cancion.secciones, semi]);

  const total = eventos.length;
  const actualIdx = Math.min(idx, Math.max(total - 1, 0));
  const actual = eventos[actualIdx] ?? null;
  const siguiente = eventos[actualIdx + 1] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  // Acordes distintos, en orden de aparición.
  const distintos = useMemo(() => {
    const m = new Map<string, { nota: Nota; calidad: Calidad; veces: number; primero: number }>();
    eventos.forEach((e, i) => {
      const x = m.get(e.clave);
      if (x) x.veces += 1;
      else m.set(e.clave, { nota: e.nota, calidad: e.calidad, veces: 1, primero: i });
    });
    return [...m.values()];
  }, [eventos]);

  const usados = useMemo(() => {
    const s = new Set<string>();
    distintos.forEach((d) => {
      const p = posicionEnCirculo(d.nota, d.calidad);
      s.add(`${p.pos}|${p.anillo}`);
    });
    return s;
  }, [distintos]);

  const grado = actual ? gradoEnTonalidad(actual.nota, actual.calidad, tonalidad) : null;
  const forma = actual ? formaDeAcorde(instrumento, afinacion, actual.nota, actual.calidad) : null;
  const tonos = actual ? tonosDelAcorde(actual.nota, actual.calidad) : null;
  const seccionActual = actual ? cancion.secciones[actual.sec] : null;
  const rutaActual = actual ? indicesPorSeccion[actual.sec] ?? [] : [];
  const romanosRuta = rutaActual.map((i) => gradoEnTonalidad(eventos[i].nota, eventos[i].calidad, tonalidad).romano);
  const patron = patronEnSecuencia(romanosRuta);
  const textoSpotify = encodeURIComponent(`${cancion.titulo}${cancion.autor ? " " + cancion.autor : ""}`);

  const eliminar = () => {
    if (!window.confirm(`¿Eliminar «${cancion.titulo}»? No se puede deshacer.`)) return;
    iniciarEliminar(() => {
      void eliminarCancionAction(cancion.id, cancion.bandaId);
    });
  };

  const boton: React.CSSProperties = {
    border: `1px solid ${LINE}`,
    background: CARD,
    color: INK,
    borderRadius: 10,
    padding: "6px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div className="flex h-screen flex-col" style={{ background: BG, color: INK }}>
      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-3 px-6 py-3" style={{ borderBottom: `1px solid ${LINE}`, background: CARD }}>
        <Link href={volverHref} className="text-sm no-underline" style={{ color: MUTED }}>‹ Canciones</Link>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 24, lineHeight: 1 }}>{cancion.titulo}</h1>
        {cancion.autor && <span style={{ fontSize: 12, color: MUTED }}>{cancion.autor}</span>}
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {tonalidad.raiz} {tonalidad.modo}{cancion.bpm ? ` · ${cancion.bpm} BPM` : ""}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span style={{ fontSize: 11, color: MUTED }}>Transponer</span>
          <button style={boton} onClick={() => setSemi((s) => s - 1)} aria-label="Bajar un semitono">−</button>
          <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 22, textAlign: "center" }}>{semi > 0 ? `+${semi}` : semi}</span>
          <button style={boton} onClick={() => setSemi((s) => s + 1)} aria-label="Subir un semitono">+</button>
          <a href={`https://open.spotify.com/search/${textoSpotify}`} target="_blank" rel="noreferrer" style={{ ...boton, background: "#1db954", color: "white", borderColor: "#1db954" }}>
            ▶ Buscar en Spotify
          </a>
          <Link href={escenarioHref} style={boton}>Vista escenario</Link>
          {puedeEditar && (
            <>
              <Link href={`/canciones/${cancion.id}/editar`} style={boton}>Editar</Link>
              <button style={{ ...boton, color: "oklch(0.5 0.18 25)", borderColor: "oklch(0.6 0.15 25 / 0.45)" }} onClick={eliminar} disabled={eliminando}>
                {eliminando ? "Eliminando…" : "Eliminar"}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "210px minmax(0,1fr) 400px" }}>
        {/* Izquierda: todos los acordes */}
        <aside className="overflow-y-auto px-3 py-4" style={{ borderRight: `1px solid ${LINE}`, background: CARD }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
            Acordes · {distintos.length}
          </div>
          <div className="flex flex-col gap-2">
            {distintos.map((d) => {
              const activo = actual?.clave === claveDe(d.nota, d.calidad);
              const f = formaDeAcorde(instrumento, afinacion, d.nota, d.calidad);
              const g = gradoEnTonalidad(d.nota, d.calidad, tonalidad);
              return (
                <button
                  key={claveDe(d.nota, d.calidad)}
                  onClick={() => setIdx(d.primero)}
                  className="flex items-center gap-2 text-left"
                  style={{ border: `2px solid ${activo ? CORAL : LINE}`, borderRadius: 12, padding: "6px 8px", background: activo ? "oklch(0.97 0.02 28)" : BG, cursor: "pointer" }}
                >
                  <div style={{ width: 54, minHeight: 40 }}>
                    {f ? <Diagrama forma={f} afinacion={afinacion} raiz={d.nota} mini /> : <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{notasDelAcorde(d.nota, d.calidad).map((p) => NOTAS[p]).join(" ")}</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 17, color: colorRaizAcorde(d.nota, d.calidad) }}>{simboloAcorde(d.nota, d.calidad)}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{g.romano} · {d.veces}×</div>
                  </div>
                </button>
              );
            })}
            {distintos.length === 0 && <p style={{ fontSize: 12, color: MUTED }}>Esta canción aún no tiene acordes.</p>}
          </div>
        </aside>

        {/* Centro: letra con acordes */}
        <main className="overflow-y-auto px-8 py-5">
          {cancion.secciones.map((s, si) => {
            const conLetra = s.letra.some((l) => l.acordes.length > 0 || l.texto.trim());
            return (
              <div key={s.id} style={{ marginBottom: 22 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ background: colorPorTipoSeccion(s.nombre), color: "white", fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {s.nombre}
                  </span>
                  {s.repiteVeces > 1 && <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>× {s.repiteVeces}</span>}
                </div>
                {conLetra ? (
                  s.letra.map((l, li) => {
                    const idxs = indicesPorLinea.get(`${si}-${li}`) ?? [];
                    const orden = [...l.acordes].sort((a, b) => a.posicion - b.posicion || a.orden - b.orden);
                    const texto = l.texto.length ? l.texto : " ";
                    const cortes = [0, ...orden.map((p) => Math.min(p.posicion, texto.length)), texto.length];
                    return (
                      <div key={l.id} className="flex flex-wrap items-end" style={{ marginBottom: 6 }}>
                        {cortes.slice(0, -1).map((c, k) => {
                          const trozo = texto.slice(c, cortes[k + 1]);
                          const ei = k > 0 ? idxs[k - 1] : undefined;
                          const e = ei !== undefined ? eventos[ei] : null;
                          const esActual = ei === actualIdx;
                          const mismo = !!e && !!actual && e.clave === actual.clave;
                          return (
                            <div key={k} className="flex flex-col" style={{ gap: 2 }}>
                              {e ? (
                                <button
                                  onClick={() => setIdx(ei!)}
                                  style={{
                                    alignSelf: "flex-start", fontFamily: MONO, fontWeight: 700, fontSize: 19, padding: "1px 8px", borderRadius: 8, cursor: "pointer", border: "none",
                                    background: colorRaizAcorde(e.nota, e.calidad), color: tinta(e.nota, e.calidad),
                                    outline: esActual ? `3px solid ${CORAL}` : mismo ? `2px solid ${CORAL}` : "none", outlineOffset: 2,
                                    opacity: mismo || !actual ? 1 : 0.8,
                                  }}
                                >
                                  {simboloAcorde(e.nota, e.calidad)}
                                  <span style={{ display: "block", fontSize: 9, fontWeight: 400, textAlign: "center", marginTop: -2 }}>{gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}</span>
                                </button>
                              ) : (
                                <span style={{ height: 34 }} />
                              )}
                              <span style={{ fontSize: 23, lineHeight: 1.2, whiteSpace: "pre" }}>{trozo}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(indicesPorSeccion[si] ?? []).map((ei) => {
                      const e = eventos[ei];
                      return (
                        <button
                          key={ei}
                          onClick={() => setIdx(ei)}
                          style={{ fontFamily: MONO, fontWeight: 700, fontSize: 19, padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: colorRaizAcorde(e.nota, e.calidad), color: tinta(e.nota, e.calidad), outline: ei === actualIdx ? `3px solid ${CORAL}` : "none", outlineOffset: 2 }}
                        >
                          {simboloAcorde(e.nota, e.calidad)}
                        </button>
                      );
                    })}
                    {(indicesPorSeccion[si] ?? []).length === 0 && <span style={{ fontSize: 12, color: MUTED }}>Sin acordes todavía.</span>}
                  </div>
                )}
              </div>
            );
          })}
          {cancion.secciones.length === 0 && <p style={{ color: MUTED }}>Esta canción aún no tiene secciones. Usa Editar para agregarlas.</p>}
        </main>

        {/* Derecha: qué toco y dónde estoy */}
        <aside className="flex flex-col gap-3 overflow-y-auto px-4 py-4" style={{ borderLeft: `1px solid ${LINE}`, background: BG }}>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(INSTRUMENTOS_ESTUDIO) as NombreInstrumento[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setInstrumento(k);
                  setAfinId("estandar");
                }}
                style={{ ...boton, background: instrumento === k ? INK : CARD, color: instrumento === k ? "white" : INK, borderRadius: 99 }}
              >
                {INSTRUMENTOS_ESTUDIO[k].etiqueta}
              </button>
            ))}
            <select
              value={afinacion.id}
              onChange={(e) => setAfinId(e.target.value)}
              aria-label="Afinación"
              style={{ ...boton, marginLeft: "auto", fontWeight: 500 }}
            >
              {afinaciones.map((a) => (
                <option key={a.id} value={a.id}>{a.etiqueta}</option>
              ))}
            </select>
          </div>

          {actual && grado && tonos ? (
            <>
              <Tarjeta titulo="Estás tocando">
                <div className="flex items-center gap-4">
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, lineHeight: 1, color: colorRaizAcorde(actual.nota, actual.calidad) }}>
                    {simboloAcorde(actual.nota, actual.calidad)}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>
                    <b>{grado.romano}</b> de {tonalidad.raiz} {tonalidad.modo}.<br />
                    <span style={{ color: MUTED }}>{grado.sentir}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {forma ? (
                    <Diagrama forma={forma} afinacion={afinacion} raiz={actual.nota} />
                  ) : instrumento === "bajo" ? (
                    <div style={{ fontSize: 12, color: MUTED, maxWidth: 150 }}>En el bajo se toca nota por nota: empieza por la raíz (punto coral) en el mástil de abajo.</div>
                  ) : (
                    <div style={{ fontSize: 12, color: MUTED, maxWidth: 150 }}>No encontré una forma cómoda; usa las notas del mástil.</div>
                  )}
                  <div className="flex flex-1 flex-col gap-1.5">
                    {[{ intervalo: "raíz", nota: tonos.raiz }, ...tonos.acompanantes.filter((a) => a.intervalo !== "9ª")].map((t, i) => (
                      <div key={i} className="flex items-center gap-2" style={{ background: i === 0 ? CORAL : colorExtension(t.nota), color: "white", borderRadius: 9, padding: "4px 10px", fontWeight: 800, fontSize: 14 }}>
                        <span style={{ fontFamily: MONO }}>{t.nota}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.9 }}>{t.intervalo}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {siguiente && (
                  <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>
                    Sigue <b style={{ color: INK }}>{simboloAcorde(siguiente.nota, siguiente.calidad)}</b>
                    {" "}({gradoEnTonalidad(siguiente.nota, siguiente.calidad, tonalidad).romano}) · salto de {distanciaEnSemitonos(actual.nota, siguiente.nota)} semitonos. Usa ← →.
                  </div>
                )}
              </Tarjeta>

              <Tarjeta titulo="Dónde estás en la canción">
                <div className="relative flex gap-1" style={{ paddingTop: 16 }}>
                  {cancion.secciones.map((s, si) => {
                    const aqui = actual.sec === si;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          const primero = indicesPorSeccion[si]?.[0];
                          if (primero !== undefined) setIdx(primero);
                        }}
                        title={s.nombre}
                        style={{ flex: Math.max(1, (indicesPorSeccion[si] ?? []).length), position: "relative", height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: colorPorTipoSeccion(s.nombre), opacity: aqui ? 1 : 0.4, color: "white", fontSize: 9, fontFamily: MONO, overflow: "hidden", whiteSpace: "nowrap" }}
                      >
                        {aqui && <span style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", color: CORAL, fontSize: 10, fontWeight: 800 }}>▼ aquí</span>}
                        {s.nombre.replace("Sección Única", "Única")}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: MUTED, margin: "10px 0 6px" }}>
                  Camino de {seccionActual?.nombre}:
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {rutaActual.map((ei, k) => {
                    const e = eventos[ei];
                    const g = gradoEnTonalidad(e.nota, e.calidad, tonalidad);
                    return (
                      <div key={ei} className="flex items-center gap-1">
                        {k > 0 && <span style={{ color: MUTED, fontSize: 11 }}>→</span>}
                        <button
                          onClick={() => setIdx(ei)}
                          style={{ border: `2px solid ${ei === actualIdx ? CORAL : LINE}`, background: ei === actualIdx ? "oklch(0.97 0.02 28)" : BG, borderRadius: 9, padding: "3px 7px", cursor: "pointer", textAlign: "center" }}
                        >
                          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, color: colorRaizAcorde(e.nota, e.calidad) }}>{simboloAcorde(e.nota, e.calidad)}</div>
                          <div style={{ fontSize: 9, color: MUTED }}>{g.romano}</div>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {patron && (
                  <div style={{ marginTop: 10, fontSize: 12, background: "oklch(0.95 0.02 262)", borderRadius: 10, padding: "6px 10px" }}>
                    Aquí está <b>{patron.romanos.join(" – ")}</b>: {patron.nombre}.
                  </div>
                )}
              </Tarjeta>

              <Tarjeta titulo="Círculo de quintas · tu mapa de armonía">
                <div style={{ maxWidth: 270, margin: "0 auto" }}>
                  <Circulo
                    tonalidad={tonalidad}
                    usados={usados}
                    actual={posicionEnCirculo(actual.nota, actual.calidad)}
                    siguiente={siguiente ? posicionEnCirculo(siguiente.nota, siguiente.calidad) : null}
                  />
                </div>
                <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
                  Zona azul: los acordes que “viven” en {tonalidad.raiz} {tonalidad.modo}. Borde oscuro: los que usa esta canción. Coral: el que tocas; línea punteada: a dónde vas.
                </div>
              </Tarjeta>

              <Tarjeta titulo="Dónde está en el mástil">
                <Mastil afinacion={afinacion} raiz={actual.nota} calidad={actual.calidad} />
                <div style={{ fontSize: 11, color: MUTED }}>Coral = raíz. Los otros colores son las demás notas del acorde.</div>
              </Tarjeta>
            </>
          ) : (
            <Tarjeta titulo="Estás tocando">
              <p style={{ fontSize: 13, color: MUTED }}>Cuando la canción tenga acordes, aquí verás qué tocas y dónde estás.</p>
            </Tarjeta>
          )}
        </aside>
      </div>
    </div>
  );
}
