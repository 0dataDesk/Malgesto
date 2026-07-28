"use client";

import type { Evento } from "@/lib/malgestoEventos";
import { COLOR_TIPO, colorConAlpha } from "@/lib/eventoUI";
import { celdasDelMes, esMismoDia, mismoMesAno } from "@/lib/fechas";

function estaEnRangoGira(dia: Date, gira: Evento): boolean {
  const inicio = new Date(gira.fechaInicio);
  const fin = gira.fechaFin ? new Date(gira.fechaFin) : inicio;
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const i = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const f = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  return d >= i && d <= f;
}

export function MesView({
  mes,
  eventos,
  onEventoClick,
}: {
  mes: Date;
  eventos: Evento[];
  onEventoClick: (evento: Evento) => void;
}) {
  const hoy = new Date();
  const celdas = celdasDelMes(mes);
  const giras = eventos.filter((e) => e.tipo === "gira");

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 text-center font-mono text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-0.5 gap-y-1 text-center">
        {celdas.map((dia, i) => {
          const fueraDeMes = !mismoMesAno(dia, mes);
          const esHoy = esMismoDia(dia, hoy);
          const eventosDelDia = eventos.filter(
            (e) => e.tipo !== "gira" && esMismoDia(new Date(e.fechaInicio), dia)
          );
          const giraDelDia = giras.find((g) => estaEnRangoGira(dia, g));

          let bg = "transparent";
          let radius = "0";
          if (giraDelDia) {
            bg = colorConAlpha(COLOR_TIPO.gira, 0.22);
            // Design redondea solo en el día exacto de inicio/fin de la gira,
            // nunca en los bordes de fila del calendario (ver líneas 481-485
            // del HTML: el día 17, fin de semana, queda cuadrado igual).
            const inicio = new Date(giraDelDia.fechaInicio);
            const fin = giraDelDia.fechaFin ? new Date(giraDelDia.fechaFin) : inicio;
            const esInicio = esMismoDia(dia, inicio);
            const esFin = esMismoDia(dia, fin);
            radius = `${esInicio ? "9px" : "0"} ${esFin ? "9px" : "0"} ${esFin ? "9px" : "0"} ${esInicio ? "9px" : "0"}`;
          }

          return (
            <button
              key={i}
              type="button"
              disabled={eventosDelDia.length === 0}
              onClick={() => eventosDelDia.length > 0 && onEventoClick(eventosDelDia[0])}
              className="flex flex-col items-center text-[13px]"
              style={{
                paddingTop: 7,
                paddingBottom: 7,
                background: esHoy ? "oklch(0.24 0.02 55)" : bg,
                borderRadius: esHoy ? 9 : radius,
                color: esHoy
                  ? "oklch(0.99 0.01 82)"
                  : fueraDeMes
                    ? "oklch(0.72 0.02 60)"
                    : "oklch(0.3 0.02 55)",
                fontWeight: esHoy || giraDelDia ? 700 : 400,
              }}
            >
              {dia.getDate()}
              <div className="mt-0.5 flex h-[5px] gap-0.5">
                {!fueraDeMes &&
                  eventosDelDia.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ background: COLOR_TIPO[e.tipo] }}
                    />
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      {giras
        .filter((g) => mismoMesAno(new Date(g.fechaInicio), mes) || (g.fechaFin && mismoMesAno(new Date(g.fechaFin), mes)))
        .map((g) => {
          const showsDeLaGira = eventos.filter((e) => e.giraId === g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onEventoClick(g)}
              className="mt-3.5 flex w-full items-center gap-2.5 rounded-[13px] px-3.5"
              style={{
                paddingTop: 11,
                paddingBottom: 11,
                background: colorConAlpha(COLOR_TIPO.gira, 0.16),
                border: `1px solid ${COLOR_TIPO.gira}`,
              }}
            >
              <span className="font-mono text-[11px]" style={{ color: "oklch(0.5 0.05 70)" }}>
                {new Date(g.fechaInicio).getDate()}–{g.fechaFin ? new Date(g.fechaFin).getDate() : new Date(g.fechaInicio).getDate()}
              </span>
              <span className="flex-1 text-left text-sm font-bold" style={{ color: "oklch(0.28 0.03 60)" }}>
                {g.titulo} · {g.bandaNombre}
              </span>
              <span className="font-mono text-[11px]" style={{ color: "oklch(0.5 0.05 70)" }}>
                {showsDeLaGira.length} shows
              </span>
            </button>
          );
        })}
    </div>
  );
}
