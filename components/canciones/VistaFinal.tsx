"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { CancionCompleta, LetraLineaGuardada, PrioridadMusico } from "@/lib/cancionesData";
import { actualizarEstadoBorradorAction } from "@/app/canciones/actions";
import type { SeteoEnContexto } from "@/lib/dispositivosData";
import { simboloAcorde, colorRaizAcorde, colorContrasteTexto, colorExtension, tonosDelAcorde } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import {
  expandirCancion,
  posicionEn,
  totalCompases as sumaCompases,
  duracionTotal as sumaDuracion,
  mmss,
  type VueltaExpandida,
} from "./vistaCancionModelo";
import { ChordBlock } from "./ChordBlock";

// Tokens de tema del diseño Fase 2. "Ensayo" (claro) / "Escenario" (oscuro).
const TEMA = {
  claro: {
    "--bg": "oklch(0.965 0.012 82)",
    "--card": "oklch(0.99 0.008 82)",
    "--card2": "oklch(0.975 0.01 82)",
    "--line": "oklch(0.89 0.013 78)",
    "--ink": "oklch(0.24 0.02 55)",
    "--muted": "oklch(0.5 0.02 55)",
    "--faint": "oklch(0.62 0.02 55)",
    "--chip": "oklch(0.93 0.016 78)",
    "--accent": "oklch(0.64 0.15 34)",
    "--accentInk": "oklch(0.99 0.01 82)",
  },
  oscuro: {
    "--bg": "oklch(0.16 0.01 260)",
    "--card": "oklch(0.212 0.012 260)",
    "--card2": "oklch(0.19 0.012 260)",
    "--line": "oklch(0.31 0.014 260)",
    "--ink": "oklch(0.95 0.005 260)",
    "--muted": "oklch(0.72 0.012 260)",
    "--faint": "oklch(0.58 0.012 260)",
    "--chip": "oklch(0.28 0.016 260)",
    "--accent": "oklch(0.68 0.16 34)",
    "--accentInk": "oklch(0.16 0.02 40)",
  },
} as const;

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-bricolage), sans-serif";

type Tema = "claro" | "oscuro";

// El diseño ofrece 3 vistas: armonía, percusión, voz. "ambos" (armonía+canta)
// entra por la de armonía; "armonia" también.
function vistaBase(p: PrioridadMusico): "armonia" | "percusion" | "voz" {
  if (p === "ritmo") return "percusion";
  if (p === "voz") return "voz";
  return "armonia";
}

function acordeInk(nota: string, calidad: string): string {
  return colorContrasteTexto(colorRaizAcorde(nota as never, calidad as never));
}

// ---- Letra alineada (comparte el modelo texto + acordes@posición) --------
function LetraAlineada({
  lineas,
  activa,
  tamTexto,
  tamAcorde,
}: {
  lineas: LetraLineaGuardada[];
  activa: number | null;
  tamTexto: number;
  tamAcorde: number;
}) {
  if (lineas.length === 0) {
    return (
      <div style={{ opacity: 0.5, fontFamily: MONO, fontSize: tamTexto, color: "var(--faint)" }}>— instrumental —</div>
    );
  }
  return (
    <>
      {lineas.map((l, li) => {
        const texto = l.texto.length ? l.texto : " ";
        const puntos = [...l.acordes].sort((a, b) => a.posicion - b.posicion);
        const cortes = [0, ...puntos.map((p) => Math.min(p.posicion, texto.length)), texto.length];
        const segs: { texto: string; acorde: (typeof puntos)[number] | null }[] = [];
        for (let i = 0; i < cortes.length - 1; i++) {
          segs.push({ texto: texto.slice(cortes[i], cortes[i + 1]), acorde: i > 0 ? puntos[i - 1] ?? null : null });
        }
        return (
          <div key={l.id} className="flex flex-wrap items-end" style={{ opacity: activa === null || li === activa ? 1 : 0.35 }}>
            {segs.map((seg, i) => (
              <div key={i} className="flex flex-col" style={{ gap: 1 }}>
                <span style={{ height: tamAcorde + 3, fontFamily: MONO, fontWeight: 700, fontSize: tamAcorde, color: seg.acorde ? colorRaizAcorde(seg.acorde.notaRaiz, seg.acorde.calidad) : "transparent" }}>
                  {seg.acorde ? simboloAcorde(seg.acorde.notaRaiz, seg.acorde.calidad) : "·"}
                </span>
                <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: tamTexto, lineHeight: 1.2, color: "var(--ink)", whiteSpace: "pre" }}>{seg.texto}</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function letraPlana(lineas: LetraLineaGuardada[], i: number): string {
  return lineas[i]?.texto ?? "";
}

// ---- Tira de tiempo (timeline) ------------------------------------------
function Timeline({
  vueltas,
  idxActivo,
  iAcordeActivo,
  playheadPct,
  onIr,
}: {
  vueltas: VueltaExpandida[];
  idxActivo: number;
  iAcordeActivo: number;
  playheadPct: number;
  onIr: (i: number) => void;
}) {
  return (
    <div style={{ position: "relative", display: "flex", gap: 2, height: 52 }}>
      {vueltas.map((b, i) => {
        const activo = i === idxActivo;
        const base = colorRaizAcorde(b.acordes[0]?.notaRaiz ?? "C", b.acordes[0]?.calidad ?? "mayor");
        const cortar = b.acordes.length > 4 ? Math.ceil(b.acordes.length / 2) : b.acordes.length;
        const filas = [b.acordes.slice(0, cortar), b.acordes.slice(cortar)].filter((f) => f.length);
        return (
          <button
            key={`${b.seccionId}-${b.indice}`}
            type="button"
            onClick={() => onIr(i)}
            style={{
              flex: Math.max(1, b.compases),
              minWidth: 0,
              border: `1px solid ${activo ? base : "var(--line)"}`,
              borderRadius: 7,
              overflow: "hidden",
              background: activo ? "var(--card)" : "var(--card2)",
              boxShadow: activo ? `inset 0 0 0 1px ${base}` : "none",
              display: "flex",
              flexDirection: "column",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ padding: "3px 5px 2px", fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: activo ? base : "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {b.deVueltas > 1 ? `${b.nombre} ${b.indice}/${b.deVueltas}${b.esVariante ? "★" : ""}` : b.nombre}
            </span>
            <span style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1, padding: "0 3px 3px" }}>
              {filas.map((fila, fi) => (
                <span key={fi} style={{ flex: 1, minHeight: 0, display: "flex", gap: 1 }}>
                  {fila.map((a, ai) => {
                    const idxReal = fi === 0 ? ai : cortar + ai;
                    const suena = activo && idxReal === iAcordeActivo;
                    const color = colorRaizAcorde(a.notaRaiz, a.calidad);
                    return (
                      <span
                        key={ai}
                        style={{
                          flex: Math.max(1, a.duracionCompases),
                          minWidth: 0,
                          borderRadius: 4,
                          background: activo ? color : "var(--chip)",
                          opacity: activo ? (suena ? 1 : 0.72) : 1,
                          boxShadow: suena ? "inset 0 0 0 2px var(--ink)" : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: MONO,
                          fontWeight: 700,
                          fontSize: 10,
                          color: activo ? acordeInk(a.notaRaiz, a.calidad) : "var(--muted)",
                          overflow: "hidden",
                        }}
                      >
                        {simboloAcorde(a.notaRaiz, a.calidad)}
                      </span>
                    );
                  })}
                </span>
              ))}
            </span>
          </button>
        );
      })}
      <div style={{ position: "absolute", top: -3, bottom: -3, width: 2, background: "var(--accent)", left: `${playheadPct}%`, boxShadow: "0 0 10px var(--accent)", pointerEvents: "none" }} />
    </div>
  );
}

// ---- Vista horizontal (modo lista, apaisada) ----------------------------
function ModoLista({
  cancion,
  prioridad,
  puedeEditar,
  desdeSetlist,
  volverHref,
  seteosContexto,
}: {
  cancion: CancionCompleta;
  prioridad: PrioridadMusico;
  puedeEditar: boolean;
  desdeSetlist: string | null;
  volverHref: string;
  seteosContexto: SeteoEnContexto[];
}) {
  const vueltas = useMemo(() => expandirCancion(cancion), [cancion]);
  const total = useMemo(() => sumaCompases(vueltas), [vueltas]);
  const dur = useMemo(() => sumaDuracion(vueltas), [vueltas]);

  const [tema, setTema] = useState<Tema>("claro");
  const [modo, setModo] = useState<"armonia" | "percusion" | "voz">(vistaBase(prioridad));
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [verSeteos, setVerSeteos] = useState(false);
  const [pendingEstado, startEstado] = useTransition();
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    // Sincroniza el tema con la preferencia guardada del navegador. Es una
    // lectura de sistema externo tras el montaje (no se puede en SSR), no un
    // cálculo derivable de props — por eso el setState en efecto.
    try {
      const g = localStorage.getItem("malgesto:cancion:tema");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (g === "claro" || g === "oscuro") setTema(g);
    } catch {}
  }, []);
  const cambiarTema = (v: Tema) => {
    setTema(v);
    try {
      localStorage.setItem("malgesto:cancion:tema", v);
    } catch {}
  };

  useEffect(() => {
    if (!tocando) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        return dur > 0 && next >= dur ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tocando, dur]);

  const pos = useMemo(() => posicionEn(vueltas, t), [vueltas, t]);
  const irA = (i: number) => {
    const b = vueltas[Math.max(0, Math.min(vueltas.length - 1, i))];
    if (b) setT(b.inicioSegundos);
  };

  const vars = TEMA[tema] as unknown as React.CSSProperties;
  const tituloSub = `${cancion.tonalidadNota}${cancion.tonalidadModo === "menor" ? "m" : ""} · ${cancion.bpm ?? "—"} BPM · ${total} compases · ${mmss(dur)}`;

  if (!pos) {
    return (
      <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: MONO }}>
        Esta canción todavía no tiene secciones con acordes.
      </div>
    );
  }

  const acordeColor = colorRaizAcorde(pos.acorde.notaRaiz, pos.acorde.calidad);
  const acordeInkC = acordeInk(pos.acorde.notaRaiz, pos.acorde.calidad);
  const tonos = tonosDelAcorde(pos.acorde.notaRaiz, pos.acorde.calidad);
  const beat = Math.floor((t / (60 / (pos.vuelta.bpmEfectivo || 92))) % 4);

  return (
    <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-manrope), sans-serif", display: "flex", flexDirection: "column" }}>
      <div className="portrait-hint" style={{ display: "none", padding: "10px 16px", fontFamily: MONO, fontSize: 11, color: "var(--faint)", textAlign: "center", background: "var(--card2)", borderBottom: "1px solid var(--line)" }}>
        Girá el teléfono para el modo lista.
      </div>

      {/* Cabecera */}
      <div style={{ flex: "none", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid var(--line)" }}>
        <Link href={volverHref} style={{ fontSize: 14, color: "var(--muted)", textDecoration: "none" }}>
          ‹
        </Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, lineHeight: 1.05, color: "var(--ink)", whiteSpace: "nowrap" }}>{cancion.titulo}</div>
          <div style={{ marginTop: 2, fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{tituloSub}</div>
        </div>

        {desdeSetlist ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px", fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>
            🔒 Desde set list
          </div>
        ) : (
          puedeEditar && (
            <Link href={`/canciones/${cancion.id}/editar`} style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", borderRadius: 9, padding: "6px 10px", fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none" }}>
              Editar
            </Link>
          )
        )}

        {puedeEditar && !desdeSetlist && (
          <button
            type="button"
            disabled={pendingEstado}
            onClick={() => startEstado(() => actualizarEstadoBorradorAction(cancion.id, cancion.bandaId, !cancion.esBorrador))}
            style={{ border: "1px solid var(--line)", background: cancion.esBorrador ? "var(--accent)" : "transparent", color: cancion.esBorrador ? "var(--accentInk)" : "var(--muted)", borderRadius: 9, padding: "6px 10px", fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {cancion.esBorrador ? "Marcar lista" : "A borrador"}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Selector de vista por músico */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["armonia", "percusion", "voz"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              style={{ border: `1px solid ${modo === m ? "var(--ink)" : "var(--line)"}`, background: modo === m ? "var(--ink)" : "transparent", color: modo === m ? "var(--bg)" : "var(--muted)", borderRadius: 9, padding: "5px 9px", fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {m === "armonia" ? "Armonía" : m === "percusion" ? "Ritmo" : "Voz"}
            </button>
          ))}
        </div>

        {/* Transporte */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 8, borderLeft: "1px solid var(--line)" }}>
          <button type="button" onClick={() => setT(0)} title="Reiniciar" style={ctrlBtn}>
            ⟲
          </button>
          <button type="button" onClick={() => irA(pos.idx - 1)} title="Retroceder" style={ctrlBtn}>
            ‹
          </button>
          <button type="button" onClick={() => setTocando((v) => !v)} style={{ ...ctrlBtn, width: 34, height: 34, border: 0, background: "var(--accent)", color: "var(--accentInk)" }}>
            {tocando ? "❚❚" : "▶"}
          </button>
          <button type="button" onClick={() => irA(pos.idx + 1)} title="Avanzar" style={ctrlBtn}>
            ›
          </button>
          <div style={{ width: 44, textAlign: "right", fontFamily: MONO, fontWeight: 700, fontSize: 11, color: "var(--ink)" }}>{mmss(t)}</div>
        </div>

        {seteosContexto.length > 0 && (
          <button type="button" onClick={() => setVerSeteos((v) => !v)} style={{ border: "1px solid var(--line)", background: verSeteos ? "var(--ink)" : "var(--card)", color: verSeteos ? "var(--bg)" : "var(--muted)", borderRadius: 999, padding: "6px 11px", fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
            Seteos
          </button>
        )}

        <button type="button" onClick={() => cambiarTema(tema === "claro" ? "oscuro" : "claro")} style={{ border: "1px solid var(--line)", background: "var(--card)", color: "var(--muted)", borderRadius: 999, padding: "6px 11px", fontFamily: MONO, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
          {tema === "oscuro" ? "Escenario ●" : "Ensayo ○"}
        </button>
      </div>

      {verSeteos && seteosContexto.length > 0 && (
        <div style={{ flex: "none", padding: "8px 16px", borderBottom: "1px solid var(--line)", background: "var(--card2)", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {seteosContexto.map((s) => (
            <div key={s.seteo.id} style={{ borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", padding: "6px 9px", fontFamily: MONO, fontSize: 10, color: "var(--muted)" }}>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{s.usuarioNombre} · {s.dispositivo.nombre}</span>
              {" — "}
              {Object.entries(s.seteo.valores).map(([k, v]) => `${k}:${v}`).join(" · ")}
              {" "}
              <span style={{ color: s.etiqueta === "Vinculado" ? "var(--accent)" : "var(--faint)" }}>[{s.etiqueta}]</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: "none", padding: "9px 16px 7px" }}>
        <Timeline vueltas={vueltas} idxActivo={pos.idx} iAcordeActivo={pos.iAcorde} playheadPct={dur > 0 ? (t / dur) * 100 : 0} onIr={irA} />
        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 8, color: "var(--faint)" }}>
          <span>c.1</span>
          <span>c.{Math.round(total * 0.25)}</span>
          <span>c.{Math.round(total * 0.5)}</span>
          <span>c.{Math.round(total * 0.75)}</span>
          <span>c.{total}</span>
        </div>
      </div>

      {/* Contenido por músico */}
      <div style={{ flex: 1, minHeight: 0, padding: "4px 16px 10px", display: "flex", gap: 12 }}>
        {modo === "armonia" && (
          <>
            <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ flex: 1, borderRadius: 14, padding: "10px 12px", background: acordeColor, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: acordeInkC, opacity: 0.85 }}>
                  {pos.vuelta.nombre} · vuelta {pos.vuelta.indice} · compás {pos.compasEnSeccion}
                </div>
                <div style={{ marginTop: 2, fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, lineHeight: 1, color: acordeInkC }}>
                  {simboloAcorde(pos.acorde.notaRaiz, pos.acorde.calidad)}
                </div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {tonos.acompanantes.map((tn, i) => (
                    <span key={i} style={{ display: "inline-flex", gap: 3, borderRadius: 999, padding: "2px 6px", background: "oklch(0.97 0.01 82)", fontFamily: MONO, fontWeight: 700, fontSize: 10, color: "oklch(0.3 0.02 55)" }}>
                      <span style={{ color: colorExtension(tn.nota) }}>{tn.intervalo.replace("ª", "")}</span>
                      {tn.nota}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ flex: "none", borderRadius: 12, padding: "8px 11px", background: "var(--card)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>Sigue</span>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: colorRaizAcorde(pos.acordeSiguiente.notaRaiz, pos.acordeSiguiente.calidad) }}>
                    {simboloAcorde(pos.acordeSiguiente.notaRaiz, pos.acordeSiguiente.calidad)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)" }}>en {Math.max(1, Math.ceil(pos.restanteCompases))} c.</span>
                </div>
                <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 999, background: "var(--chip)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pos.avanceSeccion * 100}%`, background: pos.compasesASeccion <= 2 ? "var(--accent)" : acordeColor, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase", color: pos.cambiaSeccion ? "var(--accent)" : "var(--faint)", whiteSpace: "nowrap" }}>
                    {pos.cambiaSeccion ? `entra ${pos.siguienteVuelta.nombre}` : `${Math.max(1, Math.ceil(pos.compasesASeccion))} c. de sección`}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)", padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9, overflow: "auto" }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)" }}>Letra alineada</div>
              <LetraAlineada lineas={pos.vuelta.letra} activa={pos.lineaActiva} tamTexto={20} tamAcorde={13} />
            </div>
          </>
        )}

        {modo === "percusion" && (
          <>
            <div style={{ flex: "0 0 220px", borderRadius: 14, background: acordeColor, padding: "11px 13px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: acordeInkC, opacity: 0.85 }}>
                {pos.vuelta.nombre} · vuelta {pos.vuelta.indice}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, lineHeight: 1, color: acordeInkC }}>{pos.compasEnSeccion}</div>
                <div style={{ fontFamily: MONO, fontSize: 15, color: acordeInkC, opacity: 0.85 }}>/{pos.vuelta.compases}</div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                {[1, 2, 3, 4].map((n) => {
                  const on = tocando && beat === n - 1;
                  return (
                    <div key={n} style={{ flex: 1, height: 26, borderRadius: 6, background: on ? "var(--accent)" : "rgba(0,0,0,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 12, color: on ? "var(--accentInk)" : acordeInkC }}>
                      {n}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontFamily: MONO, fontWeight: 700, fontSize: 9, color: acordeInkC }}>
                4/4 · {pos.vuelta.bpmEfectivo || cancion.bpm || "—"} BPM · compás {pos.compasGlobal} de {total}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ flex: 1, borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)" }}>Recorrido · qué viene</div>
                <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
                  {vueltas.slice(pos.idx, pos.idx + 4).map((b, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, borderRadius: 10, padding: "8px 9px", background: i === 0 ? colorRaizAcorde(b.acordes[0]?.notaRaiz ?? "C", b.acordes[0]?.calidad ?? "mayor") : "var(--card2)", border: i === 0 ? "1px solid transparent" : "1px solid var(--line)", color: i === 0 ? "#fff" : "var(--muted)" }}>
                      <div style={{ fontFamily: "var(--font-manrope), sans-serif", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.deVueltas > 1 ? `${b.nombre} ${b.indice}/${b.deVueltas}` : b.nombre}
                      </div>
                      <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 9, opacity: 0.8 }}>{b.compases}c · {mmss(b.duracionSegundos)}</div>
                      <div style={{ marginTop: 5, fontFamily: MONO, fontWeight: 700, fontSize: 11, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {b.acordes.map((a) => simboloAcorde(a.notaRaiz, a.calidad)).join(" ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: "none", display: "flex", gap: 7 }}>
                <div style={{ flex: 1, borderRadius: 12, background: "var(--card2)", border: "1px solid var(--line)", padding: "8px 10px" }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>Armonía (apoyo)</div>
                  <div style={{ marginTop: 4, fontFamily: MONO, fontWeight: 700, fontSize: 14, color: acordeColor }}>
                    {simboloAcorde(pos.acorde.notaRaiz, pos.acorde.calidad)} → {simboloAcorde(pos.acordeSiguiente.notaRaiz, pos.acordeSiguiente.calidad)}
                  </div>
                </div>
                <div style={{ flex: 1.4, minWidth: 0, borderRadius: 12, background: "var(--card2)", border: "1px solid var(--line)", padding: "8px 10px" }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>Letra (apoyo)</div>
                  <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {letraPlana(pos.vuelta.letra, pos.lineaActiva) || "— instrumental —"}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {modo === "voz" && (
          <div style={{ flex: 1, minWidth: 0, borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)" }}>
                {pos.vuelta.nombre} · vuelta {pos.vuelta.indice} · compás {pos.compasEnSeccion}
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11, color: acordeColor }}>
                {simboloAcorde(pos.acorde.notaRaiz, pos.acorde.calidad)} → {simboloAcorde(pos.acordeSiguiente.notaRaiz, pos.acordeSiguiente.calidad)}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <LetraAlineada lineas={pos.vuelta.letra} activa={pos.lineaActiva} tamTexto={30} tamAcorde={10} />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--faint)" }}>
              Entra en {Math.max(1, Math.ceil(pos.restanteCompases))} c. · sigue {pos.siguienteVuelta.nombre}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: "none", padding: "0 16px 8px", display: "flex", alignItems: "center", gap: 9, fontFamily: MONO, fontSize: 9, color: "var(--faint)" }}>
        <span>El conteo sale del BPM y los compases — nadie lo cronometra a mano.</span>
        <span style={{ flex: 1 }} />
        <span>Esta misma vista se usa en Show; ahí avanza sola según el set list.</span>
      </div>

      <style>{`@media (orientation: portrait){ .portrait-hint{ display:block !important } }`}</style>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  cursor: "pointer",
  width: 26,
  height: 26,
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--muted)",
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: MONO,
  fontSize: 12,
};

// ---- Vista vertical (borrador de solo lectura) --------------------------
function ModoVertical({ cancion, prioridad, volverHref }: { cancion: CancionCompleta; prioridad: PrioridadMusico; volverHref: string }) {
  const vueltas = useMemo(() => expandirCancion(cancion), [cancion]);
  const total = useMemo(() => sumaCompases(vueltas), [vueltas]);
  const dur = useMemo(() => sumaDuracion(vueltas), [vueltas]);
  const letraGrande = prioridad === "voz";

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <Link href={volverHref} className="mb-3 inline-block text-sm no-underline" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ Canciones
        </Link>
        <h1 className="flex flex-wrap items-center gap-2.5 text-[26px] font-extrabold tracking-tight" style={{ color: "oklch(0.24 0.02 55)", fontFamily: DISPLAY }}>
          {cancion.titulo}
          <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ fontFamily: MONO, border: "1px dashed oklch(0.64 0.15 34)", color: "oklch(0.64 0.15 34)" }}>
            Borrador
          </span>
        </h1>
        <div className="mt-1 text-xs uppercase tracking-[0.1em]" style={{ fontFamily: MONO, color: "oklch(0.5 0.02 55)" }}>
          {cancion.tonalidadNota}
          {cancion.tonalidadModo === "menor" ? "m" : ""} · {cancion.bpm ?? "—"} BPM · {total} compases · {cancion.duracionSegundos !== null ? formatoMMSS(cancion.duracionSegundos) : mmss(dur)}
        </div>
        <p className="mt-2 text-xs" style={{ color: "oklch(0.5 0.13 70)" }}>
          Borrador en construcción — para tocarla en modo lista, un administrador tiene que marcarla como lista.
        </p>

        {(cancion.audioReferenciaUrl || cancion.audioSecuenciaUrl) && (
          <div className="mt-4 flex flex-col gap-2">
            {cancion.audioReferenciaUrl && <AudioMini titulo="Audio de referencia" url={cancion.audioReferenciaUrl} />}
            {cancion.audioSecuenciaUrl && <AudioMini titulo="Secuencia final" url={cancion.audioSecuenciaUrl} />}
          </div>
        )}
      </div>

      <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-3 px-5">
        {vueltas.map((v, i) => (
          <div key={`${v.seccionId}-${v.indice}`} className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: `1px solid ${v.esVariante ? "oklch(0.64 0.15 34)" : "oklch(0.89 0.013 78)"}` }}>
            <div className="mb-3 flex flex-wrap items-baseline gap-2">
              <span className="text-xs" style={{ fontFamily: MONO, color: "oklch(0.6 0.02 55)" }}>{i + 1}</span>
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: "oklch(0.24 0.02 55)", fontFamily: DISPLAY }}>{v.nombre}</h2>
              {v.deVueltas > 1 && (
                <span className="text-xs" style={{ fontFamily: MONO, color: v.esVariante ? "oklch(0.5 0.13 34)" : "oklch(0.6 0.02 55)" }}>
                  vuelta {v.indice}/{v.deVueltas}{v.esVariante ? " · aparte" : ""}
                </span>
              )}
              <span className="text-xs" style={{ fontFamily: MONO, color: "oklch(0.6 0.02 55)" }}>— {v.compases} compases</span>
            </div>
            {v.acordes.length > 0 && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, v.acordes.length))}, 1fr)` }}>
                {v.acordes.map((a) => (
                  <ChordBlock key={a.id} acorde={a} densidad={v.acordes.length <= 4 ? "grande" : v.acordes.length <= 8 ? "media" : "compacta"} />
                ))}
              </div>
            )}
            {v.letra.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5" style={{ fontFamily: MONO }}>
                <LetraAlineada lineas={v.letra} activa={null} tamTexto={letraGrande ? 18 : 14} tamAcorde={11} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioMini({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: "oklch(0.5 0.02 55)" }}>{titulo}</div>
      <audio controls preload="none" src={url} className="w-full" style={{ height: 36 }} />
    </div>
  );
}

// ---- Punto de entrada ---------------------------------------------------
export function VistaFinal({
  cancion,
  setlist,
  seteosContexto = [],
  prioridad,
  modo,
  puedeEditar = false,
}: {
  cancion: CancionCompleta;
  setlist: { id: string; nombre: string } | null;
  seteosContexto?: SeteoEnContexto[];
  prevId?: string | null;
  nextId?: string | null;
  prioridad: PrioridadMusico;
  modo: "vertical" | "horizontal";
  soloLectura?: boolean;
  puedeEditar?: boolean;
}) {
  const volverHref = setlist ? `/set-list/${setlist.id}/vivo` : `/canciones?banda=${cancion.bandaId}`;

  if (modo === "vertical") {
    return <ModoVertical cancion={cancion} prioridad={prioridad} volverHref={volverHref} />;
  }
  return (
    <ModoLista
      cancion={cancion}
      prioridad={prioridad}
      puedeEditar={puedeEditar}
      desdeSetlist={setlist ? setlist.nombre : null}
      volverHref={volverHref}
      seteosContexto={seteosContexto}
    />
  );
}
