"use client";

import { useEffect, useState } from "react";
import type { Seteo, InstrumentoPropioResumen } from "@/lib/dispositivosData";
import { actualizarHabilitadoDispositivoAction } from "@/app/seteos/actions";
import { DispositivoBloque, type DispositivoConSeteos, type Vista } from "./DispositivoBloque";

type CancionOpcion = { id: string; titulo: string };

// Brief "Instrumentos propios + selector de instrumento activo en Seteos"
// §2: la selección es "de sesión" pero persiste entre visitas -- localStorage
// en vez de estado del servidor, porque cuál es el instrumento activo no
// tiene por qué sobrevivir a un revalidatePath ni bloquear el primer render.
const LOCALSTORAGE_INSTRUMENTO_ACTIVO = "malgesto:instrumentoActivo";

function etiquetaInstrumentoPropio(i: InstrumentoPropioResumen): string {
  const detalle = [i.marca, i.modelo].filter(Boolean).join(" ");
  return detalle ? `${i.instrumento} · ${detalle}` : i.instrumento;
}

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ACENTO = "oklch(0.64 0.15 34)";
const PILL_INACTIVO = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const PILL_ACTIVO = { background: ACENTO, color: "oklch(0.99 0.01 82)" };

// Orquestador de /seteos (brief "Seteos — selector único global,
// dispositivos colapsables/habilitables..." §1/§2): un solo selector
// General/+/Canciones para toda la página (ya no uno por dispositivo) —
// cambiar la vista hace que cada DispositivoBloque de abajo resuelva su
// propio seteo para esa vista. También ordena la lista (amplificadores
// habilitados primero, después pedales habilitados) y separa los
// deshabilitados en un acordeón cerrado al fondo.
export function SeteosLista({
  dispositivosIniciales,
  cancionesDisponibles,
  nombreBanda,
  instrumentosPropios,
}: {
  dispositivosIniciales: DispositivoConSeteos[];
  cancionesDisponibles: CancionOpcion[];
  nombreBanda: string;
  instrumentosPropios: InstrumentoPropioResumen[];
}) {
  const [dispositivos, setDispositivos] = useState(dispositivosIniciales);
  const [vista, setVista] = useState<Vista>({ tipo: "general" });
  const [picker, setPicker] = useState<"nueva" | "canciones" | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pendingHabilitadoId, setPendingHabilitadoId] = useState<string | null>(null);
  const [deshabilitadosAbierto, setDeshabilitadosAbierto] = useState(false);

  // Brief "Instrumentos propios...": con 0 o 1 instrumento propio queda en
  // null siempre (sin selector, sin filtrar -- comportamiento de siempre).
  // Con 2+, arranca en null en el primer render del servidor (localStorage
  // no existe ahí) y el efecto de abajo lo resuelve apenas monta en el
  // cliente -- por eso DispositivoBloque tiene que tolerar un instante con
  // instrumentoActivoId=null aunque haya 2+ instrumentos (ver ahí: solo crea
  // on-demand, no rompe nada mientras tanto).
  const [instrumentoActivoId, setInstrumentoActivoId] = useState<string | null>(null);
  const [instrumentoAbierto, setInstrumentoAbierto] = useState(false);

  useEffect(() => {
    if (instrumentosPropios.length < 2) return;
    const guardado = localStorage.getItem(LOCALSTORAGE_INSTRUMENTO_ACTIVO);
    const valido = guardado && instrumentosPropios.some((i) => i.id === guardado) ? guardado : instrumentosPropios[0].id;
    // localStorage no existe en el server, así que la sincronización inicial
    // con este estado solo puede pasar acá (efecto de montaje), no derivarse
    // en el render como pide la regla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstrumentoActivoId(valido);
    localStorage.setItem(LOCALSTORAGE_INSTRUMENTO_ACTIVO, valido);
  }, [instrumentosPropios]);

  const elegirInstrumento = (id: string) => {
    setInstrumentoActivoId(id);
    localStorage.setItem(LOCALSTORAGE_INSTRUMENTO_ACTIVO, id);
    setInstrumentoAbierto(false);
  };

  const instrumentoActivo = instrumentosPropios.find((i) => i.id === instrumentoActivoId) ?? null;

  const cancionesConSeteo = cancionesDisponibles.filter((c) => dispositivos.some((d) => d.seteos.some((s) => s.cancionId === c.id)));
  const cancionesFiltradas = cancionesDisponibles.filter((c) => c.titulo.toLowerCase().includes(busqueda.trim().toLowerCase()));

  // Amplificadores habilitados primero, después pedales habilitados (brief
  // §2) — sort estable, dentro de cada categoría se conserva el orden que ya
  // trae `dispositivos` (creación).
  const ordenar = (lista: DispositivoConSeteos[]) => [...lista].sort((a, b) => (a.categoria === "pedal" ? 1 : 0) - (b.categoria === "pedal" ? 1 : 0));
  const habilitados = ordenar(dispositivos.filter((d) => d.habilitado));
  const deshabilitados = ordenar(dispositivos.filter((d) => !d.habilitado));

  const elegirGeneral = () => {
    setVista({ tipo: "general" });
    setPicker(null);
  };

  const toggleNueva = () => {
    setBusqueda("");
    setPicker((p) => (p === "nueva" ? null : "nueva"));
  };

  const toggleCanciones = () => {
    setPicker((p) => (p === "canciones" ? null : "canciones"));
  };

  const elegirCancion = (c: CancionOpcion) => {
    setVista({ tipo: "cancion", cancionId: c.id, cancionTitulo: c.titulo });
    setPicker(null);
  };

  const onValoresCambiados = (dispositivoId: string, seteoId: string, valores: Record<string, number>) => {
    setDispositivos((prev) =>
      prev.map((d) => (d.id !== dispositivoId ? d : { ...d, seteos: d.seteos.map((s) => (s.id === seteoId ? { ...s, valores } : s)) }))
    );
  };

  const onSeteoCreado = (dispositivoId: string, seteo: Seteo) => {
    setDispositivos((prev) =>
      prev.map((d) => (d.id !== dispositivoId || d.seteos.some((s) => s.id === seteo.id) ? d : { ...d, seteos: [...d.seteos, seteo] }))
    );
  };

  const onHabilitadoChange = (dispositivoId: string, habilitado: boolean) => {
    const dispositivo = dispositivos.find((d) => d.id === dispositivoId);
    if (!dispositivo) return;
    setPendingHabilitadoId(dispositivoId);
    setDispositivos((prev) => prev.map((d) => (d.id === dispositivoId ? { ...d, habilitado } : d)));
    actualizarHabilitadoDispositivoAction(dispositivoId, dispositivo.bandaId, habilitado)
      .catch(() => {
        setDispositivos((prev) => prev.map((d) => (d.id === dispositivoId ? { ...d, habilitado: !habilitado } : d)));
      })
      .finally(() => setPendingHabilitadoId(null));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={elegirGeneral}
            className="rounded-full px-3 py-1.5 text-xs font-bold"
            style={vista.tipo === "general" ? PILL_ACTIVO : PILL_INACTIVO}
          >
            General
          </button>
          <button
            type="button"
            onClick={toggleNueva}
            aria-label="Crear seteo para una canción"
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
            style={picker === "nueva" ? PILL_ACTIVO : PILL_INACTIVO}
          >
            +
          </button>
          {cancionesConSeteo.length > 0 && (
            <button
              type="button"
              onClick={toggleCanciones}
              className="rounded-full px-3 py-1.5 text-xs font-bold"
              style={vista.tipo === "cancion" ? PILL_ACTIVO : PILL_INACTIVO}
            >
              Canciones
            </button>
          )}
          {vista.tipo === "cancion" && (
            <span className="font-mono text-xs" style={{ color: TEXTO_GRIS }}>
              {vista.cancionTitulo}
            </span>
          )}
        </div>

        {picker === "nueva" && (
          <div className="mt-2.5 rounded-xl p-2.5" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar canción…"
              autoFocus
              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: TEXTO_OSCURO }}
            />
            <div className="mt-1.5 flex max-h-48 flex-col gap-1 overflow-y-auto">
              {cancionesFiltradas.length === 0 ? (
                <p className="px-1 py-1 text-xs" style={{ color: TEXTO_GRIS }}>
                  {cancionesDisponibles.length === 0 ? "Todavía no hay canciones en esta banda." : "Sin resultados."}
                </p>
              ) : (
                cancionesFiltradas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => elegirCancion(c)}
                    className="rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold"
                    style={{ color: TEXTO_OSCURO }}
                  >
                    {c.titulo}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {picker === "canciones" && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 rounded-xl p-2.5" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
            {cancionesConSeteo.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegirCancion(c)}
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={vista.tipo === "cancion" && vista.cancionId === c.id ? PILL_ACTIVO : PILL_INACTIVO}
              >
                {c.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Brief "Instrumentos propios...": solo aparece con 2+ instrumentos
          propios (0/1 = sin cambios de comportamiento, ver useState de
          instrumentoActivoId más arriba) -- acordeón antes de la lista de
          dispositivos, mismo patrón visual que "Deshabilitados" más abajo. */}
      {instrumentosPropios.length >= 2 && (
        <div className="rounded-2xl" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <button
            type="button"
            onClick={() => setInstrumentoAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-bold" style={{ color: TEXTO_OSCURO }}>
              Instrumento: {instrumentoActivo ? etiquetaInstrumentoPropio(instrumentoActivo) : "…"}
            </span>
            <span
              className="text-xs"
              style={{ color: TEXTO_GRIS, transform: instrumentoAbierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            >
              ▾
            </span>
          </button>
          {instrumentoAbierto && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-4">
              {instrumentosPropios.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => elegirInstrumento(i.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-bold"
                  style={i.id === instrumentoActivoId ? PILL_ACTIVO : PILL_INACTIVO}
                >
                  {etiquetaInstrumentoPropio(i)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {dispositivos.length === 0 && (
        <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no tenés dispositivos asignados en {nombreBanda}. Pedile a un administrador que te asigne uno desde Gestión
          &gt; Integrantes.
        </p>
      )}

      {habilitados.map((d) => (
        <DispositivoBloque
          key={d.id}
          dispositivo={d}
          vista={vista}
          instrumentoActivoId={instrumentoActivoId}
          onValoresCambiados={onValoresCambiados}
          onSeteoCreado={onSeteoCreado}
          onHabilitadoChange={onHabilitadoChange}
          pendingHabilitado={pendingHabilitadoId === d.id}
        />
      ))}

      {deshabilitados.length > 0 && (
        <div className="rounded-2xl" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.9 0.012 78)" }}>
          <button
            type="button"
            onClick={() => setDeshabilitadosAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-bold" style={{ color: TEXTO_OSCURO }}>
              Deshabilitados ({deshabilitados.length})
            </span>
            <span
              className="text-xs"
              style={{ color: TEXTO_GRIS, transform: deshabilitadosAbierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
            >
              ▾
            </span>
          </button>
          {deshabilitadosAbierto && (
            <div className="flex flex-col gap-3 px-4 pb-4">
              {deshabilitados.map((d) => (
                <DispositivoBloque
                  key={d.id}
                  dispositivo={d}
                  vista={vista}
                  instrumentoActivoId={instrumentoActivoId}
                  onValoresCambiados={onValoresCambiados}
                  onSeteoCreado={onSeteoCreado}
                  onHabilitadoChange={onHabilitadoChange}
                  pendingHabilitado={pendingHabilitadoId === d.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
