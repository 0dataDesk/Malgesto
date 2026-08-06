"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { SetlistItem } from "@/lib/setlistsData";
import {
  ETIQUETA_BLOQUE,
  calcularSubtotalesPorSeccion,
  calcularAcumuladoGlobal,
  itemActualPorTiempo,
  type ItemParaDuracion,
} from "@/lib/setlistCatalogo";
import { formatoMMSS } from "@/lib/duracion";
import { iniciarEnVivoAction, detenerEnVivoAction, corregirEnVivoAction, obtenerEnVivoIniciadoEnAction } from "@/app/set-list/actions";

const COLOR_ADVERTENCIA = "oklch(0.75 0.15 70)";
const COLOR_ACENTO = "oklch(0.74 0.12 78)";

// Brief "Cronómetro sincronizado en vivo": en_vivo_iniciado_en es la única
// fuente de verdad, compartida en la base — nunca un timer local
// independiente por dispositivo. Cada dispositivo:
// 1. Poll corto (4s) para enterarse si OTRO dispositivo inició/detuvo/
//    corrigió el cronómetro.
// 2. Tick local (1s) solo para refrescar el reloj en pantalla entre polls
//    — el cálculo real siempre sale de (ahora del navegador - iniciadoEn),
//    nunca de un contador propio que pueda irse desincronizando.
function useEnVivoSincronizado(setlistId: string, bandaId: string, inicial: string | null) {
  const [iniciadoEn, setIniciadoEn] = useState(inicial);
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const actual = await obtenerEnVivoIniciadoEnAction(setlistId, bandaId);
        setIniciadoEn((prev) => (actual !== prev ? actual : prev));
      } catch {
        // Un poll fallido no es motivo de error visible — se reintenta solo.
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [setlistId, bandaId]);

  useEffect(() => {
    if (!iniciadoEn) return;
    const tick = setInterval(() => setAhoraMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [iniciadoEn]);

  const elapsedSegundos = iniciadoEn ? Math.max(0, Math.floor((ahoraMs - new Date(iniciadoEn).getTime()) / 1000)) : 0;
  return { iniciadoEn, setIniciadoEn, elapsedSegundos };
}

export function SetlistEnVivoCliente({
  setlistId,
  bandaId,
  nombre,
  items,
  enVivoIniciadoEnInicial,
}: {
  setlistId: string;
  bandaId: string;
  nombre: string;
  items: SetlistItem[];
  enVivoIniciadoEnInicial: string | null;
}) {
  const { iniciadoEn, setIniciadoEn, elapsedSegundos } = useEnVivoSincronizado(setlistId, bandaId, enVivoIniciadoEnInicial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  let contadorTomas = 0;
  const numeros = items.map((it) => (it.tipo === "marcador" ? null : ++contadorTomas));

  const itemsParaCalculo: ItemParaDuracion[] = items.map((it) => ({
    tipo: it.tipo,
    duracionSegundos: it.duracionSegundos,
    cancion: it.cancion ? { duracionSegundos: it.cancion.duracionSegundos } : null,
  }));
  const { porMarcador, total } = calcularSubtotalesPorSeccion(itemsParaCalculo);
  const { inicioDe } = calcularAcumuladoGlobal(itemsParaCalculo);
  const indiceActual = iniciadoEn ? itemActualPorTiempo(itemsParaCalculo, elapsedSegundos) : null;

  const iniciar = () => {
    setError(null);
    startTransition(async () => {
      try {
        setIniciadoEn(await iniciarEnVivoAction(setlistId, bandaId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo iniciar el cronómetro.");
      }
    });
  };

  const detener = () => {
    setError(null);
    startTransition(async () => {
      try {
        await detenerEnVivoAction(setlistId, bandaId);
        setIniciadoEn(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo detener el cronómetro.");
      }
    });
  };

  // Brief "Corrección manual": reescribe en_vivo_iniciado_en a (ahora -
  // suma_de_duraciones_hasta_ese_punto) — el server action hace la resta
  // con SU reloj, acá solo mandamos el offset ya calculado.
  const corregir = (indice: number) => {
    setError(null);
    startTransition(async () => {
      try {
        setIniciadoEn(await corregirEnVivoAction(setlistId, bandaId, inicioDe[indice]));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo corregir el cronómetro.");
      }
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.22 0.02 52)" }}>
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <Link href={`/set-list/${setlistId}`} className="mb-4 inline-block text-sm no-underline" style={{ color: "oklch(0.7 0.03 60)" }}>
          ‹ {nombre}
        </Link>
        <h1 className="mb-1 text-[28px] font-extrabold" style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}>
          En vivo
        </h1>
        <div className="mb-4 font-mono text-xs" style={{ color: "oklch(0.7 0.03 60)" }}>
          {items.length} {items.length === 1 ? "item" : "items"} · Total: {formatoMMSS(total.segundos)}
          {total.faltanTiempos && (
            <span className="ml-1" style={{ color: COLOR_ADVERTENCIA }} title="Faltan tiempos por capturar">
              ?
            </span>
          )}
        </div>

        {/* Brief "Cronómetro sincronizado": reloj + Iniciar/Detener — el
            valor mostrado sale siempre de (ahora - iniciadoEn), sincronizado
            entre dispositivos vía poll, nunca un contador local propio. */}
        <div
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl p-4"
          style={{ background: "oklch(0.28 0.025 55)", border: "1px solid oklch(0.34 0.03 55)" }}
        >
          <div>
            <div className="font-mono text-[28px] font-bold tracking-tight" style={{ color: COLOR_ACENTO }}>
              {formatoMMSS(elapsedSegundos)}
              <span className="text-sm font-normal" style={{ color: "oklch(0.6 0.03 60)" }}>
                {" "}
                / {formatoMMSS(total.segundos)}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wide" style={{ color: "oklch(0.6 0.03 60)" }}>
              {iniciadoEn ? "Corriendo" : "Detenido"}
            </div>
          </div>
          <button
            type="button"
            onClick={iniciadoEn ? detener : iniciar}
            disabled={pending}
            className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
            style={
              iniciadoEn
                ? { background: "oklch(0.6 0.15 25 / 0.16)", color: "oklch(0.72 0.15 30)" }
                : { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
            }
          >
            {pending ? "…" : iniciadoEn ? "Detener" : "Iniciar"}
          </button>
        </div>
        {error && (
          <p className="mb-4 text-sm" style={{ color: "oklch(0.65 0.15 25)" }}>
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {items.map((item, i) => {
            if (item.tipo === "marcador") {
              return (
                <div key={item.id} className="flex items-center gap-2.5 py-1">
                  <div className="h-px flex-1" style={{ background: "oklch(0.4 0.03 60)" }} />
                  <span
                    className="shrink-0 rounded-full px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide"
                    style={{ background: "oklch(0.34 0.03 55)", color: "oklch(0.85 0.08 80)" }}
                  >
                    {item.etiqueta}
                    {porMarcador[i] && (
                      <span className="ml-1.5 font-normal normal-case opacity-80">
                        · {formatoMMSS(porMarcador[i]!.segundos)}
                        {porMarcador[i]!.faltanTiempos && <span style={{ color: COLOR_ADVERTENCIA }}>?</span>}
                      </span>
                    )}
                  </span>
                  <div className="h-px flex-1" style={{ background: "oklch(0.4 0.03 60)" }} />
                </div>
              );
            }

            const resaltado = i === indiceActual;
            const anilloResaltado = resaltado ? { boxShadow: "0 0 0 2px oklch(0.64 0.15 34)" } : {};

            return (
              <div key={item.id} className="flex items-stretch gap-2">
                {item.tipo === "cancion" && item.cancion ? (
                  <Link
                    href={`/canciones/${item.cancion.id}?setlist=${setlistId}`}
                    className="flex flex-1 items-center gap-3 rounded-2xl p-3.5 no-underline"
                    style={{ background: "oklch(0.28 0.025 55)", border: "1px solid oklch(0.34 0.03 55)", ...anilloResaltado }}
                  >
                    <span className="font-mono text-sm font-bold" style={{ color: resaltado ? "oklch(0.64 0.15 34)" : COLOR_ACENTO }}>
                      {resaltado ? "▶" : numeros[i]}
                    </span>
                    <div className="flex-1">
                      <div className="text-[16px] font-bold" style={{ color: "oklch(0.97 0.012 82)", fontFamily: "var(--font-bricolage), sans-serif" }}>
                        {item.cancion.titulo}
                      </div>
                      <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.72 0.03 60)" }}>
                        {item.cancion.tonalidadNota}
                        {item.cancion.tonalidadModo === "menor" ? "m" : ""}
                        {item.cancion.bpm ? ` · ${item.cancion.bpm} BPM` : ""}
                        {item.cancion.duracionSegundos !== null ? ` · ${formatoMMSS(item.cancion.duracionSegundos)}` : ""}
                        {item.cancion.duracionSegundos === null && (
                          <span className="ml-1" style={{ color: COLOR_ADVERTENCIA }} title="Falta capturar la duración">
                            ?
                          </span>
                        )}
                      </div>
                      {item.notasTransicion && (
                        <div className="mt-1 text-xs italic" style={{ color: "oklch(0.6 0.05 70)" }}>
                          {item.notasTransicion}
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div
                    className="flex flex-1 items-center gap-3 rounded-2xl p-3.5"
                    style={{ background: "oklch(0.24 0.02 55)", border: "1px dashed oklch(0.5 0.05 60)", ...anilloResaltado }}
                  >
                    <span className="font-mono text-sm font-bold" style={{ color: resaltado ? "oklch(0.64 0.15 34)" : "oklch(0.6 0.05 60)" }}>
                      {resaltado ? "▶" : numeros[i]}
                    </span>
                    <div className="flex-1">
                      <span
                        className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: "oklch(0.34 0.03 55)", color: "oklch(0.8 0.03 60)" }}
                      >
                        {ETIQUETA_BLOQUE[item.tipo as "secuencia" | "interludio"]}
                      </span>
                      <div className="mt-1 text-[16px] font-bold italic" style={{ color: "oklch(0.9 0.02 60)" }}>
                        {item.etiqueta}
                      </div>
                      <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.72 0.03 60)" }}>
                        {item.duracionSegundos !== null ? (
                          formatoMMSS(item.duracionSegundos)
                        ) : (
                          <span style={{ color: COLOR_ADVERTENCIA }} title="Falta capturar la duración">
                            ?
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Brief "Corrección manual": marca "estamos acá" en
                    cualquier item real, corriendo o no — reescribe
                    en_vivo_iniciado_en para realinear a todos los
                    dispositivos sin perder sincronía. Botón separado del
                    <Link> (no anidar <button> dentro de <a>). */}
                <button
                  type="button"
                  onClick={() => corregir(i)}
                  disabled={pending}
                  title="Estamos acá"
                  className="shrink-0 rounded-xl px-3 text-sm font-bold disabled:opacity-40"
                  style={{ background: "oklch(0.34 0.03 55)", color: "oklch(0.8 0.03 60)" }}
                >
                  ▶
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
