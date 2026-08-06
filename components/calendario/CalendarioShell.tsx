"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Evento, Membresia } from "@/lib/malgestoEventos";
import { algunaBandaConBloque } from "@/lib/bloques";
import type { Lugar } from "@/lib/lugaresData";
import type { PersonaConCumple } from "@/lib/cumpleanosVirtual";
import { generarCumpleanosVirtuales } from "@/lib/cumpleanosVirtual";
import type { AusenciaPersona } from "@/lib/ausenciasData";
import { nombreMesAno, sumarMeses, esMismoDia, hora, fechaISO } from "@/lib/fechas";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";
import { COLOR_TIPO, ETIQUETA_TIPO, eventoYaPaso } from "@/lib/eventoUI";
import { eliminarIncidenciaAction } from "@/app/inicio/actions";
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
  ausencias,
  userEmail,
  usuarioId,
}: {
  membresias: Membresia[];
  eventos: Evento[];
  setlists: SetlistOpcion[];
  lugares: Lugar[];
  cumpleanos: PersonaConCumple[];
  ausencias: AusenciaPersona[];
  userEmail: string;
  usuarioId: string;
}) {
  const router = useRouter();
  const [mes, setMes] = useState(() => new Date());
  const [activas, setActivas] = useState<Set<string>>(() => new Set(membresias.map((m) => m.bandaId)));
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);
  const [borrandoAusencia, startBorrarAusencia] = useTransition();
  // Fix: "+ Crear Set List" (y "Confirmar fecha") parecían no hacer nada.
  // Antes estos guardaban el objeto Evento entero, capturado al
  // seleccionarlo — router.refresh() trae `eventos` (prop, server)
  // actualizado, pero no reescribía esa copia ya en estado, así que el
  // detalle abierto seguía mostrando el evento viejo (sin setlistId, con
  // estado tentativo) aunque el server action ya hubiera terminado bien
  // (confirmado con datos reales: el Set List sí se creaba y asignaba en la
  // base, solo no se veía reflejado en pantalla). Guardar solo el id y
  // derivar el objeto actual en cada render (más abajo, contra
  // eventosConCumple) resuelve esto sin un efecto que reescriba estado
  // sincrónicamente (evitado a propósito, ver regla react-hooks del lint).
  const [eventoDelDiaElegidoId, setEventoDelDiaElegidoId] = useState<string | null>(null);
  const [eventoSeleccionadoId, setEventoSeleccionadoId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eventoEnEdicion, setEventoEnEdicion] = useState<Evento | undefined>(undefined);
  const [fechaParaForm, setFechaParaForm] = useState<Date>(() => new Date());
  // Brief 18 §5: la fila "Todas tus bandas" se colapsa al scrollear la lista
  // de abajo, para darle más aire a "Próximos eventos" — el grid del mes ya
  // es fijo (vive en el bloque `shrink-0` de arriba), así que al colapsar
  // esa fila el título/chips quedan pegados arriba del todo.
  const [scrolleado, setScrolleado] = useState(false);

  // Brief "Color de banda configurable...": color fijo por banda (ya no
  // calculado por índice) — se resuelve una sola vez acá y se pasa a
  // MesView/AgendaView, en vez de que cada uno arme su propio mapa.
  const colorPorBanda = useMemo(() => new Map(membresias.map((m) => [m.bandaId, m.color])), [membresias]);
  // Brief "Rediseño de Ausencias §5": emoji opcional por banda, mismo
  // patrón que colorPorBanda -- MesView usa el emoji en vez del punto de
  // color cuando existe, y sigue con el punto cuando es null.
  const emojiPorBanda = useMemo(() => new Map(membresias.map((m) => [m.bandaId, m.emoji])), [membresias]);

  // Para la grilla del mes / selección de día: ventana centro±1 año, así
  // navegar meses hacia atrás o adelante sigue mostrando el cumpleaños
  // correcto de cada año visitado.
  const eventosConCumple = useMemo(
    () => [...eventos, ...generarCumpleanosVirtuales(cumpleanos, mes)],
    [eventos, cumpleanos, mes]
  );

  // Derivados (no estado) a partir de los ids de arriba — siempre reflejan
  // el evento actual de eventosConCumple, incluso justo después de un
  // router.refresh(). Busca en eventosConCumple, no en `eventos` a secas,
  // porque un cumpleaños elegido desde la lista de un día con varios
  // eventos es virtual y no vive en `eventos`.
  const eventoDelDiaElegido = eventoDelDiaElegidoId ? (eventosConCumple.find((e) => e.id === eventoDelDiaElegidoId) ?? null) : null;
  const eventoSeleccionado = eventoSeleccionadoId ? (eventosConCumple.find((e) => e.id === eventoSeleccionadoId) ?? null) : null;

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

  // Brief "Disponibilidad de integrantes" §2: mismo filtro por banda activa
  // que ya usan los eventos (`activas`/`todasONinguna`) — una ausencia solo
  // se muestra si la banda a la que aplica está entre las que se están
  // viendo ahora mismo.
  const ausenciasFiltradas = useMemo(
    () => (todasONinguna ? ausencias : ausencias.filter((a) => activas.has(a.bandaId))),
    [ausencias, activas, todasONinguna]
  );

  const giras = useMemo(() => eventosConCumple.filter((e) => e.tipo === "gira"), [eventosConCumple]);
  const esSuperadmin = membresias.some((m) => m.rol === "superadmin");
  // Brief 21 §2: unión de bandas con la regla de visibilidad efectiva
  // (banda activa Y persona no restringida) en vez de mirar solo el toggle
  // de banda.
  const mostrarCanciones = algunaBandaConBloque(membresias, "canciones", esSuperadmin);
  const mostrarSetlist = algunaBandaConBloque(membresias, "set_list", esSuperadmin);
  const mostrarSeteos = algunaBandaConBloque(membresias, "seteos", esSuperadmin);
  const mostrarFinanzas = algunaBandaConBloque(membresias, "finanzas", esSuperadmin);
  const mostrarStagePlot = algunaBandaConBloque(membresias, "stage_plot", esSuperadmin);

  const eventosDelDia = diaSeleccionado
    ? eventosFiltrados.filter((e) => e.tipo !== "gira" && esMismoDia(enZonaApp(e.fechaInicio), diaSeleccionado))
    : [];

  // Brief "Disponibilidad de integrantes" §2: quién está ausente el día
  // seleccionado, para las bandas activas — deduplicado por persona+banda
  // (una incidencia manual y un conflicto automático podrían solaparse).
  const ausenciasDelDia = diaSeleccionado
    ? (() => {
        const diaStr = fechaISO(diaSeleccionado);
        const vistos = new Set<string>();
        return ausenciasFiltradas.filter((a) => {
          if (diaStr < a.fechaInicio || diaStr > a.fechaFin) return false;
          const clave = `${a.usuarioId}:${a.bandaId}`;
          if (vistos.has(clave)) return false;
          vistos.add(clave);
          return true;
        });
      })()
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
      setEventoDelDiaElegidoId(null);
    } else {
      setDiaSeleccionado(dia);
      setEventoDelDiaElegidoId(null);
    }
  };

  const quitarSeleccionDia = () => {
    setDiaSeleccionado(null);
    setEventoDelDiaElegidoId(null);
  };

  const abrirNuevoEnDia = (dia: Date) => {
    setEventoEnEdicion(undefined);
    setFechaParaForm(dia);
    setMostrarForm(true);
  };

  // Brief "Rediseño de Ausencias": borrar una ausencia propia declarada por
  // error (o ya resuelta antes de que un evento la confirme) -- solo tiene
  // sentido para origen "manual" (una fila real de incidencias); un
  // conflicto "automatico" no es una fila, se recalcula solo.
  const borrarAusencia = (incidenciaId: string) => {
    startBorrarAusencia(async () => {
      await eliminarIncidenciaAction(incidenciaId);
      router.refresh();
    });
  };

  const abrirEdicion = (evento: Evento) => {
    setEventoSeleccionadoId(null);
    setEventoDelDiaElegidoId(null);
    setEventoEnEdicion(evento);
    setFechaParaForm(enZonaApp(evento.fechaInicio));
    setMostrarForm(true);
  };

  let listaContenido: React.ReactNode;
  if (!diaSeleccionado) {
    listaContenido = <AgendaView eventos={eventosFiltradosAgenda} colorPorBanda={colorPorBanda} onEventoClick={(e) => setEventoSeleccionadoId(e.id)} />;
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
        onCerrar={() => (eventosDelDia.length > 1 ? setEventoDelDiaElegidoId(null) : quitarSeleccionDia())}
        onEditar={abrirEdicion}
        onEliminado={() => {
          setEventoDelDiaElegidoId(null);
          setDiaSeleccionado(null);
          router.refresh();
        }}
        onEstadoActualizado={() => router.refresh()}
        onSetlistCreado={() => router.refresh()}
      />
    );
  } else {
    listaContenido = (
      <div className="flex flex-col gap-2">
        {eventosDelDia.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEventoDelDiaElegidoId(e.id)}
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
      {/* Brief "...menú de vistas arriba centrado...": pt-20 en vez de pt-5
          para que el título no quede debajo de la pill flotante de vistas,
          que ahora vive arriba-centro (antes abajo-derecha, no competía con
          este espacio). Mismo ajuste replicado en las otras 5 vistas que
          montan TabBar. */}
      <div className="mx-auto w-full max-w-2xl shrink-0 px-5 pt-20">
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: scrolleado ? 0 : 40, opacity: scrolleado ? 0 : 1 }}
        >
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
            Calendario
          </div>
        </div>
        {/* Brief "Color de banda... calendario más compacto...": los chips
            (ahora solo círculos de color, sin texto) se mudan a esta misma
            fila, alineados a la derecha del título — eliminan la fila propia
            que ocupaban antes para ganar espacio vertical. */}
        <div className="mt-1 flex items-center justify-between gap-3">
          <h2 className="text-[30px] font-extrabold tracking-[-0.02em]" style={{ ...fuenteEncabezado, color: "oklch(0.24 0.02 55)" }}>
            {nombreMesAno(mes)}
          </h2>
          <BandaFilterChips membresias={membresias} activas={activas} onToggle={toggleBanda} />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, -1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes anterior">
            ‹
          </button>
          {/* Brief "Botón Hoy": vuelve al mes actual de un clic — útil tras
              navegar varios meses adelante o atrás. No usa `new Date()`
              directo (esa es la fecha del navegador, no la de
              ZONA_HORARIA_APP) para no desalinearse de "hoy" en el grid. */}
          <button
            type="button"
            onClick={() => setMes(ahoraEnZonaApp())}
            className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide"
            style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
          >
            Hoy
          </button>
          <button type="button" onClick={() => setMes((m) => sumarMeses(m, 1))} className="text-lg" style={{ color: "oklch(0.6 0.02 55)" }} aria-label="Mes siguiente">
            ›
          </button>
        </div>

        <div className="mt-4">
          <MesView
            mes={mes}
            eventos={eventosFiltrados}
            ausencias={ausenciasFiltradas}
            colorPorBanda={colorPorBanda}
            emojiPorBanda={emojiPorBanda}
            diaSeleccionado={diaSeleccionado}
            onDiaClick={onDiaClick}
            onEventoClick={(e) => setEventoSeleccionadoId(e.id)}
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

        {/* Brief "Disponibilidad de integrantes" §2: quién está ausente ese
            día, para cualquier integrante de la banda (no restringido a
            administradores) — nombre + instrumento(s), nunca el motivo ni,
            si es un conflicto automático, con qué otra banda. */}
        {ausenciasDelDia.length > 0 && (
          <div className="mt-4 rounded-2xl p-3.5" style={{ background: "oklch(0.93 0.016 78 / 0.6)", border: "1px dashed oklch(0.75 0.02 60)" }}>
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.05 60)" }}>
              Ausencias
            </div>
            <div className="flex flex-col gap-1.5">
              {ausenciasDelDia.map((a) => (
                <div key={`${a.usuarioId}:${a.bandaId}`} className="flex items-center justify-between gap-2 text-sm">
                  <span style={{ color: "oklch(0.3 0.02 55)" }}>
                    {a.nombre}
                    {a.instrumentos.length > 0 && (
                      <span className="ml-1 font-mono text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                        ({a.instrumentos.join(", ")})
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {membresias.length > 1 && (
                      <span className="font-mono text-xs" style={{ color: colorPorBanda.get(a.bandaId) ?? "oklch(0.55 0.02 55)" }}>
                        {membresias.find((m) => m.bandaId === a.bandaId)?.bandaNombre ?? ""}
                      </span>
                    )}
                    {/* Brief "Rediseño de Ausencias": borrar solo la propia y solo
                        si es manual -- un conflicto automático no es una fila,
                        no hay nada que borrar. */}
                    {a.origen === "manual" && a.usuarioId === usuarioId && (
                      <button
                        type="button"
                        onClick={() => borrarAusencia(a.id)}
                        disabled={borrandoAusencia}
                        aria-label="Borrar ausencia"
                        title="Borrar ausencia"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-xs disabled:opacity-50"
                        style={{ background: "oklch(0.85 0.016 78)", color: "oklch(0.4 0.02 55)" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brief 18 §2: acción del DÍA, separada de las acciones del evento
            (Editar/Eliminar viven dentro de la tarjeta de EventoDetalle) —
            por eso va acá, después de todo el contenido del día, no dentro
            de la tarjeta. Brief 18 §3: solo superadmin crea eventos, ampliado
            en "Nuevo nivel de rol" a también administrador -- y en "Rediseño
            de Ausencias §2" a CUALQUIER integrante, porque el mismo botón
            ahora también es la puerta de entrada para declarar una Ausencia
            (NuevoEventoForm decide puertas adentro qué tipos ve cada quien
            según su rol). */}
        {diaSeleccionado && (
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
        mostrarStagePlot={mostrarStagePlot}
      />

      {eventoSeleccionado && (
        <EventoDetalle
          evento={eventoSeleccionado}
          giras={giras.filter((g) => g.bandaIds.some((id) => eventoSeleccionado.bandaIds.includes(id)))}
          setlists={setlists.filter((s) => s.bandaId === eventoSeleccionado.bandaId)}
          puedeEditar={esSuperadmin}
          onCerrar={() => setEventoSeleccionadoId(null)}
          onEditar={abrirEdicion}
          onEliminado={() => {
            setEventoSeleccionadoId(null);
            router.refresh();
          }}
          onEstadoActualizado={() => router.refresh()}
          onSetlistCreado={() => router.refresh()}
        />
      )}

      {mostrarForm && (
        <NuevoEventoForm
          membresias={membresias}
          giras={giras.filter((g) => !g.id.startsWith("cumple-"))}
          setlists={setlists}
          lugares={lugares}
          ausencias={ausencias}
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
