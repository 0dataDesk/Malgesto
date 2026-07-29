"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Evento, Membresia } from "@/lib/malgestoEventos";
import type { CuartoEnsayo } from "@/lib/cuartosEnsayoData";
import { nombreMesAno, sumarMeses, esMismoDia, hora } from "@/lib/fechas";
import { COLOR_TIPO, ETIQUETA_TIPO } from "@/lib/eventoUI";
import { MesView } from "./MesView";
import { AgendaView } from "./AgendaView";
import { EventoDetalle } from "./EventoDetalle";
import { NuevoEventoForm } from "./NuevoEventoForm";
import { BandaFilterChips } from "./BandaFilterChips";
import { TabBar } from "@/components/shell/TabBar";
import { cerrarSesion } from "@/app/auth/actions";

const fuenteEncabezado = { fontFamily: "var(--font-bricolage), sans-serif" };

type SetlistOpcion = { id: string; bandaId: string; nombre: string };

export function CalendarioShell({
  membresias,
  eventos,
  setlists,
  cuartosEnsayo,
  userEmail,
}: {
  membresias: Membresia[];
  eventos: Evento[];
  setlists: SetlistOpcion[];
  cuartosEnsayo: CuartoEnsayo[];
  userEmail: string;
}) {
  const router = useRouter();
  const [mes, setMes] = useState(() => new Date());
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [eventoDelDiaElegido, setEventoDelDiaElegido] = useState<Evento | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eventoEnEdicion, setEventoEnEdicion] = useState<Evento | undefined>(undefined);
  const [fechaParaForm, setFechaParaForm] = useState<Date>(() => new Date());

  const eventosFiltrados = useMemo(() => {
    if (seleccionadas.size === 0 || seleccionadas.size === membresias.length) return eventos;
    return eventos.filter((e) => seleccionadas.has(e.bandaId));
  }, [eventos, seleccionadas, membresias.length]);

  const giras = useMemo(() => eventos.filter((e) => e.tipo === "gira"), [eventos]);
  const esSuperadmin = membresias.some((m) => m.rol === "superadmin");
  const mostrarCanciones = membresias.some((m) => m.cancionesHabilitado);
  const mostrarSetlist = membresias.some((m) => m.setlistHabilitado);
  const mostrarSeteos = membresias.some((m) => m.seteosHabilitado);

  const eventosDelDia = diaSeleccionado
    ? eventosFiltrados.filter((e) => e.tipo !== "gira" && esMismoDia(new Date(e.fechaInicio), diaSeleccionado))
    : [];

  const toggleBanda = (bandaId: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(bandaId)) next.delete(bandaId);
      else next.add(bandaId);
      return next;
    });
  };

  const onDiaClick = (dia: Date) => {
    if (diaSeleccionado && esMismoDia(dia, diaSeleccionado)) {
      setDiaSeleccionado(null);
      setEventoDelDiaElegido(null);
    } else {
      setDiaSeleccionado(dia);
      setEventoDelDiaElegido(null);
    }
  };

  const quitarSeleccionDia = () => {
    setDiaSeleccionado(null);
    setEventoDelDiaElegido(null);
  };

  const abrirNuevo = () => {
    setEventoEnEdicion(undefined);
    setFechaParaForm(diaSeleccionado ?? new Date());
    setMostrarForm(true);
  };

  const abrirNuevoEnDia = (dia: Date) => {
    setEventoEnEdicion(undefined);
    setFechaParaForm(dia);
    setMostrarForm(true);
  };

  const abrirEdicion = (evento: Evento) => {
    setEventoSeleccionado(null);
    setEventoDelDiaElegido(null);
    setEventoEnEdicion(evento);
    setFechaParaForm(new Date(evento.fechaInicio));
    setMostrarForm(true);
  };

  let listaContenido: React.ReactNode;
  if (!diaSeleccionado) {
    listaContenido = <AgendaView eventos={eventosFiltrados} onEventoClick={setEventoSeleccionado} />;
  } else if (eventosDelDia.length === 0) {
    listaContenido = (
      <div className="flex flex-col items-center gap-3 pt-10 text-center">
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Sin eventos este día.
        </p>
        <button
          type="button"
          onClick={() => abrirNuevoEnDia(diaSeleccionado)}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          + Nuevo evento este día
        </button>
      </div>
    );
  } else if (eventosDelDia.length === 1 || eventoDelDiaElegido) {
    const eventoAMostrar = eventoDelDiaElegido ?? eventosDelDia[0];
    listaContenido = (
      <EventoDetalle
        inline
        evento={eventoAMostrar}
        giras={giras.filter((g) => g.bandaId === eventoAMostrar.bandaId)}
        setlists={setlists.filter((s) => s.bandaId === eventoAMostrar.bandaId)}
        onCerrar={() => (eventosDelDia.length > 1 ? setEventoDelDiaElegido(null) : quitarSeleccionDia())}
        onEditar={abrirEdicion}
        onEliminado={() => {
          setEventoDelDiaElegido(null);
          setDiaSeleccionado(null);
          router.refresh();
        }}
        onNuevoEnDia={() => abrirNuevoEnDia(diaSeleccionado)}
      />
    );
  } else {
    listaContenido = (
      <div className="flex flex-col gap-2">
        {eventosDelDia.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEventoDelDiaElegido(e)}
            className="flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left"
            style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", borderLeft: `3px solid ${COLOR_TIPO[e.tipo]}` }}
          >
            <div>
              <div className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                {e.titulo}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                {ETIQUETA_TIPO[e.tipo]} · {e.bandaNombre}
              </div>
            </div>
            {e.tipo !== "cumpleanos" && (
              <span className="font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
                {hora(e.fechaInicio)}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto w-full max-w-2xl shrink-0 px-5 pt-5">
        <div className="mb-2 flex items-center justify-end gap-3">
          <form action={cerrarSesion}>
            <button type="submit" className="text-xs" style={{ color: "oklch(0.5 0.02 55)" }} title={userEmail}>
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
              Todas tus bandas
            </div>
            <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ ...fuenteEncabezado, color: "oklch(0.24 0.02 55)" }}>
              {nombreMesAno(mes)}
            </h2>
          </div>
        </div>

        <BandaFilterChips membresias={membresias} seleccionadas={seleccionadas} onToggle={toggleBanda} />

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, -1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes anterior">
            ‹
          </button>
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, 1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes siguiente">
            ›
          </button>
        </div>

        <div className="mt-4">
          <MesView mes={mes} eventos={eventosFiltrados} diaSeleccionado={diaSeleccionado} onDiaClick={onDiaClick} onEventoClick={setEventoSeleccionado} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5 pb-32 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            {diaSeleccionado ? diaSeleccionado.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) : "Próximos eventos"}
          </span>
          {diaSeleccionado && (
            <button type="button" onClick={quitarSeleccionDia} className="text-xs font-semibold" style={{ color: "oklch(0.64 0.15 34)" }}>
              Quitar selección
            </button>
          )}
        </div>
        {listaContenido}
      </div>

      <button
        type="button"
        onClick={abrirNuevo}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
      >
        +
      </button>

      <TabBar activa="calendario" esSuperadmin={esSuperadmin} mostrarCanciones={mostrarCanciones} mostrarSetlist={mostrarSetlist} mostrarSeteos={mostrarSeteos} />

      {eventoSeleccionado && (
        <EventoDetalle
          evento={eventoSeleccionado}
          giras={giras.filter((g) => g.bandaId === eventoSeleccionado.bandaId)}
          setlists={setlists.filter((s) => s.bandaId === eventoSeleccionado.bandaId)}
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
          setlists={setlists}
          cuartosEnsayo={cuartosEnsayo}
          eventoExistente={eventoEnEdicion}
          fechaSeleccionada={fechaParaForm}
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
