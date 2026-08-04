"use client";

import type { Evento, Membresia } from "@/lib/malgestoEventos";
import { COLOR_TIPO, COLOR_TENTATIVO, colorConAlpha, colorPorIndiceBanda, eventoYaPaso } from "@/lib/eventoUI";
import { celdasDelMes, esMismoDia, mismoMesAno } from "@/lib/fechas";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";

function estaEnRangoGira(dia: Date, gira: Evento): boolean {
  const inicio = enZonaApp(gira.fechaInicio);
  const fin = gira.fechaFin ? enZonaApp(gira.fechaFin) : inicio;
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const i = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const f = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  return d >= i && d <= f;
}

export function MesView({
  mes,
  eventos,
  membresias,
  diaSeleccionado,
  onDiaClick,
  onEventoClick,
}: {
  mes: Date;
  eventos: Evento[];
  membresias: Membresia[];
  diaSeleccionado: Date | null;
  onDiaClick: (dia: Date) => void;
  onEventoClick: (evento: Evento) => void;
}) {
  const hoy = ahoraEnZonaApp();
  const celdas = celdasDelMes(mes);
  const giras = eventos.filter((e) => e.tipo === "gira");
  // Brief 18 §6: mismo color por banda que BandaFilterChips (índice en
  // `membresias`, no un color fijo por tipo de evento).
  const colorPorBanda = new Map(membresias.map((m, i) => [m.bandaId, colorPorIndiceBanda(i)]));

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
          const esSeleccionado = !!diaSeleccionado && esMismoDia(dia, diaSeleccionado);
          const eventosDelDia = eventos.filter(
            (e) => e.tipo !== "gira" && esMismoDia(enZonaApp(e.fechaInicio), dia)
          );
          // Brief 18 §6: un punto por BANDA con evento ese día (no uno por
          // evento) — los no-gira siempre tienen una sola bandaId propia.
          const bandaIdsDelDia = [...new Set(eventosDelDia.map((e) => e.bandaId))];
          const giraDelDia = giras.find((g) => estaEnRangoGira(dia, g));

          let bg = "transparent";
          let radius = "0";
          if (giraDelDia) {
            bg = colorConAlpha(COLOR_TIPO.gira, 0.22);
            // Design redondea solo en el día exacto de inicio/fin de la gira,
            // nunca en los bordes de fila del calendario (ver líneas 481-485
            // del HTML: el día 17, fin de semana, queda cuadrado igual).
            const inicio = enZonaApp(giraDelDia.fechaInicio);
            const fin = giraDelDia.fechaFin ? enZonaApp(giraDelDia.fechaFin) : inicio;
            const esInicio = esMismoDia(dia, inicio);
            const esFin = esMismoDia(dia, fin);
            radius = `${esInicio ? "9px" : "0"} ${esFin ? "9px" : "0"} ${esFin ? "9px" : "0"} ${esInicio ? "9px" : "0"}`;
          } else if (bandaIdsDelDia.length > 0) {
            // Corrección §2: un punto de 5px por banda pasaba desapercibido
            // al ver el mes completo. Se suma un fondo neutro (no el color de
            // ninguna banda en particular, para no insinuar que el día es "de
            // esa banda") detrás del número, mismo lenguaje visual que ya usa
            // "hoy"/gira para destacar una celda — así un día con evento se
            // distingue de uno vacío de un vistazo, y los puntos de color
            // siguen abajo indicando cuáles bandas.
            // Brief de refinamiento §2: si TODOS los eventos del día ya
            // pasaron se usa un tono más apagado que si hay alguno futuro
            // (mezclado cuenta como "con eventos futuros", mismo resaltado
            // de siempre) — mismo criterio eventoYaPaso de lib/eventoUI.
            const todosPasados = eventosDelDia.every((e) => eventoYaPaso(e));
            bg = todosPasados ? "oklch(0.55 0.02 55 / 0.07)" : "oklch(0.55 0.02 55 / 0.16)";
            radius = "9px";
          }

          // Brief "Estado Tentativo...": una fecha tentativa necesita
          // revisión/decisión, no es solo información pasiva -- prevalece
          // sobre el resaltado normal de evento/gira/pasado de arriba (fondo
          // de advertencia) y se refuerza con un anillo, así no se pierde ni
          // siquiera sobre el fondo oscuro de "hoy" más abajo.
          const tieneTentativo = giraDelDia?.estado === "tentativo" || eventosDelDia.some((e) => e.estado === "tentativo");
          if (tieneTentativo) {
            bg = colorConAlpha(COLOR_TENTATIVO, 0.3);
            if (radius === "0") radius = "9px";
          }
          const anillos = [
            esSeleccionado ? "inset 0 0 0 2px oklch(0.64 0.15 34)" : null,
            tieneTentativo ? "inset 0 0 0 2px oklch(0.62 0.17 88)" : null,
          ].filter(Boolean);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDiaClick(dia)}
              className="flex flex-col items-center text-[13px]"
              style={{
                paddingTop: 7,
                paddingBottom: 7,
                background: esHoy ? "oklch(0.24 0.02 55)" : bg,
                borderRadius: esHoy ? 9 : radius,
                boxShadow: anillos.length > 0 ? anillos.join(", ") : "none",
                color: esHoy
                  ? "oklch(0.99 0.01 82)"
                  : fueraDeMes
                    ? "oklch(0.72 0.02 60)"
                    : "oklch(0.3 0.02 55)",
                fontWeight: esHoy || giraDelDia || bandaIdsDelDia.length > 0 ? 700 : 400,
              }}
            >
              {dia.getDate()}
              <div className="mt-0.5 flex h-[6px] gap-[3px]">
                {!fueraDeMes &&
                  bandaIdsDelDia.slice(0, 3).map((bandaId) => (
                    <span
                      key={bandaId}
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: colorPorBanda.get(bandaId) ?? colorPorIndiceBanda(0) }}
                    />
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      {giras
        .filter((g) => mismoMesAno(enZonaApp(g.fechaInicio), mes) || (g.fechaFin && mismoMesAno(enZonaApp(g.fechaFin), mes)))
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
                {enZonaApp(g.fechaInicio).getDate()}–{g.fechaFin ? enZonaApp(g.fechaFin).getDate() : enZonaApp(g.fechaInicio).getDate()}
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
