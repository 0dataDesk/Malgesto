"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CancionCompleta, SeccionBase, PrioridadMusico } from "@/lib/cancionesData";
import { actualizarEstadoBorradorAction } from "@/app/canciones/actions";
import type { SeteoEnContexto } from "@/lib/dispositivosData";
import { escalaDiatonica, type Nota, type Modo } from "@/lib/cancionTeoria";
import { formatoMMSS } from "@/lib/duracion";
import { calcularTiempos, compasesDeSeccion, type VueltaExpandida, type VueltaConTiempo } from "@/lib/cancionTiempo";
import { ChordBlock, type Densidad } from "./ChordBlock";
import { LetraLinea } from "./LetraLinea";

const COLOR_ADVERTENCIA = "oklch(0.55 0.15 70)";
const FONDO = "oklch(0.965 0.012 82)";
const TARJETA = "oklch(0.99 0.008 82)";
const BORDE = "oklch(0.89 0.013 78)";
const TINTA = "oklch(0.24 0.02 55)";
const TINTA_SUAVE = "oklch(0.5 0.02 55)";
const ACENTO = "oklch(0.64 0.15 34)";

function textoCompases(n: number): string {
  return `${n} ${n === 1 ? "compás" : "compases"}`;
}

function densidadPorCantidadDeAcordes(totalAcordes: number): Densidad {
  if (totalAcordes <= 8) return "grande";
  if (totalAcordes <= 24) return "media";
  return "compacta";
}
const COLUMNAS_POR_DENSIDAD: Record<Densidad, string> = {
  grande: "grid-cols-2",
  media: "grid-cols-3",
  compacta: "grid-cols-4",
};

// Una vuelta concreta ya resuelta (plantilla o repetición desprendida) lista
// para renderizar.
type VueltaRender = VueltaExpandida & {
  seccion: SeccionBase;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
};

function expandirVueltas(cancion: CancionCompleta): { render: VueltaRender[]; conTiempo: VueltaConTiempo[] } {
  const render: VueltaRender[] = [];
  for (const s of cancion.secciones) {
    for (let vuelta = 1; vuelta <= s.repiteVeces; vuelta++) {
      const override = s.repeticiones.find((r) => r.repeticionIndice === vuelta);
      const seccion: SeccionBase = override ?? s;
      const tonalidadNota = seccion.tonalidadNota ?? cancion.tonalidadNota;
      const tonalidadModo = seccion.tonalidadModo ?? cancion.tonalidadModo;
      const bpmEfectivo = seccion.bpm ?? cancion.bpm ?? 0;
      render.push({
        seccionId: seccion.id,
        nombre: s.nombre,
        indiceRepeticion: vuelta,
        totalRepeticiones: s.repiteVeces,
        compases: compasesDeSeccion(seccion),
        bpmEfectivo,
        esRepeticionDesprendida: !!override,
        seccion,
        tonalidadNota,
        tonalidadModo,
      });
    }
  }
  const conTiempo = calcularTiempos(render);
  return { render, conTiempo };
}

function AudioEmbebido({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: TARJETA, border: `1px solid ${BORDE}` }}>
      <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: TINTA_SUAVE }}>
        {titulo}
      </div>
      <audio controls preload="none" src={url} className="w-full" style={{ height: 36 }} />
    </div>
  );
}

function SeccionCard({
  vuelta,
  indiceGlobal,
  prioridad,
}: {
  vuelta: VueltaRender;
  indiceGlobal: number;
  prioridad: PrioridadMusico;
}) {
  const { seccion } = vuelta;
  const totalAcordes = seccion.acordes.length;
  const densidad = densidadPorCantidadDeAcordes(totalAcordes);
  const escala = escalaDiatonica({ raiz: vuelta.tonalidadNota, modo: vuelta.tonalidadModo });
  // "voz": la letra va primero y protagonista, los acordes chicos de apoyo.
  const letraPrimero = prioridad === "voz";
  const acordesGrandes = prioridad === "ambos" || prioridad === "armonia";
  const densidadGrid = acordesGrandes ? densidad : "compacta";

  const grid =
    totalAcordes > 0 ? (
      <div className={`grid ${COLUMNAS_POR_DENSIDAD[densidadGrid]} gap-2`}>
        {seccion.acordes.map((acorde) => (
          <ChordBlock key={acorde.id} acorde={acorde} densidad={densidadGrid} />
        ))}
      </div>
    ) : null;

  const letra =
    seccion.letra.length > 0 ? (
      <div className="flex flex-col gap-1.5">
        {seccion.letra.map((l) => (
          <LetraLinea key={l.id} linea={l} prioridad={prioridad} />
        ))}
      </div>
    ) : null;

  return (
    <div
      id={`seccion-${vuelta.seccionId}`}
      className="scroll-mt-4 rounded-2xl p-4"
      style={{ background: TARJETA, border: `1px solid ${vuelta.esRepeticionDesprendida ? ACENTO : BORDE}` }}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-xs" style={{ color: "oklch(0.6 0.02 55)" }}>
          {indiceGlobal + 1}
        </span>
        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: TINTA, fontFamily: "var(--font-bricolage), sans-serif" }}>
          {vuelta.nombre}
        </h2>
        {vuelta.totalRepeticiones > 1 && (
          <span className="font-mono text-xs" style={{ color: vuelta.esRepeticionDesprendida ? ACENTO : "oklch(0.6 0.02 55)" }}>
            vuelta {vuelta.indiceRepeticion}/{vuelta.totalRepeticiones}
            {vuelta.esRepeticionDesprendida ? " · aparte" : ""}
          </span>
        )}
        <span className="font-mono text-xs" style={{ color: "oklch(0.6 0.02 55)" }}>
          — {textoCompases(vuelta.compases)}
        </span>
        {(seccion.tonalidadNota || seccion.bpm) && (
          <span className="font-mono text-xs" style={{ color: TINTA_SUAVE }}>
            {seccion.tonalidadNota ? `${vuelta.tonalidadNota}${vuelta.tonalidadModo === "menor" ? "m" : ""}` : ""}
            {seccion.bpm ? ` · ${seccion.bpm} BPM` : ""}
          </span>
        )}
      </div>

      {/* "ritmo": estructura al centro — regla de compases marcando el 1 de
          cada 4, letra y armonía de apoyo chico debajo. */}
      {prioridad === "ritmo" && (
        <div className="mb-3 flex items-center gap-1" aria-hidden>
          {Array.from({ length: Math.min(Math.max(vuelta.compases, 1), 16) }).map((_, i) => (
            <span key={i} className="h-6 flex-1 rounded" style={{ background: i % 4 === 0 ? ACENTO : "oklch(0.9 0.02 60)" }} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {letraPrimero ? (
          <>
            {letra}
            {grid}
          </>
        ) : (
          <>
            {grid}
            {letra}
          </>
        )}
      </div>

      {prioridad === "armonia" && (
        <div className="mt-2 font-mono text-[11px]" style={{ color: "oklch(0.62 0.02 55)" }}>
          Escala {escala.join(" · ")}
        </div>
      )}
    </div>
  );
}

export function VistaFinal({
  cancion,
  prevId,
  nextId,
  setlist,
  seteosContexto,
  modo,
  prioridad,
  soloLectura = false,
  puedeEditar = false,
}: {
  cancion: CancionCompleta;
  prevId: string | null;
  nextId: string | null;
  setlist: { id: string; nombre: string } | null;
  seteosContexto: SeteoEnContexto[];
  modo: "vertical" | "horizontal";
  prioridad: PrioridadMusico;
  soloLectura?: boolean;
  puedeEditar?: boolean;
}) {
  const sufijo = setlist ? `?setlist=${setlist.id}` : "";
  const [pendingEstado, startEstado] = useTransition();
  const { render: vueltas, conTiempo } = useMemo(() => expandirVueltas(cancion), [cancion]);
  const duracionCalculada = conTiempo.length ? conTiempo[conTiempo.length - 1].inicioSegundos + conTiempo[conTiempo.length - 1].duracionSegundos : 0;
  const [cursor, setCursor] = useState(0);

  const cabecera = (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <Link
        href={setlist ? `/set-list/${setlist.id}/vivo` : `/canciones?banda=${cancion.bandaId}`}
        className="mb-3 inline-block text-sm no-underline"
        style={{ color: TINTA_SUAVE }}
      >
        ‹ {setlist ? setlist.nombre : "Canciones"}
      </Link>

      <h1 className="flex flex-wrap items-center gap-2.5 text-[28px] font-extrabold tracking-tight" style={{ color: TINTA, fontFamily: "var(--font-bricolage), sans-serif" }}>
        {cancion.titulo}
        {cancion.esCover && (
          <span className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide" style={{ background: "oklch(0.93 0.016 78)", color: TINTA_SUAVE }}>
            Cover
          </span>
        )}
        {cancion.esBorrador && (
          <span className="rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide" style={{ background: "oklch(0.55 0.15 70 / 0.16)", color: "oklch(0.5 0.13 70)" }}>
            Borrador
          </span>
        )}
      </h1>
      <div className="mt-1 font-mono text-xs uppercase tracking-[0.1em]" style={{ color: TINTA_SUAVE }}>
        {cancion.tonalidadNota}
        {cancion.tonalidadModo === "menor" ? "m" : ""} · {cancion.bpm ?? "—"} BPM ·{" "}
        {cancion.duracionSegundos !== null ? (
          formatoMMSS(cancion.duracionSegundos)
        ) : duracionCalculada > 0 ? (
          <span title="Calculada desde BPM + compases">{formatoMMSS(Math.round(duracionCalculada))}</span>
        ) : (
          <span style={{ color: COLOR_ADVERTENCIA }}>?</span>
        )}{" "}
        · {textoCompases(cancion.totalCompases)}
      </div>

      {soloLectura && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.5 0.13 70)" }}>
          Borrador en construcción — para tocarla, un administrador tiene que marcarla como lista.
        </p>
      )}

      {puedeEditar && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/canciones/${cancion.id}/editar`}
            className="rounded-lg px-3 py-1.5 text-xs font-bold no-underline"
            style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
          >
            Editar
          </Link>
          <button
            type="button"
            disabled={pendingEstado}
            onClick={() => startEstado(() => actualizarEstadoBorradorAction(cancion.id, cancion.bandaId, !cancion.esBorrador))}
            className="rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            style={{ background: cancion.esBorrador ? ACENTO : "oklch(0.93 0.016 78)", color: cancion.esBorrador ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)" }}
          >
            {cancion.esBorrador ? "Marcar como lista" : "Volver a borrador"}
          </button>
        </div>
      )}

      {(cancion.audioReferenciaUrl || cancion.audioSecuenciaUrl) && (
        <div className="mt-4 flex flex-col gap-2">
          {cancion.audioReferenciaUrl && <AudioEmbebido titulo="Audio de referencia" url={cancion.audioReferenciaUrl} />}
          {cancion.audioSecuenciaUrl && <AudioEmbebido titulo="Secuencia (uso en vivo)" url={cancion.audioSecuenciaUrl} />}
        </div>
      )}
    </div>
  );

  // -------- Modo vertical: todo apilado (borrador de solo lectura) --------
  if (modo === "vertical") {
    return (
      <div className="min-h-screen pb-28" style={{ background: FONDO }}>
        {cabecera}
        {vueltas.length > 1 && (
          <div className="mx-auto mt-4 max-w-2xl px-5">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {cancion.secciones.map((s, i) => (
                <a key={s.id} href={`#seccion-${s.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold no-underline" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                  {i + 1} · {s.nombre}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-3 px-5">
          {vueltas.map((v, i) => (
            <SeccionCard key={`${v.seccionId}-${v.indiceRepeticion}`} vuelta={v} indiceGlobal={i} prioridad={prioridad} />
          ))}
        </div>
        <SeteosBloque seteosContexto={seteosContexto} />
      </div>
    );
  }

  // -------- Modo horizontal: una vuelta a la vez (canción lista) --------
  const actual = vueltas[Math.min(cursor, vueltas.length - 1)] ?? null;
  const tiempoActual = conTiempo[Math.min(cursor, conTiempo.length - 1)] ?? null;

  return (
    <div className="min-h-screen pb-28" style={{ background: FONDO }}>
      {cabecera}

      {/* Paginador de secciones */}
      <div className="mx-auto mt-4 max-w-2xl px-5">
        <div className="flex flex-wrap gap-1.5">
          {vueltas.map((v, i) => (
            <button
              key={`${v.seccionId}-${v.indiceRepeticion}`}
              type="button"
              onClick={() => setCursor(i)}
              aria-label={`${v.nombre} vuelta ${v.indiceRepeticion}`}
              className="h-2 rounded-full transition-all"
              style={{ width: i === cursor ? 26 : 8, background: i === cursor ? ACENTO : "oklch(0.82 0.02 60)" }}
            />
          ))}
        </div>
      </div>

      {actual && (
        <div className="mx-auto mt-3 max-w-2xl px-5">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-mono text-xs" style={{ color: TINTA_SUAVE }}>
              {tiempoActual ? formatoMMSS(Math.round(tiempoActual.inicioSegundos)) : "0:00"}
              {duracionCalculada > 0 ? ` / ${formatoMMSS(Math.round(duracionCalculada))}` : ""}
            </span>
            <span className="font-mono text-xs" style={{ color: TINTA_SUAVE }}>
              {cursor + 1} / {vueltas.length}
            </span>
          </div>
          <SeccionCard vuelta={actual} indiceGlobal={cursor} prioridad={prioridad} />
        </div>
      )}

      <SeteosBloque seteosContexto={seteosContexto} />

      {/* Controles discretos de reproducción — no se guardan en base. Los
          del modo Set List existentes no se tocan. */}
      <div className="fixed bottom-8 left-0 right-0 mx-auto flex max-w-2xl items-center justify-center gap-3 px-6">
        <button
          type="button"
          onClick={() => setCursor(0)}
          aria-label="Reiniciar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-base"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor === 0}
          aria-label="Retroceder"
          className="flex h-13 w-13 items-center justify-center rounded-full text-xl disabled:opacity-40"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)", height: 52, width: 52 }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => Math.min(vueltas.length - 1, c + 1))}
          disabled={cursor >= vueltas.length - 1}
          aria-label="Avanzar"
          className="flex items-center justify-center rounded-full text-xl disabled:opacity-40"
          style={{ background: ACENTO, color: "oklch(0.99 0.01 82)", height: 52, width: 52, boxShadow: "0 12px 24px -10px oklch(0.5 0.15 30)" }}
        >
          ›
        </button>
      </div>

      {/* Navegación entre canciones (alfabético o por set list) — se mantiene
          el patrón previo, arriba de los controles de reproducción. */}
      {(prevId || nextId) && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-between px-6">
          <Link
            href={prevId ? `/canciones/${prevId}${sufijo}` : "#"}
            className="font-mono text-xs no-underline"
            style={{ color: TINTA_SUAVE, opacity: prevId ? 1 : 0.3, pointerEvents: prevId ? "auto" : "none" }}
          >
            ‹ anterior
          </Link>
          <Link
            href={nextId ? `/canciones/${nextId}${sufijo}` : "#"}
            className="font-mono text-xs no-underline"
            style={{ color: TINTA_SUAVE, opacity: nextId ? 1 : 0.3, pointerEvents: nextId ? "auto" : "none" }}
          >
            siguiente ›
          </Link>
        </div>
      )}
    </div>
  );
}

function SeteosBloque({ seteosContexto }: { seteosContexto: SeteoEnContexto[] }) {
  if (seteosContexto.length === 0) return null;
  return (
    <div className="mx-auto max-w-2xl px-5 pb-8 pt-5">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TINTA_SUAVE }}>
        Seteos
      </h3>
      <div className="flex flex-col gap-2">
        {seteosContexto.map((s) => (
          <div key={s.seteo.id} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: TARJETA, border: `1px solid ${BORDE}` }}>
            <div className="min-w-0">
              <div className="text-sm font-bold" style={{ color: TINTA }}>
                {s.usuarioNombre} · {s.dispositivo.nombre}
              </div>
              <div className="mt-0.5 truncate font-mono text-xs" style={{ color: TINTA_SUAVE }}>
                {Object.entries(s.seteo.valores)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
            </div>
            <span
              className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: s.etiqueta === "Vinculado" ? ACENTO : "oklch(0.93 0.016 78)",
                color: s.etiqueta === "Vinculado" ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)",
              }}
            >
              {s.etiqueta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
