"use client";

import { useState } from "react";
import type { Seteo, InstrumentoPropioResumen, InstrumentoEnCadena } from "@/lib/dispositivosData";
import { actualizarHabilitadoDispositivoAction, agregarInstrumentoEnCadenaAction, quitarInstrumentoEnCadenaAction } from "@/app/seteos/actions";
import { DispositivoBloque, type DispositivoConSeteos, type Vista } from "./DispositivoBloque";

type CancionOpcion = { id: string; titulo: string };

function etiquetaInstrumentoPropio(i: InstrumentoPropioResumen): string {
  const detalle = [i.marca, i.modelo].filter(Boolean).join(" ");
  return detalle ? `${i.instrumento} · ${detalle}` : i.instrumento;
}

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ACENTO = "oklch(0.64 0.15 34)";
const PILL_INACTIVO = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };
const PILL_ACTIVO = { background: ACENTO, color: "oklch(0.99 0.01 82)" };

// Brief "Seteos: colores, conectores, borrar por canción..." §2: colores de
// fondo por tipo de bloque, uno solo por tipo (brief "...simplificar
// colores..." §2: ya no hay un segundo tono para el acordeón individual --
// ver DispositivoBloque/InstrumentoBloque, que ahora van en blanco). Texto
// claro para Amplificadores porque su fondo es oscuro; el resto conserva
// TEXTO_OSCURO/TEXTO_GRIS porque sus fondos son claros.
const TEXTO_CLARO = "oklch(0.96 0.006 260)";
const TEXTO_CLARO_GRIS = "oklch(0.76 0.012 260)";
const FONDO_INSTRUMENTO = "oklch(0.68 0.075 55)";
const FONDO_AMPLI_BLOQUE = "oklch(0.33 0.006 260)";
const FONDO_PEDAL_BLOQUE = "oklch(0.86 0.006 235)";

// Brief "Seteos: simplificar colores + permiso de borrar seteo por
// canción" §3: acentos (punto de color del acordeón de bloque, borde
// izquierdo de cada acordeón individual) que combinan con la paleta de
// cada bloque en vez de los genéricos verde/naranja/azul de antes --
// mismo tono que el fondo de bloque, más oscuro/saturado para que el punto
// se distinga tanto sobre ese fondo como sobre el blanco de cada acordeón
// individual.
const ACENTO_INSTRUMENTO = "oklch(0.42 0.09 55)";
const ACENTO_AMPLI = "oklch(0.5 0.008 260)";
const ACENTO_PEDAL = "oklch(0.58 0.012 235)";

const MODELO_AFINADOR = "Afinador";
const esAfinador = (d: DispositivoConSeteos) => d.disenoModelo === MODELO_AFINADOR;

// Grupo colapsable de dispositivos (Amplificadores / Pedales·FX) -- mismo
// patrón visual que el acordeón "Deshabilitados" de más abajo, pero con un
// punto de color + borde del acento del grupo (brief §2 "distinción visual")
// y arranca cerrado (brief §2 "inician colapsados", a diferencia del
// acordeón de Instrumento o Deshabilitados que no cambian). Brief "Seteos:
// simplificar colores..." §2: `fondoBloque`/`oscuro` tiñen únicamente este
// acordeón del bloque completo -- cada DispositivoBloque individual dentro
// ya no recibe fondo propio, va en blanco (mismo criterio que Deshabilitados).
function GrupoCadena({
  titulo,
  color,
  fondoBloque,
  oscuro,
  dispositivos,
  abierto,
  onToggle,
  vista,
  pendingHabilitadoId,
  onValoresCambiados,
  onSeteoCreado,
  onHabilitadoChange,
}: {
  titulo: string;
  color: string;
  fondoBloque: string;
  oscuro: boolean;
  dispositivos: DispositivoConSeteos[];
  abierto: boolean;
  onToggle: () => void;
  vista: Vista;
  pendingHabilitadoId: string | null;
  onValoresCambiados: (dispositivoId: string, seteoId: string, valores: Record<string, number>) => void;
  onSeteoCreado: (dispositivoId: string, seteo: Seteo) => void;
  onHabilitadoChange: (dispositivoId: string, habilitado: boolean) => void;
}) {
  const textoBloque = oscuro ? TEXTO_CLARO : TEXTO_OSCURO;
  const textoBloqueGris = oscuro ? TEXTO_CLARO_GRIS : TEXTO_GRIS;
  return (
    <div className="rounded-2xl" style={{ background: fondoBloque, border: `1px solid ${color}`, borderLeft: `3px solid ${color}` }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="flex-1 text-sm font-bold" style={{ color: textoBloque }}>
          {titulo} ({dispositivos.length})
        </span>
        <span className="text-xs" style={{ color: textoBloqueGris, transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>
      {abierto && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          {dispositivos.map((d) => (
            <DispositivoBloque
              key={d.id}
              dispositivo={d}
              colorCadena={color}
              vista={vista}
              onValoresCambiados={onValoresCambiados}
              onSeteoCreado={onSeteoCreado}
              onHabilitadoChange={onHabilitadoChange}
              pendingHabilitado={pendingHabilitadoId === d.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Brief "Instrumento como bloque agregable (reemplaza el selector de
// instrumento activo)": a diferencia de DispositivoBloque (amplis/pedales),
// esto no tiene diseño/controles/seteos -- es un dato informativo (qué
// instrumento, qué marca/modelo), sin colapsar ni interacción más allá de
// quitarlo. Mismo lenguaje visual que la cabecera de DispositivoBloque
// (mismo tipo de letra/tamaño del nombre, mismo borde de acento de cadena).
function InstrumentoBloque({
  instrumento,
  colorCadena,
  onQuitar,
  pendingQuitar,
}: {
  instrumento: InstrumentoEnCadena;
  colorCadena: string;
  onQuitar: () => void;
  pendingQuitar: boolean;
}) {
  const detalle = [instrumento.marca, instrumento.modelo].filter(Boolean).join(" ");
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", borderLeft: `3px solid ${colorCadena}` }}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[19px] font-bold" style={{ color: TEXTO_OSCURO, fontFamily: "var(--font-bricolage), sans-serif" }}>
          {instrumento.instrumento}
        </span>
        {detalle && (
          <span className="mt-0.5 block font-mono text-xs uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
            {detalle}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onQuitar}
        disabled={pendingQuitar}
        aria-label="Quitar instrumento"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold disabled:opacity-50"
        style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
      >
        ×
      </button>
    </div>
  );
}

// Agregar un instrumento propio a la vista actual (General o la canción
// activa) -- lista de chips (mismo patrón que el picker de plazas en
// Gestión > Integrantes), no un <select> como en Gestión > Integrantes,
// porque acá ya existe un lenguaje de chips propio de esta pantalla
// (picker de canciones más arriba) y la cantidad de instrumentos propios
// por persona suele ser chica.
function AgregarInstrumentoPicker({
  opciones,
  mensajeVacio,
  onAgregar,
  pending,
}: {
  opciones: InstrumentoPropioResumen[];
  mensajeVacio: string;
  onAgregar: (id: string) => void;
  pending: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-dashed px-2.5 py-1.5 text-xs font-semibold"
        style={{ borderColor: "oklch(0.8 0.02 60)", color: TEXTO_GRIS }}
      >
        + Agregar instrumento
      </button>
    );
  }

  return (
    <div className="rounded-lg p-2" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.9 0.012 78)" }}>
      {opciones.length === 0 ? (
        <p className="text-xs" style={{ color: TEXTO_GRIS }}>
          {mensajeVacio}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {opciones.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => {
                onAgregar(i.id);
                setAbierto(false);
              }}
              disabled={pending}
              className="rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              style={PILL_INACTIVO}
            >
              {etiquetaInstrumentoPropio(i)}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setAbierto(false)} className="mt-1.5 text-xs font-semibold" style={{ color: TEXTO_GRIS }}>
        Cancelar
      </button>
    </div>
  );
}

// Grupo "cadena de señal" para Instrumento -- mismo patrón visual/interactivo
// que GrupoCadena (header con punto de color + chevron, cerrado por
// default), pero SIEMPRE se muestra (incluso con 0 instrumentos en la vista
// actual) porque acá el picker "+ Agregar instrumento" es el único punto de
// entrada para esto -- a diferencia de Amplificadores/Pedales, que se
// asignan aparte en Gestión > Integrantes y por eso el grupo entero se oculta
// si no hay ninguno habilitado.
function GrupoInstrumento({
  instrumentos,
  opcionesDisponibles,
  mensajeVacio,
  abierto,
  onToggle,
  onAgregar,
  onQuitar,
  pendingAgregar,
  pendingQuitarId,
}: {
  instrumentos: InstrumentoEnCadena[];
  opcionesDisponibles: InstrumentoPropioResumen[];
  mensajeVacio: string;
  abierto: boolean;
  onToggle: () => void;
  onAgregar: (instrumentoPropioId: string) => void;
  onQuitar: (id: string) => void;
  pendingAgregar: boolean;
  pendingQuitarId: string | null;
}) {
  return (
    <div
      className="rounded-2xl"
      style={{ background: FONDO_INSTRUMENTO, border: `1px solid ${ACENTO_INSTRUMENTO}`, borderLeft: `3px solid ${ACENTO_INSTRUMENTO}` }}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACENTO_INSTRUMENTO }} />
        <span className="flex-1 text-sm font-bold" style={{ color: TEXTO_OSCURO }}>
          Instrumento ({instrumentos.length})
        </span>
        <span className="text-xs" style={{ color: TEXTO_GRIS, transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>
      {abierto && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          {instrumentos.map((inst) => (
            <InstrumentoBloque
              key={inst.id}
              instrumento={inst}
              colorCadena={ACENTO_INSTRUMENTO}
              onQuitar={() => onQuitar(inst.id)}
              pendingQuitar={pendingQuitarId === inst.id}
            />
          ))}
          <AgregarInstrumentoPicker opciones={opcionesDisponibles} mensajeVacio={mensajeVacio} onAgregar={onAgregar} pending={pendingAgregar} />
        </div>
      )}
    </div>
  );
}

// Orquestador de /seteos (brief "Seteos — selector único global,
// dispositivos colapsables/habilitables..." §1/§2, rediseñado por brief
// "Seteos: completar selector de instrumento + rediseño de cadena" §2): un
// solo selector General/+/Canciones para toda la página (ya no uno por
// dispositivo) — cambiar la vista hace que cada DispositivoBloque de abajo
// resuelva su propio seteo para esa vista. Agrupa los habilitados en dos
// acordeones "cadena de señal" (Amplificadores, luego Pedales/FX con el
// Afinador primero), ambos cerrados por default, y separa los
// deshabilitados en su propio acordeón cerrado al fondo, sin agrupar.
// Brief "Instrumento como bloque agregable...": suma un tercer grupo
// (Instrumento) antes de Amplificadores -- a diferencia de esos dos, su
// contenido varía según `vista` (General o la canción activa), y se agrega/
// quita acá mismo en vez de en Gestión > Integrantes.
export function SeteosLista({
  dispositivosIniciales,
  cancionesDisponibles,
  nombreBanda,
  bandaId,
  instrumentosPropios,
  instrumentosEnCadenaIniciales,
}: {
  dispositivosIniciales: DispositivoConSeteos[];
  cancionesDisponibles: CancionOpcion[];
  nombreBanda: string;
  bandaId: string;
  instrumentosPropios: InstrumentoPropioResumen[];
  instrumentosEnCadenaIniciales: InstrumentoEnCadena[];
}) {
  const [dispositivos, setDispositivos] = useState(dispositivosIniciales);
  const [vista, setVista] = useState<Vista>({ tipo: "general" });
  const [picker, setPicker] = useState<"nueva" | "canciones" | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pendingHabilitadoId, setPendingHabilitadoId] = useState<string | null>(null);
  const [deshabilitadosAbierto, setDeshabilitadosAbierto] = useState(false);
  // Brief "Seteos: completar selector de instrumento + rediseño de cadena"
  // §2: ambos grupos arrancan cerrados -- a diferencia de Deshabilitados
  // (que siempre arrancó así), acá antes de este brief no había grupos, era
  // una lista plana ya expandida.
  const [amplificadoresAbierto, setAmplificadoresAbierto] = useState(false);
  const [pedalesAbierto, setPedalesAbierto] = useState(false);
  // Brief "Instrumento como bloque agregable...": mismo criterio "cerrado
  // por default" que los otros dos grupos de cadena.
  const [instrumentosAbierto, setInstrumentosAbierto] = useState(false);
  const [instrumentosEnCadena, setInstrumentosEnCadena] = useState(instrumentosEnCadenaIniciales);
  const [pendingAgregarInstrumento, setPendingAgregarInstrumento] = useState(false);
  const [pendingQuitarInstrumentoId, setPendingQuitarInstrumentoId] = useState<string | null>(null);
  const [errorInstrumento, setErrorInstrumento] = useState<string | null>(null);

  const cancionesConSeteo = cancionesDisponibles.filter((c) => dispositivos.some((d) => d.seteos.some((s) => s.cancionId === c.id)));
  // Brief "Seteos: colores, conectores, borrar por canción..." §5: una
  // canción ya agregada (con al menos un seteo propio) no vuelve a aparecer
  // en el selector "+" -- mismo criterio que ya usa el pill "Canciones" para
  // decidir qué mostrar ahí.
  const idsCancionesConSeteo = new Set(cancionesConSeteo.map((c) => c.id));
  const cancionesFiltradas = cancionesDisponibles.filter(
    (c) => !idsCancionesConSeteo.has(c.id) && c.titulo.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  // Brief "Seteos: completar selector de instrumento + rediseño de cadena"
  // §2: Amplificadores y Pedales/FX son dos grupos separados (ya no una
  // lista plana ampli-luego-pedal) -- dentro de Pedales/FX, el Afinador va
  // primero (sort estable: el resto conserva el orden que ya trae
  // `dispositivos`, o sea el de creación).
  const habilitadosDe = (categoria: DispositivoConSeteos["categoria"]) => dispositivos.filter((d) => d.habilitado && d.categoria === categoria);
  const amplificadores = habilitadosDe("amplificador");
  const pedales = [...habilitadosDe("pedal")].sort((a, b) => (esAfinador(a) ? 0 : 1) - (esAfinador(b) ? 0 : 1));
  // Deshabilitados se mantiene como lista plana (ampli antes que pedal) --
  // queda fuera de la cadena visual, no tiene sentido agruparlo igual.
  const deshabilitados = [...dispositivos.filter((d) => !d.habilitado)].sort((a, b) => (a.categoria === "pedal" ? 1 : 0) - (b.categoria === "pedal" ? 1 : 0));

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

  // Brief "Instrumento como bloque agregable...": qué instrumentos aplican a
  // la vista actual (General = cancionId null, o la canción activa) -- se
  // filtra en el cliente sobre el listado completo del usuario+banda, mismo
  // criterio que ya usa DispositivoBloque para resolver su seteo según
  // `vista`, sin refetch al cambiar de vista.
  const cancionIdVista = vista.tipo === "cancion" ? vista.cancionId : null;
  const instrumentosDeLaVista = instrumentosEnCadena.filter((i) => i.cancionId === cancionIdVista);
  const idsYaAgregados = new Set(instrumentosDeLaVista.map((i) => i.instrumentoPropioId));
  const instrumentosDisponibles = instrumentosPropios.filter((i) => !idsYaAgregados.has(i.id));
  const mensajeVacioInstrumento =
    instrumentosPropios.length === 0
      ? "Todavía no tenés instrumentos propios cargados. Pedile a un administrador que te cargue uno en Gestión > Integrantes."
      : "Ya agregaste todos tus instrumentos acá.";

  const agregarInstrumento = (instrumentoPropioId: string) => {
    setErrorInstrumento(null);
    setPendingAgregarInstrumento(true);
    agregarInstrumentoEnCadenaAction(bandaId, instrumentoPropioId, cancionIdVista)
      .then((nuevo) => setInstrumentosEnCadena((prev) => [...prev, nuevo]))
      .catch((e) => setErrorInstrumento(e instanceof Error ? e.message : "No se pudo agregar el instrumento."))
      .finally(() => setPendingAgregarInstrumento(false));
  };

  const quitarInstrumento = (id: string) => {
    setPendingQuitarInstrumentoId(id);
    const anteriores = instrumentosEnCadena;
    setInstrumentosEnCadena((prev) => prev.filter((i) => i.id !== id));
    quitarInstrumentoEnCadenaAction(id, bandaId)
      .catch(() => {
        setErrorInstrumento("No se pudo quitar el instrumento.");
        setInstrumentosEnCadena(anteriores);
      })
      .finally(() => setPendingQuitarInstrumentoId(null));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
        {nombreBanda}
      </div>

      <div className="rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        {/* Brief "Seteos: colores, conectores, borrar por canción..." §6:
            tira horizontal con scroll (una sola línea) en vez de wrap --
            crece la lista de canciones sin empujar el resto de la pantalla
            hacia abajo. Mismo patrón que el picker de secciones en
            VistaFinal (canciones). */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={elegirGeneral}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
            style={vista.tipo === "general" ? PILL_ACTIVO : PILL_INACTIVO}
          >
            General
          </button>
          <button
            type="button"
            onClick={toggleNueva}
            aria-label="Crear seteo para una canción"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={picker === "nueva" ? PILL_ACTIVO : PILL_INACTIVO}
          >
            +
          </button>
          {cancionesConSeteo.length > 0 && (
            <button
              type="button"
              onClick={toggleCanciones}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
              style={vista.tipo === "cancion" ? PILL_ACTIVO : PILL_INACTIVO}
            >
              Canciones
            </button>
          )}
          {vista.tipo === "cancion" && (
            <span className="shrink-0 font-mono text-xs" style={{ color: TEXTO_GRIS }}>
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
          // Brief "Seteos: colores, conectores, borrar por canción..." §6:
          // esta es la fila que crece con la cantidad de canciones agregadas
          // -- tira horizontal con scroll (una sola línea) en vez de
          // flex-wrap, para que no empuje el resto de la pantalla hacia
          // abajo en mobile.
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto rounded-xl p-2.5" style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
            {cancionesConSeteo.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegirCancion(c)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
                style={vista.tipo === "cancion" && vista.cancionId === c.id ? PILL_ACTIVO : PILL_INACTIVO}
              >
                {c.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Brief "Instrumento como bloque agregable...": reemplaza el
          acordeón "Instrumento: X" (selector único, oculto con 0/1) por un
          grupo de cadena más -- siempre visible, contenido filtrado por la
          `vista` actual (General o la canción activa). */}
      <GrupoInstrumento
        instrumentos={instrumentosDeLaVista}
        opcionesDisponibles={instrumentosDisponibles}
        mensajeVacio={mensajeVacioInstrumento}
        abierto={instrumentosAbierto}
        onToggle={() => setInstrumentosAbierto((v) => !v)}
        onAgregar={agregarInstrumento}
        onQuitar={quitarInstrumento}
        pendingAgregar={pendingAgregarInstrumento}
        pendingQuitarId={pendingQuitarInstrumentoId}
      />
      {errorInstrumento && (
        <p className="text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {errorInstrumento}
        </p>
      )}

      {dispositivos.length === 0 && (
        <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no tenés dispositivos asignados en {nombreBanda}. Pedile a un administrador que te asigne uno desde Gestión
          &gt; Integrantes.
        </p>
      )}

      {/* Brief "Seteos: completar selector de instrumento + rediseño de
          cadena" §2: Amplificadores primero, Pedales/FX después (con el
          Afinador primero adentro, ver `pedales` más arriba) -- ambos
          grupos cerrados por default. Brief "Seteos: corrección de
          comportamiento y ajuste visual" §2: el conector entre ambos grupos
          se sacó -- se veía como un error visual, no como cadena. La
          separación entre grupos queda marcada solo por el
          encabezado/borde de cada `GrupoCadena`. */}
      {amplificadores.length > 0 && (
        <GrupoCadena
          titulo="Amplificadores"
          color={ACENTO_AMPLI}
          fondoBloque={FONDO_AMPLI_BLOQUE}
          oscuro
          dispositivos={amplificadores}
          abierto={amplificadoresAbierto}
          onToggle={() => setAmplificadoresAbierto((v) => !v)}
          vista={vista}
          pendingHabilitadoId={pendingHabilitadoId}
          onValoresCambiados={onValoresCambiados}
          onSeteoCreado={onSeteoCreado}
          onHabilitadoChange={onHabilitadoChange}
        />
      )}

      {pedales.length > 0 && (
        <GrupoCadena
          titulo="Pedales/FX"
          color={ACENTO_PEDAL}
          fondoBloque={FONDO_PEDAL_BLOQUE}
          oscuro={false}
          dispositivos={pedales}
          abierto={pedalesAbierto}
          onToggle={() => setPedalesAbierto((v) => !v)}
          vista={vista}
          pendingHabilitadoId={pendingHabilitadoId}
          onValoresCambiados={onValoresCambiados}
          onSeteoCreado={onSeteoCreado}
          onHabilitadoChange={onHabilitadoChange}
        />
      )}

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
