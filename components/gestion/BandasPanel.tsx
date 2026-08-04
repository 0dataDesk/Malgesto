"use client";

import { useState, useTransition } from "react";
import type { BandaSimple, ActualizacionBanda, Plaza } from "@/lib/gestionData";
import { INSTRUMENTOS, ETIQUETA_INSTRUMENTO, etiquetaPlaza, type Instrumento } from "@/lib/instrumentoCatalogo";
import { PALETA_COLOR_BANDA } from "@/lib/eventoUI";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { crearBandaAction, actualizarBandaAction, crearPlazaAction, eliminarPlazaAction } from "@/app/gestion/actions";

const COLOR_DEFECTO = PALETA_COLOR_BANDA[0];

// Brief "Color de banda configurable...": paleta acotada en vez de color
// picker libre, para no arriesgar contraste/legibilidad -- ver
// PALETA_COLOR_BANDA en lib/eventoUI.ts.
function SelectorColorBanda({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETA_COLOR_BANDA.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className="h-7 w-7 shrink-0 rounded-full transition-transform"
          style={{
            background: c,
            boxShadow: c === value ? "0 0 0 2px oklch(0.99 0.01 82), 0 0 0 4px oklch(0.3 0.02 55)" : "none",
            transform: c === value ? "scale(1.05)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

// Selector estilizado de instrumento (Brief 13 §4): mismo patrón de
// trigger + panel de chips que AcordeSelector, en vez del <select> nativo
// del navegador que quedaba desentonado con el resto de Gestión.
function InstrumentoDropdown({
  value,
  opciones,
  onSeleccionar,
}: {
  value: Instrumento;
  opciones: readonly Instrumento[];
  onSeleccionar: (instrumento: Instrumento) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
        style={inputStyle}
      >
        <span>{ETIQUETA_INSTRUMENTO[value]}</span>
        <span style={{ color: "oklch(0.6 0.02 55)" }}>▾</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div
            className="absolute z-20 mt-1.5 w-full rounded-xl p-2"
            style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" }}
          >
            <div className="flex flex-wrap gap-1.5">
              {opciones.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSeleccionar(i);
                    setAbierto(false);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  style={
                    i === value
                      ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
                      : { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }
                  }
                >
                  {ETIQUETA_INSTRUMENTO[i]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InstrumentosDeLaBanda({ bandaId, plazas, onPlazas }: { bandaId: string; plazas: Plaza[]; onPlazas: (p: Plaza[]) => void }) {
  // Brief 13 §3/Brief 14 §1: un instrumento del catálogo fijo se agrega una
  // sola vez por banda, así que desaparece de las opciones una vez agregado
  // — "otro" es la excepción, se puede repetir con etiquetas distintas.
  const usados = new Set(plazas.map((p) => p.instrumento));
  const opciones = INSTRUMENTOS.filter((i) => i === "otro" || !usados.has(i));

  const [instrumentoElegido, setInstrumentoElegido] = useState<Instrumento | null>(null);
  const instrumento = instrumentoElegido && opciones.includes(instrumentoElegido) ? instrumentoElegido : opciones[0];
  const esOtro = instrumento === "otro";

  const [etiqueta, setEtiqueta] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    setError(null);
    if (esOtro && !etiqueta.trim()) {
      setError('Escribí una etiqueta para "Otro".');
      return;
    }
    startTransition(async () => {
      try {
        const nueva = await crearPlazaAction(bandaId, instrumento, esOtro ? etiqueta.trim() : null);
        onPlazas([...plazas, nueva]);
        setEtiqueta("");
        setInstrumentoElegido(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el instrumento.");
      }
    });
  };

  const quitar = (plazaId: string) => {
    startTransition(async () => {
      try {
        await eliminarPlazaAction(plazaId);
        onPlazas(plazas.filter((p) => p.id !== plazaId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar el instrumento.");
      }
    });
  };

  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
        Instrumentos
      </span>
      {plazas.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no hay instrumentos definidos para esta banda.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {plazas.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-xs font-semibold"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
            >
              {etiquetaPlaza(p.instrumento, p.etiqueta)}
              <button
                type="button"
                onClick={() => quitar(p.id)}
                disabled={pending}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ background: "oklch(0.85 0.016 78)" }}
                aria-label="Quitar instrumento"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5">
        <InstrumentoDropdown value={instrumento} opciones={opciones} onSeleccionar={setInstrumentoElegido} />
        {esOtro && (
          <input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Etiqueta"
            className={`${inputCls} flex-1`}
            style={inputStyle}
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
  onPlazas,
}: {
  banda: BandaSimple;
  plazas: Plaza[];
  onVolver: () => void;
  onActualizada: (b: BandaSimple) => void;
  onPlazas: (p: Plaza[]) => void;
}) {
  const [nombre, setNombre] = useState(banda.nombre);
  const [color, setColor] = useState(banda.color);
  const [genero, setGenero] = useState(banda.genero ?? "");
  const numeroIntegrantesInicial = banda.numeroIntegrantes !== null ? String(banda.numeroIntegrantes) : "";
  const [numeroIntegrantes, setNumeroIntegrantes] = useState(numeroIntegrantesInicial);
  const [canciones, setCanciones] = useState(banda.cancionesHabilitado);
  const [setlist, setSetlist] = useState(banda.setlistHabilitado);
  const [seteos, setSeteos] = useState(banda.seteosHabilitado);
  const [finanzas, setFinanzas] = useState(banda.finanzasHabilitado);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hayCambios =
    nombre.trim() !== banda.nombre ||
    color !== banda.color ||
    (genero.trim() || null) !== banda.genero ||
    numeroIntegrantes !== numeroIntegrantesInicial ||
    canciones !== banda.cancionesHabilitado ||
    setlist !== banda.setlistHabilitado ||
    seteos !== banda.seteosHabilitado ||
    finanzas !== banda.finanzasHabilitado;

  const guardar = () => {
    if (!nombre.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const cambios: ActualizacionBanda = {
          nombre: nombre.trim(),
          color,
          genero: genero.trim() || null,
          numeroIntegrantes: numeroIntegrantes.trim() === "" ? null : Number(numeroIntegrantes),
          cancionesHabilitado: canciones,
          setlistHabilitado: setlist,
          seteosHabilitado: seteos,
          finanzasHabilitado: finanzas,
        };
        await actualizarBandaAction(banda.id, cambios);
        onActualizada({ ...banda, ...cambios });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
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
          Color
        </label>
        <SelectorColorBanda value={color} onChange={setColor} />

        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
              Género
            </label>
            <input value={genero} onChange={(e) => setGenero(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. Cumbia, Rock…" />
          </div>
          <div className="w-20 shrink-0">
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
              Integrantes
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={numeroIntegrantes}
              onChange={(e) => setNumeroIntegrantes(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className={inputCls}
              style={inputStyle}
              placeholder="—"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ToggleChip label="Calendario" active dot={false} onClick={() => {}} />
          <ToggleChip label="Canciones" active={canciones} onClick={() => setCanciones((v) => !v)} />
          <ToggleChip label="Set List" active={setlist} onClick={() => setSetlist((v) => !v)} />
          <ToggleChip label="Seteos" active={seteos} onClick={() => setSeteos((v) => !v)} />
          <ToggleChip label="Finanzas" active={finanzas} onClick={() => setFinanzas((v) => !v)} />
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
        <InstrumentosDeLaBanda bandaId={banda.id} plazas={plazas} onPlazas={onPlazas} />
      </div>
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
            {
              id,
              nombre: nombreNueva.trim(),
              color: COLOR_DEFECTO,
              genero: null,
              numeroIntegrantes: null,
              archivada: false,
              cancionesHabilitado: true,
              setlistHabilitado: true,
              seteosHabilitado: true,
              finanzasHabilitado: true,
            },
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
              <div className="flex items-center gap-2 text-base font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: b.color }} />
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
              {b.finanzasHabilitado && (
                <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                  Finanzas
                </span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
