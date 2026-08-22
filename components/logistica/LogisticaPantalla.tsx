"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Evento } from "@/lib/malgestoEventos";
import type { Lugar } from "@/lib/lugaresData";
import type { PuntoLogistica, MusicoLogistica } from "@/lib/logisticaData";
import { enZonaApp } from "@/lib/zonaHoraria";
import { BadgePrivado } from "@/components/ui/BadgePrivado";
import { crearPuntoLogisticaAction, actualizarPuntoLogisticaAction, eliminarPuntoLogisticaAction } from "@/app/logistica/actions";

// Brief "Logística: línea de tiempo del evento" §2: eje fijo 11:00 -> 02:00
// del día siguiente (15h) -- cubre la mayoría de los shows reales sin pedir
// un rango configurable. `diaSiguiente` se deriva SIEMPRE de la hora elegida
// con esta misma convención (hora < "11:00" cae después de medianoche), así
// que nunca hace falta un toggle aparte para eso -- ni al arrastrar sobre el
// eje ni al tipear la hora a mano en el form.
const HORA_INICIO_EJE = 11;
const TOTAL_MINUTOS_EJE = 15 * 60;
const PX_POR_MINUTO = 1.2;
const ALTURA_EJE = TOTAL_MINUTOS_EJE * PX_POR_MINUTO;

const pad2 = (n: number) => String(n).padStart(2, "0");

function horaAMinutosEje(hora: string, diaSiguiente: boolean): number {
  const [h, m] = hora.split(":").map(Number);
  return ((diaSiguiente ? h + 24 : h) - HORA_INICIO_EJE) * 60 + m;
}

function minutosEjeAHora(minutos: number): { hora: string; diaSiguiente: boolean } {
  const horaCruda = HORA_INICIO_EJE + Math.floor(minutos / 60);
  const minuto = minutos % 60;
  return { hora: `${pad2(horaCruda % 24)}:${pad2(minuto)}`, diaSiguiente: horaCruda >= 24 };
}

const diaSiguienteDeHora = (hora: string) => hora < "11:00";

function redondearA15(minutos: number): number {
  return Math.min(TOTAL_MINUTOS_EJE, Math.max(0, Math.round(minutos / 15) * 15));
}

function horaDesdeIso(iso: string): { hora: string; diaSiguiente: boolean } {
  const d = enZonaApp(iso);
  const hora = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { hora, diaSiguiente: diaSiguienteDeHora(hora) };
}

type FormPunto = { hora: string; diaSiguiente: boolean; etiqueta: string; lugarId: string | null };

// Brief "Logística: mejoras de interacción..." §2: `oculta` reemplaza el
// filtrado directo del array -- descartar ya no borra la sugerencia, solo
// la saca de la vista normal (ver sugerenciasVisibles/sugerenciasOcultas).
type Sugerencia = { key: string; etiqueta: string; hora: string; diaSiguiente: boolean; lugarId: string | null; oculta: boolean };

// Brief §3: sugerencias solo se ofrecen, nunca se crean solas -- se calculan
// una vez a partir del evento (nombre del lugar, fecha_inicio/fecha_fin) y
// el usuario las acepta (con o sin edición previa) o las descarta, punto por
// punto.
function construirSugerencias(evento: Evento): Sugerencia[] {
  const lista: Sugerencia[] = [];
  if (evento.lugarId) {
    const { hora, diaSiguiente } = horaDesdeIso(evento.fechaInicio);
    lista.push({ key: "lugar", etiqueta: `Llegada a ${evento.lugarNombre ?? "el lugar"}`, hora, diaSiguiente, lugarId: evento.lugarId, oculta: false });
  }
  lista.push({ key: "musicos", etiqueta: "Llegada de músicos", hora: "", diaSiguiente: false, lugarId: null, oculta: false });
  lista.push({ key: "transporte", etiqueta: "Llegada del transporte", hora: "", diaSiguiente: false, lugarId: null, oculta: false });
  lista.push({ key: "salida", etiqueta: "Salida hacia el lugar", hora: "", diaSiguiente: false, lugarId: null, oculta: false });
  lista.push({ key: "inicio", etiqueta: "Inicio del show", hora: "", diaSiguiente: false, lugarId: null, oculta: false });
  const fin = evento.fechaFin ? horaDesdeIso(evento.fechaFin) : { hora: "", diaSiguiente: false };
  lista.push({ key: "fin", etiqueta: "Fin del show", hora: fin.hora, diaSiguiente: fin.diaSiguiente, lugarId: null, oculta: false });
  return lista;
}

const inputCls = "w-full rounded-xl border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };
const labelCls = "mb-1 block font-mono text-[10px] font-bold tracking-wide uppercase";
const labelStyle = { color: "oklch(0.55 0.02 55)" };
const ACENTO = "oklch(0.64 0.15 34)";

function SelectorLugar({ lugares, value, onChange }: { lugares: Lugar[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <span className={labelCls} style={labelStyle}>
        Lugar (opcional)
      </span>
      <select className={inputCls} style={inputStyle} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Sin lugar vinculado -- texto libre</option>
        {lugares.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormularioPunto({
  form,
  setForm,
  lugares,
  onGuardar,
  onCancelar,
  onEliminar,
  guardando,
  tituloBoton,
}: {
  form: FormPunto;
  setForm: (f: FormPunto) => void;
  lugares: Lugar[];
  onGuardar: () => void;
  onCancelar: () => void;
  onEliminar?: () => void;
  guardando: boolean;
  tituloBoton: string;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2.5 rounded-2xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
      <div className="flex gap-2">
        <div className="w-28 shrink-0">
          <span className={labelCls} style={labelStyle}>
            Hora
          </span>
          <input
            type="time"
            className={inputCls}
            style={inputStyle}
            value={form.hora}
            onChange={(e) => setForm({ ...form, hora: e.target.value, diaSiguiente: diaSiguienteDeHora(e.target.value) })}
          />
          {form.hora && <p className="mt-1 text-[11px]" style={labelStyle}>{form.diaSiguiente ? "Día siguiente" : "Mismo día"}</p>}
        </div>
        <div className="flex-1">
          <span className={labelCls} style={labelStyle}>
            Etiqueta
          </span>
          <input
            className={inputCls}
            style={inputStyle}
            value={form.etiqueta}
            onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
            placeholder="Llegada del transporte"
          />
        </div>
      </div>
      <SelectorLugar lugares={lugares} value={form.lugarId} onChange={(lugarId) => setForm({ ...form, lugarId })} />
      {form.lugarId &&
        (() => {
          const lugar = lugares.find((l) => l.id === form.lugarId);
          if (!lugar) return null;
          return (
            <a
              href={lugar.linkMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="-mt-1 text-xs font-semibold no-underline"
              style={{ color: ACENTO }}
            >
              {lugar.nombre} · Ver en Maps ↗
            </a>
          );
        })()}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando || !form.hora || !form.etiqueta.trim()}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
          style={{ background: ACENTO, color: "oklch(0.99 0.01 82)" }}
        >
          {guardando ? "Guardando…" : tituloBoton}
        </button>
        {onEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
            style={{ color: "oklch(0.6 0.15 25)" }}
          >
            Eliminar
          </button>
        )}
        <button type="button" onClick={onCancelar} disabled={guardando} className="rounded-lg px-3 py-2 text-sm font-bold" style={{ color: "oklch(0.4 0.02 55)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Brief §1: tarjeta de una sugerencia, reusada tanto para las visibles como
// (con `oculta`) para las que se muestran al abrir "Ver sugerencias
// ocultas" -- mismo layout, solo cambia la acción secundaria (Descartar vs
// Volver a mostrar).
function TarjetaSugerencia({
  s,
  oculta,
  enEdicion,
  form,
  setForm,
  lugares,
  pending,
  onAceptar,
  onDescartar,
  onMostrar,
}: {
  s: Sugerencia;
  oculta: boolean;
  enEdicion: boolean;
  form: FormPunto | null;
  setForm: (f: FormPunto) => void;
  lugares: Lugar[];
  pending: boolean;
  onAceptar: () => void;
  onDescartar: () => void;
  onMostrar: () => void;
}) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: "oklch(0.99 0.008 82)", opacity: oculta ? 0.6 : 1 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: "oklch(0.24 0.02 55)" }}>
            {s.etiqueta}
          </div>
          <div className="text-xs" style={labelStyle}>
            {s.hora ? `${s.hora}${s.diaSiguiente ? " (día siguiente)" : ""}` : "Sin hora -- se pide al aceptar"}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onAceptar} disabled={pending} className="text-sm font-bold disabled:opacity-50" style={{ color: ACENTO }}>
            Aceptar
          </button>
          {oculta ? (
            <button type="button" onClick={onMostrar} disabled={pending} className="text-sm font-bold" style={labelStyle}>
              Volver a mostrar
            </button>
          ) : (
            <button type="button" onClick={onDescartar} disabled={pending} className="text-sm font-bold" style={labelStyle}>
              Descartar
            </button>
          )}
        </div>
      </div>
      {enEdicion && form && (
        <FormularioPunto form={form} setForm={setForm} lugares={lugares} onGuardar={onAceptar} onCancelar={onDescartar} guardando={pending} tituloBoton="Agregar a la línea de tiempo" />
      )}
    </div>
  );
}

export function LogisticaPantalla({
  evento,
  puntosIniciales,
  lugares,
  musicos,
  puedeEditar,
}: {
  evento: Evento;
  puntosIniciales: PuntoLogistica[];
  lugares: Lugar[];
  musicos: MusicoLogistica[];
  puedeEditar: boolean;
}) {
  const [puntos, setPuntos] = useState<PuntoLogistica[]>(puntosIniciales);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>(() =>
    puedeEditar && puntosIniciales.length === 0 ? construirSugerencias(evento) : []
  );
  // Brief §1: acordeón cerrado por default, mismo criterio que los demás
  // acordeones de la app (ver TabBar/SeteosLista/IntegrantesPanel).
  const [sugerenciasAbierto, setSugerenciasAbierto] = useState(false);
  const [verOcultas, setVerOcultas] = useState(false);
  const [sugerenciaEnEdicion, setSugerenciaEnEdicion] = useState<string | null>(null);
  const [formSugerencia, setFormSugerencia] = useState<FormPunto | null>(null);

  const [nuevo, setNuevo] = useState<FormPunto | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formEdicion, setFormEdicion] = useState<FormPunto | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const axisRef = useRef<HTMLDivElement>(null);

  const inicio = enZonaApp(evento.fechaInicio);
  const fechaTexto = inicio.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  function minutosDesdeClientY(clientY: number): number {
    const rect = axisRef.current!.getBoundingClientRect();
    return redondearA15(((clientY - rect.top) / ALTURA_EJE) * TOTAL_MINUTOS_EJE);
  }

  function onPointerDownEje(e: React.PointerEvent<HTMLDivElement>) {
    if (nuevo || editandoId) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(minutosDesdeClientY(e.clientY));
  }
  function onPointerMoveEje(e: React.PointerEvent<HTMLDivElement>) {
    if (arrastrando === null) return;
    setArrastrando(minutosDesdeClientY(e.clientY));
  }
  function onPointerUpEje() {
    if (arrastrando === null) return;
    const { hora, diaSiguiente } = minutosEjeAHora(arrastrando);
    setArrastrando(null);
    setEditandoId(null);
    setFormEdicion(null);
    setNuevo({ hora, diaSiguiente, etiqueta: "", lugarId: null });
  }

  function abrirEdicion(p: PuntoLogistica) {
    setNuevo(null);
    setEditandoId(p.id);
    setFormEdicion({ hora: p.hora, diaSiguiente: p.diaSiguiente, etiqueta: p.etiqueta, lugarId: p.lugarId });
  }

  function guardarNuevo() {
    if (!nuevo) return;
    setError(null);
    startTransition(async () => {
      try {
        const punto = await crearPuntoLogisticaAction(evento.id, evento.bandaId, nuevo.hora, nuevo.diaSiguiente, nuevo.etiqueta, nuevo.lugarId);
        setPuntos((prev) => [...prev, punto]);
        setSugerencias([]);
        setNuevo(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el punto.");
      }
    });
  }

  function guardarEdicion() {
    if (!editandoId || !formEdicion) return;
    setError(null);
    startTransition(async () => {
      try {
        const actualizado = await actualizarPuntoLogisticaAction(
          editandoId,
          evento.id,
          evento.bandaId,
          formEdicion.hora,
          formEdicion.diaSiguiente,
          formEdicion.etiqueta,
          formEdicion.lugarId
        );
        setPuntos((prev) => prev.map((p) => (p.id === editandoId ? actualizado : p)));
        setEditandoId(null);
        setFormEdicion(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el punto.");
      }
    });
  }

  function eliminarPunto() {
    if (!editandoId) return;
    if (!confirm("¿Eliminar este punto de la línea de tiempo?")) return;
    setError(null);
    const id = editandoId;
    startTransition(async () => {
      try {
        await eliminarPuntoLogisticaAction(id, evento.id, evento.bandaId);
        setPuntos((prev) => prev.filter((p) => p.id !== id));
        setEditandoId(null);
        setFormEdicion(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el punto.");
      }
    });
  }

  function aceptarSugerencia(s: Sugerencia) {
    const form = formSugerencia && sugerenciaEnEdicion === s.key ? formSugerencia : { hora: s.hora, diaSiguiente: s.diaSiguiente, etiqueta: s.etiqueta, lugarId: s.lugarId };
    if (!form.hora) {
      // Sin hora predefinida (brief §3): recién abre el form para completarla,
      // no crea nada todavía.
      setSugerenciaEnEdicion(s.key);
      setFormSugerencia(form);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const punto = await crearPuntoLogisticaAction(evento.id, evento.bandaId, form.hora, form.diaSiguiente, form.etiqueta, form.lugarId);
        setPuntos((prev) => [...prev, punto]);
        setSugerencias((prev) => prev.filter((x) => x.key !== s.key));
        setSugerenciaEnEdicion(null);
        setFormSugerencia(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el punto.");
      }
    });
  }

  // Brief §2: descartar oculta, no borra -- la sugerencia sigue en
  // `sugerencias` con `oculta: true`, recuperable desde "Ver sugerencias
  // ocultas" (mostrarSugerencia) en vez de perderse para siempre.
  function descartarSugerencia(key: string) {
    setSugerencias((prev) => prev.map((s) => (s.key === key ? { ...s, oculta: true } : s)));
    if (sugerenciaEnEdicion === key) {
      setSugerenciaEnEdicion(null);
      setFormSugerencia(null);
    }
  }

  function mostrarSugerencia(key: string) {
    setSugerencias((prev) => prev.map((s) => (s.key === key ? { ...s, oculta: false } : s)));
  }

  const marcasHora = Array.from({ length: 16 }, (_, i) => {
    const horaCruda = HORA_INICIO_EJE + i;
    return { minutos: i * 60, etiqueta: `${pad2(horaCruda % 24)}:00`, diaSiguiente: horaCruda >= 24 };
  });

  const sugerenciasVisibles = sugerencias.filter((s) => !s.oculta);
  const sugerenciasOcultas = sugerencias.filter((s) => s.oculta);

  const editorAbierto = puedeEditar && ((nuevo !== null) || (editandoId !== null && formEdicion !== null));

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
      <Link href="/inicio" className="text-sm no-underline" style={{ color: "oklch(0.5 0.02 55)" }}>
        ‹ Calendario
      </Link>
      <div className="mt-1 font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
        Logística{!puedeEditar && " · solo lectura"}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-[26px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}>
          {evento.titulo}
        </h1>
        {!evento.esPublico && <BadgePrivado />}
      </div>
      <p className="mt-1 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
        {fechaTexto} · {evento.bandaNombre}
      </p>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}

      {/* Brief §1: acordeón cerrado por default -- mismo patrón que
          "Deshabilitados" en SeteosLista / "Bloques visibles" en
          IntegrantesPanel (header con label+chevron, contenido solo si
          `sugerenciasAbierto`). Se ofrece mientras haya AL MENOS una
          sugerencia, visible u oculta -- si se descartan todas hay que
          poder seguir abriendo el acordeón para recuperarlas. */}
      {puedeEditar && sugerencias.length > 0 && (
        <div className="mt-4 rounded-2xl" style={{ background: "oklch(0.93 0.016 78 / 0.7)", border: "1px dashed oklch(0.75 0.02 60)" }}>
          <button
            type="button"
            onClick={() => setSugerenciasAbierto((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.05 60)" }}>
              Sugerencias{sugerenciasVisibles.length > 0 ? ` (${sugerenciasVisibles.length})` : ""}
            </span>
            <span className="text-xs" style={{ color: "oklch(0.5 0.05 60)", transform: sugerenciasAbierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              ▾
            </span>
          </button>
          {sugerenciasAbierto && (
            <div className="flex flex-col gap-2 px-3 pb-3">
              {sugerenciasVisibles.length === 0 && (
                <p className="text-xs" style={labelStyle}>
                  Descartaste todas -- “Ver sugerencias ocultas” abajo para recuperarlas.
                </p>
              )}
              {sugerenciasVisibles.map((s) => (
                <TarjetaSugerencia
                  key={s.key}
                  s={s}
                  oculta={false}
                  enEdicion={sugerenciaEnEdicion === s.key}
                  form={formSugerencia}
                  setForm={setFormSugerencia}
                  lugares={lugares}
                  pending={pending}
                  onAceptar={() => aceptarSugerencia(s)}
                  onDescartar={() => descartarSugerencia(s.key)}
                  onMostrar={() => mostrarSugerencia(s.key)}
                />
              ))}

              {sugerenciasOcultas.length > 0 && (
                <button type="button" onClick={() => setVerOcultas((v) => !v)} className="text-left text-xs font-bold" style={labelStyle}>
                  {verOcultas ? "Ocultar sugerencias descartadas" : `Ver sugerencias ocultas (${sugerenciasOcultas.length})`}
                </button>
              )}
              {verOcultas &&
                sugerenciasOcultas.map((s) => (
                  <TarjetaSugerencia
                    key={s.key}
                    s={s}
                    oculta
                    enEdicion={sugerenciaEnEdicion === s.key}
                    form={formSugerencia}
                    setForm={setFormSugerencia}
                    lugares={lugares}
                    pending={pending}
                    onAceptar={() => aceptarSugerencia(s)}
                    onDescartar={() => descartarSugerencia(s.key)}
                    onMostrar={() => mostrarSugerencia(s.key)}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Brief §4: el editor de punto (nuevo o edición de uno existente)
          abre acá -- arriba de la línea de tiempo, debajo del acordeón de
          sugerencias -- en vez de al fondo de la página como antes, para
          que quede visible sin scrollear. */}
      {editorAbierto && nuevo && (
        <FormularioPunto form={nuevo} setForm={setNuevo} lugares={lugares} onGuardar={guardarNuevo} onCancelar={() => setNuevo(null)} guardando={pending} tituloBoton="Agregar punto" />
      )}
      {editorAbierto && editandoId && formEdicion && (
        <FormularioPunto
          form={formEdicion}
          setForm={setFormEdicion}
          lugares={lugares}
          onGuardar={guardarEdicion}
          onCancelar={() => {
            setEditandoId(null);
            setFormEdicion(null);
          }}
          onEliminar={eliminarPunto}
          guardando={pending}
          tituloBoton="Guardar cambios"
        />
      )}

      {puedeEditar && (
        <p className="mt-4 text-xs" style={labelStyle}>
          Tocá o arrastrá sobre el eje para agregar un punto a esa hora.
        </p>
      )}

      {/* Brief §3: con las sugerencias cerradas por default hay más espacio
          para el eje -- queda con su propio scroll (max-height) en vez de
          forzar a scrollear toda la página cuando el rango de 15h no cabe
          completo en pantalla. */}
      <div className="mt-2 flex gap-2 overflow-y-auto" style={{ maxHeight: "68vh" }}>
        <div className="shrink-0" style={{ width: 46 }}>
          {marcasHora.map((m) => (
            <div key={m.minutos} className="relative font-mono text-[10px]" style={{ height: 60 * PX_POR_MINUTO, color: "oklch(0.55 0.02 55)" }}>
              <span className="absolute -top-1.5">{m.etiqueta}</span>
            </div>
          ))}
        </div>

        <div
          ref={axisRef}
          onPointerDown={puedeEditar ? onPointerDownEje : undefined}
          onPointerMove={puedeEditar ? onPointerMoveEje : undefined}
          onPointerUp={puedeEditar ? onPointerUpEje : undefined}
          className={`relative flex-1 rounded-2xl ${puedeEditar ? "touch-none" : ""}`}
          style={{ height: ALTURA_EJE, background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
        >
          {marcasHora.map((m) => (
            <div key={m.minutos} className="absolute left-0 right-0" style={{ top: m.minutos * PX_POR_MINUTO, borderTop: "1px solid oklch(0.91 0.013 78)" }} />
          ))}

          {puedeEditar && arrastrando !== null && (
            <div className="pointer-events-none absolute left-0 right-0 flex items-center gap-2" style={{ top: arrastrando * PX_POR_MINUTO }}>
              <div className="h-px flex-1" style={{ background: ACENTO }} />
              <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white" style={{ background: ACENTO }}>
                {minutosEjeAHora(arrastrando).hora}
              </span>
            </div>
          )}

          {puntos.map((p) => {
            const top = Math.min(ALTURA_EJE, Math.max(0, horaAMinutosEje(p.hora, p.diaSiguiente) * PX_POR_MINUTO));
            const contenido = (
              <>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACENTO }} />
                <span className="truncate text-[13px] font-semibold" style={{ color: "oklch(0.24 0.02 55)" }}>
                  {p.hora} · {p.etiqueta}
                </span>
                {p.lugarNombre && (
                  <span className="shrink-0 text-xs" style={labelStyle}>
                    ↗ {p.lugarNombre}
                  </span>
                )}
              </>
            );
            return puedeEditar ? (
              <button
                key={p.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  abrirEdicion(p);
                }}
                className="absolute left-1 right-1 flex items-center gap-2 rounded-lg px-2 py-1 text-left"
                style={{ top: top - 11, background: "oklch(0.99 0.01 82)" }}
              >
                {contenido}
              </button>
            ) : (
              <div key={p.id} className="absolute left-1 right-1 flex items-center gap-2 rounded-lg px-2 py-1" style={{ top: top - 11, background: "oklch(0.99 0.01 82)" }}>
                {contenido}
              </div>
            );
          })}
        </div>
      </div>

      {puntos.length === 0 && sugerencias.length === 0 && (
        <p className="mt-4 text-sm" style={labelStyle}>
          {puedeEditar ? "Sin puntos todavía -- tocá el eje para agregar el primero." : "Sin puntos todavía."}
        </p>
      )}

      <div className="mt-6">
        <div className="font-mono text-[10px] font-bold tracking-wide uppercase" style={labelStyle}>
          Músicos
        </div>
        {musicos.length === 0 ? (
          <p className="mt-1.5 text-sm" style={labelStyle}>
            {evento.bandaNombre} todavía no tiene un stage plot armado con músicos.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl p-3" style={{ background: "oklch(0.93 0.016 78)" }}>
            {musicos.map((m, i) => (
              <div key={i} className="text-sm" style={{ color: "oklch(0.3 0.02 55)" }}>
                <span className="font-semibold">{m.persona}</span>
                {m.roles && <> — {m.roles}</>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
