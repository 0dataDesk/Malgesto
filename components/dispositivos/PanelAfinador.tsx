"use client";

import { useEffect, useRef, useState } from "react";
import type { ControlDiseno } from "@/lib/dispositivosData";
import { construirTema } from "./PanelDispositivo";
import { Boton } from "./Boton";
import { detectarTonoYIN, frecuenciaANota, cuerdaMasCercana, type NotaDetectada } from "@/lib/pitchDetection";

// Afinador en vivo (Seteos, brief "Afinador como seteo (pedal)"): a
// diferencia de los demás dispositivos del catálogo, este pedal no tiene
// perillas con valores guardados -- la nota detectada y el indicador de
// afinación salen del micrófono en tiempo real (Web Audio API), no de
// `seteo.valores`. Lo único que SÍ persiste como un seteo normal es el modo
// de afinación (Estándar/Drop D, control tipo "boton" real en el diseño) --
// reutiliza el mismo <Boton> y el mismo onChange que cualquier otro
// dispositivo, así que ese valor viaja con el seteo general/por canción como
// siempre.
//
// El micrófono solo se activa con un click explícito (nunca automático al
// entrar a la pantalla) -- requisito del navegador para getUserMedia y,
// además, ningún usuario quiere que Malgesto escuche de arranque.
//
// Umbral de "afinado": ±5 cents, igual de estricto que un afinador de pedal
// real. Fuera de ese rango, bemol (grave, hay que subir la cuerda) o
// sostenido (agudo, hay que bajarla).
const TOLERANCIA_CENTS = 5;
const FFT_SIZE = 4096;
const INTERVALO_DETECCION_MS = 100;

function encontrarControlModo(controles: ControlDiseno[]): ControlDiseno | null {
  return controles.find((c) => c.tipo === "boton") ?? null;
}

export function PanelAfinador({
  controles,
  valores,
  onChange,
  colorFondo,
  colorAcento,
  colorTexto,
}: {
  controles: ControlDiseno[];
  valores: Record<string, number>;
  onChange: (controlId: string, valor: number) => void;
  colorFondo: string | null;
  colorAcento: string | null;
  colorTexto: string | null;
}) {
  const tema = construirTema(colorFondo, colorAcento, colorTexto);
  const controlModo = encontrarControlModo(controles);
  const dropD = controlModo ? Math.round(valores[controlModo.id] ?? controlModo.valorDefault ?? 0) === (controlModo.max ?? 1) : false;

  const [escuchando, setEscuchando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState<NotaDetectada | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detener = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setEscuchando(false);
    setNota(null);
  };

  useEffect(() => () => detener(), []);

  const iniciar = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const audioCtx = new AudioContext();
      const fuente = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      fuente.connect(analyser);

      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      intervalRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const freq = detectarTonoYIN(buffer, audioCtx.sampleRate);
        setNota(freq > 0 ? frecuenciaANota(freq) : null);
      }, INTERVALO_DETECCION_MS);

      setEscuchando(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisá los permisos del navegador.");
    }
  };

  const cuerda = nota ? cuerdaMasCercana(nota.freq, dropD) : null;
  const afinado = nota !== null && Math.abs(nota.cents) <= TOLERANCIA_CENTS;
  const bemol = nota !== null && nota.cents < -TOLERANCIA_CENTS;
  const sostenido = nota !== null && nota.cents > TOLERANCIA_CENTS;

  const luz = (activa: boolean) => (
    <div
      className="h-3 w-3 rounded-full"
      style={
        activa
          ? { background: "oklch(0.72 0.19 25)", boxShadow: "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)" }
          : { background: tema.superficie, border: `1px solid ${tema.textoSecundario}` }
      }
    />
  );

  return (
    <div className="w-full rounded-2xl p-4" style={{ background: tema.fondo, border: `4px solid ${tema.acento}` }}>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={escuchando ? detener : iniciar}
          className="rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide"
          style={{ background: escuchando ? tema.acento : tema.superficie, color: escuchando ? tema.texto : tema.textoSecundario, border: `1px solid ${tema.texto}` }}
        >
          {escuchando ? "Detener" : "Escuchar"}
        </button>

        {error && (
          <p className="text-center font-mono text-[10px]" style={{ color: "oklch(0.72 0.19 25)" }}>
            {error}
          </p>
        )}

        <div className="flex min-h-[64px] flex-col items-center justify-center">
          {nota ? (
            <>
              <div className="font-mono font-bold leading-none" style={{ color: tema.texto, fontSize: "40px" }}>
                {nota.nombre}
                <span style={{ fontSize: "20px", color: tema.textoSecundario }}>{nota.octava}</span>
              </div>
              <div className="mt-1 font-mono text-xs" style={{ color: tema.textoSecundario }}>
                {nota.cents > 0 ? "+" : ""}
                {nota.cents} cents · {nota.freq.toFixed(1)} Hz
              </div>
            </>
          ) : (
            <div className="font-mono text-xs uppercase tracking-wide" style={{ color: tema.textoSecundario }}>
              {escuchando ? "Escuchando…" : "Tocá una cuerda"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            {luz(bemol)}
            <span className="font-mono text-[9px]" style={{ color: tema.textoSecundario }}>
              ♭
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {luz(afinado)}
            <span className="font-mono text-[9px]" style={{ color: tema.textoSecundario }}>
              OK
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {luz(sostenido)}
            <span className="font-mono text-[9px]" style={{ color: tema.textoSecundario }}>
              ♯
            </span>
          </div>
        </div>

        {cuerda && (
          <div className="font-mono text-[10px]" style={{ color: tema.textoSecundario }}>
            Cuerda más cercana: {cuerda.nombre}
            {cuerda.octava} ({cuerda.freq} Hz)
          </div>
        )}

        {controlModo && (
          <Boton
            control={controlModo}
            valor={valores[controlModo.id] ?? controlModo.valorDefault ?? 0}
            onChange={(v) => onChange(controlModo.id, v)}
            tema={tema}
          />
        )}
      </div>
    </div>
  );
}
