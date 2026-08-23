"use client";

import { useState, useTransition } from "react";
import type { RiderInfo, BacklineItem } from "@/lib/riderData";
import { ETIQUETA_CATEGORIA_BACKLINE, CATEGORIAS_BACKLINE, type CategoriaBackline } from "@/lib/riderCatalogo";
import {
  actualizarRiderInfoAction,
  agregarBacklineItemAction,
  actualizarBacklineItemAction,
  eliminarBacklineItemAction,
} from "@/app/stage-plot/actions";

const TEXTO_OSCURO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";
const ROJO = "oklch(0.55 0.15 25)";
const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: TEXTO_OSCURO };
const labelCls = "mb-1.5 block font-mono text-[10px] font-bold tracking-wide uppercase";
const labelStyle = { color: TEXTO_GRIS };

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

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider"
// §3: fila de Backline en modo lectura -- categoría + especificación son el
// dato principal, la marca sugerida (si existe) va aparte y visualmente
// secundaria, nunca mezclada en el mismo texto que la especificación
// técnica (ese era justo el problema del formato viejo "Ampeg SVT" sin
// rendimiento/tamaño).
function FilaBacklineLectura({ item }: { item: BacklineItem }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.64 0.15 34)" }}>
        {ETIQUETA_CATEGORIA_BACKLINE[item.categoria]}
      </div>
      <div className="mt-1 text-sm" style={{ color: TEXTO_OSCURO }}>
        {item.especificacion}
      </div>
      {item.marcaSugerida && (
        <div className="mt-1 text-xs" style={{ color: TEXTO_GRIS }}>
          Marca sugerida: {item.marcaSugerida}
        </div>
      )}
    </div>
  );
}

function FilaBacklineEditable({
  item,
  bandaId,
  onActualizado,
  onEliminado,
}: {
  item: BacklineItem;
  bandaId: string;
  onActualizado: (item: BacklineItem) => void;
  onEliminado: (id: string) => void;
}) {
  const [categoria, setCategoria] = useState(item.categoria);
  const [especificacion, setEspecificacion] = useState(item.especificacion);
  const [marca, setMarca] = useState(item.marcaSugerida ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hayCambios = categoria !== item.categoria || especificacion !== item.especificacion || marca !== (item.marcaSugerida ?? "");

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarBacklineItemAction(bandaId, item.id, categoria, especificacion, marca || null);
        onActualizado({ ...item, categoria, especificacion, marcaSugerida: marca || null });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const eliminar = () => {
    if (!confirm("¿Quitar este ítem del Backline?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarBacklineItemAction(bandaId, item.id);
        onEliminado(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  };

  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <div className="flex gap-2">
        <select className={`${inputCls} flex-1`} style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaBackline)}>
          {CATEGORIAS_BACKLINE.map((c) => (
            <option key={c} value={c}>
              {ETIQUETA_CATEGORIA_BACKLINE[c]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={eliminar}
          disabled={pending}
          aria-label="Quitar ítem"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold disabled:opacity-50"
          style={{ background: "oklch(0.93 0.016 78)", color: TEXTO_GRIS }}
        >
          ×
        </button>
      </div>
      <textarea
        value={especificacion}
        onChange={(e) => setEspecificacion(e.target.value)}
        placeholder='Especificación por rendimiento, ej. "Cabezal 300+ watts, gabinete 8x10 o 2x10"'
        rows={2}
        className={`${inputCls} mt-2 resize-none`}
        style={inputStyle}
      />
      <input
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        placeholder="Marca(s) sugerida(s) — opcional"
        className={`${inputCls} mt-2`}
        style={inputStyle}
      />
      {hayCambios && (
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !especificacion.trim()}
          className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold disabled:opacity-50"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      )}
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: ROJO }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AgregarBacklineItem({ bandaId, stagePlotId, onAgregado }: { bandaId: string; stagePlotId: string; onAgregado: (item: BacklineItem) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaBackline>("bateria");
  const [especificacion, setEspecificacion] = useState("");
  const [marca, setMarca] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-dashed px-3 py-2 text-sm font-semibold"
        style={{ borderColor: "oklch(0.8 0.02 60)", color: TEXTO_GRIS }}
      >
        + Agregar ítem al Backline
      </button>
    );
  }

  const agregar = () => {
    setError(null);
    if (!especificacion.trim()) {
      setError("La especificación es obligatoria.");
      return;
    }
    startTransition(async () => {
      try {
        const item = await agregarBacklineItemAction(bandaId, stagePlotId, categoria, especificacion, marca || null);
        onAgregado(item);
        setEspecificacion("");
        setMarca("");
        setAbierto(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar.");
      }
    });
  };

  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.965 0.012 82)", border: "1px dashed oklch(0.8 0.02 60)" }}>
      <select className={inputCls} style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaBackline)}>
        {CATEGORIAS_BACKLINE.map((c) => (
          <option key={c} value={c}>
            {ETIQUETA_CATEGORIA_BACKLINE[c]}
          </option>
        ))}
      </select>
      <textarea
        value={especificacion}
        onChange={(e) => setEspecificacion(e.target.value)}
        placeholder='Especificación por rendimiento, ej. "Cabezal 300+ watts, gabinete 8x10 o 2x10"'
        rows={2}
        autoFocus
        className={`${inputCls} mt-2 resize-none`}
        style={inputStyle}
      />
      <input
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        placeholder="Marca(s) sugerida(s) — opcional"
        className={`${inputCls} mt-2`}
        style={inputStyle}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="flex-1 rounded-lg py-1.5 text-xs font-bold disabled:opacity-50"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {pending ? "Agregando…" : "Agregar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: "oklch(0.93 0.016 78)", color: TEXTO_GRIS }}
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: ROJO }}>
          {error}
        </p>
      )}
    </div>
  );
}

function SeccionTitulo({ children }: { children: string }) {
  return (
    <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXTO_GRIS }}>
      {children}
    </h3>
  );
}

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider":
// pestaña "Rider" del módulo -- a diferencia de Input/Stage (derivados del
// stage plot), este contenido es propio, capturado a mano, estándar de la
// industria (backline por rendimiento/especificación con marca sugerida
// aparte y opcional, requerimientos de espacio, nota de contra rider,
// contacto). `puedeEscribir` decide edición inline vs. solo lectura -- el
// link público (/plot/[token]) siempre es solo lectura.
export function RiderInfoVista({
  bandaId,
  stagePlotId,
  riderInfo,
  puedeEscribir,
}: {
  bandaId: string;
  stagePlotId: string;
  riderInfo: RiderInfo;
  puedeEscribir: boolean;
}) {
  const [backline, setBackline] = useState(riderInfo.backline);

  const inicial = {
    corriente: riderInfo.corrienteElectrica ?? "",
    resguardo: riderInfo.resguardoInstrumentos,
    resguardoNota: riderInfo.resguardoNota ?? "",
    proyeccionNota: riderInfo.proyeccionVideoNota ?? "",
    tiempoMontaje: riderInfo.tiempoMontaje ?? "",
    contraRider: riderInfo.contraRiderNota ?? "",
    contactoNombre: riderInfo.contactoNombre ?? "",
    contactoTelefono: riderInfo.contactoTelefono ?? "",
    contactoEmail: riderInfo.contactoEmail ?? "",
  };
  const [campos, setCampos] = useState(inicial);
  const [guardados, setGuardados] = useState(inicial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hayCambios = Object.keys(campos).some((k) => campos[k as keyof typeof campos] !== guardados[k as keyof typeof guardados]);

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarRiderInfoAction(bandaId, stagePlotId, {
          corrienteElectrica: campos.corriente || null,
          resguardoInstrumentos: campos.resguardo,
          resguardoNota: campos.resguardoNota || null,
          proyeccionVideoNota: campos.proyeccionNota || null,
          tiempoMontaje: campos.tiempoMontaje || null,
          contraRiderNota: campos.contraRider || null,
          contactoNombre: campos.contactoNombre || null,
          contactoTelefono: campos.contactoTelefono || null,
          contactoEmail: campos.contactoEmail || null,
        });
        setGuardados(campos);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const hayEspacio = campos.corriente || campos.resguardo || campos.resguardoNota || campos.proyeccionNota || campos.tiempoMontaje;
  const hayContacto = campos.contactoNombre || campos.contactoTelefono || campos.contactoEmail;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <SeccionTitulo>Backline</SeccionTitulo>
          {backline.length > 0 && (
            <span className="font-mono text-[10px]" style={{ color: TEXTO_GRIS }}>
              {backline.length}
            </span>
          )}
        </div>
        {backline.length === 0 && !puedeEscribir && (
          <p className="text-sm" style={{ color: TEXTO_GRIS }}>
            Sin backline capturado todavía.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {backline.map((item) =>
            puedeEscribir ? (
              <FilaBacklineEditable
                key={item.id}
                item={item}
                bandaId={bandaId}
                onActualizado={(actualizado) => setBackline((prev) => prev.map((i) => (i.id === actualizado.id ? actualizado : i)))}
                onEliminado={(id) => setBackline((prev) => prev.filter((i) => i.id !== id))}
              />
            ) : (
              <FilaBacklineLectura key={item.id} item={item} />
            )
          )}
        </div>
        {puedeEscribir && (
          <div className="mt-2">
            <AgregarBacklineItem bandaId={bandaId} stagePlotId={stagePlotId} onAgregado={(item) => setBackline((prev) => [...prev, item])} />
          </div>
        )}
      </div>

      {(hayEspacio || puedeEscribir) && (
        <div>
          <SeccionTitulo>Requerimientos de espacio</SeccionTitulo>
          {puedeEscribir ? (
            <div className="flex flex-col gap-3">
              <div>
                <span className={labelCls} style={labelStyle}>
                  Corriente eléctrica
                </span>
                <input
                  value={campos.corriente}
                  onChange={(e) => setCampos((c) => ({ ...c, corriente: e.target.value }))}
                  placeholder='Ej. "110-120V, bien aterrizada"'
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className={labelCls} style={{ ...labelStyle, marginBottom: 0 }}>
                    Espacio para resguardar instrumentos
                  </span>
                  <Switch activo={campos.resguardo} onToggle={() => setCampos((c) => ({ ...c, resguardo: !c.resguardo }))} />
                </div>
                {campos.resguardo && (
                  <input
                    value={campos.resguardoNota}
                    onChange={(e) => setCampos((c) => ({ ...c, resguardoNota: e.target.value }))}
                    placeholder="Nota (ej. cuarto cerrado atrás del escenario)"
                    className={`${inputCls} mt-2`}
                    style={inputStyle}
                  />
                )}
              </div>
              <div>
                <span className={labelCls} style={labelStyle}>
                  Proyección de video
                </span>
                <input
                  value={campos.proyeccionNota}
                  onChange={(e) => setCampos((c) => ({ ...c, proyeccionNota: e.target.value }))}
                  placeholder="Avisar con anticipación si se cuenta con esto, para llevar visuales"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <span className={labelCls} style={labelStyle}>
                  Tiempo de montaje / prueba de audio (shows privados)
                </span>
                <input
                  value={campos.tiempoMontaje}
                  onChange={(e) => setCampos((c) => ({ ...c, tiempoMontaje: e.target.value }))}
                  placeholder='Ej. "1.5 a 2 horas"'
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-sm" style={{ color: TEXTO_OSCURO }}>
              {campos.corriente && <p>Corriente eléctrica: {campos.corriente}</p>}
              {campos.resguardo && <p>Espacio para resguardar instrumentos{campos.resguardoNota ? ` — ${campos.resguardoNota}` : ""}</p>}
              {campos.proyeccionNota && <p>Proyección de video: {campos.proyeccionNota}</p>}
              {campos.tiempoMontaje && <p>Tiempo de montaje/prueba de audio: {campos.tiempoMontaje}</p>}
            </div>
          )}
        </div>
      )}

      {(campos.contraRider || puedeEscribir) && (
        <div>
          <SeccionTitulo>Contra rider</SeccionTitulo>
          {puedeEscribir ? (
            <textarea
              value={campos.contraRider}
              onChange={(e) => setCampos((c) => ({ ...c, contraRider: e.target.value }))}
              placeholder="Ej. Se puede recibir un contra rider."
              rows={3}
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
          ) : (
            <p className="text-sm" style={{ color: TEXTO_OSCURO }}>
              {campos.contraRider}
            </p>
          )}
        </div>
      )}

      {(hayContacto || puedeEscribir) && (
        <div>
          <SeccionTitulo>Contacto de requerimientos</SeccionTitulo>
          {puedeEscribir ? (
            <div className="flex flex-col gap-2">
              <input
                value={campos.contactoNombre}
                onChange={(e) => setCampos((c) => ({ ...c, contactoNombre: e.target.value }))}
                placeholder="Nombre"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={campos.contactoTelefono}
                onChange={(e) => setCampos((c) => ({ ...c, contactoTelefono: e.target.value }))}
                placeholder="Teléfono"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={campos.contactoEmail}
                onChange={(e) => setCampos((c) => ({ ...c, contactoEmail: e.target.value }))}
                placeholder="Correo"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-sm" style={{ color: TEXTO_OSCURO }}>
              {campos.contactoNombre && <p className="font-bold">{campos.contactoNombre}</p>}
              {campos.contactoTelefono && <p>{campos.contactoTelefono}</p>}
              {campos.contactoEmail && <p>{campos.contactoEmail}</p>}
            </div>
          )}
        </div>
      )}

      {!hayEspacio && !campos.contraRider && !hayContacto && backline.length === 0 && !puedeEscribir && (
        <p className="text-sm" style={{ color: TEXTO_GRIS }}>
          Esta banda todavía no cargó su Rider.
        </p>
      )}

      {puedeEscribir && hayCambios && (
        <div className="sticky bottom-3">
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-bold shadow-lg disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Guardando…" : "Guardar cambios del Rider"}
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs" style={{ color: ROJO }}>
          {error}
        </p>
      )}
    </div>
  );
}
