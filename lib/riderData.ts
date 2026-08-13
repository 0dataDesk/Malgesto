import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { StagePlot, StagePlotItem } from "@/lib/stagePlotData";
import { ETIQUETA_TIPO, type TipoEscenario } from "@/lib/stagePlotCatalogo";
import type { Voz } from "@/lib/gestionData";
import { ahoraEnZonaApp } from "@/lib/zonaHoraria";
import { MESES } from "@/lib/eventoUI";

// Brief "Rider técnico — vista previa completa + PDF de una página": una
// fila del Input List -- `numero` es el canal (1..N, en el orden en que los
// ítems musico/teclado se colocaron en el lienzo, ver construirRider más
// abajo), `fuente` combina rol/instrumento + nombre de la persona (mismo
// criterio " · " que ya usan StagePlotLienzo/stagePlotExport), `mic` viene
// de plazas.mic / miembros_banda.mic -- null si no está cargado (la UI lo
// deja vacío, nunca un placeholder tipo "-").
export type CanalRider = {
  numero: number;
  fuente: string;
  mic: string | null;
};

export type ResumenAmplificador = { disenoNombre: string; nombrePersona: string };
export type ResumenPedales = { nombrePersona: string; cantidad: number };
export type ResumenEscenario = { tipo: TipoEscenario; etiqueta: string; cantidad: number; etiquetas: string[] };

export type RiderTecnico = {
  bandaNombre: string;
  bandaColor: string;
  fechaGeneracion: string;
  // Se reexportan los items ya resueltos de StagePlot -- stagePlotExport.ts
  // los usa tal cual para generar la imagen (Brief §2.2: "reusar el export
  // ya existente, no reconstruir el render").
  items: StagePlotItem[];
  canales: CanalRider[];
  amplificadores: ResumenAmplificador[];
  pedales: ResumenPedales[];
  escenario: ResumenEscenario[];
};

function formatearFechaGeneracion(): string {
  const hoy = ahoraEnZonaApp();
  return `${hoy.getDate()} de ${MESES[hoy.getMonth()].toLowerCase()} de ${hoy.getFullYear()}`;
}

const TIPOS_ESCENARIO_RESUMEN: TipoEscenario[] = ["mix", "side_fill", "di", "power", "riser"];

// Brief §1: arma el rider a partir de un StagePlot YA resuelto (obtenido
// vía obtenerStagePlot/obtenerOCrearStagePlot/obtenerStagePlotPorToken en
// stagePlotData.ts, que ya trae instrumento/nombrePersona/disenoNombre/
// etiqueta por ítem) -- acá solo se agregan los datos que ese archivo no
// resuelve porque son específicos del rider y no del ícono del lienzo: el
// mic/DI capturado (plazas.mic / miembros_banda.mic), el tipo exacto de voz
// (principal/coro, no solo el booleano tieneVoz) y el conteo REAL de
// pedales por persona (StagePlotItem.cantidadPedales viene acotado a 6 para
// que el ícono nunca dibuje más de 6 casillas -- acá hace falta el número
// real, sin ese tope).
export async function construirRider(stagePlot: StagePlot, bandaId: string, bandaNombre: string, bandaColor: string): Promise<RiderTecnico> {
  const itemsDePersona = stagePlot.items.filter((i): i is StagePlotItem & { plazaId: string } => (i.tipo === "musico" || i.tipo === "teclado") && !!i.plazaId);
  const itemsPedalera = stagePlot.items.filter((i): i is StagePlotItem & { plazaId: string } => i.tipo === "pedalera" && !!i.plazaId);
  const plazaIds = [...new Set([...itemsDePersona, ...itemsPedalera].map((i) => i.plazaId))];

  const admin = supabaseMalgesto();
  const [{ data: plazasRows }, { data: personaPlazasRows }] =
    plazaIds.length === 0
      ? [{ data: [] as { id: string; mic: string | null }[] }, { data: [] as { plaza_id: string; persona_id: string }[] }]
      : await Promise.all([
          admin.from("plazas").select("id, mic").in("id", plazaIds),
          admin.from("persona_plazas").select("plaza_id, persona_id").in("plaza_id", plazaIds),
        ]);

  const micPorPlaza = new Map((plazasRows ?? []).map((p) => [p.id, p.mic as string | null]));
  const personaIdPorPlaza = new Map((personaPlazasRows ?? []).map((pp) => [pp.plaza_id, pp.persona_id as string]));
  const personaIds = [...new Set(personaIdPorPlaza.values())];

  const [{ data: miembrosRows }, { data: pedalesRows }] =
    personaIds.length === 0
      ? [{ data: [] as { usuario_id: string; voz: string; mic: string | null }[] }, { data: [] as { usuario_id: string }[] }]
      : await Promise.all([
          admin.from("miembros_banda").select("usuario_id, voz, mic").eq("banda_id", bandaId).in("usuario_id", personaIds),
          admin.from("dispositivos").select("usuario_id").eq("banda_id", bandaId).eq("categoria", "pedal").in("usuario_id", personaIds),
        ]);

  const vozPorPersona = new Map((miembrosRows ?? []).map((m) => [m.usuario_id, { voz: m.voz as Voz, mic: m.mic as string | null }]));
  const pedalesPorPersona = new Map<string, number>();
  for (const p of pedalesRows ?? []) pedalesPorPersona.set(p.usuario_id, (pedalesPorPersona.get(p.usuario_id) ?? 0) + 1);

  // Brief §2.3: numerado en el orden en que se colocaron en el lienzo
  // (`orden` ascendente) -- una fila por instrumento, más una fila extra
  // inmediatamente después si esa persona tiene voz (miembros_banda.voz !=
  // "sin_voz"), ambas consumiendo el próximo número de canal disponible.
  const canales: CanalRider[] = [];
  let numero = 1;
  for (const item of [...itemsDePersona].sort((a, b) => a.orden - b.orden)) {
    const personaId = personaIdPorPlaza.get(item.plazaId);
    canales.push({ numero: numero++, fuente: `${item.instrumento} · ${item.nombrePersona}`, mic: micPorPlaza.get(item.plazaId) ?? null });

    const infoVoz = personaId ? vozPorPersona.get(personaId) : undefined;
    if (infoVoz && infoVoz.voz !== "sin_voz") {
      const etiquetaVoz = infoVoz.voz === "principal" ? "Voz principal" : "Coro";
      canales.push({ numero: numero++, fuente: `${etiquetaVoz} · ${item.nombrePersona}`, mic: infoVoz.mic });
    }
  }

  // Brief §1: amplificadores -- ya resueltos en StagePlotItem
  // (disenoNombre/nombrePersona vía dispositivo_id), no hace falta
  // consultar de nuevo.
  const amplificadores: ResumenAmplificador[] = stagePlot.items
    .filter((i) => i.tipo === "amplificador")
    .map((i) => ({ disenoNombre: i.disenoNombre ?? "Amplificador", nombrePersona: i.nombrePersona ?? "Sin asignar" }));

  // Brief §1: pedalera -- agrupada por plaza_id (persona), una fila con el
  // conteo REAL de pedales (no el acotado a 6 de cada ícono individual, que
  // además se repetiría si la persona tiene más de una pedalera en el
  // lienzo).
  const nombrePorPlazaPedalera = new Map(itemsPedalera.map((i) => [i.plazaId, i.nombrePersona ?? "Integrante"]));
  const pedales: ResumenPedales[] = [...new Set(itemsPedalera.map((i) => i.plazaId))].map((plazaId) => {
    const personaId = personaIdPorPlaza.get(plazaId);
    return {
      nombrePersona: nombrePorPlazaPedalera.get(plazaId) ?? "Integrante",
      cantidad: personaId ? (pedalesPorPersona.get(personaId) ?? 0) : 0,
    };
  });

  // Brief §1: mix/side_fill/di/power/riser -- cuenta + etiquetas por tipo;
  // `etiqueta` ya viene resuelta en StagePlotItem (columna real de
  // stage_plot_items, solo aplica a estos 5 tipos).
  const escenario: ResumenEscenario[] = TIPOS_ESCENARIO_RESUMEN.map((tipo) => {
    const deEsteTipo = stagePlot.items.filter((i) => i.tipo === tipo);
    return {
      tipo,
      etiqueta: ETIQUETA_TIPO[tipo],
      cantidad: deEsteTipo.length,
      etiquetas: deEsteTipo.map((i) => i.etiqueta).filter((e): e is string => !!e),
    };
  }).filter((r) => r.cantidad > 0);

  return {
    bandaNombre,
    bandaColor,
    fechaGeneracion: formatearFechaGeneracion(),
    items: stagePlot.items,
    canales,
    amplificadores,
    pedales,
    escenario,
  };
}
