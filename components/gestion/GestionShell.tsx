"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { BandaSimple, PersonaPendiente, BandaConMiembros } from "@/lib/gestionData";
import { crearBandaAction, invitarPersonaAction, ignorarPersonaPendienteAction } from "@/app/gestion/actions";

const ROLES = ["miembro", "superadmin"] as const;

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Pantalla 15 "Escritorio · Gestión" (Brief 7): crear banda, invitar/asignar
// persona a una banda existente, resolver personas pendientes de asignar
// (cayeron en /sin-acceso), y un panorama de miembros por banda.
export function GestionShell({
  bandas: bandasIniciales,
  personasPendientes: personasPendientesIniciales,
  bandasConMiembros,
}: {
  bandas: BandaSimple[];
  personasPendientes: PersonaPendiente[];
  bandasConMiembros: BandaConMiembros[];
}) {
  const [bandas, setBandas] = useState(bandasIniciales);
  const [personasPendientes, setPersonasPendientes] = useState(personasPendientesIniciales);

  const [nombreBanda, setNombreBanda] = useState("");
  const [errorBanda, setErrorBanda] = useState<string | null>(null);
  const [pendingBanda, startBandaTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [bandaIdInvitar, setBandaIdInvitar] = useState("");
  const [rolInvitar, setRolInvitar] = useState<string>("miembro");
  const [avisoInvitar, setAvisoInvitar] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendingInvitar, startInvitarTransition] = useTransition();

  const [pendingIgnorar, setPendingIgnorar] = useState<string | null>(null);

  const formInvitarRef = useRef<HTMLDivElement>(null);

  const crearBanda = () => {
    setErrorBanda(null);
    if (!nombreBanda.trim()) {
      setErrorBanda("Ponele un nombre a la banda.");
      return;
    }
    startBandaTransition(async () => {
      try {
        const id = await crearBandaAction(nombreBanda.trim());
        setBandas((prev) => [...prev, { id, nombre: nombreBanda.trim() }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNombreBanda("");
      } catch (e) {
        setErrorBanda(e instanceof Error ? e.message : "No se pudo crear la banda.");
      }
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
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/inicio" className="text-sm no-underline" style={{ color: "oklch(0.6 0.02 55)" }}>
            ‹ Inicio
          </Link>
        </div>
        <h2
          className="text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Gestión
        </h2>

        <section className="mt-6 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Crear banda nueva
          </h3>
          <div className="flex gap-2">
            <input
              value={nombreBanda}
              onChange={(e) => setNombreBanda(e.target.value)}
              placeholder="Nombre de la banda"
              className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <button
              type="button"
              onClick={crearBanda}
              disabled={pendingBanda}
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
              style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
            >
              {pendingBanda ? "Creando..." : "Crear"}
            </button>
          </div>
          {errorBanda && (
            <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
              {errorBanda}
            </p>
          )}
        </section>

        <section ref={formInvitarRef} className="mt-4 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Invitar / asignar persona
          </h3>
          <div className="flex flex-col gap-2.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@gmail.com"
              className="rounded-xl border px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            />
            <select
              value={bandaIdInvitar}
              onChange={(e) => setBandaIdInvitar(e.target.value)}
              className="rounded-xl border px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
            >
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

        <section className="mt-4 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
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

        <section className="mt-4 rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Miembros por banda
          </h3>
          <div className="flex flex-col gap-3">
            {bandasConMiembros.map((b) => (
              <div key={b.id}>
                <div className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                  {b.nombre}
                </div>
                {b.miembros.length === 0 ? (
                  <p className="mt-1 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                    Sin miembros todavía.
                  </p>
                ) : (
                  <div className="mt-1 flex flex-col gap-1">
                    {b.miembros.map((m) => (
                      <div key={m.usuarioId} className="flex items-center justify-between font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                        <span className="truncate">{m.email}</span>
                        <span className="shrink-0 capitalize">{m.rol}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
