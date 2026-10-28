"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import { eliminarCancionAction } from "@/app/canciones/actions";
import { NOTAS, simboloAcorde, colorRaizAcorde, colorContrasteTexto, tonosDelAcorde, type Calidad, type Nota } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { guardarTiemposAction } from "@/app/canciones/actions";
import { ocurrencias, ocurrenciaPorAnclas, agregarAncla, posicionEstimada, pesosDeSeccion, type Ancla } from "@/lib/estudioSync";
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
function Diagrama({ forma, afinacion, mini = false, capo = 0 }: { forma: Forma; afinacion: Afinacion; mini?: boolean; capo?: number }) {
  const n = afinacion.cuerdas.length;
  const ancho = mini ? 78 : 150;
  const alto = (mini ? 84 : 160) + (capo > 0 ? (mini ? 4 : 6) : 0);
  const izq = mini ? 15 : 24;
  const arriba = (mini ? 15 : 26) + (capo > 0 ? (mini ? 4 : 6) : 0);
  const filas = 5;
  const sx = (ancho - izq * 2) / (n - 1);
  const sy = (alto - arriba - 5) / filas;
  const pisados = forma.trastes.filter((t): t is number => t !== null && t > 0);
  const inicio = pisados.length && Math.max(...pisados) > 4 ? Math.min(...pisados) : 1;
  const yFila = (t: number) => arriba + (t - inicio + 0.5) * sy;
  const r = mini ? 4.7 : 9;
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
      {capo > 0 && (
        <g>
          <rect x={izq - 4} y={arriba - (mini ? 3 : 5)} width={ancho - izq * 2 + 8} height={mini ? 6 : 10} rx={mini ? 3 : 5} fill={CORAL} />
          <text x={1} y={arriba + (mini ? 3 : 4)} fontSize={mini ? 9 : 12} fontWeight={800} fill={CORAL} fontFamily={MONO}>{capo}</text>
          {!mini && <text x={ancho / 2} y={arriba + 3.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="white" fontFamily={MONO}>CAPO</text>}
        </g>
      )}
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
              <text x={x} y={yFila(t) + (mini ? 2.6 : 4)} textAnchor="middle" fontSize={mini ? 7 : 11} fontWeight={700} fill="white" fontFamily={MONO}>
                {forma.dedos[i]}
              </text>
            )}
          </g>
        );
      })}
      {inicio > 1 && (
        <text x={1} y={arriba + sy * 0.7} fontSize={mini ? 9 : 11} fontWeight={700} fill={INK} textAnchor="start" fontFamily={MONO}>{inicio}</text>
      )}
    </svg>
  );
}

// ---- Mástil -----------------------------------------------------------------
// Dibuja las notas de uno o varios acordes. Si dos acordes comparten una nota
// en el mismo lugar, el círculo se parte en gajos de sus colores.
function Mastil({ afinacion, acordes, capo = 0 }: { afinacion: Afinacion; acordes: { nota: Nota; calidad: Calidad }[]; capo?: number }) {
  const trastes = 12;
  const n = afinacion.cuerdas.length;
  const izq = 26;
  const wf = 46;
  const sy = n > 4 ? 26 : 32;
  const alto = 14 + (n - 1) * sy + 26;
  const ancho = izq + trastes * wf + 10;
  const y = (cuerda: number) => 12 + (n - 1 - cuerda) * sy;
  const x = (t: number) => (t === 0 ? izq - 12 : izq + (t - 0.5) * wf);

  const puntos = new Map<string, { cuerda: number; traste: number; nota: Nota; raiz: boolean; colores: string[]; base: string; nivel: number }>();
  acordes.forEach((c) => {
    const base = colorDe(c.nota, c.calidad);
    const clase = notasDelAcorde(c.nota, c.calidad);
    posicionesEnMastil(afinacion, c.nota, c.calidad, trastes).forEach((p) => {
      const k = `${p.cuerda}-${p.traste}`;
      const nivel = Math.max(clase.indexOf(NOTAS.indexOf(p.nota)), 0);
      const colorPunto = tono(base, nivel);
      const previo = puntos.get(k);
      if (previo) {
        if (!previo.colores.includes(colorPunto)) previo.colores.push(colorPunto);
        previo.raiz = previo.raiz || p.esRaiz;
      } else puntos.set(k, { cuerda: p.cuerda, traste: p.traste, nota: p.nota, raiz: p.esRaiz, colores: [colorPunto], base, nivel });
    });
  });

  const gajo = (cx: number, cy: number, r: number, i: number, k: number, color: string) => {
    const a0 = (i * 2 * Math.PI) / k - Math.PI / 2;
    const a1 = ((i + 1) * 2 * Math.PI) / k - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      <path key={i} d={`M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`} fill={color} />
    );
  };

  return (
    <svg width="100%" viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
      {Array.from({ length: trastes + 1 }, (_, i) => (
        <line key={i} x1={izq + i * wf} x2={izq + i * wf} y1={12} y2={12 + (n - 1) * sy} stroke={i === 0 && capo > 0 ? CORAL : INK} strokeWidth={i === 0 ? (capo > 0 ? 8 : 3) : 0.8} opacity={i === 0 ? 1 : 0.5} strokeLinecap="round" />
      ))}
      {capo > 0 && (
        <text x={izq} y={8} textAnchor="middle" fontSize={9} fontWeight={800} fill={CORAL} fontFamily={MONO}>CAPO {capo}</text>
      )}
      {afinacion.cuerdas.map((_, c) => (
        <g key={c}>
          <line x1={izq} x2={izq + trastes * wf} y1={y(c)} y2={y(c)} stroke={INK} strokeWidth={0.9} opacity={0.65} />
          <text x={4} y={y(c) + 3.5} fontSize={10} fill={MUTED} fontFamily={MONO}>{afinacion.nombres[c]}</text>
        </g>
      ))}
      {[3, 5, 7, 9, 12].map((f) => (
        <text key={f} x={izq + (f - 0.5) * wf} y={alto - 4} fontSize={9} textAnchor="middle" fill={MUTED} fontFamily={MONO}>{f + capo}</text>
      ))}
      {[...puntos.values()].map((p, i) => {
        const r = p.raiz ? 12 : 10;
        const cx = x(p.traste);
        const cy = y(p.cuerda);
        return (
          <g key={i}>
            {p.colores.length === 1 ? (
              <circle cx={cx} cy={cy} r={r} fill={p.colores[0]} />
            ) : (
              p.colores.map((col, gi) => gajo(cx, cy, r, gi, p.colores.length, col))
            )}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.raiz ? INK : "white"} strokeWidth={p.raiz ? 2 : 1.5} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={10} fontWeight={800} fontFamily={MONO} fill={p.colores.length === 1 ? colorContrasteTexto(p.colores[0]) : INK} stroke="white" strokeWidth={p.colores.length === 1 ? 0 : 2.5} paintOrder="stroke">
              {p.nota}
            </text>
          </g>
        );
      })}
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
const PREF_REPRO = "malgesto-estudio-reproductor";
const PREF_ADELANTO = "malgesto-estudio-adelanto-";

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

// Controlador del reproductor incrustado de Spotify (API de iFrame).
type ControladorSpotify = {
  loadUri: (uri: string) => void;
  destroy: () => void;
  addListener: (evento: string, cb: (e: { data: { isPaused?: boolean; position?: number; duration?: number; playingURI?: string } }) => void) => void;
};
type ApiSpotify = { createController: (el: HTMLElement, opciones: { uri: string; width: string; height: number }, cb: (c: ControladorSpotify) => void) => void };

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
  const [filtro, setFiltro] = useState<string[]>([]);
  const [reproductor, setReproductor] = useState(true);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [anclas, setAnclas] = useState<Ancla[]>(cancion.tiemposMs ?? []);
  const [grabando, setGrabando] = useState(false);
  // Adelanto (ms): el acorde se marca un poco antes de lo grabado, para compensar lo que tardas en tocar.
  const [adelanto, setAdelanto] = useState(400);
  const [tomas, setTomas] = useState<Ancla[]>([]);
  const tomasRef = useRef<Ancla[]>([]);
  const grabandoRef = useRef(false);
  const finRef = useRef<() => void>(() => undefined);
  const [aviso, setAviso] = useState("");
  const contRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<ControladorSpotify | null>(null);
  const ultimoRef = useRef<{ ms: number; rec: number; pausado: boolean; uri: string | null; dur: number }>({ ms: 0, rec: 0, pausado: true, uri: null, dur: 0 });
  const ocurrRef = useRef(-1);
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
      setReproductor(leer<boolean>(PREF_REPRO, true));
      setAdelanto(leer<number>(PREF_ADELANTO + cancion.id, 400));
      prefsLeidas.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [cancion.id]);
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
  const ocurr = useMemo(() => ocurrencias(indicesPorSeccion, cancion.secciones.map((x) => x.repiteVeces)), [indicesPorSeccion, cancion.secciones]);
  const uriInicialRef = useRef(cancion.spotifyUri);
  // Peso de cada ocurrencia: cuánto texto cubre su acorde (ver pesosDeSeccion).
  const pesos = useMemo(() => {
    const porSeccion = cancion.secciones.map((s) => {
      const conLetra = s.letra.some((l) => l.acordes.length > 0);
      return pesosDeSeccion(
        conLetra ? s.letra.map((l) => ({ largo: l.texto.length, posiciones: l.acordes.map((a) => a.posicion) })) : [],
        s.acordes.length
      );
    });
    return ocurr.map((o) => {
      const idxEnSeccion = indicesPorSeccion[o.seccion].indexOf(o.evento);
      return porSeccion[o.seccion][idxEnSeccion] ?? 24;
    });
  }, [ocurr, indicesPorSeccion, cancion.secciones]);
  const actualIdx = Math.min(idx, Math.max(total - 1, 0));
  const actual = eventos[actualIdx] ?? null;
  const siguiente = eventos[actualIdx + 1] ?? null;

  // Elegir un acorde de la canción: se mueve el marcador y el mástil se filtra a ese acorde.
  const elegir = (i: number) => {
    const ev = eventos[i];
    if (!ev) return;
    setIdx(i);
    setFiltro([ev.clave]);
    afinar(i);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const nuevo = Math.min(Math.max(actualIdx + (e.key === "ArrowRight" ? 1 : -1), 0), total - 1);
      const ev = eventos[nuevo];
      if (!ev) return;
      setIdx(nuevo);
      setFiltro([ev.clave]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, actualIdx, eventos]);

  // Reproductor incrustado de Spotify (se crea una vez y se reutiliza).
  useEffect(() => {
    const cont = contRef.current;
    const uri = uriInicialRef.current;
    if (!cont || !uri) return;
    let cancelado = false;
    const crear = (api: ApiSpotify) => {
      if (cancelado || !contRef.current) return;
      const el = document.createElement("div");
      contRef.current.innerHTML = "";
      contRef.current.appendChild(el);
      api.createController(el, { uri, width: "100%", height: 152 }, (c) => {
        if (cancelado) {
          c.destroy();
          return;
        }
        ctrlRef.current = c;
        c.addListener("playback_update", (e) => {
          const d = e.data ?? {};
          ultimoRef.current = { ms: d.position ?? 0, rec: performance.now(), pausado: d.isPaused ?? true, uri: d.playingURI ?? null, dur: d.duration ?? 0 };
          setReproduciendo(!(d.isPaused ?? true));
          if (grabandoRef.current && (d.duration ?? 0) > 0 && (d.position ?? 0) >= (d.duration ?? 0) - 1000) finRef.current();
        });
      });
    };
    const w = window as unknown as { __spotifyApi?: ApiSpotify; onSpotifyIframeApiReady?: (api: ApiSpotify) => void };
    if (w.__spotifyApi) crear(w.__spotifyApi);
    else {
      const previo = w.onSpotifyIframeApiReady;
      w.onSpotifyIframeApiReady = (api) => {
        w.__spotifyApi = api;
        crear(api);
        previo?.(api);
      };
      if (!document.getElementById("spotify-iframe-api")) {
        const sc = document.createElement("script");
        sc.id = "spotify-iframe-api";
        sc.src = "https://open.spotify.com/embed/iframe-api/v1";
        sc.async = true;
        document.body.appendChild(sc);
      }
    }
    return () => {
      cancelado = true;
      try {
        ctrlRef.current?.destroy();
      } catch {
        /* ya destruido */
      }
      ctrlRef.current = null;
    };
  }, []);

  const posicionAhora = () => {
    const u = ultimoRef.current;
    return posicionEstimada(u.ms, u.rec, performance.now(), u.pausado);
  };
  // ¿Lo que suena es esta canción? Si Spotify no dice cuál suena, se asume que sí cuando se cargó "esta canción".
  const suenaEsta = () => {
    const u = ultimoRef.current;
    return u.uri ? u.uri === cancion.spotifyUri : !!cancion.spotifyUri;
  };

  // Seguir la canción: arranca solo cuando le das play en Spotify. Sin ajustes, el
  // reparto es parejo de 0 a la duración; cada clic sobre el acorde que estás
  // oyendo agrega un ancla y lo afina.
  useEffect(() => {
    if (ocurr.length === 0 || grabando) return;
    const id = setInterval(() => {
      const u = ultimoRef.current;
      if (u.pausado || !suenaEsta()) return;
      const k = ocurrenciaPorAnclas(anclas, posicionAhora() + adelanto, ocurr.length, u.dur, pesos);
      if (k < 0 || k === ocurrRef.current) return;
      ocurrRef.current = k;
      const ev = ocurr[k].evento;
      if (!eventos[ev]) return;
      setIdx(ev);
      setFiltro([eventos[ev].clave]);
      document.querySelector(`[data-ev="${ev}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anclas, ocurr, eventos, pesos, grabando, adelanto]);

  // Al tocar un acorde mientras suena la canción: "este es el que oigo ahora".
  const afinar = (evento: number) => {
    const u = ultimoRef.current;
    if (u.pausado || !suenaEsta()) return;
    const candidatas = ocurr.map((o, k) => ({ o, k })).filter((x) => x.o.evento === evento);
    if (candidatas.length === 0) return;
    const ref = ocurrRef.current >= 0 ? ocurrRef.current : 0;
    const k = candidatas.reduce((m, x) => (Math.abs(x.k - ref) < Math.abs(m.k - ref) ? x : m)).k;
    const nuevas = agregarAncla(anclas, [k, Math.max(0, Math.round(posicionAhora()))]);
    ocurrRef.current = k;
    setAnclas(nuevas);
    if (puedeEditar) void guardarTiemposAction(cancion.id, cancion.bandaId, nuevas).catch(() => setAviso("No se pudo guardar el ajuste."));
  };

  // Grabar los tiempos: dale play y toca (clic, ESPACIO o ENTER) justo cuando EMPIECE
  // el acorde que se muestra. Cada toque queda como ancla y el seguimiento se vuelve exacto.
  const irA = (k: number) => {
    const ev = ocurr[k]?.evento;
    if (ev === undefined || !eventos[ev]) return;
    setIdx(ev);
    setFiltro([eventos[ev].clave]);
    document.querySelector(`[data-ev="${ev}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const empezarGrabado = () => {
    if (!cancion.spotifyUri || ocurr.length === 0) {
      setAviso("Primero pega la liga de la canción de Spotify en Editar.");
      return;
    }
    tomasRef.current = [];
    setTomas([]);
    grabandoRef.current = true;
    setGrabando(true);
    setAviso("");
    irA(0);
  };

  const terminarGrabado = (guardarTomas: boolean) => {
    grabandoRef.current = false;
    setGrabando(false);
    const t = tomasRef.current;
    if (!guardarTomas) {
      setAviso("Grabación cancelada; se conserva lo anterior.");
      return;
    }
    if (t.length === 0) {
      setAviso("No se grabó ningún acorde.");
      return;
    }
    setAnclas(t);
    ocurrRef.current = -1;
    if (puedeEditar) {
      setAviso("Guardando…");
      void guardarTiemposAction(cancion.id, cancion.bandaId, t)
        .then(() => setAviso(`Listo: ${t.length} de ${ocurr.length} acordes grabados. Dale play y te sigue.`))
        .catch(() => setAviso("No se pudo guardar la grabación."));
    } else setAviso(`Grabados ${t.length} de ${ocurr.length} acordes (sin guardar: solo quien edita guarda).`);
  };
  useEffect(() => {
    finRef.current = () => terminarGrabado(true);
  });

  const tocar = () => {
    const u = ultimoRef.current;
    if (u.pausado) {
      setAviso("Dale play a la canción en Spotify y toca de nuevo.");
      return;
    }
    const k = tomasRef.current.length;
    if (k >= ocurr.length) return;
    const previo = tomasRef.current[k - 1];
    const t = Math.max(0, Math.round(posicionAhora()));
    tomasRef.current = [...tomasRef.current, [k, previo ? Math.max(t, previo[1] + 50) : t]];
    setTomas(tomasRef.current);
    setAviso("");
    if (k + 1 >= ocurr.length) terminarGrabado(true);
    else irA(k + 1);
  };

  const deshacerToma = () => {
    if (tomasRef.current.length === 0) return;
    tomasRef.current = tomasRef.current.slice(0, -1);
    setTomas(tomasRef.current);
    irA(tomasRef.current.length);
  };

  const cancelarGrabado = () => {
    if (tomasRef.current.length > 0 && !window.confirm(`Llevas ${tomasRef.current.length} acordes grabados. ¿Cancelar y descartarlos?`)) return;
    terminarGrabado(false);
  };

  // Teclado mientras se graba; el reproductor de Spotify se queda con el foco al darle play,
  // así que se lo quitamos para que ESPACIO, ENTER y Esc lleguen a la página.
  useEffect(() => {
    if (!grabando) return;
    const quitaFoco = setInterval(() => {
      if (document.activeElement instanceof HTMLIFrameElement) document.activeElement.blur();
    }, 200);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tocar();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        deshacerToma();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelarGrabado();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(quitaFoco);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabando, ocurr, eventos]);

  const borrarAjustes = () => {
    setAnclas([]);
    ocurrRef.current = -1;
    if (puedeEditar) void guardarTiemposAction(cancion.id, cancion.bandaId, null).catch(() => undefined);
    setAviso("Ajustes borrados.");
  };

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
    <div className="flex min-h-screen flex-col xl:h-screen" style={{ background: BG, color: INK }}>
      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-3 px-5 py-2.5" style={{ borderBottom: `1px solid ${LINE}`, background: CARD }}>
        <Link href={volverHref} className="text-sm no-underline" style={{ color: MUTED }}>‹ Canciones</Link>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{cancion.titulo}</h1>
        {cancion.autor && <span style={{ fontSize: 12, color: MUTED }}>{cancion.autor}</span>}
        <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>
          {tonalidad.raiz} {tonalidad.modo}{cancion.capo > 0 ? ` · suena ${transponerNota(tonalidad.raiz, cancion.capo)}` : ""}
        </span>
        {[
          { etiqueta: "Capo", valor: cancion.capo > 0 ? String(cancion.capo) : "—" },
          { etiqueta: "BPM", valor: cancion.bpm ? String(cancion.bpm) : "—" },
          { etiqueta: "Duración", valor: cancion.duracionSegundos ? formatoMMSS(cancion.duracionSegundos) : "—" },
        ].map((c) => (
          <div key={c.etiqueta} title={c.valor === "—" ? "Sin dato todavía: se llena en Editar" : c.etiqueta} style={{ border: `1px solid ${LINE}`, borderRadius: 9, padding: "2px 10px", background: BG, lineHeight: 1.1 }}>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{c.etiqueta}</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800 }}>{c.valor}</div>
          </div>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span title="Sube o baja TODA la canción de tono, de medio en medio tono" style={{ fontSize: 11, color: MUTED }}>Cambiar tono</span>
          <button style={boton} onClick={() => setSemi((s) => s - 1)} aria-label="Bajar medio tono" title="Bajar medio tono">−</button>
          <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 22, textAlign: "center" }}>{semi > 0 ? `+${semi}` : semi}</span>
          <button style={boton} onClick={() => setSemi((s) => s + 1)} aria-label="Subir medio tono" title="Subir medio tono">+</button>
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

      {/* Línea de tiempo de la canción: franja oscura para distinguirla de la página */}
      <div className="px-5 pb-2.5 pt-3" style={{ background: INK }}>
        <div className="relative flex" style={{ height: 38 }}>
          {cancion.secciones.map((s, si) => {
            const ids = indicesPorSeccion[si] ?? [];
            const aqui = actual?.sec === si;
            return (
              <div key={s.id} className="relative flex items-end" style={{ flex: Math.max(ids.length, 1), borderLeft: si === 0 ? "none" : "1px dotted oklch(0.85 0.02 262 / 0.6)", paddingLeft: 3, paddingRight: 3 }}>
                <span style={{ position: "absolute", top: -2, right: 4, fontFamily: MONO, fontSize: 9, color: aqui ? "white" : "oklch(0.8 0.02 262)", fontWeight: aqui ? 700 : 400, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.nombre}</span>
                <div className="flex w-full items-end gap-px">
                  {ids.map((ei) => {
                    const e = eventos[ei];
                    const esActual = ei === actualIdx;
                    return (
                      <button
                        key={ei}
                        onClick={() => elegir(ei)}
                        title={`${simboloAcorde(e.nota, e.calidad)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
                        style={{ flex: 1, minWidth: 2, height: esActual ? 24 : 12, border: "none", padding: 0, cursor: "pointer", borderRadius: 2, background: colorDe(e.nota, e.calidad), opacity: esActual ? 1 : ei < actualIdx ? 0.45 : 0.95, outline: esActual ? "2px solid white" : "none", outlineOffset: 1 }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)_560px]">
        {/* Izquierda: acordes con color y formas */}
        <aside className="order-2 flex min-h-0 flex-col xl:order-1" style={{ borderRight: `1px solid ${LINE}`, background: CARD }}>
         <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <Titulo>Acordes · {distintos.length}</Titulo>
            {filtro.length > 0 && (
              <button onClick={() => setFiltro([])} style={{ fontSize: 10, color: MUTED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginBottom: 6 }}>
                quitar selección
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {distintos.map((d) => {
              const k = claveDe(d.nota, d.calidad);
              const activo = filtro.includes(k);
              const vs = variantesDeAcorde(instrumento, afinacion, d.nota, d.calidad);
              const elegida = Math.min(variantes[claveVar(d.nota, d.calidad)] ?? 0, Math.max(vs.length - 1, 0));
              const g = gradoEnTonalidad(d.nota, d.calidad, tonalidad);
              const fondo = colorDe(d.nota, d.calidad);
              const ink = tinta(d.nota, d.calidad);
              const abierto = !!abiertos[`${instrumento}|${k}`];
              return (
                <div key={k} style={{ gridColumn: abierto ? "1 / -1" : undefined, background: fondo, color: ink, borderRadius: 13, padding: 5, outline: activo ? `3px solid ${CORAL}` : "none", outlineOffset: 1, opacity: filtro.length && !activo ? 0.6 : 1 }}>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setFiltro((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
                        if (!activo) setIdx(d.primero);
                      }}
                      className="flex w-full flex-col items-center gap-1"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: ink, padding: 0 }}
                    >
                      <div style={{ background: "white", borderRadius: 9, padding: 2, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 50, width: "100%" }}>
                        {vs[elegida] ? (
                          <Diagrama forma={vs[elegida]} afinacion={afinacion} mini capo={cancion.capo} />
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: 11, color: INK }}>{notasDelAcorde(d.nota, d.calidad).map((p) => NOTAS[p]).join(" ")}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5" style={{ alignSelf: "flex-start", paddingLeft: 3, minHeight: 20 }}>
                        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{simboloAcorde(d.nota, d.calidad)}</span>
                        <span style={{ fontSize: 10, opacity: 0.9 }}>{g.romano} · {d.veces}×</span>
                      </div>
                    </button>
                    {vs.length > 1 && (
                      <button
                        onClick={() => setAbiertos((a) => ({ ...a, [`${instrumento}|${k}`]: !abierto }))}
                        aria-label="Ver otras formas de tocarlo"
                        title="Otras formas de tocarlo"
                        style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(255,255,255,0.3)", border: "none", color: ink, borderRadius: 7, padding: "1px 6px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                      >
                        {abierto ? "▴" : `▾${vs.length}`}
                      </button>
                    )}
                  </div>
                  {abierto && (
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {vs.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => elegirVariante(d.nota, d.calidad, i)}
                          title={f.origen === "catalogo" ? "Forma común" : "Forma sugerida"}
                          style={{ background: "white", borderRadius: 8, border: i === elegida ? `3px solid ${INK}` : "3px solid transparent", padding: 1, cursor: "pointer", display: "flex", justifyContent: "center" }}
                        >
                          <Diagrama forma={f} afinacion={afinacion} mini capo={cancion.capo} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {distintos.length === 0 && <p style={{ fontSize: 12, color: MUTED }}>Esta canción aún no tiene acordes.</p>}
          </div>
         </div>

        </aside>

        {/* Centro: letra con la palabra subrayada del color del acorde */}
        <main className="order-1 overflow-y-auto px-6 py-4 xl:order-2">
          <div style={{ columnWidth: 430, columnGap: 64, columnRule: "1px dotted oklch(0.5 0.044 262 / 0.35)" }}>
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
                            // Antes del primer acorde de la línea sigue sonando el anterior.
                            const ei = k > 0 ? ids[k - 1] : trozo.length > 0 && ids.length > 0 && ids[0] > 0 ? ids[0] - 1 : undefined;
                            const e = ei !== undefined ? eventos[ei] : null;
                            if (!e) return <span key={k}>{trozo}</span>;
                            const heredado = k === 0;
                            const color = colorDe(e.nota, e.calidad);
                            const esActual = ei === actualIdx;
                            const mismo = !!actual && e.clave === actual.clave;
                            return (
                              <span
                                key={k}
                                data-ev={heredado ? undefined : ei}
                                onClick={() => elegir(ei!)}
                                title={`${simboloAcorde(e.nota, e.calidad)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
                                style={{
                                  position: "relative",
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
                                {esActual && !heredado && (
                                  <span style={{ position: "absolute", left: 0, top: -9, fontFamily: MONO, fontWeight: 800, fontSize: 10.5, lineHeight: 1, padding: "2px 4px", borderRadius: 4, background: color, color: tinta(e.nota, e.calidad), textDecoration: "none", pointerEvents: "none", whiteSpace: "nowrap" }}>
                                    {simboloAcorde(e.nota, e.calidad)}
                                  </span>
                                )}
                                {trozo.length ? trozo : "\u00A0\u00A0\u00A0"}
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
                            data-ev={ei}
                            onClick={() => elegir(ei)}
                            style={{ fontFamily: MONO, fontWeight: 800, fontSize: 10.5, lineHeight: 1, padding: "3px 6px", borderRadius: 4, border: "none", cursor: "pointer", background: colorDe(e.nota, e.calidad), color: tinta(e.nota, e.calidad), outline: ei === actualIdx ? `3px solid ${CORAL}` : "none", outlineOffset: 1 }}
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
        <aside className="order-3 flex min-h-0 flex-col" style={{ borderLeft: `1px solid ${LINE}`, background: BG }}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
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
                  <Titulo>Mástil · {filtro.length ? filtro.map((k) => k.replace("|", "").replace("mayor", "").replace("menor", "m")).join(", ") : "todas las notas de la canción"}</Titulo>
                  {filtro.length > 0 && (
                    <button onClick={() => setFiltro([])} style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginBottom: 6 }}>
                      ver todas
                    </button>
                  )}
                </div>
                <Mastil capo={cancion.capo} afinacion={afinacion} acordes={(filtro.length ? distintos.filter((d) => filtro.includes(claveDe(d.nota, d.calidad))) : distintos).map((d) => ({ nota: d.nota, calidad: d.calidad }))} />
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
          </div>

          {/* Abajo y siempre a la vista: la grabación y Spotify */}
          <div className="flex-none flex flex-col gap-3 px-4 pb-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          {grabando && (
            <div style={{ background: INK, color: "white", borderRadius: 16, padding: "12px 14px" }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.8 }}>● Grabando los tiempos</div>
              <div style={{ fontSize: 13, margin: "4px 0 8px" }}>Dale play y toca justo cuando <b>empiece</b> este acorde:</div>
              <div className="flex items-center gap-3">
                {ocurr[tomas.length] && eventos[ocurr[tomas.length].evento] && (
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, lineHeight: 1, padding: "6px 14px", borderRadius: 12, background: colorDe(eventos[ocurr[tomas.length].evento].nota, eventos[ocurr[tomas.length].evento].calidad), color: tinta(eventos[ocurr[tomas.length].evento].nota, eventos[ocurr[tomas.length].evento].calidad) }}>
                    {simboloAcorde(eventos[ocurr[tomas.length].evento].nota, eventos[ocurr[tomas.length].evento].calidad)}
                  </span>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 13 }}>{tomas.length + 1} de {ocurr.length}</div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, marginTop: 4 }}>
                    <div style={{ height: 6, borderRadius: 3, background: CORAL, width: `${(tomas.length / Math.max(ocurr.length, 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
              <button onClick={tocar} style={{ width: "100%", marginTop: 10, padding: "14px 0", borderRadius: 12, border: "none", background: CORAL, color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                TOCA AQUÍ cuando cambie el acorde
              </button>
              <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8 }}>
                <button onClick={deshacerToma} disabled={tomas.length === 0} style={{ ...boton, background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.4)" }}>↶ Deshacer</button>
                <button onClick={() => terminarGrabado(true)} disabled={tomas.length === 0} style={{ ...boton, background: "white" }}>Terminar y guardar</button>
                <button onClick={cancelarGrabado} style={{ ...boton, background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.4)" }}>Cancelar</button>
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8, lineHeight: 1.4 }}>
                También funciona ESPACIO o ENTER; ⌫ deshace y Esc cancela. Si te saltas acordes, toca igual: puedes terminar cuando quieras y lo que falte se estima.
              </div>
            </div>
          )}

          {/* Spotify de esta canción; se minimiza si estorba y la música sigue */}
          <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "8px 10px" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: reproductor ? 6 : 0 }}>
              <Titulo>♪ Spotify</Titulo>
              <span className="flex items-center gap-2">
              {puedeEditar && cancion.spotifyUri && !grabando && (
                <button onClick={empezarGrabado} style={{ ...boton, padding: "1px 9px", fontSize: 11, color: CORAL, borderColor: CORAL, marginBottom: 6 }}>
                  ● {anclas.length > 0 ? "Volver a grabar" : "Grabar tiempos"}
                </button>
              )}
              <button
                onClick={() => {
                  setReproductor((v) => {
                    guardar(PREF_REPRO, !v);
                    return !v;
                  });
                }}
                aria-label={reproductor ? "Minimizar" : "Mostrar"}
                title={reproductor ? "Minimizar (la música sigue)" : "Mostrar"}
                style={{ ...boton, padding: "0 7px", fontSize: 12, lineHeight: "18px", marginBottom: 6 }}
              >
                {reproductor ? "—" : "▢"}
              </button>
              </span>
            </div>
            <div ref={contRef} style={{ display: reproductor && cancion.spotifyUri ? "block" : "none", minHeight: 152 }} />
            {cancion.spotifyUri ? (
              <div style={{ marginTop: 6, fontSize: 11, color: MUTED, lineHeight: 1.35 }}>
                {reproduciendo ? "● Siguiendo la canción. " : "Dale play y te sigue. "}
                Si se adelanta o se atrasa, toca el acorde que estás oyendo y se ajusta.
                <span className="flex items-center gap-2" style={{ marginTop: 6 }}>
                  <span>Sincronía: si la letra va <b>atrás</b> de la canción, sube el adelanto.</span>
                  <button
                    onClick={() => {
                      const n = Math.max(-2000, adelanto - 100);
                      setAdelanto(n);
                      guardar(PREF_ADELANTO + cancion.id, n);
                    }}
                    style={{ ...boton, padding: "0 8px" }}
                    aria-label="Menos adelanto"
                  >
                    −
                  </button>
                  <b style={{ fontFamily: MONO, minWidth: 44, textAlign: "center" }}>{(adelanto / 1000).toFixed(1)} s</b>
                  <button
                    onClick={() => {
                      const n = Math.min(3000, adelanto + 100);
                      setAdelanto(n);
                      guardar(PREF_ADELANTO + cancion.id, n);
                    }}
                    style={{ ...boton, padding: "0 8px" }}
                    aria-label="Más adelanto"
                  >
                    +
                  </button>
                </span>
                {anclas.length > 0 && (
                  <>
                    {" "}({anclas.length} {anclas.length === 1 ? "ajuste" : "ajustes"}){" "}
                    <button onClick={borrarAjustes} style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      borrar
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: MUTED }}>
                Esta canción aún no tiene liga de Spotify.{" "}
                {puedeEditar && (
                  <Link href={`/canciones/${cancion.id}/editar`} style={{ color: CORAL, fontWeight: 700 }}>
                    Pégala en Editar
                  </Link>
                )}
              </p>
            )}
            {aviso && <div style={{ marginTop: 4, fontSize: 11, color: MUTED }}>{aviso}</div>}
          </section>

          </div>
        </aside>
      </div>
    </div>
  );
}
