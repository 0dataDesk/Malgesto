"use client";

import { useState, useTransition } from "react";
import type { BandaSimple, ActualizacionBanda } from "@/lib/gestionData";
import { crearBandaAction, actualizarBandaAction } from "@/app/gestion/actions";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function Toggle({ label, activo, onToggle }: { label: string; activo: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm"
      style={{ background: "oklch(0.965 0.012 82)" }}
    >
      <span style={{ color: "oklch(0.3 0.02 55)" }}>{label}</span>
      <span
        className="relative h-5 w-9 rounded-full"
        style={{ background: activo ? "oklch(0.64 0.15 34)" : "oklch(0.85 0.013 78)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ left: 2, transform: activo ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

function FilaBanda({ banda, onActualizado }: { banda: BandaSimple; onActualizado: (b: BandaSimple) => void }) {
  const [nombre, setNombre] = useState(banda.nombre);
  const [canciones, setCanciones] = useState(banda.cancionesHabilitado);
  const [setlist, setSetlist] = useState(banda.setlistHabilitado);
  const [seteos, setSeteos] = useState(banda.seteosHabilitado);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hayCambios =
    nombre.trim() !== banda.nombre ||
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
          cancionesHabilitado: canciones,
          setlistHabilitado: setlist,
          seteosHabilitado: seteos,
        };
        await actualizarBandaAction(banda.id, cambios);
        onActualizado({ ...banda, ...cambios });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  return (
    <div className="rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${inputCls} font-bold`} style={inputStyle} />
      <div className="mt-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm" style={{ background: "oklch(0.965 0.012 82)" }}>
          <span style={{ color: "oklch(0.3 0.02 55)" }}>Calendario</span>
          <span className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
            Siempre activo
          </span>
        </div>
        <Toggle label="Canciones" activo={canciones} onToggle={() => setCanciones((v) => !v)} />
        <Toggle label="Set List" activo={setlist} onToggle={() => setSetlist((v) => !v)} />
        <Toggle label="Seteos" activo={seteos} onToggle={() => setSeteos((v) => !v)} />
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
  );
}

export function BandasPanel({ bandas: bandasIniciales }: { bandas: BandaSimple[] }) {
  const [bandas, setBandas] = useState(bandasIniciales);
  const [nombreNueva, setNombreNueva] = useState("");
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [pendingNueva, startNueva] = useTransition();

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
          [...prev, { id, nombre: nombreNueva.trim(), cancionesHabilitado: true, setlistHabilitado: true, seteosHabilitado: true }].sort(
            (a, b) => a.nombre.localeCompare(b.nombre)
          )
        );
        setNombreNueva("");
      } catch (e) {
        setErrorNueva(e instanceof Error ? e.message : "No se pudo crear la banda.");
      }
    });
  };

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

      {bandas.map((b) => (
        <FilaBanda
          key={b.id}
          banda={b}
          onActualizado={(actualizada) => setBandas((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)))}
        />
      ))}
    </div>
  );
}
