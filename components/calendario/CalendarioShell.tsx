"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Evento, Membresia } from "@/lib/malgestoEventos";
import { algunaBandaConBloque } from "@/lib/bloques";
import type { Lugar } from "@/lib/lugaresData";
import type { PersonaConCumple } from "@/lib/cumpleanosVirtual";
import { generarCumpleanosVirtuales } from "@/lib/cumpleanosVirtual";
import { nombreMesAno, sumarMeses, esMismoDia, hora } from "@/lib/fechas";
import { enZonaApp } from "@/lib/zonaHoraria";
import { COLOR_TIPO, ETIQUETA_TIPO, eventoYaPaso } from "@/lib/eventoUI";
import { MesView } from "./MesView";
import { AgendaView } from "./AgendaView";
import { EventoDetalle } from "./EventoDetalle";
import { NuevoEventoForm } from "./NuevoEventoForm";
import { BandaFilterChips } from "./BandaFilterChips";
import { TabBar } from "@/components/shell/TabBar";

const fuenteEncabezado = { fontFamily: "var(--font-bricolage), sans-serif" };

type SetlistOpcion = { id: string; bandaId: string; nombre: string };

export function CalendarioShell({
  membresias,
  eventos,
  setlists,
  lugares,
  cumpleanos,
  userEmail,
}: {
  membresias: Membresia[];
  eventos: Evento[];
  setlists: SetlistOpcion[];
  lugares: Lugar[];
  cumpleanos: PersonaConCumple[];
  userEmail: string;
}) {
  const router = useRouter();
  const [mes, setMes] = useState(() => new Date());
  const [activas, setActivas] = useState<Set<string>>(() => new Set(membresias.map((m) => m.bandaId)));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [eventoDelDiaElegido, setEventoDelDiaElegido] = useState<Evento | null>(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eventoEnEdicion, setEventoEnEdicion] = useState<Evento | undefined>(undefined);
  const [fechaParaForm, setFechaParaForm] = useState<Date>(() => new Date());
  // Brief 18 §5: la fila "Todas tus bandas" se colapsa al scrollear la lista
  // de abajo, para darle más aire a "Próximos eventos" — el grid del mes y
  // los chips ya son fijos (viven en el bloque `shrink-0` de arriba), así
  // que al colapsar esa fila los chips quedan pegados debajo de "Mes/Año".
  const [scrolleado, setScrolleado] = useState(false);

  // Para la grilla del mes / selección de día: ventana centro±1 año, así
  // navegar meses hacia atrás o adelante sigue mostrando el cumpleaños
  // correcto de cada año visitado.
  const eventosConCumple = useMemo(
    () => [...eventos, ...generarCumpleanosVirtuales(cumpleanos, mes)],
    [eventos, cumpleanos, mes]
  );

  // Brief 9 §2: cada chip prende/apaga SOLO ese chip (el set arranca con
  // TODAS las bandas activas, no vacío) — con todas apagadas o todas
  // prendidas se ve todo, igual que antes, pero sin que tocar una banda
  // afecte visualmente a las demás.
  const todasONinguna = activas.size === 0 || activas.size === membresias.length;
  const eventosFiltrados = useMemo(
    () => (todasONinguna ? eventosConCumple : eventosConCumple.filter((e) => e.bandaIds.some((id) => activas.has(id)))),
    [eventosConCumple, activas, todasONinguna]
  );
  // Brief 15 §2: los cumpleaños no van en "Próximos eventos" — solo en la
  // grilla del mes y el detalle de día (eventosConCumple/eventosFiltrados
  // arriba), así que la agenda se filtra sobre `eventos` a secas, sin merge.
  // Brief de corrección §1: un evento ya pasado no debe seguir apareciendo acá
  // — se compara la hora de fin efectiva (fechaFin si existe, si no
  // fechaInicio; en giras eso es el fin de la gira, no el de cada show) contra
  // "ahora" en hora de México, así una gira en curso no desaparece de golpe.
  const eventosFiltradosAgenda = useMemo(() => {
    const base = todasONinguna ? eventos : eventos.filter((e) => e.bandaIds.some((id) => activas.has(id)));
    return base.filter((e) => !eventoYaPaso(e));
  }, [eventos, activas, todasONinguna]);

  const giras = useMemo(() => eventosConCumple.filter((e) => e.tipo === "gira"), [eventosConCumple]);
  const esSuperadmin = membresias.some((m) => m.rol === "superadmin");
  // Brief 21 §2: unión de bandas con la regla de visibilidad efectiva
  // (banda activa Y persona no restringida) en vez de mirar solo el toggle
  // de banda.
  const mostrarCanciones = algunaBandaConBloque(membresias, "canciones", esSuperadmin);
  const mostrarSetlist = algunaBandaConBloque(membresias, "set_list", esSuperadmin);
  const mostrarSeteos = algunaBandaConBloque(membresias, "seteos", esSuperadmin);
  const mostrarFinanzas = algunaBandaConBloque(membresias, "finanzas", esSuperadmin);

  const eventosDelDia = diaSeleccionado
    ? eventosFiltrados.filter((e) => e.tipo !== "gira" && esMismoDia(enZonaApp(e.fechaInicio), diaSeleccionado))
    : [];

  const toggleBanda = (bandaId: string) => {
    setActivas((prev) => {
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

  const abrirNuevoEnDia = (dia: Date) => {
    setEventoEnEdicion(undefined);
    setFechaParaForm(dia);
    setMostrarForm(true);
  };

  const abrirEdicion = (evento: Evento) => {
    setEventoSeleccionado(null);
    setEventoDelDiaElegido(null);
    setEventoEnEdicion(evento);
    setFechaParaForm(enZonaApp(evento.fechaInicio));
    setMostrarForm(true);
  };

  let listaContenido: React.ReactNode;
  if (!diaSeleccionado) {
    listaContenido = <AgendaView eventos={eventosFiltradosAgenda} onEventoClick={setEventoSeleccionado} />;
  } else if (eventosDelDia.length === 0) {
    listaContenido = (
      <p className="pt-10 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
        Sin eventos este día.
      </p>
    );
  } else if (eventosDelDia.length === 1 || eventoDelDiaElegido) {
    const eventoAMostrar = eventoDelDiaElegido ?? eventosDelDia[0];
    listaContenido = (
      <EventoDetalle
        inline
        evento={eventoAMostrar}
        giras={giras.filter((g) => g.bandaIds.some((id) => eventoAMostrar.bandaIds.includes(id)))}
        setlists={setlists.filter((s) => s.bandaId === eventoAMostrar.bandaId)}
        puedeEditar={esSuperadmin}
        onCerrar={() => (eventosDelDia.length > 1 ? setEventoDelDiaElegido(null) : quitarSeleccionDia())}
        onEditar={abrirEdicion}
        onEliminado={() => {
          setEventoDelDiaElegido(null);
          setDiaSeleccionado(null);
          router.refresh();
        }}
        onEstadoActualizado={() => router.refresh()}
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
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: scrolleado ? 0 : 40, opacity: scrolleado ? 0 : 1 }}
        >
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Todas tus bandas
          </div>
        </div>
        <h2 className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]" style={{ ...fuenteEncabezado, color: "oklch(0.24 0.02 55)" }}>
          {nombreMesAno(mes)}
        </h2>

        <BandaFilterChips membresias={membresias} activas={activas} onToggle={toggleBanda} />

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, -1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes anterior">
            ‹
          </button>
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, 1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes siguiente">
            ›
          </button>
        </div>

        <div className="mt-4">
          <MesView
            mes={mes}
            eventos={eventosFiltrados}
            membresias={membresias}
            diaSeleccionado={diaSeleccionado}
            onDiaClick={onDiaClick}
            onEventoClick={setEventoSeleccionado}
          />
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5 pb-20 pt-4"
        onScroll={(e) => setScrolleado(e.currentTarget.scrollTop > 8)}
      >
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

        {/* Brief 18 §2: acción del DÍA, separada de las acciones del evento
            (Editar/Eliminar viven dentro de la tarjeta de EventoDetalle) —
            por eso va acá, después de todo el contenido del día, no dentro
            de la tarjeta. Brief 18 §3: solo superadmin crea eventos. */}
        {diaSeleccionado && esSuperadmin && (
          <button
            type="button"
            onClick={() => abrirNuevoEnDia(diaSeleccionado)}
            className="mt-5 w-full rounded-xl py-2.5 text-center text-sm font-bold"
            style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
          >
            + Nuevo evento este día
          </button>
        )}
      </div>

      <TabBar
        activa="calendario"
        userEmail={userEmail}
        esSuperadmin={esSuperadmin}
        mostrarCanciones={mostrarCanciones}
        mostrarSetlist={mostrarSetlist}
        mostrarSeteos={mostrarSeteos}
        mostrarFinanzas={mostrarFinanzas}
      />

      {eventoSeleccionado && (
        <EventoDetalle
          evento={eventoSeleccionado}
          giras={giras.filter((g) => g.bandaIds.some((id) => eventoSeleccionado.bandaIds.includes(id)))}
          setlists={setlists.filter((s) => s.bandaId === eventoSeleccionado.bandaId)}
          puedeEditar={esSuperadmin}
          onCerrar={() => setEventoSeleccionado(null)}
          onEditar={abrirEdicion}
          onEliminado={() => {
            setEventoSeleccionado(null);
            router.refresh();
          }}
          onEstadoActualizado={() => router.refresh()}
        />
      )}

      {mostrarForm && (
        <NuevoEventoForm
          membresias={membresias}
          giras={giras.filter((g) => !g.id.startsWith("cumple-"))}
          setlists={setlists}
          lugares={lugares}
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
