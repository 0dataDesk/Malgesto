"use client";

import { useRef, useState, useTransition } from "react";
import type { BandaSimple, PersonaPendiente, Integrante, Plaza, BandaDeIntegrante } from "@/lib/gestionData";
import type { NombreBloque } from "@/lib/bloques";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { ToggleChip } from "@/components/ui/ToggleChip";
import {
  invitarPersonaAction,
  ignorarPersonaPendienteAction,
  actualizarDatosPersonaAction,
  removerDeBandaAction,
  asignarABandaAction,
  asignarPersonaAPlazaAction,
  quitarPersonaDePlazaAction,
  actualizarBloquesVisiblesAction,
} from "@/app/gestion/actions";

// Catálogo de bloques opcionales restringibles por persona (Brief 21 §1) —
// Calendario nunca entra acá porque nunca se restringe.
const BLOQUES: { key: NombreBloque; label: string; activo: (b: BandaSimple) => boolean }[] = [
  { key: "canciones", label: "Canciones", activo: (b) => b.cancionesHabilitado },
  { key: "set_list", label: "Set List", activo: (b) => b.setlistHabilitado },
  { key: "seteos", label: "Seteos", activo: (b) => b.seteosHabilitado },
  { key: "finanzas", label: "Finanzas", activo: (b) => b.finanzasHabilitado },
];

function bloqueVisible(banda: BandaDeIntegrante, bloque: NombreBloque): boolean {
  if (!banda.bloquesVisibles) return true;
  return banda.bloquesVisibles.includes(bloque);
}

const inputCls = "rounded-xl border px-3.5 py-2.5 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ETIQUETA_ESTADO: Record<Integrante["estado"], string> = { invitado: "Invitado", activo: "Activo", inactivo: "Inactivo" };
const COLOR_ESTADO: Record<Integrante["estado"], string> = {
  invitado: "oklch(0.6 0.1 70)",
  activo: "oklch(0.5 0.13 148)",
  inactivo: "oklch(0.55 0.02 55)",
};

function FilaIntegrante({
  integrante,
  bandas,
  plazas,
}: {
  integrante: Integrante;
  bandas: BandaSimple[];
  plazas: Plaza[];
}) {
  const [expandido, setExpandido] = useState(false);
  const [nombreMostrar, setNombreMostrar] = useState(integrante.nombreMostrar ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(integrante.fechaNacimiento ?? "");
  const [datosGuardados, setDatosGuardados] = useState({ nombreMostrar: integrante.nombreMostrar ?? "", fechaNacimiento: integrante.fechaNacimiento ?? "" });
  const [pendingDatos, startDatos] = useTransition();
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [bandasLocal, setBandasLocal] = useState(integrante.bandas);
  const [pendingBanda, setPendingBanda] = useState<string | null>(null);

  const bandaAsignada = (bandaId: string) => bandasLocal.find((b) => b.bandaId === bandaId && b.activo);

  const hayCambiosDatos = nombreMostrar !== datosGuardados.nombreMostrar || fechaNacimiento !== datosGuardados.fechaNacimiento;

  // Brief 10 §5: nombre para mostrar y fecha de nacimiento comparten un solo
  // botón "Guardar" en vez de dos sueltos sin relación visual entre sí.
  const guardarDatos = () => {
    if (!integrante.usuarioId) return;
    setErrorDatos(null);
    startDatos(async () => {
      try {
        await actualizarDatosPersonaAction(integrante.usuarioId!, nombreMostrar, fechaNacimiento || null);
        setDatosGuardados({ nombreMostrar, fechaNacimiento });
      } catch (e) {
        setErrorDatos(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const toggleBanda = (bandaId: string) => {
    if (!integrante.usuarioId) return;
    const asignada = !!bandaAsignada(bandaId);
    setPendingBanda(bandaId);
    const accion = asignada ? removerDeBandaAction(integrante.usuarioId, bandaId) : asignarABandaAction(integrante.usuarioId, bandaId);
    accion
      .then(() => {
        setBandasLocal((prev) => {
          if (prev.some((b) => b.bandaId === bandaId)) {
            return prev.map((b) => (b.bandaId === bandaId ? { ...b, activo: !asignada } : b));
          }
          const info = bandas.find((b) => b.id === bandaId);
          return [...prev, { bandaId, bandaNombre: info?.nombre ?? "Banda", activo: true, plazas: [], bloquesVisibles: null }];
        });
      })
      .finally(() => setPendingBanda(null));
  };

  // Brief 21 §1: al tildar/destildar un bloque, si el resultado cubre TODOS
  // los bloques activos de esa banda se persiste null (sin restricción) en
  // vez del array completo — así, si la banda activa un bloque nuevo más
  // adelante, esta persona lo ve automáticamente en vez de quedar excluida
  // por un array que quedó desactualizado.
  const togglePermisoBloque = (bandaId: string, bloque: NombreBloque, bloquesActivos: NombreBloque[]) => {
    if (!integrante.usuarioId) return;
    const banda = bandasLocal.find((b) => b.bandaId === bandaId);
    if (!banda) return;
    const tildados = new Set(bloquesActivos.filter((bl) => bloqueVisible(banda, bl)));
    if (tildados.has(bloque)) tildados.delete(bloque);
    else tildados.add(bloque);
    const nuevoValor = tildados.size === bloquesActivos.length ? null : bloquesActivos.filter((bl) => tildados.has(bl));

    actualizarBloquesVisiblesAction(integrante.usuarioId, bandaId, nuevoValor).then(() => {
      setBandasLocal((prev) => prev.map((b) => (b.bandaId === bandaId ? { ...b, bloquesVisibles: nuevoValor } : b)));
    });
  };

  const togglePlaza = (bandaId: string, plazaId: string) => {
    if (!integrante.usuarioId) return;
    const banda = bandasLocal.find((b) => b.bandaId === bandaId);
    const tiene = banda?.plazas.some((p) => p.plazaId === plazaId);
    const accion = tiene
      ? quitarPersonaDePlazaAction(integrante.usuarioId, plazaId)
      : asignarPersonaAPlazaAction(integrante.usuarioId, plazaId);
    accion.then(() => {
      setBandasLocal((prev) =>
        prev.map((b) => {
          if (b.bandaId !== bandaId) return b;
          if (tiene) return { ...b, plazas: b.plazas.filter((p) => p.plazaId !== plazaId) };
          const info = plazas.find((p) => p.id === plazaId);
          return { ...b, plazas: [...b.plazas, { plazaId, instrumento: info?.instrumento ?? "otro", etiqueta: info?.etiqueta ?? null }] };
        })
      );
    });
  };

  return (
    <div className="rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <button type="button" onClick={() => setExpandido((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
              {integrante.nombreMostrar || integrante.email}
            </div>
            {integrante.esSuperadmin && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase" style={{ background: "oklch(0.64 0.15 34 / 0.15)", color: "oklch(0.64 0.15 34)" }}>
                Superadmin
              </span>
            )}
          </div>
          <div className="truncate font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
            {integrante.email}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
          style={{ background: "oklch(0.965 0.012 82)", color: COLOR_ESTADO[integrante.estado] }}
        >
          {ETIQUETA_ESTADO[integrante.estado]}
        </span>
      </button>

      {expandido && integrante.usuarioId && (
        <div className="mt-3 flex flex-col gap-3 border-t pt-3" style={{ borderColor: "oklch(0.9 0.012 78)" }}>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Nombre para mostrar
            </label>
            <input
              value={nombreMostrar}
              onChange={(e) => setNombreMostrar(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={inputStyle}
            />

            <label className="mb-1 mt-2.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={inputStyle}
            />

            {hayCambiosDatos && (
              <button
                type="button"
                onClick={guardarDatos}
                disabled={pendingDatos}
                className="mt-2.5 w-full rounded-lg py-2 text-sm font-bold disabled:opacity-60"
                style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
              >
                {pendingDatos ? "Guardando…" : "Guardar"}
              </button>
            )}
            {errorDatos && (
              <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
                {errorDatos}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Bandas asignadas
            </label>
            <div className="flex flex-col gap-2">
              {bandas.map((b) => {
                const asignada = bandaAsignada(b.id);
                const plazasDeLaBanda = plazas.filter((p) => p.bandaId === b.id);
                const bloquesActivosBanda = BLOQUES.filter((bl) => bl.activo(b));
                return (
                  <div key={b.id}>
                    <label className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.3 0.02 55)" }}>
                      <input type="checkbox" checked={!!asignada} disabled={pendingBanda === b.id} onChange={() => toggleBanda(b.id)} />
                      {b.nombre}
                    </label>
                    {asignada && (
                      <div className="ml-6 mt-1.5 flex flex-col gap-2.5">
                        {plazasDeLaBanda.length === 0 ? (
                          <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                            Esta banda todavía no tiene instrumentos definidos.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {plazasDeLaBanda.map((p) => {
                              const activo = asignada.plazas.some((ap) => ap.plazaId === p.id);
                              return (
                                <ToggleChip
                                  key={p.id}
                                  label={etiquetaPlaza(p.instrumento, p.etiqueta)}
                                  active={activo}
                                  onClick={() => togglePlaza(b.id, p.id)}
                                />
                              );
                            })}
                          </div>
                        )}

                        {bloquesActivosBanda.length > 0 && (
                          <div>
                            <span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                              Bloques visibles
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {bloquesActivosBanda.map((bl) => (
                                <ToggleChip
                                  key={bl.key}
                                  label={bl.label}
                                  active={bloqueVisible(asignada, bl.key)}
                                  onClick={() => togglePermisoBloque(b.id, bl.key, bloquesActivosBanda.map((x) => x.key))}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function IntegrantesPanel({
  bandas,
  personasPendientes: personasPendientesIniciales,
  integrantes,
  plazas,
}: {
  bandas: BandaSimple[];
  personasPendientes: PersonaPendiente[];
  integrantes: Integrante[];
  plazas: Plaza[];
}) {
  const [personasPendientes, setPersonasPendientes] = useState(personasPendientesIniciales);

  const [email, setEmail] = useState("");
  const [bandaIdsInvitar, setBandaIdsInvitar] = useState<Set<string>>(new Set());
  const [avisoInvitar, setAvisoInvitar] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendingInvitar, startInvitarTransition] = useTransition();
  const [pendingIgnorar, setPendingIgnorar] = useState<string | null>(null);

  const formInvitarRef = useRef<HTMLDivElement>(null);

  const toggleBandaInvitar = (bandaId: string) => {
    setBandaIdsInvitar((prev) => {
      const next = new Set(prev);
      if (next.has(bandaId)) next.delete(bandaId);
      else next.add(bandaId);
      return next;
    });
  };

  const asignarDesdePendiente = (persona: PersonaPendiente) => {
    setEmail(persona.email);
    setAvisoInvitar(null);
    formInvitarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ignorarPendiente = (usuarioId: string) => {
    setPendingIgnorar(usuarioId);
    ignorarPersonaPendienteAction(usuarioId)
      .then(() => setPersonasPendientes((prev) => prev.filter((p) => p.usuarioId !== usuarioId)))
      .catch(() => setAvisoInvitar({ tipo: "error", texto: "No se pudo ignorar a esa persona." }))
      .finally(() => setPendingIgnorar(null));
  };

  const invitar = () => {
    setAvisoInvitar(null);
    if (!email.trim() || bandaIdsInvitar.size === 0) {
      setAvisoInvitar({ tipo: "error", texto: "Completá correo y al menos una banda." });
      return;
    }
    startInvitarTransition(async () => {
      try {
        const resultado = await invitarPersonaAction(email.trim(), Array.from(bandaIdsInvitar));
        if (!resultado.ok) {
          setAvisoInvitar({ tipo: "error", texto: resultado.motivo });
          return;
        }
        setAvisoInvitar({ tipo: "ok", texto: `Invitación enviada a ${email.trim()}.` });
        const emailInvitado = email.trim().toLowerCase();
        setPersonasPendientes((prev) => prev.filter((p) => p.email.toLowerCase() !== emailInvitado));
        setEmail("");
        setBandaIdsInvitar(new Set());
      } catch (e) {
        setAvisoInvitar({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo invitar." });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <section ref={formInvitarRef} className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Invitar / asignar persona
        </h3>
        <div className="flex flex-col gap-2.5">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@gmail.com" className={inputCls} style={inputStyle} />
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Bandas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {bandas.map((b) => (
                <ToggleChip key={b.id} label={b.nombre} active={bandaIdsInvitar.has(b.id)} onClick={() => toggleBandaInvitar(b.id)} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={invitar}
            disabled={pendingInvitar}
            className="rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pendingInvitar ? "Invitando..." : "Invitar"}
          </button>
        </div>
        {avisoInvitar && (
          <p className="mt-2 text-xs" style={{ color: avisoInvitar.tipo === "ok" ? "oklch(0.5 0.13 148)" : "oklch(0.55 0.15 25)" }}>
            {avisoInvitar.texto}
          </p>
        )}
      </section>

      <section className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Personas pendientes de asignar
        </h3>
        {personasPendientes.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            No hay nadie esperando acceso.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {personasPendientes.map((p) => (
              <div
                key={p.usuarioId}
                className="flex items-center justify-between gap-3 rounded-xl p-3"
                style={{ background: "oklch(0.965 0.012 82)", border: "1px solid oklch(0.89 0.013 78)" }}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                    {p.email}
                  </div>
                  <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                    Primer acceso: {formatearFecha(p.primerAcceso)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => asignarDesdePendiente(p)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
                  >
                    Asignar
                  </button>
                  <button
                    type="button"
                    onClick={() => ignorarPendiente(p.usuarioId)}
                    disabled={pendingIgnorar === p.usuarioId}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60"
                    style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Integrantes
        </h3>
        {integrantes.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay integrantes.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {integrantes.map((i) => (
              <FilaIntegrante key={i.usuarioId ?? i.email} integrante={i} bandas={bandas} plazas={plazas} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
