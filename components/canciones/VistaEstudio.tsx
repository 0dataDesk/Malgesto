"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import { eliminarCancionAction } from "@/app/canciones/actions";
import { NOTAS, simboloAcorde, colorRaizAcorde, colorContrasteTexto, tonosDelAcorde, type Calidad, type Nota } from "@/lib/cancionTeoria";
import { colorPorTipoSeccion } from "@/lib/seccionCatalogo";
import {
  INSTRUMENTOS_ESTUDIO,
  variantesDeAcorde,
  posicionesEnMastil,
  notasDelAcorde,
  type Afinacion,
  type Forma,
  type NombreInstrumento,
} from "@/lib/estudioInstrumentos";
import { transponerNota, gradoEnTonalidad, posicionEnCirculo, etiquetaCirculo, centroTonal, patronEnSecuencia } from "@/lib/estudioArmonia";

// Modo Estudio (escritorio). Arriba: cabecera y línea de tiempo de la canción.
// Izquierda: cada acorde con su color y sus formas. Centro: letra con la
// palabra subrayada del color del acorde. Derecha: mástil, todos los acordes
// con sus notas (tonos del color de la raíz) y círculo de quintas.
// Teclas ← → recorren los acordes.

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
const colorDe = (n: Nota, c: Calidad) => colorRaizAcorde(n, c);
const tinta = (n: Nota, c: Calidad) => colorContrasteTexto(colorRaizAcorde(n, c));

// Tonos del color de la raíz: nivel 0 = raíz, 1..3 = 3ª/5ª/7ª más claros.
function tono(base: string, nivel: number): string {
  const m = /hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)/.exec(base);
  if (!m) return base;
  const [h, s, l] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (nivel === 0) return base;
  return `hsl(${h} ${Math.max(s - 8 * nivel, 18)}% ${Math.min(l + 13 * nivel, 86)}%)`;
}

// ---- Diagrama de acorde (con dedos y cejilla) --------------------------------
function Diagrama({ forma, afinacion, mini = false }: { forma: Forma; afinacion: Afinacion; mini?: boolean }) {
  const n = afinacion.cuerdas.length;
  const ancho = mini ? 70 : 150;
  const alto = mini ? 82 : 160;
  const izq = mini ? 9 : 18;
  const arriba = mini ? 15 : 26;
  const filas = 5;
  const sx = (ancho - izq * 2) / (n - 1);
  const sy = (alto - arriba - 5) / filas;
  const pisados = forma.trastes.filter((t): t is number => t !== null && t > 0);
  const inicio = pisados.length && Math.max(...pisados) > 4 ? Math.min(...pisados) : 1;
  const yFila = (t: number) => arriba + (t - inicio + 0.5) * sy;
  const r = mini ? 5.4 : 9;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden style={{ display: "block" }}>
      <g stroke={INK} strokeWidth={mini ? 0.8 : 1.3}>
        {Array.from({ length: filas + 1 }, (_, i) => (
          <line key={i} x1={izq} x2={ancho - izq} y1={arriba + i * sy} y2={arriba + i * sy} strokeWidth={i === 0 && inicio === 1 ? (mini ? 2.5 : 4) : undefined} />
        ))}
        {Array.from({ length: n }, (_, i) => (
          <line key={i} x1={izq + i * sx} x2={izq + i * sx} y1={arriba} y2={arriba + filas * sy} />
        ))}
      </g>
      {forma.barre && (
        <rect
          x={izq + forma.barre.desde * sx - r}
          y={yFila(forma.barre.traste) - r}
          width={(forma.barre.hasta - forma.barre.desde) * sx + r * 2}
          height={r * 2}
          rx={r}
          fill={INK}
        />
      )}
      {forma.trastes.map((t, i) => {
        const x = izq + i * sx;
        if (t === null) return <text key={i} x={x} y={arriba - 5} textAnchor="middle" fontSize={mini ? 9 : 12} fill={MUTED}>×</text>;
        if (t === 0) return <circle key={i} cx={x} cy={arriba - 7} r={mini ? 2.8 : 4.5} fill="none" stroke={INK} strokeWidth={1.2} />;
        const enBarre = forma.barre && t === forma.barre.traste && i >= forma.barre.desde && i <= forma.barre.hasta;
        return (
          <g key={i}>
            {!enBarre && <circle cx={x} cy={yFila(t)} r={r} fill={INK} />}
            {forma.dedos[i] !== null && !(enBarre && i !== forma.barre!.desde) && (
              <text x={x} y={yFila(t) + (mini ? 2.6 : 4)} textAnchor="middle" fontSize={mini ? 7.5 : 11} fontWeight={700} fill="white" fontFamily={MONO}>
                {forma.dedos[i]}
              </text>
            )}
          </g>
        );
      })}
      {inicio > 1 && (
        <text x={ancho - 1} y={arriba + sy * 0.7} fontSize={mini ? 8 : 11} fill={MUTED} textAnchor="end" fontFamily={MONO}>{inicio}</text>
      )}
    </svg>
  );
}

// ---- Mástil -----------------------------------------------------------------
function Mastil({
  afinacion,
  actual,
  otros,
}: {
  afinacion: Afinacion;
  actual: { nota: Nota; calidad: Calidad };
  otros: { nota: Nota; calidad: Calidad }[];
}) {
  const trastes = 12;
  const n = afinacion.cuerdas.length;
  const izq = 26;
  const wf = 46;
  const sy = n > 4 ? 26 : 32;
  const alto = 14 + (n - 1) * sy + 26;
  const ancho = izq + trastes * wf + 10;
  const y = (cuerda: number) => 12 + (n - 1 - cuerda) * sy;
  const x = (t: number) => (t === 0 ? izq - 12 : izq + (t - 0.5) * wf);
  const dibujar = (c: { nota: Nota; calidad: Calidad }, fuerte: boolean) => {
    const base = colorDe(c.nota, c.calidad);
    const clase = notasDelAcorde(c.nota, c.calidad);
    return posicionesEnMastil(afinacion, c.nota, c.calidad, trastes).map((p, i) => {
      const nivel = clase.indexOf(NOTAS.indexOf(p.nota));
      return (
        <g key={`${c.nota}${c.calidad}${i}`} opacity={fuerte ? 1 : 0.3}>
          <circle cx={x(p.traste)} cy={y(p.cuerda)} r={fuerte ? (p.esRaiz ? 12 : 10) : 5} fill={tono(base, Math.max(nivel, 0))} stroke={fuerte && p.esRaiz ? INK : "none"} strokeWidth={2} />
          {fuerte && (
            <text x={x(p.traste)} y={y(p.cuerda) + 3.5} textAnchor="middle" fontSize={10} fontWeight={800} fontFamily={MONO} fill={nivel === 0 ? colorContrasteTexto(base) : INK}>
              {p.nota}
            </text>
          )}
        </g>
      );
    });
  };
  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
      {Array.from({ length: trastes + 1 }, (_, i) => (
        <line key={i} x1={izq + i * wf} x2={izq + i * wf} y1={12} y2={12 + (n - 1) * sy} stroke={INK} strokeWidth={i === 0 ? 3 : 0.8} opacity={i === 0 ? 1 : 0.5} />
      ))}
      {afinacion.cuerdas.map((_, c) => (
        <g key={c}>
          <line x1={izq} x2={izq + trastes * wf} y1={y(c)} y2={y(c)} stroke={INK} strokeWidth={0.9} opacity={0.65} />
          <text x={4} y={y(c) + 3.5} fontSize={10} fill={MUTED} fontFamily={MONO}>{afinacion.nombres[c]}</text>
        </g>
      ))}
      {[3, 5, 7, 9, 12].map((f) => (
        <text key={f} x={izq + (f - 0.5) * wf} y={alto - 4} fontSize={9} textAnchor="middle" fill={MUTED} fontFamily={MONO}>{f}</text>
      ))}
      {otros.map((c) => dibujar(c, false))}
      {dibujar(actual, true)}
    </svg>
  );
}

// ---- Círculo de quintas -------------------------------------------------------
function Circulo({
  tonalidad,
  usados,
  actual,
  siguiente,
}: {
  tonalidad: { raiz: Nota; modo: "mayor" | "menor" };
  usados: Map<string, string>;
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
          const color = usados.get(`${pos}|${anillo}`);
          const esActual = actual?.pos === pos && actual.anillo === anillo;
          const esSig = siguiente?.pos === pos && siguiente.anillo === anillo;
          const relleno = color ?? (diatonico(pos) ? "oklch(0.93 0.03 262)" : CARD);
          return (
            <g key={`${anillo}${pos}`}>
              <circle
                cx={x}
                cy={y}
                r={anillo === "mayor" ? 16 : 13}
                fill={relleno}
                stroke={esActual ? INK : esSig ? CORAL : LINE}
                strokeWidth={esActual ? 3 : esSig ? 2 : 1}
                strokeDasharray={esSig && !esActual ? "3 2" : undefined}
              />
              <text x={x} y={y + 3.5} textAnchor="middle" fontSize={anillo === "mayor" ? 11 : 9.5} fontWeight={700} fontFamily={MONO} fill={color ? colorContrasteTexto(color) : INK} opacity={color || diatonico(pos) ? 1 : 0.4}>
                {etiquetaCirculo(pos, anillo)}
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

function Titulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>{children}</div>;
}

const PREF = "malgesto-estudio";
const PREF_VAR = "malgesto-estudio-variantes";
const PREF_LISTA = "malgesto-estudio-lista";

function leer<T>(clave: string, defecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : defecto;
  } catch {
    return defecto;
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento */
  }
}

// Embed de Spotify a partir de una liga de lista, álbum o canción.
function urlEmbed(liga: string): string | null {
  const m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/.exec(liga);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0` : null;
}

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
  const [variantes, setVariantes] = useState<Record<string, number>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [verTodos, setVerTodos] = useState(false);
  const [lista, setLista] = useState("");
  const [reproductor, setReproductor] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [eliminando, iniciarEliminar] = useTransition();
  const prefsLeidas = useRef(false);

  useEffect(() => {
    // Se lee después del primer pintado para no desfasar el HTML del servidor.
    const t = setTimeout(() => {
      const g = leer<{ instrumento?: NombreInstrumento; afinId?: string } | null>(PREF, null);
      if (g?.instrumento && g.instrumento in INSTRUMENTOS_ESTUDIO) {
        setInstrumento(g.instrumento);
        if (INSTRUMENTOS_ESTUDIO[g.instrumento].afinaciones.some((a) => a.id === g.afinId)) setAfinId(g.afinId as string);
      }
      setVariantes(leer(PREF_VAR, {}));
      setLista(leer(PREF_LISTA, ""));
      prefsLeidas.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (prefsLeidas.current) guardar(PREF, { instrumento, afinId });
  }, [instrumento, afinId]);

  const tonalidad = useMemo(() => ({ raiz: transponerNota(cancion.tonalidadNota, semi), modo: cancion.tonalidadModo }), [cancion.tonalidadNota, cancion.tonalidadModo, semi]);
  const afinaciones = INSTRUMENTOS_ESTUDIO[instrumento].afinaciones;
  const afinacion = afinaciones.find((a) => a.id === afinId) ?? afinaciones[0];

  const { eventos, indicesPorLinea, indicesPorSeccion } = useMemo(() => {
    const ev: Evento[] = [];
    const porLinea = new Map<string, number[]>();
    const porSec: number[][] = [];
    cancion.secciones.forEach((s, si) => {
      porSec[si] = [];
      const conLetra = s.letra.some((l) => l.acordes.length > 0);
      if (conLetra) {
        s.letra.forEach((l, li) => {
          const ids: number[] = [];
          [...l.acordes]
            .sort((a, b) => a.posicion - b.posicion || a.orden - b.orden)
            .forEach((a) => {
              const nota = transponerNota(a.notaRaiz, semi);
              ids.push(ev.length);
              porSec[si].push(ev.length);
              ev.push({ sec: si, linea: li, nota, calidad: a.calidad, clave: claveDe(nota, a.calidad) });
            });
          porLinea.set(`${si}-${li}`, ids);
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
    const mapa = new Map<string, string>();
    distintos.forEach((d) => {
      const p = posicionEnCirculo(d.nota, d.calidad);
      mapa.set(`${p.pos}|${p.anillo}`, colorDe(d.nota, d.calidad));
    });
    return mapa;
  }, [distintos]);

  const claveVar = (nota: Nota, calidad: Calidad) => `${instrumento}|${afinacion.id}|${claveDe(nota, calidad)}`;
  const elegirVariante = (nota: Nota, calidad: Calidad, i: number) => {
    const nuevo = { ...variantes, [claveVar(nota, calidad)]: i };
    setVariantes(nuevo);
    guardar(PREF_VAR, nuevo);
  };

  const grado = actual ? gradoEnTonalidad(actual.nota, actual.calidad, tonalidad) : null;
  const rutaActual = actual ? indicesPorSeccion[actual.sec] ?? [] : [];
  const patron = patronEnSecuencia(rutaActual.map((i) => gradoEnTonalidad(eventos[i].nota, eventos[i].calidad, tonalidad).romano));
  const embed = urlEmbed(lista);

  const eliminar = () => {
    if (!window.confirm(`¿Eliminar «${cancion.titulo}»? No se puede deshacer.`)) return;
    iniciarEliminar(() => {
      void eliminarCancionAction(cancion.id, cancion.bandaId);
    });
  };

  const boton: React.CSSProperties = {
    border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 10, padding: "5px 10px",
    fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  };

  return (
    <div className="flex h-screen flex-col" style={{ background: BG, color: INK }}>
      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-3 px-5 py-2.5" style={{ borderBottom: `1px solid ${LINE}`, background: CARD }}>
        <Link href={volverHref} className="text-sm no-underline" style={{ color: MUTED }}>‹ Canciones</Link>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{cancion.titulo}</h1>
        {cancion.autor && <span style={{ fontSize: 12, color: MUTED }}>{cancion.autor}</span>}
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {tonalidad.raiz} {tonalidad.modo}{cancion.bpm ? ` · ${cancion.bpm} BPM` : ""}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span title="Sube o baja TODA la canción de tono, de medio en medio tono" style={{ fontSize: 11, color: MUTED }}>Cambiar tono</span>
          <button style={boton} onClick={() => setSemi((s) => s - 1)} aria-label="Bajar medio tono" title="Bajar medio tono">−</button>
          <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 22, textAlign: "center" }}>{semi > 0 ? `+${semi}` : semi}</span>
          <button style={boton} onClick={() => setSemi((s) => s + 1)} aria-label="Subir medio tono" title="Subir medio tono">+</button>
          <button style={{ ...boton, background: reproductor ? INK : CARD, color: reproductor ? "white" : INK }} onClick={() => setReproductor((v) => !v)}>♪ Reproductor</button>
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

      {/* Reproductor de Spotify (plegable) */}
      {reproductor && (
        <div className="flex items-center gap-3 px-5 py-2" style={{ borderBottom: `1px solid ${LINE}`, background: CARD }}>
          {embed ? (
            <>
              <iframe title="Spotify" src={embed} width="100%" height="80" style={{ border: 0, borderRadius: 12, maxWidth: 640 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
              <button style={boton} onClick={() => { setLista(""); guardar(PREF_LISTA, ""); }}>Cambiar lista</button>
            </>
          ) : (
            <>
              <input value={borrador} onChange={(e) => setBorrador(e.target.value)} placeholder="Pega aquí la liga de tu lista de Spotify" style={{ ...boton, fontWeight: 500, width: 420, cursor: "text" }} />
              <button
                style={boton}
                onClick={() => {
                  if (urlEmbed(borrador)) {
                    setLista(borrador);
                    guardar(PREF_LISTA, borrador);
                  }
                }}
              >
                Usar lista
              </button>
              <span style={{ fontSize: 11, color: MUTED }}>Spotify → tu lista → Compartir → Copiar enlace.</span>
            </>
          )}
        </div>
      )}

      {/* Línea de tiempo de la canción */}
      <div className="px-5 pb-2 pt-3" style={{ borderBottom: `1px solid ${LINE}`, background: BG }}>
        <div className="relative flex" style={{ height: 38 }}>
          {cancion.secciones.map((s, si) => {
            const ids = indicesPorSeccion[si] ?? [];
            const aqui = actual?.sec === si;
            return (
              <div key={s.id} className="relative flex items-end" style={{ flex: Math.max(ids.length, 1), borderLeft: si === 0 ? "none" : `1px dotted ${MUTED}`, paddingLeft: 3, paddingRight: 3, opacity: aqui ? 1 : 0.85 }}>
                <span style={{ position: "absolute", top: -2, right: 4, fontFamily: MONO, fontSize: 9, color: aqui ? INK : MUTED, fontWeight: aqui ? 700 : 400, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.nombre}</span>
                <div className="flex w-full items-end gap-px">
                  {ids.map((ei) => {
                    const e = eventos[ei];
                    const esActual = ei === actualIdx;
                    return (
                      <button
                        key={ei}
                        onClick={() => setIdx(ei)}
                        title={`${simboloAcorde(e.nota, e.calidad)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
                        style={{ flex: 1, minWidth: 2, height: esActual ? 22 : 12, border: "none", padding: 0, cursor: "pointer", borderRadius: 2, background: colorDe(e.nota, e.calidad), opacity: esActual ? 1 : ei < actualIdx ? 0.45 : 0.9, outline: esActual ? `2px solid ${INK}` : "none", outlineOffset: 1 }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: "250px minmax(0,1fr) 560px" }}>
        {/* Izquierda: acordes con color y formas */}
        <aside className="overflow-y-auto px-2.5 py-3" style={{ borderRight: `1px solid ${LINE}`, background: CARD }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <Titulo>Acordes · {distintos.length}</Titulo>
          </div>
          <div className="flex flex-col gap-2">
            {distintos.map((d) => {
              const k = claveDe(d.nota, d.calidad);
              const activo = actual?.clave === k;
              const vs = variantesDeAcorde(instrumento, afinacion, d.nota, d.calidad);
              const elegida = Math.min(variantes[claveVar(d.nota, d.calidad)] ?? 0, Math.max(vs.length - 1, 0));
              const g = gradoEnTonalidad(d.nota, d.calidad, tonalidad);
              const fondo = colorDe(d.nota, d.calidad);
              const ink = tinta(d.nota, d.calidad);
              const abierto = !!abiertos[`${instrumento}|${k}`];
              return (
                <div key={k} style={{ background: fondo, color: ink, borderRadius: 14, padding: 6, outline: activo ? `3px solid ${CORAL}` : "none", outlineOffset: 1 }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIdx(d.primero)} className="flex flex-1 items-center gap-2 text-left" style={{ background: "transparent", border: "none", cursor: "pointer", color: ink, padding: 0 }}>
                      <div style={{ background: "white", borderRadius: 9, padding: 2, minWidth: 70, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {vs[elegida] ? (
                          <Diagrama forma={vs[elegida]} afinacion={afinacion} mini />
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: 11, color: INK }}>{notasDelAcorde(d.nota, d.calidad).map((p) => NOTAS[p]).join(" ")}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 20, lineHeight: 1.05 }}>{simboloAcorde(d.nota, d.calidad)}</div>
                        <div style={{ fontSize: 10, opacity: 0.9 }}>{g.romano} · {d.veces}×</div>
                      </div>
                    </button>
                    {vs.length > 1 && (
                      <button
                        onClick={() => setAbiertos((a) => ({ ...a, [`${instrumento}|${k}`]: !abierto }))}
                        aria-label="Ver otras formas de tocarlo"
                        title="Otras formas de tocarlo"
                        style={{ background: "rgba(255,255,255,0.25)", border: "none", color: ink, borderRadius: 8, padding: "4px 7px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                      >
                        {abierto ? "▴" : `▾ ${vs.length}`}
                      </button>
                    )}
                  </div>
                  {abierto && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {vs.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => elegirVariante(d.nota, d.calidad, i)}
                          title={f.origen === "catalogo" ? "Forma común" : "Forma sugerida"}
                          style={{ background: "white", borderRadius: 9, border: i === elegida ? `3px solid ${INK}` : "3px solid transparent", padding: 2, cursor: "pointer", display: "flex", justifyContent: "center" }}
                        >
                          <Diagrama forma={f} afinacion={afinacion} mini />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {distintos.length === 0 && <p style={{ fontSize: 12, color: MUTED }}>Esta canción aún no tiene acordes.</p>}
          </div>
        </aside>

        {/* Centro: letra con la palabra subrayada del color del acorde */}
        <main className="overflow-y-auto px-6 py-4">
          <div style={{ columnWidth: 440, columnGap: 40 }}>
            {cancion.secciones.map((s, si) => {
              const conLetra = s.letra.some((l) => l.acordes.length > 0 || l.texto.trim());
              return (
                <div key={s.id} style={{ breakInside: "avoid", marginBottom: 14 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                    <div style={{ flex: 1, borderTop: `1px dotted oklch(0.5 0.044 262 / 0.45)` }} />
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, opacity: 0.75 }}>
                      {s.nombre}{s.repiteVeces > 1 ? ` ×${s.repiteVeces}` : ""}
                    </span>
                  </div>
                  {conLetra ? (
                    s.letra.map((l, li) => {
                      const ids = indicesPorLinea.get(`${si}-${li}`) ?? [];
                      const orden = [...l.acordes].sort((a, b) => a.posicion - b.posicion || a.orden - b.orden);
                      const texto = l.texto;
                      const cortes = [0, ...orden.map((p) => Math.min(p.posicion, texto.length)), texto.length];
                      return (
                        <div key={l.id} style={{ fontSize: 17, lineHeight: 2.05, whiteSpace: "pre-wrap" }}>
                          {cortes.slice(0, -1).map((c, k) => {
                            const trozo = texto.slice(c, cortes[k + 1]);
                            const ei = k > 0 ? ids[k - 1] : undefined;
                            const e = ei !== undefined ? eventos[ei] : null;
                            if (!e) return <span key={k}>{trozo}</span>;
                            const color = colorDe(e.nota, e.calidad);
                            const esActual = ei === actualIdx;
                            const mismo = !!actual && e.clave === actual.clave;
                            return (
                              <span
                                key={k}
                                onClick={() => setIdx(ei!)}
                                title={`${simboloAcorde(e.nota, e.calidad)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
                                style={{
                                  cursor: "pointer",
                                  background: esActual ? `color-mix(in srgb, ${color} 22%, transparent)` : mismo ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
                                  textDecoration: "underline",
                                  textDecorationColor: color,
                                  textDecorationThickness: esActual ? 5 : 3.5,
                                  textUnderlineOffset: 5,
                                  textDecorationSkipInk: "none",
                                  borderRadius: 4,
                                }}
                              >
                                <span style={{ display: "inline-block", fontFamily: MONO, fontWeight: 800, fontSize: 10.5, lineHeight: 1, padding: "2px 4px", marginRight: 3, borderRadius: 4, background: color, color: tinta(e.nota, e.calidad), transform: "translateY(-6px)", textDecoration: "none" }}>
                                  {simboloAcorde(e.nota, e.calidad)}
                                </span>
                                {trozo.length ? trozo : "   "}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-wrap gap-1.5" style={{ padding: "6px 0" }}>
                      {(indicesPorSeccion[si] ?? []).map((ei) => {
                        const e = eventos[ei];
                        return (
                          <button
                            key={ei}
                            onClick={() => setIdx(ei)}
                            style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13, padding: "3px 9px", borderRadius: 7, border: "none", cursor: "pointer", background: colorDe(e.nota, e.calidad), color: tinta(e.nota, e.calidad), outline: ei === actualIdx ? `3px solid ${CORAL}` : "none", outlineOffset: 1 }}
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
          </div>
          {cancion.secciones.length === 0 && <p style={{ color: MUTED }}>Esta canción aún no tiene secciones. Usa Editar para agregarlas.</p>}
        </main>

        {/* Derecha: mástil, todos los acordes y círculo */}
        <aside className="flex flex-col gap-3 overflow-y-auto px-4 py-3" style={{ borderLeft: `1px solid ${LINE}`, background: BG }}>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(INSTRUMENTOS_ESTUDIO) as NombreInstrumento[]).map((k) => (
              <button
                key={k}
                onClick={() => { setInstrumento(k); setAfinId("estandar"); }}
                style={{ ...boton, background: instrumento === k ? INK : CARD, color: instrumento === k ? "white" : INK, borderRadius: 99 }}
              >
                {INSTRUMENTOS_ESTUDIO[k].etiqueta}
              </button>
            ))}
            <select value={afinacion.id} onChange={(e) => setAfinId(e.target.value)} aria-label="Afinación" style={{ ...boton, marginLeft: "auto", fontWeight: 500 }}>
              {afinaciones.map((a) => (
                <option key={a.id} value={a.id}>{a.etiqueta}</option>
              ))}
            </select>
          </div>

          {actual && grado ? (
            <>
              <div style={{ fontSize: 13, lineHeight: 1.35 }}>
                <b style={{ fontFamily: MONO, color: colorDe(actual.nota, actual.calidad) }}>{simboloAcorde(actual.nota, actual.calidad)}</b>{" "}
                es el <b>{grado.romano}</b> de {tonalidad.raiz} {tonalidad.modo}: <span style={{ color: MUTED }}>{grado.sentir}</span>
                {siguiente && <> Sigue <b style={{ fontFamily: MONO }}>{simboloAcorde(siguiente.nota, siguiente.calidad)}</b>.</>}
                {patron && <span style={{ color: MUTED }}> Esta sección usa {patron.romanos.join("–")}: {patron.nombre}.</span>}
              </div>

              <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "10px 12px" }}>
                <div className="flex items-center justify-between">
                  <Titulo>Mástil</Titulo>
                  <label style={{ fontSize: 11, color: MUTED, cursor: "pointer" }}>
                    <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} style={{ marginRight: 4 }} />
                    ver los demás acordes
                  </label>
                </div>
                <Mastil
                  afinacion={afinacion}
                  actual={{ nota: actual.nota, calidad: actual.calidad }}
                  otros={verTodos ? distintos.filter((d) => d.nota !== actual.nota || d.calidad !== actual.calidad) : []}
                />
              </section>

              <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0,1fr) 230px" }}>
                <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "10px 12px" }}>
                  <Titulo>Raíz y grados de cada acorde</Titulo>
                  <div className="flex flex-col gap-1.5">
                    {distintos.map((d) => {
                      const base = colorDe(d.nota, d.calidad);
                      const g = gradoEnTonalidad(d.nota, d.calidad, tonalidad);
                      const t = tonosDelAcorde(d.nota, d.calidad);
                      const piezas = [{ intervalo: "raíz", nota: t.raiz }, ...t.acompanantes.filter((a) => a.intervalo !== "9ª")];
                      const activo = actual.clave === claveDe(d.nota, d.calidad);
                      return (
                        <button
                          key={claveDe(d.nota, d.calidad)}
                          onClick={() => setIdx(d.primero)}
                          className="flex items-center gap-2 text-left"
                          style={{ border: `2px solid ${activo ? CORAL : "transparent"}`, background: BG, borderRadius: 11, padding: "4px 6px", cursor: "pointer" }}
                        >
                          <div style={{ minWidth: 58 }}>
                            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 15, color: base }}>{simboloAcorde(d.nota, d.calidad)}</div>
                            <div style={{ fontSize: 10, color: MUTED }}>{g.romano}</div>
                          </div>
                          <div className="flex flex-1 gap-1">
                            {piezas.map((p, i) => (
                              <div key={i} style={{ flex: 1, textAlign: "center", borderRadius: 7, padding: "3px 0", background: tono(base, i), color: i === 0 ? colorContrasteTexto(base) : INK, fontWeight: 800, fontSize: 12, fontFamily: MONO }}>
                                {p.nota}
                                <div style={{ fontSize: 8, fontWeight: 500, opacity: 0.85 }}>{p.intervalo}</div>
                              </div>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "10px 8px" }}>
                  <Titulo>Círculo de quintas</Titulo>
                  <Circulo
                    tonalidad={tonalidad}
                    usados={usados}
                    actual={posicionEnCirculo(actual.nota, actual.calidad)}
                    siguiente={siguiente ? posicionEnCirculo(siguiente.nota, siguiente.calidad) : null}
                  />
                  <div style={{ fontSize: 10, color: MUTED, lineHeight: 1.35 }}>
                    Azul claro: acordes de {tonalidad.raiz} {tonalidad.modo}. Color: los de esta canción. Contorno oscuro: el actual. Punteado: a dónde vas.
                  </div>
                </section>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: MUTED }}>Cuando la canción tenga acordes, aquí verás el mástil, sus notas y el círculo de quintas.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
