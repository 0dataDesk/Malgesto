// Sin "server-only": lo usan tanto el editor/paleta (cliente) como la
// data layer (servidor) y el export a SVG/PNG — un solo catálogo para que
// los tres coincidan siempre en color/forma/glifo por tipo de ítem.
//
// Brief "Rediseño de Stage Plot — Entrega 1": el catálogo fijo por ROL
// musical (vocalista/guitarrista/bajista/...) se reemplaza por un catálogo
// mucho más chico por CATEGORÍA de elemento -- el rol/instrumento real ya
// no vive acá, vive en malgesto.plazas y se resuelve en stagePlotData.ts.
// "musico"/"mic" cubren TODOS los roles (batería incluida) porque cada
// ítem de esos tipos ya lleva su propia identidad vía plaza_id -- no hace
// falta un tipo por instrumento como antes.
export const TIPOS_ITEM = ["musico", "mic", "monitor", "di", "power", "riser"] as const;

export type TipoItem = (typeof TIPOS_ITEM)[number];

export const ETIQUETA_TIPO: Record<TipoItem, string> = {
  musico: "Músico",
  mic: "Micrófono",
  monitor: "Monitor",
  di: "DI",
  power: "Power",
  riser: "Riser",
};

// Brief §2: forma por categoría -- distingue de un vistazo qué es cada
// ítem sin depender solo del color. StagePlotLienzo (DOM) y
// stagePlotExport.ts (SVG) leen esto mismo para no divergir.
export type FormaItem = "circulo" | "circulo-chico" | "rectangulo" | "rectangulo-punteado" | "rombo" | "triangulo";

export const FORMA_TIPO: Record<TipoItem, FormaItem> = {
  musico: "circulo",
  mic: "circulo-chico",
  monitor: "rectangulo",
  di: "rombo",
  power: "triangulo",
  // Brief §2: "para diferenciarlo visualmente del monitor -- es una
  // plataforma, no un objeto" -- contorno punteado en vez de relleno
  // sólido, ver COLOR_ESCENARIO/uso en Lienzo y export.
  riser: "rectangulo-punteado",
};

// Brief §3: musico/mic no llevan glifo fijo por tipo -- el glifo de
// músico sale del instrumento real de su plaza (ver GLIFO_INSTRUMENTO),
// y el de mic es simplemente "MIC" (la identidad de a quién pertenece va
// en la etiqueta de abajo, no hace falta codificarla en el glifo).
export const GLIFO_TIPO: Record<TipoItem, string> = {
  musico: "",
  mic: "MIC",
  monitor: "MON",
  di: "DI",
  power: "PWR",
  riser: "RSR",
};

// Brief §2: "colores neutros consistentes para los elementos de escenario"
// -- musico/mic no están acá a propósito, usan el color de banda (ver
// StagePlotLienzo/stagePlotExport, que reciben bandaColor aparte).
export const COLOR_ESCENARIO: Record<Exclude<TipoItem, "musico" | "mic">, string> = {
  monitor: "oklch(0.5 0.02 55)",
  di: "oklch(0.52 0.05 260)",
  power: "oklch(0.6 0.16 55)",
  riser: "oklch(0.55 0.02 70)",
};

export function esTipoItemValido(valor: string): valor is TipoItem {
  return (TIPOS_ITEM as readonly string[]).includes(valor);
}

// Glifo corto por INSTRUMENTO real (malgesto.plazas.instrumento), no por
// tipo de ítem -- así "musico" cubre batería/guitarra/etc. sin necesitar
// un TipoItem propio para cada uno. Mismo catálogo cerrado que
// lib/instrumentoCatalogo.ts (INSTRUMENTOS), un glifo de 3 letras por
// entrada; "otro" no tiene un glifo fijo con sentido (la etiqueta real
// vive en plazas.etiqueta) así que cae en "OTR".
import type { Instrumento } from "@/lib/instrumentoCatalogo";

export const GLIFO_INSTRUMENTO: Record<Instrumento, string> = {
  bajo: "BAJ",
  guitarra_principal: "GT1",
  guitarra_segunda: "GT2",
  bateria: "BAT",
  acordeon: "ACO",
  teclado_piano: "TEC",
  voz: "VOZ",
  coro: "COR",
  otro: "OTR",
};
