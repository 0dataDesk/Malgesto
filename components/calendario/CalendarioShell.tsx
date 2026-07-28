"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Evento, Membresia } from "@/lib/malgestoEventos";
import { nombreMesAno, sumarMeses } from "@/lib/fechas";
import { MesView } from "./MesView";
import { AgendaView } from "./AgendaView";
import { EventoDetalle } from "./EventoDetalle";
import { NuevoEventoForm } from "./NuevoEventoForm";
import { BandaSelectorCards } from "./BandaSelectorCards";
import { cerrarSesion } from "@/app/auth/actions";

export function CalendarioShell({
  membresias,
  eventos,
  userEmail,
}: {
  membresias: Membresia[];
  eventos: Evento[];
  userEmail: string;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<"mes" | "agenda">("mes");
  const [mes, setMes] = useState(() => new Date());
  const [bandaFiltro, setBandaFiltro] = useState<string | "todas">("todas");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const eventosFiltrados = useMemo(
    () => (bandaFiltro === "todas" ? eventos : eventos.filter((e) => e.bandaId === bandaFiltro)),
    [eventos, bandaFiltro]
  );

  const tituloEncabezado = membresias.length === 1 ? membresias[0].bandaNombre : "Todas tus bandas";

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-6">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-wide uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
            {tituloEncabezado}
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ color: "oklch(0.95 0.005 260)" }}>
            {vista === "mes" ? "Calendario" : "Próximas"}
          </h1>
        </div>
        <form action={cerrarSesion}>
          <button type="submit" className="text-xs" style={{ color: "oklch(0.55 0.01 260)" }} title={userEmail}>
            Cerrar sesión
          </button>
        </form>
      </div>

      {membresias.length > 1 && (
        <BandaSelectorCards membresias={membresias} filtro={bandaFiltro} onFiltro={setBandaFiltro} />
      )}

      <div className="mt-4 flex items-center justify-between">
        {vista === "mes" ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMes((m) => sumarMeses(m, -1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }}>
              ‹
            </button>
            <span className="text-sm font-bold" style={{ color: "oklch(0.9 0.005 260)" }}>
              {nombreMesAno(mes)}
            </span>
            <button type="button" onClick={() => setMes((m) => sumarMeses(m, 1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }}>
              ›
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-1 rounded-[10px] p-[3px]" style={{ background: "oklch(0.24 0.015 260)" }}>
          <button
            type="button"
            onClick={() => setVista("mes")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: vista === "mes" ? "oklch(0.96 0.012 82)" : "transparent",
              color: vista === "mes" ? "oklch(0.24 0.02 55)" : "oklch(0.7 0.01 260)",
            }}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => setVista("agenda")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: vista === "agenda" ? "oklch(0.96 0.012 82)" : "transparent",
              color: vista === "agenda" ? "oklch(0.24 0.02 55)" : "oklch(0.7 0.01 260)",
            }}
          >
            Agenda
          </button>
        </div>
      </div>

      <div
        className="mt-4 rounded-3xl p-4"
        style={{ background: "oklch(0.965 0.012 82)" }}
      >
        {vista === "mes" ? (
          <MesView mes={mes} eventos={eventosFiltrados} onEventoClick={setEventoSeleccionado} />
        ) : (
          <AgendaView eventos={eventosFiltrados} onEventoClick={setEventoSeleccionado} />
        )}
      </div>

      <button
        type="button"
        onClick={() => setMostrarForm(true)}
        className="fixed bottom-8 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
      >
        +
      </button>

      {eventoSeleccionado && (
        <EventoDetalle evento={eventoSeleccionado} onCerrar={() => setEventoSeleccionado(null)} />
      )}

      {mostrarForm && (
        <NuevoEventoForm
          membresias={membresias}
          onCancelar={() => setMostrarForm(false)}
          onCreado={() => {
            setMostrarForm(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
