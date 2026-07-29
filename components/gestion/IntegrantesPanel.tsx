"use client";

import { useRef, useState, useTransition } from "react";
import type { BandaSimple, PersonaPendiente, Integrante } from "@/lib/gestionData";
import { INSTRUMENTOS, ETIQUETA_INSTRUMENTO } from "@/lib/instrumentoCatalogo";
import {
  invitarPersonaAction,
  ignorarPersonaPendienteAction,
  actualizarNombreMostrarAction,
  removerDeBandaAction,
  asignarABandaAction,
  actualizarInstrumentosAction,
} from "@/app/gestion/actions";

const ROLES = ["miembro", "superadmin"] as const;
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

function FilaIntegrante({ integrante, bandas }: { integrante: Integrante; bandas: BandaSimple[] }) {
  const [expandido, setExpandido] = useState(false);
  const [nombreMostrar, setNombreMostrar] = useState(integrante.nombreMostrar ?? "");
  const [pendingNombre, startNombre] = useTransition();
  const [pendingBanda, setPendingBanda] = useState<string | null>(null);

  const bandaAsignada = (bandaId: string) => integrante.bandas.find((b) => b.bandaId === bandaId && b.activo);

  const guardarNombre = () => {
    if (!integrante.usuarioId) return;
    startNombre(async () => {
      await actualizarNombreMostrarAction(integrante.usuarioId!, nombreMostrar);
    });
  };

  const toggleBanda = (bandaId: string) => {
    if (!integrante.usuarioId) return;
    const asignada = !!bandaAsignada(bandaId);
    setPendingBanda(bandaId);
    const accion = asignada
      ? removerDeBandaAction(integrante.usuarioId, bandaId)
      : asignarABandaAction(integrante.usuarioId, bandaId);
    accion.finally(() => setPendingBanda(null));
  };

  const toggleInstrumento = (bandaId: string, instrumento: string) => {
    if (!integrante.usuarioId) return;
    const actuales = bandaAsignada(bandaId)?.instrumentos ?? [];
    const nuevos = actuales.includes(instrumento) ? actuales.filter((i) => i !== instrumento) : [...actuales, instrumento];
    actualizarInstrumentosAction(integrante.usuarioId, bandaId, nuevos);
  };

  return (
    <div className="rounded-2xl p-3.5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      <button type="button" onClick={() => setExpandido((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            {integrante.nombreMostrar || integrante.email}
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
            <div className="flex gap-2">
              <input
                value={nombreMostrar}
                onChange={(e) => setNombreMostrar(e.target.value)}
                className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={guardarNombre}
                disabled={pendingNombre}
                className="shrink-0 rounded-lg px-3 text-xs font-bold disabled:opacity-60"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                Guardar
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Bandas asignadas
            </label>
            <div className="flex flex-col gap-2">
              {bandas.map((b) => {
                const asignada = bandaAsignada(b.id);
                return (
                  <div key={b.id}>
                    <label className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.3 0.02 55)" }}>
                      <input
                        type="checkbox"
                        checked={!!asignada}
                        disabled={pendingBanda === b.id}
                        onChange={() => toggleBanda(b.id)}
                      />
                      {b.nombre}
                    </label>
                    {asignada && (
                      <div className="ml-6 mt-1 flex flex-wrap gap-1.5">
                        {INSTRUMENTOS.map((inst) => {
                          const activo = asignada.instrumentos.includes(inst);
                          return (
                            <button
                              key={inst}
                              type="button"
                              onClick={() => toggleInstrumento(b.id, inst)}
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                background: activo ? "oklch(0.64 0.15 34)" : "oklch(0.93 0.016 78)",
                                color: activo ? "oklch(0.99 0.01 82)" : "oklch(0.4 0.02 55)",
                              }}
                            >
                              {ETIQUETA_INSTRUMENTO[inst]}
                            </button>
                          );
                        })}
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
}: {
  bandas: BandaSimple[];
  personasPendientes: PersonaPendiente[];
  integrantes: Integrante[];
}) {
  const [personasPendientes, setPersonasPendientes] = useState(personasPendientesIniciales);

  const [email, setEmail] = useState("");
  const [bandaIdInvitar, setBandaIdInvitar] = useState("");
  const [rolInvitar, setRolInvitar] = useState<string>("miembro");
  const [avisoInvitar, setAvisoInvitar] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendingInvitar, startInvitarTransition] = useTransition();
  const [pendingIgnorar, setPendingIgnorar] = useState<string | null>(null);

  const formInvitarRef = useRef<HTMLDivElement>(null);

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
    if (!email.trim() || !bandaIdInvitar) {
      setAvisoInvitar({ tipo: "error", texto: "Completá correo y banda." });
      return;
    }
    startInvitarTransition(async () => {
      try {
        const resultado = await invitarPersonaAction(email.trim(), bandaIdInvitar, rolInvitar);
        if (!resultado.ok) {
          setAvisoInvitar({ tipo: "error", texto: resultado.motivo });
          return;
        }
        setAvisoInvitar({ tipo: "ok", texto: `Invitación enviada a ${email.trim()}.` });
        const emailInvitado = email.trim().toLowerCase();
        setPersonasPendientes((prev) => prev.filter((p) => p.email.toLowerCase() !== emailInvitado));
        setEmail("");
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
          <select value={bandaIdInvitar} onChange={(e) => setBandaIdInvitar(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">— elegí una banda —</option>
            {bandas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRolInvitar(r)}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-bold capitalize"
                style={{
                  background: rolInvitar === r ? "oklch(0.24 0.02 55)" : "oklch(0.93 0.016 78)",
                  color: rolInvitar === r ? "oklch(0.96 0.012 82)" : "oklch(0.4 0.02 55)",
                }}
              >
                {r}
              </button>
            ))}
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
              <FilaIntegrante key={i.usuarioId ?? i.email} integrante={i} bandas={bandas} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
