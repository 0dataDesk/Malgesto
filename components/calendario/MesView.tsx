"use client";

import type { Evento } from "@/lib/malgestoEventos";
import type { AusenciaPersona } from "@/lib/ausenciasData";
import { COLOR_TIPO, COLOR_TENTATIVO, colorConAlpha, FONDO_GRISES, type IntensidadFondoDia } from "@/lib/eventoUI";
import { textoLegibleSobre } from "@/lib/colorContraste";
import { celdasDelMes, esMismoDia, mismoMesAno, fechaISO } from "@/lib/fechas";
import { enZonaApp, ahoraEnZonaApp } from "@/lib/zonaHoraria";

function estaEnRangoGira(dia: Date, gira: Evento): boolean {
  const inicio = enZonaApp(gira.fechaInicio);
  const fin = gira.fechaFin ? enZonaApp(gira.fechaFin) : inicio;
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const i = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const f = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  return d >= i && d <= f;
}

// Brief "Colores de calendario" §1: "pasado" es por DÍA (no por hora exacta
// del evento como eventoYaPaso) — cualquier día ya transcurrido, sea
// overflow del mes anterior o parte del mes visible. No afecta a "hoy": esa
// celda siempre se pinta sólida más abajo, sin importar qué calcule esto.
function esDiaPasado(dia: Date, hoy: Date): boolean {
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return d < h;
}

// "Más oscuro" aplica solo al overflow de CIERRE (mes siguiente al
// visible) — el overflow de apertura (mes anterior) nunca lo recibe, según
// el brief, incluso en el caso raro de que ese overflow sea futuro (navegar
// varios meses adelante).
function esOverflowMesSiguiente(dia: Date, mesVisible: Date): boolean {
  const siguiente = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
  return dia.getFullYear() === siguiente.getFullYear() && dia.getMonth() === siguiente.getMonth();
}

export function MesView({
  mes,
  eventos,
  ausencias,
  colorPorBanda,
  diaSeleccionado,
  onDiaClick,
  onEventoClick,
}: {
  mes: Date;
  eventos: Evento[];
  ausencias: AusenciaPersona[];
  colorPorBanda: Map<string, string>;
  diaSeleccionado: Date | null;
  onDiaClick: (dia: Date) => void;
  onEventoClick: (evento: Evento) => void;
}) {
  const hoy = ahoraEnZonaApp();
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
          const esSeleccionado = !!diaSeleccionado && esMismoDia(dia, diaSeleccionado);
          const eventosDelDia = eventos.filter(
            (e) => e.tipo !== "gira" && esMismoDia(enZonaApp(e.fechaInicio), dia)
          );
          // Brief 18 §6: un punto por BANDA con evento ese día (no uno por
          // evento) — los no-gira siempre tienen una sola bandaId propia.
          const bandaIdsDelDia = [...new Set(eventosDelDia.map((e) => e.bandaId))];
          const giraDelDia = giras.find((g) => estaEnRangoGira(dia, g));

          // Brief "Disponibilidad de integrantes" §2: indicador de "hay
          // alguna ausencia este día" — deliberadamente distinto de los
          // puntos de banda (que indican DE QUÉ banda es un evento); acá
          // solo importa "sí/no hay que revisar", el detalle vive al abrir
          // el día (CalendarioShell).
          const diaStr = fechaISO(dia);
          const hayAusencias = !fueraDeMes && ausencias.some((a) => diaStr >= a.fechaInicio && diaStr <= a.fechaFin);

          let bg = "transparent";
          let radius = "0";
          // Brief "Calendario — sistema de colores": Ensayo ya no rellena la
          // celda -- usa el mismo gris que Show, pero solo como contorno
          // (~2px), dejando bg en el crema natural del calendario.
          let bordeEnsayo: string | null = null;
          if (giraDelDia) {
            // Gira es un color FIJO (no depende de la fecha) — mismo valor
            // que el badge de "Próximos eventos" (COLOR_TIPO.gira), ya no
            // dos tonos que se leían distinto entre las dos pantallas.
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
            // Brief "Calendario — sistema de colores": Show y Ensayo
            // comparten la misma escala de grises según qué tan lejos está
            // la fecha (pasado/normal/mesSiguiente) -- la diferencia entre
            // ambos ya no es de color, es de aplicación (relleno vs.
            // contorno, resuelto más abajo). Cumpleaños es fijo, no depende
            // de la fecha. Prioridad si un día mezcla tipos: Show sigue
            // mandando sobre Ensayo (mismo criterio ya usado — es el evento
            // de mayor peso), Cumpleaños entra por debajo de los dos —
            // criterio ya resuelto, no es parte de este brief redefinirlo.
            const tieneShow = eventosDelDia.some((e) => e.tipo === "show");
            const tieneEnsayo = eventosDelDia.some((e) => e.tipo === "ensayo");
            const tieneCumple = eventosDelDia.some((e) => e.tipo === "cumpleanos");

            if (tieneShow || tieneEnsayo) {
              const pasado = esDiaPasado(dia, hoy);
              const mesSiguiente = !pasado && fueraDeMes && esOverflowMesSiguiente(dia, mes);
              const intensidad: IntensidadFondoDia = pasado ? "pasado" : mesSiguiente ? "mesSiguiente" : "normal";
              const gris = FONDO_GRISES[intensidad];
              if (tieneShow) bg = gris;
              else bordeEnsayo = gris;
              radius = "9px";
            } else if (tieneCumple) {
              bg = COLOR_TIPO.cumpleanos;
              radius = "9px";
            }
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
            bordeEnsayo ? `inset 0 0 0 2px ${bordeEnsayo}` : null,
          ].filter(Boolean);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDiaClick(dia)}
              className="relative flex flex-col items-center text-[13px]"
              style={{
                paddingTop: 7,
                paddingBottom: 7,
                background: esHoy ? "oklch(0.24 0.02 55)" : bg,
                borderRadius: esHoy ? 9 : radius,
                boxShadow: anillos.length > 0 ? anillos.join(", ") : "none",
                // Brief "Calendario — sistema de colores": "mesSiguiente"
                // pasa a un gris OSCURO puro (#3F3F42) -- el texto oscuro
                // fijo que se usaba antes para cualquier día con fondo ya no
                // alcanza ahí (quedaría casi invisible sobre un fondo
                // igual de oscuro), así que un día con relleno mide
                // contraste real contra ESE fondo en vez de asumir que
                // siempre es claro; el tenue de "fuera de mes vacío" y el
                // oscuro fijo de siempre se mantienen sin cambios para los
                // demás casos (sin relleno).
                color: esHoy
                  ? "oklch(0.99 0.01 82)"
                  : bg !== "transparent"
                    ? textoLegibleSobre(bg)
                    : fueraDeMes
                      ? "oklch(0.72 0.02 60)"
                      : "oklch(0.3 0.02 55)",
                fontWeight: esHoy || giraDelDia || bandaIdsDelDia.length > 0 ? 700 : 400,
              }}
            >
              {hayAusencias && (
                <span
                  className="absolute h-[5px] w-[5px] rounded-full"
                  style={{ top: 4, right: 4, background: "oklch(0.5 0.14 40)" }}
                  title="Hay ausencias este día"
                />
              )}
              {dia.getDate()}
              <div className="mt-0.5 flex h-[6px] gap-[3px]">
                {/* Brief "Paleta definitiva de colores del calendario" §5:
                    el punto vuelve a ser sólido siempre — ahora que el
                    fondo del día ya distingue Show de Ensayo por color, el
                    punto no necesita hacerlo también (era el anillo hueco
                    del brief anterior); su único trabajo vuelve a ser
                    indicar de qué banda es. */}
                {!fueraDeMes &&
                  bandaIdsDelDia.slice(0, 3).map((bandaId) => (
                    <span
                      key={bandaId}
                      className="h-[6px] w-[6px] rounded-full"
                      style={{ background: colorPorBanda.get(bandaId) ?? "oklch(0.6 0.02 55)" }}
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
