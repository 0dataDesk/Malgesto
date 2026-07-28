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
import { BandaFilterChips } from "./BandaFilterChips";
import { TabBar } from "@/components/shell/TabBar";
import { cerrarSesion } from "@/app/auth/actions";

const fuenteEncabezado = { fontFamily: "var(--font-bricolage), sans-serif" };

function VistaToggle({ vista, onVista }: { vista: "mes" | "agenda"; onVista: (v: "mes" | "agenda") => void }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-[10px] p-[3px]" style={{ background: "oklch(0.93 0.016 78)" }}>
      {(["mes", "agenda"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onVista(v)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            background: vista === v ? "oklch(0.24 0.02 55)" : "transparent",
            color: vista === v ? "oklch(0.96 0.012 82)" : "oklch(0.45 0.02 55)",
          }}
        >
          {v === "mes" ? "Mes" : "Lista"}
        </button>
      ))}
    </div>
  );
}

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
  const [eventoEnEdicion, setEventoEnEdicion] = useState<Evento | undefined>(undefined);

  const eventosFiltrados = useMemo(
    () => (bandaFiltro === "todas" ? eventos : eventos.filter((e) => e.bandaId === bandaFiltro)),
    [eventos, bandaFiltro]
  );

  const giras = useMemo(() => eventos.filter((e) => e.tipo === "gira"), [eventos]);

  const abrirNuevo = () => {
    setEventoEnEdicion(undefined);
    setMostrarForm(true);
  };

  const abrirEdicion = (evento: Evento) => {
    setEventoSeleccionado(null);
    setEventoEnEdicion(evento);
    setMostrarForm(true);
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="mb-2 flex justify-end">
          <form action={cerrarSesion}>
            <button type="submit" className="text-xs" style={{ color: "oklch(0.5 0.02 55)" }} title={userEmail}>
              Cerrar sesión
            </button>
          </form>
        </div>

        {vista === "mes" ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div
                  className="font-mono text-[10px] tracking-[0.14em] uppercase"
                  style={{ color: "oklch(0.5 0.02 55)" }}
                >
                  Todas tus bandas
                </div>
                <h2
                  className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
                  style={{ ...fuenteEncabezado, color: "oklch(0.24 0.02 55)" }}
                >
                  {nombreMesAno(mes)}
                </h2>
              </div>
              <VistaToggle vista={vista} onVista={setVista} />
            </div>
            <BandaFilterChips membresias={membresias} />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMes((m) => sumarMeses(m, -1))}
                className="text-lg"
                style={{ color: "oklch(0.6 0.02 55)" }}
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setMes((m) => sumarMeses(m, 1))}
                className="text-lg"
                style={{ color: "oklch(0.6 0.02 55)" }}
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em]" style={{ ...fuenteEncabezado, color: "oklch(0.24 0.02 55)" }}>
              Próximas
            </h2>
            <VistaToggle vista={vista} onVista={setVista} />
          </div>
        )}

        {membresias.length > 1 && (
          <div className="mt-4">
            <BandaSelectorCards membresias={membresias} filtro={bandaFiltro} onFiltro={setBandaFiltro} />
          </div>
        )}

        <div className="mt-4">
          {vista === "mes" ? (
            <MesView mes={mes} eventos={eventosFiltrados} onEventoClick={setEventoSeleccionado} />
          ) : (
            <AgendaView eventos={eventosFiltrados} onEventoClick={setEventoSeleccionado} />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={abrirNuevo}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
      >
        +
      </button>

      <TabBar activa="calendario" />

      {eventoSeleccionado && (
        <EventoDetalle
          evento={eventoSeleccionado}
          giras={giras.filter((g) => g.bandaId === eventoSeleccionado.bandaId)}
          onCerrar={() => setEventoSeleccionado(null)}
          onEditar={abrirEdicion}
          onEliminado={() => {
            setEventoSeleccionado(null);
            router.refresh();
          }}
        />
      )}

      {mostrarForm && (
        <NuevoEventoForm
          membresias={membresias}
          giras={giras}
          eventoExistente={eventoEnEdicion}
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
