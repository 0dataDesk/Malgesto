"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CategoriaDispositivo, ControlDiseno, Seteo } from "@/lib/dispositivosData";
import { actualizarValoresSeteoAction, crearSeteoParaCancionAction, crearSeteoGeneralAction } from "@/app/seteos/actions";
import { PanelDispositivo } from "./PanelDispositivo";
import { PanelAfinador } from "./PanelAfinador";

// Vista compartida (brief "Seteos — selector único global..." §1): un solo
// selector General/+/Canciones a nivel de página, en vez de uno por
// dispositivo — vive acá porque es lo único que este componente y
// SeteosLista necesitan tener en común.
export type Vista = { tipo: "general" } | { tipo: "cancion"; cancionId: string; cancionTitulo: string };

export type DispositivoConSeteos = {
  id: string;
  bandaId: string;
  categoria: CategoriaDispositivo;
  disenoMarca: string;
  disenoModelo: string;
  apodo: string | null;
  habilitado: boolean;
  controles: ControlDiseno[];
  seteos: Seteo[];
  // Colores reales de marca del diseño (brief "Seteos — fix de navegación,
  // colores de marca..." §4) — el panel del dispositivo los usa en vez de
  // los tokens de color de la app.
  colorFondo: string | null;
  colorAcento: string | null;
  colorTexto: string | null;
};

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ROJO = "oklch(0.55 0.15 25)";

// Foco/LED de habilitado (brief "DispositivoBloque — el switch de
// habilitado se ve como foco/LED"): mismo lenguaje visual que ya usa
// ControlDecorativo para `tipo='luz'` (círculo + glow al estar prendido),
// en vez del switch tipo interruptor clásico — mismo comportamiento
// clickeable de antes, solo cambia la forma.
function LedHabilitado({ activo, onClick, disabled }: { activo: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={activo ? "Deshabilitar dispositivo" : "Habilitar dispositivo"}
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-full p-2 disabled:opacity-50"
    >
      <span
        className="block h-3 w-3 rounded-full transition-all"
        style={{
          background: activo ? "oklch(0.72 0.19 25)" : "oklch(0.8 0.013 78)",
          boxShadow: activo ? "0 0 6px 1px oklch(0.72 0.19 25 / 0.7)" : "none",
        }}
      />
    </button>
  );
}

// Un dispositivo dentro de /seteos (brief "Seteos — selector único global,
// dispositivos colapsables/habilitables..."): colapsable (colapsado solo
// muestra el nombre una vez + el switch de habilitado), y resuelve su propio
// seteo para la `vista` compartida (general o una canción puntual) — si la
// vista es una canción y todavía no existe seteo propio para ella, lo crea
// on-demand (mismo comportamiento que antes, ahora disparado por la
// selección global en vez de un selector propio).
export function DispositivoBloque({
  dispositivo,
  vista,
  instrumentoActivoId,
  colorCadena,
  onValoresCambiados,
  onSeteoCreado,
  onHabilitadoChange,
  pendingHabilitado,
}: {
  dispositivo: DispositivoConSeteos;
  vista: Vista;
  // Brief "Instrumentos propios + selector de instrumento activo en Seteos"
  // §2: null cuando la persona tiene 0/1 instrumento propio (comportamiento
  // de siempre, sin filtrar) o cuando todavía no hay ninguno activo.
  instrumentoActivoId: string | null;
  // Brief "Seteos: completar selector de instrumento + rediseño de cadena"
  // §2: acento del grupo (Amplificadores/Pedales·FX) al que pertenece este
  // dispositivo -- borde izquierdo del color del grupo, para que se lea como
  // un eslabón de esa cadena. undefined = sin acento (ej. en Deshabilitados,
  // que queda fuera de la cadena visual).
  colorCadena?: string;
  onValoresCambiados: (dispositivoId: string, seteoId: string, valores: Record<string, number>) => void;
  onSeteoCreado: (dispositivoId: string, seteo: Seteo) => void;
  onHabilitadoChange: (dispositivoId: string, habilitado: boolean) => void;
  pendingHabilitado: boolean;
}) {
  const [colapsado, setColapsado] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState<"guardado" | "guardando" | "error">("guardado");
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [creando, startCrear] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creandoParaClave = useRef<string | null>(null);

  const seteoActual =
    vista.tipo === "general"
      ? dispositivo.seteos.find((s) => s.esGeneral && s.instrumentoPropioId === instrumentoActivoId) ?? null
      : dispositivo.seteos.find((s) => s.cancionId === vista.cancionId && s.instrumentoPropioId === instrumentoActivoId) ?? null;

  // Crea on-demand el seteo que falte para la vista+instrumento actuales:
  // el de una canción puntual (mismo criterio de siempre: "opcional", se
  // crea recién al elegir verla) o, desde el brief "Instrumentos propios...",
  // el general de un instrumento puntual (el general sin instrumento ya lo
  // garantiza el server antes de renderizar, ver app/seteos/page.tsx, así
  // que acá no hace falta crearlo). `creandoParaClave` evita disparar una
  // segunda creación si el componente vuelve a renderizar mientras la
  // primera sigue en vuelo, o si vista/instrumento cambian y vuelven al
  // mismo valor antes de que la anterior termine.
  useEffect(() => {
    if (seteoActual) return;
    if (vista.tipo === "general" && instrumentoActivoId === null) return;
    const clave = `${vista.tipo === "cancion" ? vista.cancionId : "general"}:${instrumentoActivoId ?? "sin-instrumento"}`;
    if (creandoParaClave.current === clave) return;
    creandoParaClave.current = clave;
    startCrear(async () => {
      try {
        const nuevo =
          vista.tipo === "cancion"
            ? await crearSeteoParaCancionAction(dispositivo.id, dispositivo.bandaId, vista.cancionId, instrumentoActivoId, dispositivo.controles)
            : await crearSeteoGeneralAction(dispositivo.id, dispositivo.bandaId, instrumentoActivoId, dispositivo.controles);
        onSeteoCreado(dispositivo.id, { ...nuevo, cancionTitulo: vista.tipo === "cancion" ? vista.cancionTitulo : null });
      } catch (e) {
        setErrorCrear(e instanceof Error ? e.message : "No se pudo crear el seteo.");
      } finally {
        creandoParaClave.current = null;
      }
    });
  }, [vista, instrumentoActivoId, seteoActual, dispositivo.id, dispositivo.bandaId, dispositivo.controles, onSeteoCreado]);

  const cambiarValor = (controlId: string, v: number) => {
    if (!seteoActual) return;
    const nuevoValores = { ...seteoActual.valores, [controlId]: v };
    onValoresCambiados(dispositivo.id, seteoActual.id, nuevoValores);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEstadoGuardado("guardando");
    debounceRef.current = setTimeout(() => {
      actualizarValoresSeteoAction(seteoActual.id, dispositivo.id, dispositivo.bandaId, nuevoValores)
        .then(() => setEstadoGuardado("guardado"))
        .catch(() => setEstadoGuardado("error"));
    }, 400);
  };

  const nombreMostrado = dispositivo.apodo || `${dispositivo.disenoMarca} ${dispositivo.disenoModelo}`;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "oklch(0.99 0.008 82)",
        border: "1px solid oklch(0.89 0.013 78)",
        borderLeft: colorCadena ? `3px solid ${colorCadena}` : "1px solid oklch(0.89 0.013 78)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setColapsado((v) => !v)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
          <span
            className="shrink-0 font-mono text-xs"
            style={{ color: TEXTO_GRIS, transform: colapsado ? "none" : "rotate(90deg)", transition: "transform 0.15s", display: "inline-block" }}
          >
            ›
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px] font-bold" style={{ color: TEXTO_OSCURO, fontFamily: "var(--font-bricolage), sans-serif" }}>
              {nombreMostrado}
            </span>
            {!colapsado && dispositivo.apodo && (
              <span className="mt-0.5 block font-mono text-xs uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
                {dispositivo.disenoMarca} {dispositivo.disenoModelo}
              </span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2.5">
          {!colapsado && (
            <span className="font-mono text-[10px] uppercase" style={{ color: estadoGuardado === "error" ? ROJO : TEXTO_GRIS }}>
              {estadoGuardado === "guardando" ? "Guardando…" : estadoGuardado === "error" ? "Error" : "Guardado"}
            </span>
          )}
          <LedHabilitado
            activo={dispositivo.habilitado}
            disabled={pendingHabilitado}
            onClick={() => onHabilitadoChange(dispositivo.id, !dispositivo.habilitado)}
          />
        </div>
      </div>

      {!colapsado && (
        <div className="mt-4">
          {creando && (
            <p className="text-center text-sm" style={{ color: TEXTO_GRIS }}>
              Creando seteo para esta canción…
            </p>
          )}
          {!creando && errorCrear && (
            <p className="text-sm" style={{ color: ROJO }}>
              {errorCrear}
            </p>
          )}
          {/* Afinador (brief "Afinador como seteo (pedal)"): único dispositivo del
              catálogo cuya pantalla no es perillas con valores guardados -- la
              nota y el indicador de afinación salen del micrófono en vivo, no
              de seteoActual.valores. Se distingue por modelo porque es el
              único caso hoy; si aparece un segundo dispositivo "en vivo" vale
              la pena generalizar esto a un flag en el diseño. */}
          {!creando && seteoActual && dispositivo.disenoModelo === "Afinador" && (
            <PanelAfinador
              controles={dispositivo.controles}
              valores={seteoActual.valores}
              onChange={cambiarValor}
              colorFondo={dispositivo.colorFondo}
              colorAcento={dispositivo.colorAcento}
              colorTexto={dispositivo.colorTexto}
            />
          )}
          {!creando && seteoActual && dispositivo.disenoModelo !== "Afinador" && (
            <PanelDispositivo
              controles={dispositivo.controles}
              valores={seteoActual.valores}
              onChange={cambiarValor}
              colorFondo={dispositivo.colorFondo}
              colorAcento={dispositivo.colorAcento}
              colorTexto={dispositivo.colorTexto}
            />
          )}
        </div>
      )}
    </div>
  );
}
