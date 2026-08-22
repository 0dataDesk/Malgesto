"use client";

import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, ETIQUETA_TIPO, colorConAlpha, formatoMoneda } from "@/lib/eventoUI";
import { diaDelMes, diaSemanaAbrev, hora, nombreMes, mismoMesAno } from "@/lib/fechas";
import { enZonaApp } from "@/lib/zonaHoraria";
import { BadgePrivado } from "@/components/ui/BadgePrivado";

// Brief "Color de banda...": la tira izquierda y el círculo junto al
// nombre de banda reflejan el color fijo de la banda (no COLOR_TIPO) — el
// tipo de evento sigue distinguiéndose por la etiqueta/color del label
// "SHOW"/"ENSAYO" arriba, eso no cambia.
function TarjetaEvento({ evento, colorBanda, onClick }: { evento: Evento; colorBanda: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 rounded-[14px] p-3.5 text-left"
      style={{
        background: "oklch(0.99 0.008 82)",
        border: "1px solid oklch(0.89 0.013 78)",
        borderLeft: `3px solid ${colorBanda}`,
      }}
    >
      <div className="min-w-[38px] text-center">
        <div className="font-mono text-lg font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          {diaDelMes(evento.fechaInicio)}
        </div>
        <div className="text-[10px]" style={{ color: "oklch(0.5 0.02 55)" }}>
          {diaSemanaAbrev(evento.fechaInicio)}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="font-mono text-[10px] font-bold uppercase"
              style={{ color: COLOR_TIPO[evento.tipo], letterSpacing: "0.12em" }}
            >
              {ETIQUETA_TIPO[evento.tipo]}
            </span>
            {!evento.esPublico && <BadgePrivado />}
          </div>
          {evento.tipo !== "cumpleanos" && (
            <span className="font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
              {hora(evento.fechaInicio)}
            </span>
          )}
        </div>
        <div
          className="my-0.5 text-[17px] font-bold"
          style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {evento.titulo}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorBanda }} />
            {evento.bandaNombre}
          </span>
          {evento.lugarNombre && <span>· {evento.lugarNombre}</span>}
          {evento.ciudad && <span>· {evento.ciudad}</span>}
          {evento.ingresoEsperado !== null && <span>· {formatoMoneda(evento.ingresoEsperado)} esperado</span>}
        </div>
      </div>
    </button>
  );
}

function TarjetaGira({
  gira,
  shows,
  onClick,
  onClickShow,
}: {
  gira: Evento;
  shows: Evento[];
  onClick: () => void;
  onClickShow: (e: Evento) => void;
}) {
  const inicio = diaDelMes(gira.fechaInicio);
  const fin = gira.fechaFin ? diaDelMes(gira.fechaFin) : inicio;

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ border: `1px solid ${COLOR_TIPO.gira}` }}>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 px-3.5 text-left"
        style={{ paddingTop: 11, paddingBottom: 11, background: colorConAlpha(COLOR_TIPO.gira, 0.16) }}
      >
        <span
          className="font-mono text-[10px] font-bold uppercase"
          style={{ color: "oklch(0.5 0.06 72)", letterSpacing: "0.1em" }}
        >
          Gira
        </span>
        <span
          className="flex-1 text-[16px] font-bold"
          style={{ color: "oklch(0.28 0.03 60)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          {gira.titulo}
        </span>
        <span className="font-mono text-[11px]" style={{ color: "oklch(0.5 0.05 70)" }}>
          {inicio}–{fin} {nombreMes(gira.fechaInicio)}
        </span>
      </button>
      <div className="px-3.5 pt-1" style={{ paddingBottom: 10 }}>
        {shows.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => onClickShow(s)}
            className="flex w-full gap-2.5 border-b py-2 text-left last:border-b-0"
            style={{ borderColor: "oklch(0.9 0.012 78)" }}
          >
            <span className="min-w-[34px] font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
              {diaDelMes(s.fechaInicio)}
            </span>
            <span className="flex-1 text-[13px]" style={{ color: "oklch(0.3 0.02 55)" }}>
              Show · {s.lugarNombre ?? s.titulo}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AgendaView({
  eventos,
  colorPorBanda,
  onEventoClick,
}: {
  eventos: Evento[];
  colorPorBanda: Map<string, string>;
  onEventoClick: (evento: Evento) => void;
}) {
  const giras = eventos.filter((e) => e.tipo === "gira");
  const showsAgrupados = new Set(eventos.filter((e) => e.giraId).map((e) => e.id));
  const items = [...giras, ...eventos.filter((e) => e.tipo !== "gira" && !showsAgrupados.has(e.id))].sort(
    (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
  );

  if (items.length === 0) {
    return (
      <p className="mt-8 text-center text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
        Sin eventos próximos.
      </p>
    );
  }

  const itemsConMes = items.map((item, i) => ({
    item,
    mostrarMes: i === 0 || !mismoMesAno(enZonaApp(items[i - 1].fechaInicio), enZonaApp(item.fechaInicio)),
  }));

  return (
    <div className="flex flex-col gap-3">
      {itemsConMes.map(({ item, mostrarMes }) => {
        return (
          <div key={item.id}>
            {mostrarMes && (
              <div
                className="mb-2.5 mt-1 font-mono text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.55 0.02 55)" }}
              >
                {nombreMes(item.fechaInicio)}
              </div>
            )}
            {item.tipo === "gira" ? (
              <TarjetaGira
                gira={item}
                shows={eventos.filter((e) => e.giraId === item.id)}
                onClick={() => onEventoClick(item)}
                onClickShow={onEventoClick}
              />
            ) : (
              <TarjetaEvento
                evento={item}
                colorBanda={colorPorBanda.get(item.bandaId) ?? "oklch(0.6 0.02 55)"}
                onClick={() => onEventoClick(item)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
