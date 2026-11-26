"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CancionCompleta } from "@/lib/cancionesData";
import { NOTAS, gradoDeNota, simboloAcorde, colorRaizAcorde, colorContrasteTexto, tonosDelAcorde, type Calidad, type Nota } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { FichaEditor } from "./FichaEditor";
import { compasesDeSeccion, segundosPorCompas } from "@/lib/cancionTiempo";
import { colorPorTipoSeccion, tintaPorTipoSeccion } from "@/lib/seccionCatalogo";
import { PaletaColor } from "./PaletaColor";
import { agruparCiclos } from "@/lib/cancionLetra";
import { ocurrencias, anclasPorTempo, ocurrenciaPorAnclas, posicionEstimada, pesosDeSeccion, type Ancla } from "@/lib/estudioSync";
import {
  INSTRUMENTOS_ESTUDIO,
  variantesDeAcorde,
  inicioDiagrama,
  posicionesEnMastil,
  notasDelAcorde,
  type Afinacion,
  type Forma,
  type NombreInstrumento,
} from "@/lib/estudioInstrumentos";
import { transponerNota, gradoEnTonalidad, etiquetaCirculo, centroTonal } from "@/lib/estudioArmonia";

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
const CHIP = "oklch(0.93 0.010 85)";
const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), serif";
const NUM = "var(--font-dm-sans), sans-serif";

type Evento = { sec: number; linea: number | null; nota: Nota; calidad: Calidad; bajo: Nota | null; clave: string };

const claveDe = (n: Nota, c: Calidad, b?: Nota | null) => (b && b !== n ? `${n}|${c}|${b}` : `${n}|${c}`);
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

// Secciones listas para calcular tiempos por tempo: compases de una vuelta, segundos por compás y peso de cada acorde
// (su duración en compases; en secciones con letra, el texto que cubre).
function seccionesPorTempo(cancion: CancionCompleta) {
  return cancion.secciones.map((s) => {
    const bpm = s.bpm ?? cancion.bpm ?? 0;
    const acordes = [...s.acordes].sort((a, b) => a.orden - b.orden);
    const delTiempo = acordes.map((a) => Math.max(Number(a.duracionCompases) || 1, 0.0001));
    const omitir = acordes.map((a) => !!a.silencio);
    const reales = omitir.filter((x) => !x).length;
    const conLetra = s.letra.some((l) => l.acordes.length > 0);
    const enLetra = s.letra.reduce((n, l) => n + l.acordes.length, 0);
    // Con letra, si los acordes de la parte coinciden uno a uno con los de la letra, cada acorde dura lo que se
    // capturó (compases); si no coinciden, se reparte por el texto que cubre cada acorde.
    const porDuracion = !conLetra || (reales === enLetra && reales > 0);
    const pesos = porDuracion
      ? delTiempo
      : pesosDeSeccion(s.letra.map((l) => ({ largo: l.tipo === "tab" ? 0 : l.texto.length, posiciones: l.acordes.map((a) => a.posicion) })), 0);
    return { vueltas: s.repiteVeces, compases: compasesDeSeccion(s), segundosPorCompas: segundosPorCompas(bpm), pesos, omitir: porDuracion ? omitir : undefined };
  });
}

// ---- Diagrama de acorde (con dedos y cejilla) --------------------------------
function Diagrama({
  forma,
  afinacion,
  mini = false,
  capo = 0,
  tam,
  acorde,
  raizResaltada,
}: {
  forma: Forma;
  afinacion: Afinacion;
  mini?: boolean;
  capo?: number;
  tam?: number;
  // Con acorde, cada dedo se pinta con el color de su nota (como el mástil) y lleva su nombre.
  acorde?: { nota: Nota; calidad: Calidad };
  // Bajo: la nota que se toca (la raíz) se agranda y las demás quedan tenues.
  raizResaltada?: Nota | null;
}) {
  const n = afinacion.cuerdas.length;
  const raizPc = raizResaltada ? NOTAS.indexOf(raizResaltada) : -1;
  const ancho = mini ? 78 : 150;
  const alto = (mini ? 84 : 160) + (capo > 0 ? (mini ? 7 : 14) : 0);
  const izq = mini ? 15 : 24;
  const arriba = (mini ? 15 : 26) + (capo > 0 ? (mini ? 7 : 14) : 0);
  // Marcas de cuerda al aire / apagada: sobre la barra del capo si la hay.
  const yMarca = capo > 0 ? arriba - (mini ? 10 : 15) : arriba - (mini ? 5 : 8);
  const filas = 5;
  const sx = (ancho - izq * 2) / (n - 1);
  const sy = (alto - arriba - 5) / filas;
  const pisados = forma.trastes.filter((t): t is number => t !== null && t > 0);
  // El diagrama tiene 5 trastes de alto: solo se desplaza si la forma pasa del quinto traste (con cuerdas al aire siempre empieza en la cejilla).
  const inicio = inicioDiagrama(forma.trastes);
  const yFila = (t: number) => arriba + (t - inicio + 0.5) * sy;
  const r = mini ? 4.7 : 9;
  const colorBase = acorde ? colorDe(acorde.nota, acorde.calidad) : null;
  const clase = acorde ? notasDelAcorde(acorde.nota, acorde.calidad) : null;
  return (
    <svg width={tam ?? ancho} height={tam ? (tam * alto) / ancho : alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden style={{ display: "block", transition: "width .25s, height .25s" }}>
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
          fill={colorBase ?? INK}
        />
      )}
      {forma.trastes.map((t, i) => {
        const x = izq + i * sx;
        if (t === null) return <text key={i} x={x} y={yMarca + 4} textAnchor="middle" fontSize={mini ? 9 : 12} fill={MUTED}>×</text>;
        const pc = (afinacion.cuerdas[i] + t) % 12;
        const nivel = clase ? Math.max(clase.indexOf(pc), 0) : 0;
        const colorDedo = colorBase ? tono(colorBase, nivel) : INK;
        const esRaiz = raizPc >= 0 && pc === raizPc;
        // Bajo: la raíz grande; la quinta (fácil de ubicar) más suave; las demás notas, que son las que enseñan armonía, bien visibles.
        const grado = acorde && raizPc >= 0 ? gradoDeNota(acorde.nota, acorde.calidad, NOTAS[pc]) : "";
        const etiquetaNota = grado || NOTAS[pc];
        const tenue = raizPc >= 0 && !esRaiz ? (grado === "5" ? 0.5 : 0.9) : 1;
        const rd = raizPc >= 0 ? (esRaiz ? r * 1.25 : r * 0.7) : r;
        const tintaDedo = colorBase ? colorContrasteTexto(colorDedo) : "white";
        if (t === 0)
          return colorBase ? (
            <g key={i}>
              <circle cx={x} cy={yMarca} r={(mini ? 3.4 : 7) * (raizPc >= 0 ? (esRaiz ? 1.3 : 0.75) : 1)} fill={colorDedo} stroke={INK} strokeWidth={esRaiz ? 2.2 : 1} opacity={tenue} />
              {!mini && <text x={x} y={yMarca + 3} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={tintaDedo} fontFamily={MONO}>{etiquetaNota}</text>}
            </g>
          ) : (
            <circle key={i} cx={x} cy={yMarca} r={mini ? 2.8 : 4.5} fill="none" stroke={INK} strokeWidth={1.2} />
          );
        const enBarre = forma.barre && t === forma.barre.traste && i >= forma.barre.desde && i <= forma.barre.hasta;
        const conNota = !!colorBase && !mini;
        return (
          <g key={i}>
            {(!enBarre || colorBase) && <circle cx={x} cy={yFila(t)} r={rd} fill={colorDedo} stroke={colorBase ? INK : "none"} strokeWidth={colorBase ? (esRaiz ? 2.6 : 1.2) : 0} opacity={tenue} />}
            {conNota && (
              <text x={x} y={yFila(t) + 3.6} textAnchor="middle" fontSize={11} fontWeight={800} fill={tintaDedo} fontFamily={MONO}>{etiquetaNota}</text>
            )}
            {forma.dedos[i] !== null && !(enBarre && i !== forma.barre!.desde && !colorBase) && (
              conNota ? (
                <text x={x + r * 0.85} y={yFila(t) + r + 3} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={INK} fontFamily={MONO}>{forma.dedos[i]}</text>
              ) : (
                <text x={x} y={yFila(t) + (mini ? 2.6 : 4)} textAnchor="middle" fontSize={mini ? 7 : 11} fontWeight={700} fill={tintaDedo} fontFamily={MONO}>
                  {forma.dedos[i]}
                </text>
              )
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
// Se conserva para reusarlo en otra vista (ya no está en el panel derecho del Estudio).
export function Mastil({ afinacion, acordes, capo = 0, soloRaiz = false }: { afinacion: Afinacion; acordes: { nota: Nota; calidad: Calidad }[]; capo?: number; soloRaiz?: boolean }) {
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
        const r = soloRaiz ? (p.raiz ? 14 : 6.5) : p.raiz ? 12 : 10;
        const cx = x(p.traste);
        const cy = y(p.cuerda);
        return (
          <g key={i} opacity={soloRaiz && !p.raiz ? 0.4 : 1}>
            {p.colores.length === 1 ? (
              <circle cx={cx} cy={cy} r={r} fill={p.colores[0]} />
            ) : (
              p.colores.map((col, gi) => gajo(cx, cy, r, gi, p.colores.length, col))
            )}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.raiz ? INK : "white"} strokeWidth={p.raiz ? (soloRaiz ? 3 : 2) : 1.5} />
            {!(soloRaiz && !p.raiz) && <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={10} fontWeight={800} fontFamily={MONO} fill={p.colores.length === 1 ? colorContrasteTexto(p.colores[0]) : INK} stroke="white" strokeWidth={p.colores.length === 1 ? 0 : 2.5} paintOrder="stroke">
              {p.nota}
            </text>}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Círculo de quintas -------------------------------------------------------
// Se conserva para reusarlo en otra vista (ya no está en el panel derecho del Estudio).
export function Circulo({
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
// Anchos posibles de cada recuadro de acorde (de grande a chico); el Estudio elige el mayor con el que caben todos.
const LADOS_ACORDE = [184, 160, 140, 122, 108, 96, 84, 74];
// Alto aproximado de una tarjeta de acorde del panel según su lado.
function altoTarjetaAcorde(l: number): number {
  return 30 + ((l - 22) * 160) / 150 + (l >= 120 ? 22 : 0);
}
const PREF_ADELANTO = "malgesto-estudio-adelanto2-"; // v2 (30/10/26): se descartan los ajustes viejos, hechos contra tiempos que ya se recalcularon

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
  bandaNombre,
}: {
  cancion: CancionCompleta;
  volverHref: string;
  puedeEditar: boolean;
  bandaNombre: string;
}) {
  const [semi, setSemi] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelMedida, setPanelMedida] = useState({ w: 0, h: 0 });
  const [instrumento, setInstrumento] = useState<NombreInstrumento>("guitarra");
  const [afinId, setAfinId] = useState("estandar");
  const [idx, setIdx] = useState(0);
  const [variantes, setVariantes] = useState<Record<string, number>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [filtro, setFiltro] = useState<string[]>([]);
  const [reproduciendo, setReproduciendo] = useState(false);
  // Adelanto (ms): el acorde se marca un poco antes de lo grabado, para compensar lo que tardas en tocar.
  const [adelanto, setAdelanto] = useState(400);
  const [adelantoTxt, setAdelantoTxt] = useState<string | null>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<ControladorSpotify | null>(null);
  const ultimoRef = useRef<{ ms: number; rec: number; pausado: boolean; uri: string | null; dur: number }>({ ms: 0, rec: 0, pausado: true, uri: null, dur: 0 });
  const ocurrRef = useRef(-1);
  const [editando, setEditando] = useState(false);
  const [progresoMs, setProgresoMs] = useState(0);
  const [durSpotifyMs, setDurSpotifyMs] = useState(0);
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
      setAdelanto(leer<number>(PREF_ADELANTO + cancion.id, 400));
      prefsLeidas.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [cancion.id]);
  useEffect(() => {
    if (prefsLeidas.current) guardar(PREF, { instrumento, afinId });
  }, [instrumento, afinId]);

  // Solo la guitarra lleva capo. Bajo y ukelele tocan los acordes tal como suenan (formas de la hoja + capo), sin barra de capo.
  const capoInstr = instrumento === "guitarra" ? cancion.capo : 0;
  const semiEf = semi + (instrumento === "guitarra" ? 0 : cancion.capo);
  const tonalidad = useMemo(() => ({ raiz: transponerNota(cancion.tonalidadNota, semiEf), modo: cancion.tonalidadModo }), [cancion.tonalidadNota, cancion.tonalidadModo, semiEf]);
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
              const nota = transponerNota(a.notaRaiz, semiEf);
              const bajo = a.notaBajo ? transponerNota(a.notaBajo, semiEf) : null;
              ids.push(ev.length);
              porSec[si].push(ev.length);
              ev.push({ sec: si, linea: li, nota, calidad: a.calidad, bajo, clave: claveDe(nota, a.calidad, bajo) });
            });
          porLinea.set(`${si}-${li}`, ids);
        });
      } else {
        [...s.acordes]
          .sort((a, b) => a.orden - b.orden)
          .filter((a) => !a.silencio)
          .forEach((a) => {
            const nota = transponerNota(a.notaRaiz, semiEf);
            const bajo = a.notaBajo ? transponerNota(a.notaBajo, semiEf) : null;
            porSec[si].push(ev.length);
            ev.push({ sec: si, linea: null, nota, calidad: a.calidad, bajo, clave: claveDe(nota, a.calidad, bajo) });
          });
      }
    });
    return { eventos: ev, indicesPorLinea: porLinea, indicesPorSeccion: porSec };
  }, [cancion.secciones, semiEf]);

  const total = eventos.length;
  const ocurr = useMemo(() => ocurrencias(indicesPorSeccion, cancion.secciones.map((x) => x.repiteVeces)), [indicesPorSeccion, cancion.secciones]);
  const uriInicialRef = useRef(cancion.spotifyUri);
  // Peso de cada ocurrencia: cuánto texto cubre su acorde (ver pesosDeSeccion).
  const pesos = useMemo(() => {
    const porSeccion = cancion.secciones.map((s) => {
      const conLetra = s.letra.some((l) => l.acordes.length > 0);
      return pesosDeSeccion(
        conLetra ? s.letra.map((l) => ({ largo: l.tipo === "tab" ? 0 : l.texto.length, posiciones: l.acordes.map((a) => a.posicion) })) : [],
        s.acordes.length
      );
    });
    return ocurr.map((o) => {
      const idxEnSeccion = indicesPorSeccion[o.seccion].indexOf(o.evento);
      return porSeccion[o.seccion][idxEnSeccion] ?? 24;
    });
  }, [ocurr, indicesPorSeccion, cancion.secciones]);
  // El seguimiento sale solo del tempo y los compases capturados: la canción arranca después de lo que sobra
  // entre su duración y la suma de compases, y la Sincronía desplaza todo parejo.
  const anclasAuto = useMemo<Ancla[]>(() => {
    if ((cancion.bpm ?? 0) <= 0 || ocurr.length === 0) return [];
    const secs = seccionesPorTempo(cancion);
    if (secs.some((x) => x.pesos.length > 0 && (x.compases <= 0 || x.segundosPorCompas <= 0))) return [];
    const estructura = secs.reduce((t, x) => t + x.vueltas * x.compases * x.segundosPorCompas, 0);
    const duracion = cancion.duracionSegundos ?? 0;
    const entrada = duracion > 0 ? Math.min(15, Math.max(0, duracion - estructura)) : 0;
    // Si la canción ya tenía tiempos guardados, solo se conserva de ellos el momento en que entra el primer acorde
    // (ya estaba afinado a oído); todo lo demás sale del tempo y los compases.
    const guardada = cancion.tiemposMs?.find((x) => x[0] === 0)?.[1];
    const auto = anclasPorTempo(guardada ?? Math.round(entrada * 1000), secs);
    return auto.length === ocurr.length ? auto : [];
  }, [cancion, ocurr]);
  const anclasSeg = anclasAuto;
  const actualIdx = Math.min(idx, Math.max(total - 1, 0));
  const actual = eventos[actualIdx] ?? null;
  const siguiente = eventos[actualIdx + 1] ?? null;

  // Elegir un acorde de la canción: se mueve el marcador y el mástil se filtra a ese acorde.
  const elegir = (i: number) => {
    const ev = eventos[i];
    if (!ev) return;
    setIdx(i);
    setFiltro([ev.clave]);
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
          setProgresoMs(d.position ?? 0);
          if ((d.duration ?? 0) > 0) setDurSpotifyMs(d.duration ?? 0);
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

  useEffect(() => {
    if (!reproduciendo) return;
    const id = setInterval(() => {
      const u = ultimoRef.current;
      setProgresoMs(posicionEstimada(u.ms, u.rec, performance.now(), u.pausado));
    }, 250);
    return () => clearInterval(id);
  }, [reproduciendo]);

  // La faja de arriba copia el recorrido del editor: cada parte con su fondo y sus acordes del ancho de su duración (en compases).
  // Lo que se repite seguido se muestra una sola vez con su «×N» (así el recorrido no se alarga).
  const faja = useMemo(() => {
    type Tile = { silencio: boolean; dur: number; evs: (number | null)[]; ks: (number | null)[] };
    type Item = { ancho: number; veces: number; x0: number; tiles: Tile[] };
    let k = 0;
    let pos = 0;
    const inicios = new Map<number, number>();
    const partes: { si: number; ancho: number; items: Item[] }[] = [];
    for (let si = 0; si < cancion.secciones.length; si++) {
      const s = cancion.secciones[si];
      const ids = indicesPorSeccion[si] ?? [];
      const acordes = [...s.acordes].sort((x, y) => x.orden - y.orden);
      const reales = acordes.filter((x) => !x.silencio).length;
      const porAcordes = acordes.length > 0 && reales === ids.length;
      const base = porAcordes ? acordes.map((x) => ({ silencio: !!x.silencio, dur: Math.max(Number(x.duracionCompases) || 1, 0.0001) })) : ids.map(() => ({ silencio: false, dur: 1 }));
      // Todas las notas de la parte, vuelta por vuelta.
      const planas: { silencio: boolean; dur: number; ev: number | null; k: number | null; clave: string }[] = [];
      for (let v = 0; v < Math.max(1, s.repiteVeces); v++) {
        let enVuelta = 0;
        for (const t of base) {
          const ev = t.silencio ? null : ids[enVuelta++] ?? null;
          planas.push({ silencio: t.silencio, dur: t.dur, ev, k: t.silencio ? null : k++, clave: t.silencio ? "silencio" : eventos[ev ?? -1]?.clave ?? "?" });
        }
      }
      const filas = agruparCiclos(planas.map((t) => ({ notaRaiz: t.clave as unknown as Nota, calidad: "mayor" as Calidad, notaBajo: null, duracionCompases: t.dur, silencio: t.silencio })));
      const items: Item[] = [];
      const inicioParte = pos;
      for (const it of filas) {
        const veces = it.tipo === "ciclo" ? it.veces : 1;
        const largo = it.tipo === "ciclo" ? it.largo : 1;
        const desde = it.tipo === "ciclo" ? it.inicio : it.i;
        const tiles: Tile[] = [];
        for (let o = 0; o < largo; o++) {
          const ocurr = Array.from({ length: veces }, (_, r) => planas[desde + r * largo + o]);
          tiles.push({ silencio: ocurr[0].silencio, dur: ocurr[0].dur, evs: ocurr.map((x) => x.ev), ks: ocurr.map((x) => x.k) });
        }
        const ancho = tiles.reduce((n, t) => n + t.dur, 0);
        const unCiclo = ancho;
        let antes = 0;
        for (const t of tiles) {
          t.ks.forEach((kk, r) => {
            if (kk !== null) inicios.set(kk, pos + ((r * unCiclo + antes) / (veces * unCiclo)) * ancho);
          });
          antes += t.dur;
        }
        items.push({ ancho, veces, x0: pos, tiles });
        pos += ancho;
      }
      partes.push({ si, ancho: Math.max(pos - inicioParte, 0.0001), items });
    }
    return { partes, total: Math.max(pos, 0.0001), inicios };
  }, [cancion.secciones, indicesPorSeccion, eventos]);

  // Dónde va la barra que crece (0 a 1): sigue los mismos tiempos que el seguimiento de los acordes.
  const xDeTiempo = (ms: number): number => {
    const T = anclasSeg;
    const inicios = faja.inicios;
    if (T.length === 0 || inicios.size === 0) return duracionMs > 0 ? Math.min(1, Math.max(0, ms / duracionMs)) : 0;
    const puntos: [number, number][] = T.filter((a) => inicios.has(a[0])).map((a) => [a[1], inicios.get(a[0]) as number]);
    puntos.push([Math.max(duracionMs, (puntos[puntos.length - 1]?.[0] ?? 0) + 1000), faja.total]);
    if (ms <= puntos[0][0]) return puntos[0][0] > 0 ? Math.max(0, (ms / puntos[0][0]) * (puntos[0][1] / faja.total)) : 0;
    for (let i = 0; i < puntos.length - 1; i++) {
      const [t0, x0] = puntos[i];
      const [t1, x1] = puntos[i + 1];
      if (ms < t1) return (x0 + ((ms - t0) / Math.max(t1 - t0, 1)) * (x1 - x0)) / faja.total;
    }
    return 1;
  };

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
    if (ocurr.length === 0) return;
    const id = setInterval(() => {
      const u = ultimoRef.current;
      if (u.pausado || !suenaEsta()) return;
      const k = ocurrenciaPorAnclas(anclasSeg, posicionAhora() + adelanto, ocurr.length, u.dur, pesos);
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
  }, [anclasSeg, ocurr, eventos, pesos, adelanto]);

  const cambiarAdelanto = (ms: number) => {
    const n = Math.min(15000, Math.max(-15000, ms));
    setAdelanto(n);
    guardar(PREF_ADELANTO + cancion.id, n);
  };

  const distintos = useMemo(() => {
    const m = new Map<string, { nota: Nota; calidad: Calidad; bajo: Nota | null; veces: number; primero: number }>();
    eventos.forEach((e, i) => {
      const x = m.get(e.clave);
      if (x) x.veces += 1;
      else m.set(e.clave, { nota: e.nota, calidad: e.calidad, bajo: e.bajo, veces: 1, primero: i });
    });
    return [...m.values()];
  }, [eventos]);


  // Mide el panel derecho y elige solo el tamaño de los acordes: el mayor con el que caben todos sin desplazarse.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const medir = () => setPanelMedida({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [actual]);
  // Acordes de la canción: hasta 9 van en 3 columnas, hasta 16 en 4 (3×3 y 4×4); el tamaño de cada tarjeta es el mayor con el
  // que caben TODAS las filas a lo alto del panel (sin desplazarse). Con más de 16 se elige el tamaño que quepa.
  const nDistintos = distintos.length;
  const anchoPanel = panelMedida.w;
  const altoPanel = panelMedida.h;
  const disposicion = (() => {
    const gap = 8;
    const util = Math.max(0, anchoPanel - 32 - 24); // menos padding del panel y de la sección
    const alto = Math.max(0, altoPanel - 56); // solo los márgenes del panel y de la sección (ya no hay textos)
    const n = nDistintos;
    const minLado = LADOS_ACORDE[LADOS_ACORDE.length - 1];
    const maxLado = LADOS_ACORDE[0];
    const cols = n <= 9 ? 3 : n <= 16 ? 4 : null;
    if (util === 0 || alto === 0) return { lado: LADOS_ACORDE[3], cols };
    if (cols) {
      const porAncho = Math.max(minLado, Math.min(maxLado, Math.floor((util - gap * (cols - 1)) / cols)));
      const filas = Math.ceil(n / cols);
      for (let l = porAncho; l > minLado; l -= 4) if (filas * (altoTarjetaAcorde(l) + gap) <= alto) return { lado: l, cols };
      return { lado: minLado, cols };
    }
    for (const l of LADOS_ACORDE) {
      const columnas = Math.max(1, Math.floor((util + gap) / (l + gap)));
      if (Math.ceil(n / columnas) * (altoTarjetaAcorde(l) + gap) <= alto) return { lado: l, cols };
    }
    return { lado: minLado, cols };
  })();
  const lado = disposicion.lado;
  const columnasAcordes = disposicion.cols;

  const claveVar = (nota: Nota, calidad: Calidad, bajo?: Nota | null) => `${instrumento}|${afinacion.id}|${claveDe(nota, calidad, bajo)}`;
  // Forma tomada de la hoja de la canción (solo sin transponer: transpuesta ya no sería la misma).
  const formaHoja = (nota: Nota, calidad: Calidad, bajo: Nota | null) => (semiEf === 0 ? cancion.formas?.[`${instrumento}|${afinacion.id}|${simboloAcorde(nota, calidad, bajo)}`] ?? null : null);
  const elegirVariante = (nota: Nota, calidad: Calidad, i: number, bajo?: Nota | null) => {
    const nuevo = { ...variantes, [claveVar(nota, calidad, bajo)]: i };
    setVariantes(nuevo);
    guardar(PREF_VAR, nuevo);
  };

  // Cola: el acorde seleccionado arriba y los que siguen, cada vez más chicos (máx. 5, sin repetir seguidos).
  const cola = useMemo(() => {
    const out: number[] = [];
    for (let i = actualIdx; i < eventos.length && out.length < 5; i++) {
      if (out.length > 0 && eventos[i].clave === eventos[out[out.length - 1]].clave) continue;
      out.push(i);
    }
    return out;
  }, [eventos, actualIdx]);
  const FRACCION_COLA = [0.74, 0.5, 0.4, 0.33, 0.27];
  const [anchoCola, setAnchoCola] = useState(270);
  const colaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = colaRef.current;
    if (!el) return;
    const medir = () => setAnchoCola(Math.max(160, el.clientWidth));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const duracionMs = (cancion.duracionSegundos ?? 0) * 1000 || durSpotifyMs;

  const grado = actual ? gradoEnTonalidad(actual.nota, actual.calidad, tonalidad) : null;

  const boton: React.CSSProperties = {
    border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 10, padding: "5px 10px",
    fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap",
  };


  return (
    <div className="flex min-h-screen flex-col xl:h-screen" style={{ background: BG, color: INK }}>
      {/* Cabecera: volver y nombre | datos de la canción (centrados) | cambiar tono y editar */}
      <header className="px-5 pb-1 pt-2">
        <Link href={volverHref} className="mb-1 flex w-fit items-center no-underline" style={{ fontSize: 12, color: MUTED }}>
          ‹ Canciones
        </Link>
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-4 py-2.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
          <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 1 }}>
              {cancion.esCover ? "Cover" : `Propia${cancion.esBorrador ? " · borrador" : ""}`}
            </div>
            <h1 className="truncate" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1.08 }}>{cancion.titulo}</h1>
            {cancion.autor && <div className="truncate" style={{ fontSize: 12, color: MUTED }}>{cancion.autor}</div>}
          </div>
          {/* En medio, lo propio de la ejecución: instrumento y, debajo, el cambiador de tono */}
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
          {/* Instrumento: tres botones; la afinación solo se pregunta en el bajo (el único con dos). */}
          <div role="group" aria-label="Instrumento" className="flex items-center" style={{ marginRight: 0 }}>
            {(Object.keys(INSTRUMENTOS_ESTUDIO) as NombreInstrumento[]).map((k, n, todos) => {
              const activo = k === instrumento;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => {
                    setInstrumento(k);
                    setAfinId(INSTRUMENTOS_ESTUDIO[k].afinaciones.some((a) => a.id === afinId) ? afinId : INSTRUMENTOS_ESTUDIO[k].afinaciones[0].id);
                  }}
                  style={{
                    ...boton,
                    fontWeight: 600,
                    padding: "2px 9px", fontSize: 11,
                    borderRadius: n === 0 ? "8px 0 0 8px" : n === todos.length - 1 ? "0 8px 8px 0" : 0,
                    marginLeft: n === 0 ? 0 : -1,
                    background: activo ? INK : "white",
                    color: activo ? "white" : INK,
                  }}
                >
                  {INSTRUMENTOS_ESTUDIO[k].etiqueta.replace(" 4", "")}
                </button>
              );
            })}
          </div>
          {afinaciones.length > 1 && (
            <div role="group" aria-label="Afinación del bajo" className="flex items-center" style={{ marginRight: 0 }}>
              {afinaciones.map((a, n) => {
                const activo = a.id === afinacion.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setAfinId(a.id)}
                    style={{
                      ...boton,
                      padding: "2px 9px", fontSize: 11,
                      borderRadius: n === 0 ? "8px 0 0 8px" : "0 8px 8px 0",
                      marginLeft: n === 0 ? 0 : -1,
                      background: activo ? CORAL : "white",
                      color: activo ? "white" : INK,
                    }}
                  >
                    {a.etiqueta.split(" (")[0]}
                  </button>
                );
              })}
            </div>
          )}
            </div>
            <div className="flex items-center gap-1.5">
          <span title="Sube o baja TODA la canción de tono, de medio en medio tono" style={{ fontSize: 11, color: MUTED }}>Cambiar tono</span>
          <button style={{ ...boton, padding: "0 8px", fontSize: 11 }} onClick={() => setSemi((v) => v - 1)} aria-label="Bajar medio tono" title="Bajar medio tono">−</button>
          <span style={{ fontFamily: MONO, fontSize: 12, minWidth: 22, textAlign: "center" }}>{semi > 0 ? `+${semi}` : semi}</span>
          <button style={{ ...boton, padding: "0 8px", fontSize: 11 }} onClick={() => setSemi((v) => v + 1)} aria-label="Subir medio tono" title="Subir medio tono">+</button>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <PaletaColor tonica={{ raiz: tonalidad.raiz, modo: tonalidad.modo }} />
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {([
                [cancion.bpm ? `${cancion.bpm} BPM` : "— BPM", "Tempo (se edita en Editar)"],
                [duracionMs > 0 ? formatoMMSS(Math.round(duracionMs / 1000)) : "—", "Duración"],
                [`${cancion.totalCompases} compases`, "Compases"],
              ] as [string, string][]).map(([txt, titulo]) => (
                <span key={titulo} title={titulo} style={{ background: CHIP, borderRadius: 8, padding: "3px 9px", fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 12, color: MUTED }}>
                  {txt}
                </span>
              ))}
              {capoInstr > 0 ? (
                <span title={`Capo en el traste ${capoInstr}: suena en ${transponerNota(tonalidad.raiz, capoInstr)}`} style={{ background: CORAL, color: "white", borderRadius: 8, padding: "3px 9px", fontFamily: NUM, fontWeight: 700, fontSize: 12 }}>
                  capo {capoInstr}
                </span>
              ) : cancion.capo > 0 ? (
                <span title={`El capo solo es de guitarra: aquí los acordes ya van como suenan (la guitarra lleva capo ${cancion.capo})`}  style={{ border: `1px dashed ${LINE}`, borderRadius: 8, padding: "2px 8px", fontFamily: NUM, fontWeight: 600, fontSize: 11, color: MUTED }}>
                  capo {cancion.capo} (guitarra)
                </span>
              ) : null}
              {puedeEditar && (
                <button type="button" style={{ ...boton, padding: "2px 9px", marginLeft: 4 }} onClick={() => setEditando(true)} title="Editar" aria-label="Editar">✏️</button>
              )}
            </div>
          </div>
        </section>
      </header>

      {/* Recorrido de la canción (el mismo modelo del editor): cada parte con su fondo, sus acordes por color y una barra que crece */}
      <div className="px-5 pb-1.5 pt-2">
        <div className="relative overflow-hidden" style={{ height: 34, background: CARD, border: `1px solid ${LINE}` }}>
          <div className="relative flex h-full">
            {faja.partes.map((p) => {
              const s = cancion.secciones[p.si];
              const aqui = actual?.sec === p.si;
              const tinta = tintaPorTipoSeccion(s.nombre);
              return (
                <div
                  key={s.id}
                  className="relative flex min-w-0 flex-col items-stretch justify-between"
                  style={{ flex: `${p.ancho} 1 0`, background: colorPorTipoSeccion(s.nombre), color: tinta, borderLeft: p.si === 0 ? "none" : `1px solid ${LINE}`, padding: "3px 4px 5px", boxShadow: aqui ? `inset 0 0 0 2px ${INK}` : "none" }}
                >
                  <span className="truncate text-center" title={s.nombre} style={{ fontFamily: NUM, fontWeight: 800, fontSize: 9, lineHeight: 1 }}>{s.nombre}</span>
                  <div className="flex w-full items-end gap-1" style={{ height: 14 }}>
                    {p.items.map((it, ii) => (
                      <div key={ii} className="relative flex items-end gap-px" style={{ flex: `${it.ancho} 1 0`, minWidth: 0 }}>
                        {it.veces > 1 && (
                          <span aria-hidden style={{ position: "absolute", right: 0, top: -10, fontFamily: NUM, fontWeight: 800, fontSize: 8, lineHeight: 1, color: tinta, opacity: 0.85 }}>×{it.veces}</span>
                        )}
                        {it.tiles.map((t, ti) => {
                          const evsReales = t.evs.filter((x): x is number => x !== null);
                          if (evsReales.length === 0) return <span key={ti} style={{ flex: `${t.dur} 1 0`, minWidth: 2, height: 6, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />;
                          const e = eventos[evsReales[0]];
                          if (!e) return <span key={ti} style={{ flex: `${t.dur} 1 0`, minWidth: 2 }} />;
                          const esActual = evsReales.includes(actualIdx);
                          const pasado = evsReales.every((x) => x < actualIdx);
                          return (
                            <button
                              key={ti}
                              onClick={() => elegir(evsReales.find((x) => x >= actualIdx) ?? evsReales[0])}
                              title={`${simboloAcorde(e.nota, e.calidad, e.bajo)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
                              style={{ flex: `${t.dur} 1 0`, minWidth: 2, height: 14, border: "none", padding: 0, cursor: "pointer", borderRadius: 2, background: colorDe(e.nota, e.calidad), opacity: esActual ? 1 : pasado ? 0.5 : 1, boxShadow: esActual ? "0 0 0 1px white, 0 0 0 2px black" : "none" }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Barra horizontal que crece hacia la derecha con la canción */}
          <div aria-hidden style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${Math.min(1, Math.max(0, xDeTiempo(Math.max(0, progresoMs) + adelanto))) * 100}%`, background: INK, pointerEvents: "none" }} />
        </div>
        {/* Tiempo corrido y duración, del mismo tamaño */}
        <div className="mt-1 flex items-center justify-between gap-2" style={{ fontFamily: NUM, fontVariantNumeric: "tabular-nums", fontSize: 11, fontWeight: 700, color: MUTED }}>
          <span style={{ color: INK }}>{formatoMMSS(Math.floor(Math.max(0, progresoMs) / 1000))}</span>
          <span>{duracionMs > 0 ? formatoMMSS(Math.round(duracionMs / 1000)) : "—"}</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[290px_minmax(0,1fr)_560px]">
        {/* Izquierda: el acorde que toca, grande, y los que siguen cada vez más chicos */}
        <aside className="order-2 flex min-h-0 flex-col xl:order-1" style={{ borderRight: `1px solid ${LINE}`, background: CARD }}>
         <div ref={colaRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <Titulo>Ahora y lo que sigue</Titulo>
          <div className="flex flex-col items-center gap-2.5">
            {cola.map((ei, pos) => {
              const e = eventos[ei];
              const k = e.clave;
              const activo = pos === 0 && filtro.includes(k);
              const vs = variantesDeAcorde(instrumento, afinacion, e.nota, e.calidad, e.bajo, formaHoja(e.nota, e.calidad, e.bajo));
              const elegida = Math.min(variantes[claveVar(e.nota, e.calidad, e.bajo)] ?? 0, Math.max(vs.length - 1, 0));
              const g = gradoEnTonalidad(e.nota, e.calidad, tonalidad);
              const fondo = colorDe(e.nota, e.calidad);
              const ink = tinta(e.nota, e.calidad);
              const abierto = pos === 0 && !!abiertos[`${instrumento}|${k}`];
              const ancho = Math.round((anchoCola - 24) * FRACCION_COLA[pos]);
              const veces = distintos.find((d) => d.nota === e.nota && d.calidad === e.calidad)?.veces ?? 1;
              // Parte de la canción a la que pertenece este acorde: barra lateral con su fondo y su nombre cuando cambia.
              const parte = cancion.secciones[e.sec]?.nombre ?? "";
              const rotuloParte = pos === 0 || eventos[cola[pos - 1]]?.sec !== e.sec;
              return (
                <Fragment key={pos}>
                {rotuloParte && parte && (
                  <div className="flex w-full items-center gap-2" style={{ marginTop: pos === 0 ? 0 : 2 }}>
                    <span style={{ flex: 1, borderTop: `1px dotted ${MUTED}`, opacity: 0.6 }} />
                    <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{parte}</span>
                  </div>
                )}
                <div
                  style={{ width: abierto ? "100%" : ancho + 14, background: fondo, color: ink, borderRadius: 14, padding: 7, outline: activo ? `3px solid ${CORAL}` : "none", outlineOffset: 1, transition: "width .25s", opacity: pos === 0 ? 1 : 1 - pos * 0.08 }}
                >
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (pos === 0) {
                          // Seleccionar y deseleccionar: sin selección el mástil dibuja todas las notas.
                          setFiltro((f) => (f.includes(k) ? [] : [k]));
                        } else elegir(ei);
                      }}
                      className="flex w-full flex-col items-center gap-1"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: ink, padding: 0 }}
                      title={pos === 0 ? (activo ? "Quitar la selección (el mástil muestra todo)" : "Ver solo este acorde en el mástil") : "Pasar a este acorde"}
                    >
                      <div style={{ background: "white", borderRadius: 10, padding: 3, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                        {vs[elegida] ? (
                          <Diagrama forma={vs[elegida]} afinacion={afinacion} capo={capoInstr} tam={abierto ? 150 : ancho - 6} acorde={{ nota: e.nota, calidad: e.calidad }} raizResaltada={instrumento === "bajo" ? (e.bajo ?? e.nota) : null} />
                        ) : (
                          <span style={{ fontFamily: MONO, fontSize: 11, color: INK }}>{notasDelAcorde(e.nota, e.calidad).map((p) => NOTAS[p]).join(" ")}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5" style={{ alignSelf: "flex-start", paddingLeft: 3 }}>
                        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: pos === 0 ? 24 : pos === 1 ? 18 : 14, lineHeight: 1 }}>{simboloAcorde(e.nota, e.calidad, e.bajo)}</span>
                        <span style={{ fontSize: pos === 0 ? 11 : 10, opacity: 0.9 }}>{g.romano}{pos === 0 ? ` · ${veces}×` : ""}</span>
                      </div>
                    </button>
                    {pos === 0 && vs.length > 1 && (
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
                          onClick={() => elegirVariante(e.nota, e.calidad, i, e.bajo)}
                          title={f.origen === "hoja" ? "Forma de la hoja de la canción" : f.origen === "catalogo" ? "Forma común" : "Forma sugerida"}
                          style={{ background: "white", borderRadius: 8, border: i === elegida ? `3px solid ${INK}` : "3px solid transparent", padding: 1, cursor: "pointer", display: "flex", justifyContent: "center" }}
                        >
                          <Diagrama forma={f} afinacion={afinacion} mini capo={capoInstr} raizResaltada={instrumento === "bajo" ? (e.bajo ?? e.nota) : null} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                </Fragment>
              );
            })}
            {cola.length === 0 && <p style={{ fontSize: 12, color: MUTED }}>Esta canción aún no tiene acordes.</p>}
          </div>
         </div>
        </aside>

        {/* Centro: letra con la palabra subrayada del color del acorde */}
        <main className="order-1 overflow-y-auto px-6 py-4 xl:order-2">
          <div style={{ columnWidth: 430, columnGap: 64, columnRule: "1px dotted oklch(0.5 0.044 262 / 0.35)" }}>
            {cancion.secciones.map((s, si) => {
              const conLetra = s.letra.some((l) => l.tipo !== "tab" && (l.acordes.length > 0 || l.texto.trim()));
              const bloquesTab = s.letra.filter((l) => l.tipo === "tab");
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
                      if (l.tipo === "tab") {
                        return (
                          <div key={l.id} style={{ margin: "6px 0 8px", borderLeft: `4px solid ${CORAL}`, background: CARD, borderRadius: 8, padding: "4px 10px 6px" }}>
                            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: CORAL, fontWeight: 700 }}>Arreglo / solo</div>
                            <pre style={{ margin: 0, fontFamily: MONO, fontSize: 12, lineHeight: 1.3, overflowX: "auto", color: INK }}>{l.texto}</pre>
                          </div>
                        );
                      }
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
                                title={`${simboloAcorde(e.nota, e.calidad, e.bajo)} · ${gradoEnTonalidad(e.nota, e.calidad, tonalidad).romano}`}
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
                                    {simboloAcorde(e.nota, e.calidad, e.bajo)}
                                  </span>
                                )}
                                {!heredado && (
                                  <span aria-hidden title="Aquí cambia el acorde" style={{ display: "inline-block", width: 3, height: "1.15em", marginRight: 2, verticalAlign: "text-bottom", borderRadius: 2, background: color, textDecoration: "none" }} />
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
                            {simboloAcorde(e.nota, e.calidad, e.bajo)}
                          </button>
                        );
                      })}
                      {(indicesPorSeccion[si] ?? []).length === 0 && <span style={{ fontSize: 12, color: MUTED }}>Sin acordes todavía.</span>}
                    </div>
                  )}
                  {!conLetra && bloquesTab.length > 0 && (
                    <div>
                      {bloquesTab.map((l) => (
                        <div key={l.id} style={{ margin: "6px 0 8px", borderLeft: `4px solid ${CORAL}`, background: CARD, borderRadius: 8, padding: "4px 10px 6px" }}>
                          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: CORAL, fontWeight: 700 }}>Arreglo / solo</div>
                          <pre style={{ margin: 0, fontFamily: MONO, fontSize: 12, lineHeight: 1.3, overflowX: "auto", color: INK }}>{l.texto}</pre>
                        </div>
                      ))}
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
          <div ref={panelRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {actual && grado ? (
            <>
              <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "10px 12px" }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: columnasAcordes ? `repeat(${columnasAcordes}, minmax(0, ${lado}px))` : `repeat(auto-fill, minmax(${lado}px, 1fr))`, justifyContent: columnasAcordes ? "center" : undefined }}>
                  {distintos.map((d) => {
                    const k = claveDe(d.nota, d.calidad, d.bajo);
                    const base = colorDe(d.nota, d.calidad);
                    const g = gradoEnTonalidad(d.nota, d.calidad, tonalidad);
                    const t = tonosDelAcorde(d.nota, d.calidad);
                    const piezas = [{ intervalo: "raíz", nota: t.raiz }, ...t.acompanantes.filter((x) => x.intervalo !== "9ª")];
                    const vs = variantesDeAcorde(instrumento, afinacion, d.nota, d.calidad, d.bajo, formaHoja(d.nota, d.calidad, d.bajo));
                    const elegida = Math.min(variantes[claveVar(d.nota, d.calidad, d.bajo)] ?? 0, Math.max(vs.length - 1, 0));
                    const activo = actual.clave === k;
                    const enSiguiente = !!siguiente && siguiente.clave === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => elegir(d.primero)}
                        title={`${simboloAcorde(d.nota, d.calidad, d.bajo)} · ${g.romano} · suena ${d.veces} ${d.veces === 1 ? "vez" : "veces"}`}
                        className="flex flex-col items-center gap-1 text-center"
                        style={{ border: `2px ${enSiguiente && !activo ? "dashed" : "solid"} ${activo || enSiguiente ? CORAL : LINE}`, background: activo ? "white" : BG, borderRadius: 12, padding: "5px 4px 6px", cursor: "pointer", minWidth: 0 }}
                      >
                        <div className="flex w-full items-baseline justify-between gap-1 px-1">
                          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: lado < 110 ? 14 : 17, color: base }}>{simboloAcorde(d.nota, d.calidad, d.bajo)}</span>
                          <span style={{ fontSize: 10, color: MUTED }}>{g.romano} · ×{d.veces}</span>
                        </div>
                        {vs[elegida] && (
                          <Diagrama forma={vs[elegida]} afinacion={afinacion} capo={capoInstr} tam={lado - 22} acorde={{ nota: d.nota, calidad: d.calidad }} raizResaltada={instrumento === "bajo" ? (d.bajo ?? d.nota) : null} />
                        )}
                        {lado >= 120 && (
                          <div className="flex w-full gap-0.5 px-1">
                            {piezas.map((p, i) => (
                              <div key={i} style={{ flex: 1, borderRadius: 5, padding: "1px 0", background: tono(base, i), color: i === 0 ? colorContrasteTexto(base) : INK, fontWeight: 800, fontSize: 10, fontFamily: MONO }}>
                                {p.nota}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <p style={{ fontSize: 13, color: MUTED }}>Cuando la canción tenga acordes, aquí verás todos sus acordes.</p>
          )}
          </div>

          {/* Abajo y siempre a la vista: la grabación y Spotify */}
          <div className="flex-none flex flex-col gap-3 px-4 pb-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          {/* Spotify de esta canción */}
          <section style={{ border: `1px solid ${LINE}`, background: CARD, borderRadius: 16, padding: "8px 10px" }}>
            <div ref={contRef} style={{ display: cancion.spotifyUri ? "block" : "none", minHeight: 152 }} />
            {cancion.spotifyUri ? (
              <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
                <span className="ml-auto flex items-center gap-1.5">
                  <span title="Si la letra va atrás de la canción, sube el adelanto">Sincronía</span>
                  <button onClick={() => cambiarAdelanto(adelanto - 1000)} style={{ ...boton, padding: "2px 9px" }} aria-label="Bajar 1 segundo">−</button>
                  <input
                    inputMode="decimal"
                    aria-label="Sincronía en segundos"
                    value={adelantoTxt ?? (adelanto / 1000).toFixed(1)}
                    onFocus={(e) => {
                      setAdelantoTxt((adelanto / 1000).toFixed(1));
                      e.currentTarget.select();
                    }}
                    onChange={(e) => {
                      const txt = e.target.value;
                      setAdelantoTxt(txt);
                      const n = parseFloat(txt.replace(",", "."));
                      if (Number.isFinite(n)) cambiarAdelanto(Math.round(n * 1000));
                    }}
                    onBlur={() => setAdelantoTxt(null)}
                    style={{ ...boton, width: 60, textAlign: "center", fontFamily: MONO, cursor: "text", padding: "3px 4px" }}
                  />
                  <button onClick={() => cambiarAdelanto(adelanto + 1000)} style={{ ...boton, padding: "2px 9px" }} aria-label="Subir 1 segundo">+</button>
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: MUTED }}>
                Esta canción aún no tiene liga de Spotify.{" "}
                {puedeEditar && (
                  <button onClick={() => setEditando(true)} style={{ color: CORAL, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Pégala en Editar
                  </button>
                )}
              </p>
            )}
                      </section>

          </div>
        </aside>
      </div>
      {editando && <FichaEditor cancion={cancion} bandaNombre={bandaNombre} onCerrar={() => setEditando(false)} />}
    </div>
  );
}
