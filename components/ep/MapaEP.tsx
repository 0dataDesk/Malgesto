"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guardarMapaAction } from "@/app/ep/actions";
import {
  BANDAS_FRECUENCIA,
  ETAPAS,
  clamp,
  curvaSuave,
  etapaDe,
  nivelEfectivo,
  nuevaPieza,
  nuevaSeccion,
  totalCompases,
  tramosDe,
  type Etapa,
  type Pieza,
  type Proyecto,
  type Seccion,
} from "@/lib/epModelo";

// Mapa del EP: una curva de emoción para todo el proyecto, con fondo por etapa del viaje.
// Cada punto es una sección (se arrastra arriba/abajo); el "ajuste" de cada canción sube o baja toda su parte de la curva.
// Debajo de la curva, las capas de frecuencia (sub, graves, medios, altos) muestran qué suena en cada sección.

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";
const LINE = "oklch(0.89 0.008 85)";
const ACCENT = "oklch(0.64 0.170 28)";
const CARD = "oklch(0.99 0.005 85)";

const W = 1000;
const L = 52;
const R = 70;
const T = 30;
const PH = 200;
const CAPAS_Y = T + PH + 14;
const CAPA_H = 13;
const ETIQ_Y = CAPAS_Y + CAPA_H * BANDAS_FRECUENCIA.length + 14;
const H = ETIQ_Y + 96;
const PW = W - L - R;

const yDe = (v: number) => T + (1 - v / 100) * PH;
const xDe = (f: number) => L + f * PW;
const recorta = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const rango = { accentColor: ACCENT } as const;
const inputStyle = { border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 12 } as const;

type Sel = { p: number; s: number } | null;
type Estado = "guardado" | "pendiente" | "guardando" | "error";

export function MapaEP({ inicial, puedeEscribir }: { inicial: Proyecto; puedeEscribir: boolean }) {
  const [proy, setProy] = useState<Proyecto>(inicial);
  const [sel, setSel] = useState<Sel>(inicial.piezas[0]?.secciones[0] ? { p: 0, s: 0 } : null);
  const [vista, setVista] = useState<number | null>(null); // null = EP completo; número = una sola canción
  const [estado, setEstado] = useState<Estado>("guardado");
  const [errorMsg, setErrorMsg] = useState("");
  const primera = useRef(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastrando = useRef<Sel>(null);

  // Autoguardado: 0.9 s después del último cambio.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (!puedeEscribir) return;
    setEstado("pendiente");
    const t = setTimeout(async () => {
      setEstado("guardando");
      try {
        await guardarMapaAction(proy.bandaId, proy.id, proy);
        setEstado("guardado");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "No se pudo guardar.");
        setEstado("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [proy, puedeEscribir]);

  const soloPieza = vista !== null && proy.piezas[vista] ? vista : null;
  const tramos = useMemo(() => tramosDe(proy.piezas, soloPieza), [proy.piezas, soloPieza]);

  const cambiarSeccion = (p: number, s: number, patch: Partial<Seccion>) =>
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: pz.secciones.map((sc, j) => (j !== s ? sc : { ...sc, ...patch })) })) }));
  const cambiarPieza = (p: number, patch: Partial<Pieza>) => setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, ...patch })) }));

  const valorDeY = (clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const y = ((clientY - r.top) * H) / r.height;
    return (1 - (y - T) / PH) * 100;
  };

  const puntos = tramos.map((t) => ({ x: xDe(t.xc), y: yDe(t.nivel) }));
  const puntosGraves = tramos.map((t) => ({ x: xDe(t.xc), y: yDe(t.graves) }));
  const linea = puntos.length > 0 ? curvaSuave([{ x: xDe(0), y: puntos[0].y }, ...puntos, { x: xDe(1), y: puntos[puntos.length - 1].y }]) : "";
  const area = linea ? `${linea} L${xDe(1)},${yDe(0)} L${xDe(0)},${yDe(0)} Z` : "";
  const lineaGraves = puntosGraves.length > 0 ? curvaSuave([{ x: xDe(0), y: puntosGraves[0].y }, ...puntosGraves, { x: xDe(1), y: puntosGraves[puntosGraves.length - 1].y }]) : "";

  // Bloques de fondo: tramos consecutivos de la misma etapa.
  const fondos: { etapa: Etapa; x0: number; x1: number }[] = [];
  tramos.forEach((t) => {
    const ult = fondos[fondos.length - 1];
    if (ult && ult.etapa === t.etapa) ult.x1 = t.x1;
    else fondos.push({ etapa: t.etapa, x0: t.x0, x1: t.x1 });
  });

  // Límites de cada canción en la vista actual.
  const limites: { pieza: number; x0: number; x1: number }[] = [];
  tramos.forEach((t) => {
    const ult = limites[limites.length - 1];
    if (ult && ult.pieza === t.pieza) ult.x1 = t.x1;
    else limites.push({ pieza: t.pieza, x0: t.x0, x1: t.x1 });
  });

  const seleccionada = sel && proy.piezas[sel.p]?.secciones[sel.s] ? sel : null;
  const secSel = seleccionada ? proy.piezas[seleccionada.p].secciones[seleccionada.s] : null;

  const agregarPieza = () => {
    setProy((pr) => ({ ...pr, piezas: [...pr.piezas, nuevaPieza(`Canción ${pr.piezas.length + 1}`)] }));
    setSel({ p: proy.piezas.length, s: 0 });
  };
  const eliminarPieza = (p: number) => {
    if (!window.confirm(`¿Eliminar "${proy.piezas[p].titulo}" y todas sus secciones?`)) return;
    setProy((pr) => ({ ...pr, piezas: pr.piezas.filter((_, i) => i !== p) }));
    setSel(null);
    setVista(null);
  };
  const moverPieza = (p: number, d: number) => {
    const q = p + d;
    if (q < 0 || q >= proy.piezas.length) return;
    setProy((pr) => {
      const piezas = [...pr.piezas];
      [piezas[p], piezas[q]] = [piezas[q], piezas[p]];
      return { ...pr, piezas };
    });
    setSel(null);
    setVista(null);
  };
  const agregarSeccion = (p: number) => {
    const n = proy.piezas[p].secciones.length;
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: [...pz.secciones, nuevaSeccion(`Sección ${n + 1}`)] })) }));
    setSel({ p, s: n });
  };
  const eliminarSeccion = (p: number, s: number) => {
    if (proy.piezas[p].secciones.length <= 1) return;
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: pz.secciones.filter((_, j) => j !== s) })) }));
    setSel({ p, s: Math.max(0, s - 1) });
  };
  const moverSeccion = (p: number, s: number, d: number) => {
    const q = s + d;
    const n = proy.piezas[p].secciones.length;
    if (q < 0 || q >= n) return;
    setProy((pr) => ({
      ...pr,
      piezas: pr.piezas.map((pz, i) => {
        if (i !== p) return pz;
        const secciones = [...pz.secciones];
        [secciones[s], secciones[q]] = [secciones[q], secciones[s]];
        return { ...pz, secciones };
      }),
    }));
    setSel({ p, s: q });
  };
  const duplicarSeccion = (p: number, s: number) => {
    const orig = proy.piezas[p].secciones[s];
    const copia: Seccion = { ...orig, id: crypto.randomUUID(), nombre: `${orig.nombre} (copia)`, instrumentos: [...orig.instrumentos] };
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: [...pz.secciones.slice(0, s + 1), copia, ...pz.secciones.slice(s + 1)] })) }));
    setSel({ p, s: s + 1 });
  };

  const textoEstado = !puedeEscribir ? "Solo lectura" : estado === "guardado" ? "Guardado" : estado === "guardando" ? "Guardando…" : estado === "pendiente" ? "Cambios sin guardar…" : `No se pudo guardar: ${errorMsg}`;

  return (
    <div className="mt-3">
      {/* Nombre, historia y estado de guardado */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={proy.nombre}
          onChange={(e) => setProy({ ...proy, nombre: e.target.value })}
          disabled={!puedeEscribir}
          maxLength={120}
          aria-label="Nombre del proyecto"
          className="min-w-0 flex-1 bg-transparent text-xl font-bold"
          style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK, outline: "none" }}
        />
        <span className="shrink-0 text-[11px]" style={{ fontFamily: MONO, color: estado === "error" ? "oklch(0.5 0.18 25)" : MUTED }}>
          {textoEstado}
        </span>
      </div>
      <details className="mt-1" open={proy.historia.length > 0 && proy.historia.length < 200 ? undefined : undefined}>
        <summary className="cursor-pointer text-xs font-bold" style={{ color: MUTED }}>
          La historia del proyecto
        </summary>
        <textarea
          value={proy.historia}
          onChange={(e) => setProy({ ...proy, historia: e.target.value })}
          disabled={!puedeEscribir}
          rows={4}
          maxLength={4000}
          placeholder="Qué viaje cuenta el proyecto, de dónde parte y a dónde llega."
          className="mt-1.5 w-full p-3 text-sm"
          style={inputStyle}
        />
      </details>

      {/* Leyenda de etapas y selector de vista */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {ETAPAS.map((e) => (
          <span key={e.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: e.fondo, color: e.color, fontFamily: MONO }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: e.color }} />
            {e.nombre}
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setVista(null)} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: vista === null ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85)", color: vista === null ? "oklch(0.99 0.006 85)" : MUTED }}>
          EP completo
        </button>
        {proy.piezas.map((pz, i) => (
          <button key={pz.id} type="button" onClick={() => { setVista(i); setSel({ p: i, s: 0 }); }} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: vista === i ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85)", color: vista === i ? "oklch(0.99 0.006 85)" : MUTED }}>
            {i + 1}. {recorta(pz.titulo, 16)}
          </button>
        ))}
      </div>

      {/* La curva */}
      <div className="mt-2.5 overflow-x-auto rounded-2xl" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Curva de emoción del proyecto" style={{ width: "100%", minWidth: 780, display: "block", touchAction: "pan-x pan-y" }}>
          <defs>
            <linearGradient id="ep-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.38" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Fondo por etapa */}
          {fondos.map((f, i) => {
            const e = etapaDe(f.etapa);
            const ancho = (f.x1 - f.x0) * PW;
            return (
              <g key={i}>
                <rect x={xDe(f.x0)} y={T} width={ancho} height={PH} fill={e.fondo} />
                {ancho > e.nombre.length * 7.4 + 14 && (
                  <text x={xDe(f.x0) + 6} y={T - 10} fontSize="10" fontWeight="700" fill={e.color} style={{ fontFamily: MONO, textTransform: "uppercase" }}>
                    {e.nombre}
                  </text>
                )}
              </g>
            );
          })}

          {/* Cuadrícula */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={yDe(v)} y2={yDe(v)} stroke="oklch(0.78 0.02 262)" strokeOpacity={v === 0 ? 0.7 : 0.35} strokeDasharray={v === 0 ? undefined : "3 5"} />
              <text x={L - 8} y={yDe(v) + 3} fontSize="9" textAnchor="end" fill={MUTED} style={{ fontFamily: MONO }}>
                {v}
              </text>
            </g>
          ))}

          {/* Separadores de canción */}
          {limites.map((lim, i) => (
            <g key={lim.pieza}>
              {i > 0 && <line x1={xDe(lim.x0)} x2={xDe(lim.x0)} y1={T - 2} y2={H - 8} stroke={INK} strokeOpacity="0.35" strokeDasharray="2 4" />}
              <text x={xDe((lim.x0 + lim.x1) / 2)} y={H - 10} fontSize="12" fontWeight="700" textAnchor="middle" fill={INK} style={{ fontFamily: "var(--font-fraunces), sans-serif" }}>
                {lim.pieza + 1}. {recorta(proy.piezas[lim.pieza].titulo, Math.max(8, Math.floor(((lim.x1 - lim.x0) * PW) / 8)))}
                {proy.piezas[lim.pieza].ajuste !== 0 ? `  (${proy.piezas[lim.pieza].ajuste > 0 ? "+" : ""}${proy.piezas[lim.pieza].ajuste})` : ""}
              </text>
            </g>
          ))}

          {/* Curva de graves (punteada) y curva de emoción */}
          {lineaGraves && <path d={lineaGraves} fill="none" stroke="oklch(0.42 0.06 262)" strokeWidth="1.6" strokeDasharray="5 4" strokeOpacity="0.75" />}
          {area && <path d={area} fill="url(#ep-area)" />}
          {linea && <path d={linea} fill="none" stroke={ACCENT} strokeWidth="3.2" strokeLinecap="round" />}

          {/* Zonas clicables, capas de frecuencia y nombres de sección */}
          {tramos.map((t, k) => {
            const sc = proy.piezas[t.pieza].secciones[t.seccion];
            const esSel = seleccionada?.p === t.pieza && seleccionada?.s === t.seccion;
            return (
              <g key={sc.id}>
                <rect x={xDe(t.x0)} y={T} width={(t.x1 - t.x0) * PW} height={PH} fill={esSel ? INK : "transparent"} fillOpacity={esSel ? 0.07 : 0} style={{ cursor: "pointer" }} onClick={() => setSel({ p: t.pieza, s: t.seccion })} />
                {t.seccion > 0 && <line x1={xDe(t.x0)} x2={xDe(t.x0)} y1={T} y2={T + PH} stroke={INK} strokeOpacity="0.12" />}
                {BANDAS_FRECUENCIA.map((b, r) => {
                  const activos = b.instrumentos.filter((i) => sc.instrumentos.includes(i)).length;
                  return (
                    <rect
                      key={b.nombre}
                      x={xDe(t.x0) + 1}
                      y={CAPAS_Y + r * CAPA_H}
                      width={Math.max(1, (t.x1 - t.x0) * PW - 2)}
                      height={CAPA_H - 2}
                      rx="2"
                      fill={ACCENT}
                      fillOpacity={activos === 0 ? 0.06 : 0.28 + 0.24 * Math.min(activos, 3)}
                      onClick={() => setSel({ p: t.pieza, s: t.seccion })}
                      style={{ cursor: "pointer" }}
                    >
                      <title>{`${b.nombre}: ${b.instrumentos.filter((i) => sc.instrumentos.includes(i)).join(", ") || "—"}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={xDe(t.xc)}
                  y={ETIQ_Y}
                  fontSize={soloPieza !== null ? 11 : 10}
                  fontWeight={esSel ? 700 : 400}
                  fill={esSel ? INK : MUTED}
                  transform={`rotate(38 ${xDe(t.xc)} ${ETIQ_Y})`}
                  style={{ fontFamily: MONO, cursor: "pointer" }}
                  onClick={() => setSel({ p: t.pieza, s: t.seccion })}
                >
                  {k + 1}. {recorta(sc.nombre, 18)}
                </text>
              </g>
            );
          })}
          {BANDAS_FRECUENCIA.map((b, r) => (
            <text key={b.nombre} x={L - 8} y={CAPAS_Y + r * CAPA_H + 9} fontSize="9" textAnchor="end" fill={MUTED} style={{ fontFamily: MONO }}>
              {b.nombre}
            </text>
          ))}

          {/* Puntos de la curva (se arrastran arriba y abajo) */}
          {tramos.map((t) => {
            const sc = proy.piezas[t.pieza].secciones[t.seccion];
            const esSel = seleccionada?.p === t.pieza && seleccionada?.s === t.seccion;
            const cx = xDe(t.xc);
            const cy = yDe(t.nivel);
            return (
              <g key={sc.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={esSel ? 9 : 7}
                  fill={etapaDe(t.etapa).color}
                  stroke={CARD}
                  strokeWidth="2.5"
                  tabIndex={0}
                  role="slider"
                  aria-label={`Emoción de ${sc.nombre}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={t.nivel}
                  style={{ cursor: puedeEscribir ? "ns-resize" : "pointer", touchAction: "none", outline: "none" }}
                  onPointerDown={(e) => {
                    setSel({ p: t.pieza, s: t.seccion });
                    if (!puedeEscribir) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    arrastrando.current = { p: t.pieza, s: t.seccion };
                  }}
                  onPointerMove={(e) => {
                    const a = arrastrando.current;
                    if (!a || a.p !== t.pieza || a.s !== t.seccion) return;
                    const v = valorDeY(e.clientY);
                    cambiarSeccion(t.pieza, t.seccion, { nivel: clamp(Math.round(v - proy.piezas[t.pieza].ajuste), 0, 100) });
                  }}
                  onPointerUp={() => {
                    arrastrando.current = null;
                  }}
                  onKeyDown={(e) => {
                    if (!puedeEscribir) return;
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                      cambiarSeccion(t.pieza, t.seccion, { nivel: clamp(sc.nivel + (e.key === "ArrowUp" ? 2 : -2), 0, 100) });
                    }
                  }}
                />
                {esSel && (
                  <text x={cx} y={cy - 14} fontSize="11" fontWeight="700" textAnchor="middle" fill={INK} style={{ fontFamily: MONO }}>
                    {t.nivel}
                  </text>
                )}
              </g>
            );
          })}
          {tramos.length === 0 && (
            <text x={W / 2} y={T + PH / 2} textAnchor="middle" fontSize="13" fill={MUTED}>
              Agrega una canción para empezar el mapa.
            </text>
          )}
        </svg>
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>
        {puedeEscribir ? "Arrastra un punto hacia arriba o abajo para cambiar la emoción de esa sección (o usa las flechas del teclado). " : ""}
        La línea punteada es el peso de los graves. Las franjas de abajo muestran qué bandas de frecuencia suenan en cada sección.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Canciones */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>
              Canciones · {proy.piezas.length}
            </h3>
            {puedeEscribir && (
              <button type="button" onClick={agregarPieza} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: ACCENT, color: "oklch(0.99 0.006 85)" }}>
                + Canción
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-2.5">
            {proy.piezas.map((pz, p) => (
              <div key={pz.id} className="rounded-2xl p-3.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ fontFamily: MONO, color: MUTED }}>{p + 1}</span>
                  <input value={pz.titulo} onChange={(e) => cambiarPieza(p, { titulo: e.target.value })} disabled={!puedeEscribir} maxLength={120} aria-label="Título de la canción" className="min-w-0 flex-1 bg-transparent text-[17px] font-bold" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK, outline: "none" }} />
                  {puedeEscribir && (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => moverPieza(p, -1)} disabled={p === 0} aria-label="Subir canción" className="rounded-lg px-2 py-1 text-xs" style={{ background: "oklch(0.93 0.010 85)", color: MUTED }}>↑</button>
                      <button type="button" onClick={() => moverPieza(p, 1)} disabled={p === proy.piezas.length - 1} aria-label="Bajar canción" className="rounded-lg px-2 py-1 text-xs" style={{ background: "oklch(0.93 0.010 85)", color: MUTED }}>↓</button>
                      <button type="button" onClick={() => eliminarPieza(p)} aria-label="Eliminar canción" className="rounded-lg px-2 py-1 text-xs" style={{ background: "oklch(0.93 0.010 85)", color: "oklch(0.5 0.18 25)" }}>✕</button>
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                  <label className="flex items-center gap-1.5">
                    Altura de toda la canción
                    <input type="range" style={rango} min={-50} max={50} value={pz.ajuste} onChange={(e) => cambiarPieza(p, { ajuste: Number(e.target.value) })} disabled={!puedeEscribir} aria-label="Altura de toda la canción" />
                    <b style={{ color: INK, minWidth: 28, textAlign: "right" }}>{pz.ajuste > 0 ? "+" : ""}{pz.ajuste}</b>
                  </label>
                  <label className="flex items-center gap-1.5">
                    Tono
                    <input value={pz.tonalidad} onChange={(e) => cambiarPieza(p, { tonalidad: e.target.value })} disabled={!puedeEscribir} maxLength={40} className="w-20 px-2 py-1" style={inputStyle} />
                  </label>
                  <label className="flex items-center gap-1.5">
                    BPM
                    <input type="number" min={20} max={300} value={pz.bpm ?? ""} onChange={(e) => cambiarPieza(p, { bpm: e.target.value === "" ? null : Number(e.target.value) })} disabled={!puedeEscribir} className="w-16 px-2 py-1" style={inputStyle} />
                  </label>
                  <span>{totalCompases(pz)} compases · {pz.secciones.length} secciones</span>
                </div>
                <textarea value={pz.idea} onChange={(e) => cambiarPieza(p, { idea: e.target.value })} disabled={!puedeEscribir} rows={2} maxLength={1000} placeholder="Qué cuenta esta canción en el viaje." className="mt-2 w-full p-2.5 text-sm" style={inputStyle} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pz.secciones.map((sc, s) => {
                    const e = etapaDe(sc.etapa);
                    const activo = seleccionada?.p === p && seleccionada?.s === s;
                    return (
                      <button key={sc.id} type="button" onClick={() => setSel({ p, s })} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: activo ? e.color : e.fondo, color: activo ? "oklch(0.99 0.006 85)" : e.color, fontFamily: MONO }}>
                        {recorta(sc.nombre, 18)} · {nivelEfectivo(sc.nivel, pz.ajuste)}
                      </button>
                    );
                  })}
                  {puedeEscribir && (
                    <button type="button" onClick={() => agregarSeccion(p)} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ border: `1px dashed ${MUTED}`, color: MUTED, fontFamily: MONO }}>
                      + sección
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle de la sección elegida */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>
            Sección elegida
          </h3>
          {secSel && seleccionada ? (
            <div className="mt-2 rounded-2xl p-3.5" style={{ background: CARD, border: `1px solid ${LINE}`, borderTop: `4px solid ${etapaDe(secSel.etapa).color}` }}>
              <div className="text-[10px]" style={{ fontFamily: MONO, color: MUTED }}>
                {proy.piezas[seleccionada.p].titulo} · sección {seleccionada.s + 1}
              </div>
              <input value={secSel.nombre} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { nombre: e.target.value })} disabled={!puedeEscribir} maxLength={120} aria-label="Nombre de la sección" className="mt-0.5 w-full bg-transparent text-lg font-bold" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK, outline: "none" }} />

              <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                <span>Emoción</span>
                <input type="range" style={rango} min={0} max={100} value={secSel.nivel} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { nivel: Number(e.target.value) })} disabled={!puedeEscribir} aria-label="Emoción de la sección" />
                <b style={{ color: INK }}>{nivelEfectivo(secSel.nivel, proy.piezas[seleccionada.p].ajuste)}</b>
                <span>Graves</span>
                <input type="range" style={rango} min={0} max={100} value={secSel.graves} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { graves: Number(e.target.value) })} disabled={!puedeEscribir} aria-label="Peso de los graves" />
                <b style={{ color: INK }}>{secSel.graves}</b>
                <span>Compases</span>
                <input type="number" min={1} max={512} value={secSel.compases} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { compases: clamp(Math.round(Number(e.target.value) || 1), 1, 512) })} disabled={!puedeEscribir} className="w-20 px-2 py-1" style={inputStyle} />
                <span />
              </div>

              <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>Etapa del viaje</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ETAPAS.map((e) => (
                  <button key={e.id} type="button" disabled={!puedeEscribir} onClick={() => cambiarSeccion(seleccionada.p, seleccionada.s, { etapa: e.id })} className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: secSel.etapa === e.id ? e.color : e.fondo, color: secSel.etapa === e.id ? "oklch(0.99 0.006 85)" : e.color, fontFamily: MONO }}>
                    {e.nombre}
                  </button>
                ))}
              </div>

              <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>Quién suena (por banda de frecuencia)</div>
              {BANDAS_FRECUENCIA.map((b) => (
                <div key={b.nombre} className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="w-12 text-[10px]" style={{ fontFamily: MONO, color: MUTED }}>{b.nombre}</span>
                  {b.instrumentos.map((ins) => {
                    const on = secSel.instrumentos.includes(ins);
                    return (
                      <button
                        key={ins}
                        type="button"
                        disabled={!puedeEscribir}
                        onClick={() => cambiarSeccion(seleccionada.p, seleccionada.s, { instrumentos: on ? secSel.instrumentos.filter((x) => x !== ins) : [...secSel.instrumentos, ins] })}
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: on ? INK : "oklch(0.93 0.010 85)", color: on ? "oklch(0.99 0.006 85)" : MUTED }}
                      >
                        {ins}
                      </button>
                    );
                  })}
                </div>
              ))}

              <label className="mt-2.5 block text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>
                Notas y armonía
                <textarea value={secSel.armonia} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { armonia: e.target.value })} disabled={!puedeEscribir} rows={2} maxLength={1000} placeholder="Ej. Am | Am | Dm | Em, pedal en La" className="mt-1 w-full p-2.5 text-sm font-normal normal-case tracking-normal" style={{ ...inputStyle, fontFamily: "inherit" }} />
              </label>
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>
                Qué transmite
                <textarea value={secSel.transmite} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { transmite: e.target.value })} disabled={!puedeEscribir} rows={2} maxLength={1000} placeholder="La sensación que debe dejar esta sección." className="mt-1 w-full p-2.5 text-sm font-normal normal-case tracking-normal" style={{ ...inputStyle, fontFamily: "inherit" }} />
              </label>

              {puedeEscribir && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => moverSeccion(seleccionada.p, seleccionada.s, -1)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "oklch(0.93 0.010 85)", color: MUTED }}>← Antes</button>
                  <button type="button" onClick={() => moverSeccion(seleccionada.p, seleccionada.s, 1)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "oklch(0.93 0.010 85)", color: MUTED }}>Después →</button>
                  <button type="button" onClick={() => duplicarSeccion(seleccionada.p, seleccionada.s)} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "oklch(0.93 0.010 85)", color: MUTED }}>Duplicar</button>
                  <button type="button" onClick={() => eliminarSeccion(seleccionada.p, seleccionada.s)} disabled={proy.piezas[seleccionada.p].secciones.length <= 1} className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: "oklch(0.93 0.010 85)", color: "oklch(0.5 0.18 25)" }}>Eliminar</button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm" style={{ color: MUTED }}>
              Toca un punto de la curva o una sección para ver y editar su detalle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
