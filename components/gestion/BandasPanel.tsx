"use client";

import { useState, useTransition } from "react";
import type { BandaSimple, ActualizacionBanda, Plaza } from "@/lib/gestionData";
import { INSTRUMENTOS, ETIQUETA_INSTRUMENTO, etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { ToggleChip } from "@/components/ui/ToggleChip";
import {
  crearBandaAction,
  actualizarBandaAction,
  archivarBandaAction,
  eliminarBandaAction,
  crearPlazasAction,
  eliminarPlazaAction,
} from "@/app/gestion/actions";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function EliminarBandaModal({ banda, onCerrar, onEliminada }: { banda: BandaSimple; onCerrar: () => void; onEliminada: () => void }) {
  const [confirmacion, setConfirmacion] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const habilitado = confirmacion.trim() === banda.nombre;

  const eliminar = () => {
    if (!habilitado) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarBandaAction(banda.id);
        onEliminada();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar la banda.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-5" onClick={onCerrar}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "oklch(0.99 0.008 82)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Eliminar {banda.nombre}
        </h3>
        <p className="mt-2 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
          Esta acción es irreversible: borra en cascada todos los eventos, canciones, set lists, dispositivos, membresías, invitaciones y lugares de
          esta banda. Escribí <strong>{banda.nombre}</strong> para confirmar.
        </p>
        <input
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          className={`${inputCls} mt-3`}
          style={inputStyle}
          placeholder={banda.nombre}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={eliminar}
            disabled={!habilitado || pending}
            className="flex-1 rounded-lg py-2 text-sm font-bold disabled:opacity-40"
            style={{ background: "oklch(0.55 0.15 25)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
          <button type="button" onClick={onCerrar} className="rounded-lg px-3 py-2 text-sm font-bold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
            Cancelar
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function PlazasDeLaBanda({ bandaId, plazas, onPlazas }: { bandaId: string; plazas: Plaza[]; onPlazas: (p: Plaza[]) => void }) {
  const [instrumento, setInstrumento] = useState<string>(INSTRUMENTOS[0]);
  const [etiqueta, setEtiqueta] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esOtro = instrumento === "otro";

  const agregar = () => {
    setError(null);
    if (esOtro && !etiqueta.trim()) {
      setError("Escribí una etiqueta para \"Otro\".");
      return;
    }
    startTransition(async () => {
      try {
        const nuevas = await crearPlazasAction(bandaId, instrumento, esOtro ? etiqueta.trim() : null, esOtro ? 1 : cantidad);
        onPlazas([...plazas, ...nuevas]);
        setEtiqueta("");
        setCantidad(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear la plaza.");
      }
    });
  };

  const quitar = (plazaId: string) => {
    startTransition(async () => {
      try {
        await eliminarPlazaAction(plazaId);
        onPlazas(plazas.filter((p) => p.id !== plazaId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar la plaza.");
      }
    });
  };

  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
        Plazas
      </span>
      {plazas.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no hay plazas definidas para esta banda.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {plazas.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
            >
              {etiquetaPlaza(p.instrumento, p.etiqueta)}
              <button
                type="button"
                onClick={() => quitar(p.id)}
                disabled={pending}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ background: "oklch(0.85 0.016 78)" }}
                aria-label="Quitar plaza"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-1.5">
        <select value={instrumento} onChange={(e) => setInstrumento(e.target.value)} className={`${inputCls} flex-1`} style={inputStyle}>
          {INSTRUMENTOS.map((i) => (
            <option key={i} value={i}>
              {ETIQUETA_INSTRUMENTO[i]}
            </option>
          ))}
        </select>
        {esOtro ? (
          <input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Etiqueta"
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
        ) : (
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
            className={`${inputCls} w-20 shrink-0`}
            style={inputStyle}
            aria-label="Cantidad"
          />
        )}
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="shrink-0 rounded-lg px-3 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          +
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function DetalleBanda({
  banda,
  plazas,
  onVolver,
  onActualizada,
  onEliminada,
  onPlazas,
}: {
  banda: BandaSimple;
  plazas: Plaza[];
  onVolver: () => void;
  onActualizada: (b: BandaSimple) => void;
  onEliminada: () => void;
  onPlazas: (p: Plaza[]) => void;
}) {
  const [nombre, setNombre] = useState(banda.nombre);
  const [genero, setGenero] = useState(banda.genero ?? "");
  const [canciones, setCanciones] = useState(banda.cancionesHabilitado);
  const [setlist, setSetlist] = useState(banda.setlistHabilitado);
  const [seteos, setSeteos] = useState(banda.seteosHabilitado);
  const [pending, startTransition] = useTransition();
  const [pendingArchivar, startArchivar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);

  const hayCambios =
    nombre.trim() !== banda.nombre ||
    (genero.trim() || null) !== banda.genero ||
    canciones !== banda.cancionesHabilitado ||
    setlist !== banda.setlistHabilitado ||
    seteos !== banda.seteosHabilitado;

  const guardar = () => {
    if (!nombre.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const cambios: ActualizacionBanda = {
          nombre: nombre.trim(),
          genero: genero.trim() || null,
          cancionesHabilitado: canciones,
          setlistHabilitado: setlist,
          seteosHabilitado: seteos,
        };
        await actualizarBandaAction(banda.id, cambios);
        onActualizada({ ...banda, ...cambios });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const archivar = () => {
    startArchivar(async () => {
      try {
        await archivarBandaAction(banda.id, !banda.archivada);
        onActualizada({ ...banda, archivada: !banda.archivada });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo archivar.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onVolver} className="text-left text-sm" style={{ color: "oklch(0.6 0.02 55)" }}>
        ‹ Bandas
      </button>

      <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
          Nombre
        </label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} style={inputStyle} />

        <label className="mb-1.5 mt-3 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
          Género
        </label>
        <input value={genero} onChange={(e) => setGenero(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. Cumbia, Rock…" />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ToggleChip label="Calendario" active dot={false} onClick={() => {}} />
          <ToggleChip label="Canciones" active={canciones} onClick={() => setCanciones((v) => !v)} />
          <ToggleChip label="Set List" active={setlist} onClick={() => setSetlist((v) => !v)} />
          <ToggleChip label="Seteos" active={seteos} onClick={() => setSeteos((v) => !v)} />
        </div>

        {hayCambios && (
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="mt-3 w-full rounded-lg py-2 text-sm font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        )}
        {error && (
          <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <PlazasDeLaBanda bandaId={banda.id} plazas={plazas} onPlazas={onPlazas} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={archivar}
          disabled={pendingArchivar}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          {pendingArchivar ? "…" : banda.archivada ? "Desarchivar" : "Archivar"}
        </button>
        <button
          type="button"
          onClick={() => setMostrarEliminar(true)}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)" }}
        >
          Eliminar banda
        </button>
      </div>

      {mostrarEliminar && (
        <EliminarBandaModal banda={banda} onCerrar={() => setMostrarEliminar(false)} onEliminada={onEliminada} />
      )}
    </div>
  );
}

export function BandasPanel({ bandas: bandasIniciales, plazas: plazasIniciales }: { bandas: BandaSimple[]; plazas: Plaza[] }) {
  const [bandas, setBandas] = useState(bandasIniciales);
  const [plazas, setPlazas] = useState(plazasIniciales);
  const [bandaSeleccionadaId, setBandaSeleccionadaId] = useState<string | null>(null);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const [nombreNueva, setNombreNueva] = useState("");
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [pendingNueva, startNueva] = useTransition();

  const bandaSeleccionada = bandas.find((b) => b.id === bandaSeleccionadaId) ?? null;

  const crear = () => {
    setErrorNueva(null);
    if (!nombreNueva.trim()) {
      setErrorNueva("Ponele un nombre a la banda.");
      return;
    }
    startNueva(async () => {
      try {
        const id = await crearBandaAction(nombreNueva.trim());
        setBandas((prev) =>
          [
            ...prev,
            { id, nombre: nombreNueva.trim(), genero: null, archivada: false, cancionesHabilitado: true, setlistHabilitado: true, seteosHabilitado: true },
          ].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        setNombreNueva("");
      } catch (e) {
        setErrorNueva(e instanceof Error ? e.message : "No se pudo crear la banda.");
      }
    });
  };

  if (bandaSeleccionada) {
    return (
      <DetalleBanda
        banda={bandaSeleccionada}
        plazas={plazas.filter((p) => p.bandaId === bandaSeleccionada.id)}
        onVolver={() => setBandaSeleccionadaId(null)}
        onActualizada={(actualizada) => setBandas((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)))}
        onEliminada={() => {
          setBandas((prev) => prev.filter((x) => x.id !== bandaSeleccionada.id));
          setBandaSeleccionadaId(null);
        }}
        onPlazas={(nuevas) => setPlazas((prev) => [...prev.filter((p) => p.bandaId !== bandaSeleccionada.id), ...nuevas])}
      />
    );
  }

  const listado = bandas.filter((b) => b.archivada === verArchivadas);

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Crear banda nueva
        </h3>
        <div className="flex gap-2">
          <input
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
            placeholder="Nombre de la banda"
            className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={crear}
            disabled={pendingNueva}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pendingNueva ? "Creando..." : "Crear"}
          </button>
        </div>
        {errorNueva && (
          <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
            {errorNueva}
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => setVerArchivadas((v) => !v)}
        className="self-start text-xs font-semibold"
        style={{ color: "oklch(0.6 0.02 55)" }}
      >
        {verArchivadas ? "‹ Ver bandas activas" : "Ver archivadas"}
      </button>

      {listado.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          {verArchivadas ? "No hay bandas archivadas." : "Todavía no hay bandas."}
        </p>
      ) : (
        listado.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBandaSeleccionadaId(b.id)}
            className="rounded-2xl p-4 text-left"
            style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-base font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                {b.nombre}
              </div>
              {b.genero && (
                <span className="font-mono text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                  {b.genero}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                Calendario
              </span>
              {b.cancionesHabilitado && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                  Canciones
                </span>
              )}
              {b.setlistHabilitado && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                  Set List
                </span>
              )}
              {b.seteosHabilitado && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                  Seteos
                </span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
