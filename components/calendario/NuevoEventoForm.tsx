"use client";

import { useState, useTransition } from "react";
import type { Membresia, TipoEvento, Evento, NuevoEventoInput } from "@/lib/malgestoEventos";
import type { CuartoEnsayo } from "@/lib/cuartosEnsayoData";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";
import { crearEventoAction, actualizarEventoAction, crearGiraRapidaAction } from "@/app/inicio/actions";
import { HoraRangoSlider } from "./HoraRangoSlider";

type SetlistOpcion = { id: string; bandaId: string; nombre: string };

const TIPOS: TipoEvento[] = ["show", "ensayo", "cumpleanos", "gira"];

const inputCls = "w-full rounded-xl border px-3.5 py-3 text-[15px] outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "mb-1.5 block font-mono text-[10px] font-bold tracking-wide uppercase";
const labelStyle = { color: "oklch(0.55 0.02 55)" };

function aFechaHora(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
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

export function NuevoEventoForm({
  membresias,
  giras,
  setlists,
  cuartosEnsayo,
  eventoExistente,
  fechaSeleccionada,
  onCreado,
  onCancelar,
}: {
  membresias: Membresia[];
  giras: Evento[];
  setlists: SetlistOpcion[];
  cuartosEnsayo: CuartoEnsayo[];
  eventoExistente?: Evento;
  fechaSeleccionada: Date;
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const fechaBase = eventoExistente ? new Date(eventoExistente.fechaInicio) : fechaSeleccionada;
  const inicial = eventoExistente && eventoExistente.tipo !== "gira" ? aFechaHora(eventoExistente.fechaInicio) : null;
  const inicialFin = eventoExistente?.fechaFin && eventoExistente.tipo !== "gira" ? aFechaHora(eventoExistente.fechaFin) : null;
  const inicialGiraDesde = eventoExistente?.tipo === "gira" ? aFechaHora(eventoExistente.fechaInicio) : null;
  const inicialGiraHasta = eventoExistente?.tipo === "gira" && eventoExistente.fechaFin ? aFechaHora(eventoExistente.fechaFin) : null;

  const [tipo, setTipo] = useState<TipoEvento>(eventoExistente?.tipo ?? "show");
  const [titulo, setTitulo] = useState(eventoExistente?.titulo ?? "");
  const [ubicacion, setUbicacion] = useState(eventoExistente?.ubicacion ?? "");
  const [cuartoEnsayoId, setCuartoEnsayoId] = useState(eventoExistente?.cuartoEnsayoId ?? "");
  const [horaInicio, setHoraInicio] = useState(inicial?.hora ?? "19:00");
  const [horaFin, setHoraFin] = useState(inicialFin?.hora ?? "22:00");
  const [giraDesde, setGiraDesde] = useState(inicialGiraDesde?.fecha ?? "");
  const [giraHasta, setGiraHasta] = useState(inicialGiraHasta?.fecha ?? "");
  const [ingreso, setIngreso] = useState(eventoExistente?.ingresoEsperado?.toString() ?? "");
  const [bandaId, setBandaId] = useState(eventoExistente?.bandaId ?? membresias[0]?.bandaId ?? "");

  const [setlistOn, setSetlistOn] = useState(!!eventoExistente?.setlistId);
  const [setlistId, setSetlistId] = useState(eventoExistente?.setlistId ?? "");

  const [giraOn, setGiraOn] = useState(!!eventoExistente?.giraId);
  const [giraId, setGiraId] = useState(eventoExistente?.giraId ?? "");
  const [girasLocal, setGirasLocal] = useState(giras);
  const [nuevaGira, setNuevaGira] = useState(false);
  const [nuevaGiraNombre, setNuevaGiraNombre] = useState("");
  const [nuevaGiraDesde, setNuevaGiraDesde] = useState("");
  const [nuevaGiraHasta, setNuevaGiraHasta] = useState("");
  const [creandoGira, startCrearGira] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const girasDeLaBanda = girasLocal.filter((g) => g.bandaId === bandaId);
  const setlistsDeLaBanda = setlists.filter((s) => s.bandaId === bandaId);
  const cuartosDeLaBanda = cuartosEnsayo.filter((c) => c.bandaId === bandaId);

  const crearGiraRapida = () => {
    setError(null);
    if (!nuevaGiraNombre.trim() || !nuevaGiraDesde) {
      setError("Completá nombre y fecha de inicio de la nueva gira.");
      return;
    }
    startCrearGira(async () => {
      try {
        const desdeIso = new Date(`${nuevaGiraDesde}T00:00`).toISOString();
        const hastaIso = new Date(`${nuevaGiraHasta || nuevaGiraDesde}T00:00`).toISOString();
        const gira = await crearGiraRapidaAction(bandaId, nuevaGiraNombre.trim(), desdeIso, hastaIso);
        setGirasLocal((prev) => [...prev, gira]);
        setGiraId(gira.id);
        setNuevaGira(false);
        setNuevaGiraNombre("");
        setNuevaGiraDesde("");
        setNuevaGiraHasta("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear la gira.");
      }
    });
  };

  const onSubmit = () => {
    setError(null);
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!bandaId) {
      setError("Falta la banda.");
      return;
    }

    let fechaInicioIso: string;
    let fechaFinIso: string | null;

    if (tipo === "gira") {
      if (!giraDesde) {
        setError("La fecha de inicio de la gira es obligatoria.");
        return;
      }
      fechaInicioIso = new Date(`${giraDesde}T00:00`).toISOString();
      fechaFinIso = giraHasta ? new Date(`${giraHasta}T00:00`).toISOString() : null;
    } else {
      const pad = (n: number) => String(n).padStart(2, "0");
      const fechaStr = `${fechaBase.getFullYear()}-${pad(fechaBase.getMonth() + 1)}-${pad(fechaBase.getDate())}`;
      fechaInicioIso = new Date(`${fechaStr}T${tipo === "cumpleanos" ? "00:00" : horaInicio}`).toISOString();
      fechaFinIso = tipo === "cumpleanos" ? null : new Date(`${fechaStr}T${horaFin}`).toISOString();
    }

    const input: NuevoEventoInput = {
      bandaId,
      tipo,
      titulo: titulo.trim(),
      fechaInicio: fechaInicioIso,
      fechaFin: fechaFinIso,
      ubicacion: tipo === "show" ? ubicacion.trim() || null : null,
      ingresoEsperado: tipo === "show" && ingreso ? Number(ingreso) : null,
      giraId: tipo === "show" && giraOn && giraId ? giraId : null,
      setlistId: (tipo === "show" || tipo === "ensayo") && setlistOn && setlistId ? setlistId : null,
      cuartoEnsayoId: tipo === "ensayo" ? cuartoEnsayoId || null : null,
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
  };

  const tituloForm = eventoExistente ? "Editar evento" : tipo === "gira" ? "Nueva gira" : `Nuevo evento · ${fechaLarga(fechaBase)}`;

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
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold"
                  style={{
                    background: tipo === t ? COLOR_TIPO[t] : "oklch(0.93 0.016 78)",
                    color: tipo === t ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tipo === t ? "oklch(0.99 0.01 82)" : COLOR_TIPO[t] }} />
                  {ETIQUETA_TIPO[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls} style={labelStyle}>
              Título
            </span>
            <input
              className={inputCls}
              style={inputStyle}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={tipo === "cumpleanos" ? "Cumpleaños de…" : "Foro Escénico"}
            />
          </div>

          {tipo === "ensayo" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Cuarto de ensayo
              </span>
              {cuartosDeLaBanda.length === 0 ? (
                <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
                  Todavía no hay cuartos de ensayo cargados para esta banda. Creá uno primero desde Gestión → Cuartos de ensayo.
                </p>
              ) : (
                <select className={inputCls} style={inputStyle} value={cuartoEnsayoId} onChange={(e) => setCuartoEnsayoId(e.target.value)}>
                  <option value="">— elegí un cuarto —</option>
                  {cuartosDeLaBanda.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {tipo === "show" && (
            <div>
              <span className={labelCls} style={labelStyle}>
                Link de Google Maps
              </span>
              <input
                className={inputCls}
                style={inputStyle}
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
              />
            </div>
          )}

          {tipo === "gira" ? (
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
          ) : (
            <div>
              <span className={labelCls} style={labelStyle}>
                {tipo === "cumpleanos" ? "Fecha" : "Horario"}
              </span>
              <div className="rounded-xl border px-3.5 py-2.5" style={inputStyle}>
                <span className="text-sm">{fechaLarga(fechaBase)}</span>
                {tipo !== "cumpleanos" && (
                  <HoraRangoSlider
                    inicio={horaInicio}
                    fin={horaFin}
                    onChange={(i, f) => {
                      setHoraInicio(i);
                      setHoraFin(f);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {membresias.length > 1 && (
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
                  setCuartoEnsayoId("");
                }}
              >
                {membresias.map((m) => (
                  <option key={m.bandaId} value={m.bandaId}>
                    {m.bandaNombre}
                  </option>
                ))}
              </select>
            </div>
          )}

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
