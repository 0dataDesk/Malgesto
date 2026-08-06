"use client";

import { useState, useTransition } from "react";
import type { Membresia, TipoEvento, Evento, NuevoEventoInput } from "@/lib/malgestoEventos";
import type { Lugar } from "@/lib/lugaresData";
import type { AusenciaPersona } from "@/lib/ausenciasData";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";
import { fechaISO } from "@/lib/fechas";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { crearEventoAction, actualizarEventoAction, crearGiraRapidaAction } from "@/app/inicio/actions";
import { enZonaApp, aUtcDesdeZonaApp } from "@/lib/zonaHoraria";
import { HoraRangoSlider } from "./HoraRangoSlider";

type SetlistOpcion = { id: string; bandaId: string; nombre: string };

const TIPOS: TipoEvento[] = ["show", "ensayo", "gira"];

const inputCls = "w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "mb-1.5 block font-mono text-[10px] font-bold tracking-wide uppercase";
const labelStyle = { color: "oklch(0.55 0.02 55)" };

// Brief 16: `iso` es UTC (fecha_inicio/fecha_fin) — hay que leerlo en
// ZONA_HORARIA_APP, no en la zona ambiente del navegador, para precargar el
// form de edición con la fecha/hora que el usuario realmente eligió.
function aFechaHora(iso: string) {
  const d = enZonaApp(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Brief 16: los `<input type="date">` de gira entregan "YYYY-MM-DD" en texto
// plano, sin hora ni zona — se toman como medianoche en ZONA_HORARIA_APP, no
// en la zona ambiente del navegador.
function fechaInputAUtc(fechaStr: string, hhmm = "00:00"): string {
  const [anio, mes, dia] = fechaStr.split("-").map(Number);
  const [hora, minuto] = hhmm.split(":").map(Number);
  return aUtcDesdeZonaApp(anio, mes - 1, dia, hora, minuto);
}

function fechaLarga(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

function Switch({ activo, onToggle }: { activo: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={activo}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: activo ? "oklch(0.64 0.15 34)" : "oklch(0.85 0.013 78)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ left: 2, transform: activo ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

function toggleEnSet(set: Set<string>, valor: string): Set<string> {
  const next = new Set(set);
  if (next.has(valor)) next.delete(valor);
  else next.add(valor);
  return next;
}

export function NuevoEventoForm({
  membresias,
  giras,
  setlists,
  lugares,
  ausencias,
  eventoExistente,
  fechaSeleccionada,
  onCreado,
  onCancelar,
}: {
  membresias: Membresia[];
  giras: Evento[];
  setlists: SetlistOpcion[];
  lugares: Lugar[];
  ausencias: AusenciaPersona[];
  eventoExistente?: Evento;
  fechaSeleccionada: Date;
  onCreado: () => void;
  onCancelar: () => void;
}) {
  // Brief "3 pendientes" §3: el picker de banda al CREAR debe mostrar solo
  // las bandas donde el usuario realmente puede crear (administrador o
  // superadmin) — el servidor ya lo exige, esto evita ofrecer una opción
  // que va a fallar. Al EDITAR se deja `membresias` sin filtrar a propósito:
  // editar ya está gateado a superadmin más arriba (puedeEditar en
  // CalendarioShell), y filtrar acá podría esconder la banda actual del
  // evento si esta persona fuera superadmin en otra banda pero no en esa —
  // un caso raro pero real que no vale la pena arriesgar.
  const bandasParaElegir = eventoExistente ? membresias : membresias.filter((m) => m.rol === "administrador" || m.rol === "superadmin");
  // La gira rápida (dentro de "Gira" en un show) siempre CREA una gira nueva
  // — sin importar si el formulario de afuera está editando el show — así
  // que este picker específico siempre filtra, sin la excepción de arriba.
  const bandasParaGiraRapida = membresias.filter((m) => m.rol === "administrador" || m.rol === "superadmin");

  const fechaBase = eventoExistente ? enZonaApp(eventoExistente.fechaInicio) : fechaSeleccionada;
  const inicial = eventoExistente && eventoExistente.tipo !== "gira" ? aFechaHora(eventoExistente.fechaInicio) : null;
  const inicialFin = eventoExistente?.fechaFin && eventoExistente.tipo !== "gira" ? aFechaHora(eventoExistente.fechaFin) : null;
  const inicialGiraDesde = eventoExistente?.tipo === "gira" ? aFechaHora(eventoExistente.fechaInicio) : null;
  const inicialGiraHasta = eventoExistente?.tipo === "gira" && eventoExistente.fechaFin ? aFechaHora(eventoExistente.fechaFin) : null;

  const [tipo, setTipo] = useState<TipoEvento>(eventoExistente?.tipo ?? "show");
  // Brief "Estado Tentativo...": default Confirmado -- solo aplica a
  // show/gira, se ignora (forzado a "confirmado") para el resto en onSubmit.
  const [tentativo, setTentativo] = useState(eventoExistente?.estado === "tentativo");
  const [titulo, setTitulo] = useState(eventoExistente && eventoExistente.tipo !== "ensayo" ? eventoExistente.titulo : "");
  const [horaInicio, setHoraInicio] = useState(inicial?.hora ?? "19:00");
  const [horaFin, setHoraFin] = useState(inicialFin?.hora ?? "22:00");
  const [giraDesde, setGiraDesde] = useState(inicialGiraDesde?.fecha ?? "");
  const [giraHasta, setGiraHasta] = useState(inicialGiraHasta?.fecha ?? "");
  const [pais, setPais] = useState(eventoExistente?.pais ?? "");
  const [ciudades, setCiudades] = useState(eventoExistente?.ciudades ?? "");
  // Brief "...ciudad en shows": solo Show -- distinto de `ciudades` (Gira).
  const [ciudad, setCiudad] = useState(eventoExistente?.ciudad ?? "");
  const [ingreso, setIngreso] = useState(eventoExistente?.ingresoEsperado?.toString() ?? "");
  const [bandaId, setBandaId] = useState(eventoExistente?.bandaId ?? bandasParaElegir[0]?.bandaId ?? "");
  const [bandaIdsGira, setBandaIdsGira] = useState<Set<string>>(
    () =>
      new Set(
        eventoExistente?.tipo === "gira" ? eventoExistente.bandaIds : bandasParaElegir.length === 1 ? [bandasParaElegir[0]?.bandaId] : []
      )
  );

  const [lugarId, setLugarId] = useState(eventoExistente?.lugarId ?? "");
  const [nuevoLugar, setNuevoLugar] = useState(false);
  const [nuevoLugarNombre, setNuevoLugarNombre] = useState("");
  const [nuevoLugarLink, setNuevoLugarLink] = useState("");

  const [setlistOn, setSetlistOn] = useState(!!eventoExistente?.setlistId);
  const [setlistId, setSetlistId] = useState(eventoExistente?.setlistId ?? "");

  const [giraOn, setGiraOn] = useState(!!eventoExistente?.giraId);
  const [giraId, setGiraId] = useState(eventoExistente?.giraId ?? "");
  const [girasLocal, setGirasLocal] = useState(giras);
  const [nuevaGira, setNuevaGira] = useState(false);
  const [nuevaGiraNombre, setNuevaGiraNombre] = useState("");
  const [nuevaGiraDesde, setNuevaGiraDesde] = useState("");
  const [nuevaGiraHasta, setNuevaGiraHasta] = useState("");
  const [nuevaGiraBandaIds, setNuevaGiraBandaIds] = useState<Set<string>>(() => new Set(bandaId ? [bandaId] : []));
  const [nuevaGiraPais, setNuevaGiraPais] = useState("");
  const [nuevaGiraCiudades, setNuevaGiraCiudades] = useState("");
  const [nuevaGiraTentativo, setNuevaGiraTentativo] = useState(false);
  const [creandoGira, startCrearGira] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const girasDeLaBanda = girasLocal.filter((g) => g.bandaIds.includes(bandaId));
  const setlistsDeLaBanda = setlists.filter((s) => s.bandaId === bandaId);
  const lugaresDeLaBanda = lugares.filter((l) => l.bandaIds.includes(bandaId));
  const bandaNombreActual = membresias.find((m) => m.bandaId === bandaId)?.bandaNombre ?? "";

  // Brief "Disponibilidad de integrantes" §4: aviso no bloqueante -- quién
  // de la banda (o bandas, si es gira) elegida está ausente en la fecha (o
  // rango, si es gira) elegida. Deduplicado por persona+banda.
  const bandasSeleccionadas = tipo === "gira" ? Array.from(bandaIdsGira) : [bandaId];
  const rangoInicio = tipo === "gira" ? giraDesde : fechaISO(fechaBase);
  const rangoFin = tipo === "gira" ? giraHasta || giraDesde : fechaISO(fechaBase);
  const personasAusentes = rangoInicio
    ? (() => {
        const vistos = new Set<string>();
        return ausencias.filter((a) => {
          if (!bandasSeleccionadas.includes(a.bandaId)) return false;
          if (rangoInicio > a.fechaFin || a.fechaInicio > rangoFin) return false;
          const clave = `${a.usuarioId}:${a.bandaId}`;
          if (vistos.has(clave)) return false;
          vistos.add(clave);
          return true;
        });
      })()
    : [];

  const crearGiraRapida = () => {
    setError(null);
    const bandaIds = Array.from(nuevaGiraBandaIds);
    if (!nuevaGiraNombre.trim() || !nuevaGiraDesde || bandaIds.length === 0) {
      setError("Completá nombre, al menos una banda y la fecha de inicio de la nueva gira.");
      return;
    }
    startCrearGira(async () => {
      try {
        const desdeIso = fechaInputAUtc(nuevaGiraDesde);
        const hastaIso = fechaInputAUtc(nuevaGiraHasta || nuevaGiraDesde);
        const gira = await crearGiraRapidaAction(
          bandaIds,
          nuevaGiraNombre.trim(),
          desdeIso,
          hastaIso,
          nuevaGiraPais.trim() || null,
          nuevaGiraCiudades.trim() || null,
          nuevaGiraTentativo ? "tentativo" : "confirmado"
        );
        setGirasLocal((prev) => [...prev, gira]);
        setGiraId(gira.id);
        setNuevaGira(false);
        setNuevaGiraNombre("");
        setNuevaGiraDesde("");
        setNuevaGiraHasta("");
        setNuevaGiraPais("");
        setNuevaGiraCiudades("");
        setNuevaGiraTentativo(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear la gira.");
      }
    });
  };

  // Brief 15 §3: todo el cuerpo de onSubmit va en try/catch — antes, un
  // throw síncrono (p.ej. armando las fechas) escapaba del try/catch de
  // startTransition (que solo cubre la llamada al server action) y quedaba
  // sin mostrarle nada al usuario ni tocar `error`: clic en "Crear" y
  // "no pasaba nada", sin pista de por qué.
  const onSubmit = () => {
    setError(null);
    try {
      const tituloFinal = tipo === "ensayo" ? `Ensayo ${bandaNombreActual} — ${fechaLarga(fechaBase)}` : titulo.trim();
      if (tipo !== "ensayo" && !tituloFinal) {
        setError("El título es obligatorio.");
        return;
      }

      let fechaInicioIso: string;
      let fechaFinIso: string | null;
      let bandaIdsFinal: string[] = [bandaId];

      if (tipo === "gira") {
        bandaIdsFinal = Array.from(bandaIdsGira);
        if (bandaIdsFinal.length === 0) {
          setError("Elegí al menos una banda para la gira.");
          return;
        }
        if (!giraDesde) {
          setError("La fecha de inicio de la gira es obligatoria.");
          return;
        }
        fechaInicioIso = fechaInputAUtc(giraDesde);
        fechaFinIso = giraHasta ? fechaInputAUtc(giraHasta) : null;
      } else {
        if (!bandaId) {
          setError("Falta la banda.");
          return;
        }
        // Brief 15 §3: si la hora de fin es igual o anterior a la de inicio,
        // el evento cruza medianoche — el fin cae al día siguiente. Sumar el
        // día con setDate() (no con un +1 pegado al string) para que Date
        // haga el acarreo de mes/año correctamente (31 jul + 1 día = 1 ago).
        const fechaFinBase = new Date(fechaBase);
        if (horaFin <= horaInicio) fechaFinBase.setDate(fechaFinBase.getDate() + 1);

        // Brief 16: horaInicio/horaFin son hora de pared en ZONA_HORARIA_APP
        // (México) — aUtcDesdeZonaApp calcula el UTC real para esa zona en
        // vez de asumir la zona ambiente del navegador/servidor.
        const [hInicio, mInicio] = horaInicio.split(":").map(Number);
        const [hFin, mFin] = horaFin.split(":").map(Number);
        fechaInicioIso = aUtcDesdeZonaApp(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), hInicio, mInicio);
        fechaFinIso = aUtcDesdeZonaApp(fechaFinBase.getFullYear(), fechaFinBase.getMonth(), fechaFinBase.getDate(), hFin, mFin);
      }

      const input: NuevoEventoInput = {
        bandaId: bandaIdsFinal[0],
        bandaIds: tipo === "gira" ? bandaIdsFinal : undefined,
        tipo,
        estado: (tipo === "show" || tipo === "gira") && tentativo ? "tentativo" : "confirmado",
        titulo: tituloFinal,
        fechaInicio: fechaInicioIso,
        fechaFin: fechaFinIso,
        ingresoEsperado: tipo === "show" && ingreso ? Number(ingreso) : null,
        giraId: tipo === "show" && giraOn && giraId ? giraId : null,
        setlistId: (tipo === "show" || tipo === "ensayo") && setlistOn && setlistId ? setlistId : null,
        lugarId: tipo !== "gira" && !nuevoLugar ? lugarId || null : null,
        lugarNuevo: tipo !== "gira" && nuevoLugar && nuevoLugarNombre.trim() && nuevoLugarLink.trim() ? { nombre: nuevoLugarNombre.trim(), linkMaps: nuevoLugarLink.trim() } : null,
        pais: tipo === "gira" ? pais.trim() || null : null,
        ciudades: tipo === "gira" ? ciudades.trim() || null : null,
        ciudad: tipo === "show" ? ciudad.trim() || null : null,
      };

      startTransition(async () => {
        try {
          if (eventoExistente) {
            await actualizarEventoAction(eventoExistente.id, input);
          } else {
            await crearEventoAction(input);
          }
          onCreado();
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo guardar el evento.");
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo preparar el evento para guardar.");
    }
  };

  const tituloForm = eventoExistente ? "Editar evento" : tipo === "gira" ? "Nueva gira" : `Nuevo evento · ${fechaLarga(fechaBase)}`;

  const selectorBanda = bandasParaElegir.length > 1 && (
    <div>
      <span className={labelCls} style={labelStyle}>
        Banda
      </span>
      <select
        className={inputCls}
        style={inputStyle}
        value={bandaId}
        onChange={(e) => {
          setBandaId(e.target.value);
          setGiraId("");
          setSetlistId("");
          setLugarId("");
        }}
      >
        {bandasParaElegir.map((m) => (
          <option key={m.bandaId} value={m.bandaId}>
            {m.bandaNombre}
          </option>
        ))}
      </select>
    </div>
  );

  const selectorLugar = (tipo === "ensayo" || tipo === "show") && (
    <div>
      <span className={labelCls} style={labelStyle}>
        Lugar
      </span>
      {!nuevoLugar ? (
        <>
          {lugaresDeLaBanda.length === 0 ? (
            <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Todavía no hay lugares guardados para esta banda.
            </p>
          ) : (
            <select className={inputCls} style={inputStyle} value={lugarId} onChange={(e) => setLugarId(e.target.value)}>
              <option value="">— elegí un lugar —</option>
              {lugaresDeLaBanda.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setNuevoLugar(true)} className="mt-1.5 text-left text-sm font-bold" style={{ color: "oklch(0.64 0.15 34)" }}>
            + Nuevo lugar
          </button>
        </>
      ) : (
        <div className="rounded-xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
          <input className={inputCls} style={inputStyle} value={nuevoLugarNombre} onChange={(e) => setNuevoLugarNombre(e.target.value)} placeholder="Nombre del lugar" />
          <input
            className={`${inputCls} mt-2`}
            style={inputStyle}
            value={nuevoLugarLink}
            onChange={(e) => setNuevoLugarLink(e.target.value)}
            placeholder="Link de Google Maps"
          />
          <button type="button" onClick={() => setNuevoLugar(false)} className="mt-2 text-sm font-bold" style={{ color: "oklch(0.5 0.02 55)" }}>
            Cancelar, elegir uno guardado
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCancelar}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl"
        style={{ background: "oklch(0.99 0.008 82)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid oklch(0.89 0.013 78)" }}>
          <button type="button" onClick={onCancelar} className="text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
            Cancelar
          </button>
          <div className="font-mono text-[11px] font-bold tracking-wide uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {tituloForm}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="text-sm font-bold disabled:opacity-50"
            style={{ color: "oklch(0.64 0.15 34)" }}
          >
            {pending ? "Guardando…" : eventoExistente ? "Guardar" : "Crear"}
          </button>
        </div>

        <div className="flex flex-col gap-3.5 overflow-y-auto px-5 py-4">
          <div>
            <span className={labelCls} style={labelStyle}>
              Tipo
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS.map((t) => (
                <ToggleChip key={t} label={ETIQUETA_TIPO[t]} active={tipo === t} onClick={() => setTipo(t)} color={COLOR_TIPO[t]} />
              ))}
            </div>
          </div>

          {/* Brief "Disponibilidad de integrantes" §4: aviso, nunca bloquea
              -- se recalcula solo, reactivo a banda(s) y fecha(s) elegidas
              más abajo en el form. */}
          {personasAusentes.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "oklch(0.93 0.016 78 / 0.7)", border: "1px dashed oklch(0.75 0.02 60)" }}>
              <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.05 60)" }}>
                Posible ausencia
              </div>
              <div className="flex flex-col gap-0.5 text-sm" style={{ color: "oklch(0.35 0.02 55)" }}>
                {personasAusentes.map((a) => (
                  <span key={`${a.usuarioId}:${a.bandaId}`}>
                    {a.nombre}
                    {a.instrumentos.length > 0 ? ` (${a.instrumentos.join(", ")})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(tipo === "show" || tipo === "gira") && (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>
                  Tentativo
                </span>
                <Switch activo={tentativo} onToggle={() => setTentativo((v) => !v)} />
              </div>
              <p className="mt-1 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                {tentativo ? "Fecha candidata, todavía sin confirmar." : "Fecha confirmada."}
              </p>
            </div>
          )}

          {tipo === "ensayo" && selectorBanda}

          {tipo === "ensayo" ? (
            <div>
              <span className={labelCls} style={labelStyle}>
                Título
              </span>
              <div className="rounded-xl border px-3.5 py-3 text-[15px]" style={{ ...inputStyle, color: "oklch(0.5 0.02 55)" }}>
                Ensayo {bandaNombreActual} — {fechaLarga(fechaBase)}
              </div>
            </div>
          ) : (
            <div>
              <span className={labelCls} style={labelStyle}>
                Título
              </span>
              <input className={inputCls} style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Foro Escénico" />
            </div>
          )}

          {selectorLugar}

          {tipo === "show" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Ciudad
              </span>
              <input className={inputCls} style={inputStyle} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="CDMX" />
            </div>
          )}

          {tipo === "gira" ? (
            <>
              <div>
                <span className={labelCls} style={labelStyle}>
                  Bandas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bandasParaElegir.map((m) => (
                    <ToggleChip
                      key={m.bandaId}
                      label={m.bandaNombre}
                      active={bandaIdsGira.has(m.bandaId)}
                      onClick={() => setBandaIdsGira((prev) => toggleEnSet(prev, m.bandaId))}
                      color={m.color}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className={labelCls} style={labelStyle}>
                    Desde
                  </span>
                  <input type="date" className={inputCls} style={inputStyle} value={giraDesde} onChange={(e) => setGiraDesde(e.target.value)} />
                </div>
                <div className="flex-1">
                  <span className={labelCls} style={labelStyle}>
                    Hasta
                  </span>
                  <input type="date" className={inputCls} style={inputStyle} value={giraHasta} onChange={(e) => setGiraHasta(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className={labelCls} style={labelStyle}>
                    País
                  </span>
                  <input className={inputCls} style={inputStyle} value={pais} onChange={(e) => setPais(e.target.value)} />
                </div>
                <div className="flex-1">
                  <span className={labelCls} style={labelStyle}>
                    Ciudades
                  </span>
                  <input className={inputCls} style={inputStyle} value={ciudades} onChange={(e) => setCiudades(e.target.value)} placeholder="Separadas por coma" />
                </div>
              </div>
            </>
          ) : (
            <div>
              <span className={labelCls} style={labelStyle}>
                Horario
              </span>
              <div className="rounded-xl border px-3.5 py-2.5" style={inputStyle}>
                <span className="text-sm">{fechaLarga(fechaBase)}</span>
                <HoraRangoSlider
                  inicio={horaInicio}
                  fin={horaFin}
                  onChange={(i, f) => {
                    setHoraInicio(i);
                    setHoraFin(f);
                  }}
                />
              </div>
            </div>
          )}

          {tipo !== "ensayo" && tipo !== "gira" && selectorBanda}

          {(tipo === "show" || tipo === "ensayo") && (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>
                  Set List
                </span>
                <Switch activo={setlistOn} onToggle={() => setSetlistOn((v) => !v)} />
              </div>
              {setlistOn &&
                (setlistsDeLaBanda.length === 0 ? (
                  <p className="mt-1.5 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
                    Sin Set Lists todavía para esta banda.
                  </p>
                ) : (
                  <select className={`${inputCls} mt-1.5`} style={inputStyle} value={setlistId} onChange={(e) => setSetlistId(e.target.value)}>
                    <option value="">Sin Set List asignado</option>
                    {setlistsDeLaBanda.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                ))}
            </div>
          )}

          {tipo === "show" && (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>
                  Gira
                </span>
                <Switch activo={giraOn} onToggle={() => setGiraOn((v) => !v)} />
              </div>
              {giraOn && (
                <div className="mt-1.5 flex flex-col gap-2">
                  {!nuevaGira && (
                    <select className={inputCls} style={inputStyle} value={giraId} onChange={(e) => setGiraId(e.target.value)}>
                      <option value="">Sin gira</option>
                      {girasDeLaBanda.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.titulo}
                        </option>
                      ))}
                    </select>
                  )}
                  {nuevaGira ? (
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
                      <input
                        className={inputCls}
                        style={inputStyle}
                        value={nuevaGiraNombre}
                        onChange={(e) => setNuevaGiraNombre(e.target.value)}
                        placeholder="Nombre de la gira"
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {bandasParaGiraRapida.map((m) => (
                          <ToggleChip
                            key={m.bandaId}
                            label={m.bandaNombre}
                            active={nuevaGiraBandaIds.has(m.bandaId)}
                            onClick={() => setNuevaGiraBandaIds((prev) => toggleEnSet(prev, m.bandaId))}
                            color={m.color}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="date"
                          className={`${inputCls} flex-1`}
                          style={inputStyle}
                          value={nuevaGiraDesde}
                          onChange={(e) => setNuevaGiraDesde(e.target.value)}
                        />
                        <input
                          type="date"
                          className={`${inputCls} flex-1`}
                          style={inputStyle}
                          value={nuevaGiraHasta}
                          onChange={(e) => setNuevaGiraHasta(e.target.value)}
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          className={`${inputCls} flex-1`}
                          style={inputStyle}
                          value={nuevaGiraPais}
                          onChange={(e) => setNuevaGiraPais(e.target.value)}
                          placeholder="País"
                        />
                        <input
                          className={`${inputCls} flex-1`}
                          style={inputStyle}
                          value={nuevaGiraCiudades}
                          onChange={(e) => setNuevaGiraCiudades(e.target.value)}
                          placeholder="Ciudades"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: "oklch(0.4 0.02 55)" }}>
                          Tentativo
                        </span>
                        <Switch activo={nuevaGiraTentativo} onToggle={() => setNuevaGiraTentativo((v) => !v)} />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={crearGiraRapida}
                          disabled={creandoGira}
                          className="flex-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60"
                          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
                        >
                          {creandoGira ? "Creando…" : "Crear gira"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNuevaGira(false)}
                          className="rounded-lg px-3 py-2 text-sm font-bold"
                          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNuevaGira(true)}
                      className="text-left text-sm font-bold"
                      style={{ color: "oklch(0.64 0.15 34)" }}
                    >
                      + Nueva gira
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tipo === "show" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Ingreso esperado
              </span>
              <input
                type="number"
                min={0}
                className={inputCls}
                style={inputStyle}
                value={ingreso}
                onChange={(e) => setIngreso(e.target.value)}
                placeholder="$"
              />
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
