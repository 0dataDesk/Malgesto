// Sin "server-only": lo usan tanto el editor/paleta (cliente) como la
// data layer (servidor) y el export a SVG/PNG — un solo catálogo para que
// los tres coincidan siempre en color/forma/glifo por tipo de ítem.
//
// Brief "Stage Plot — Entrega 2": el CHECK de stage_plot_items.tipo pasa a
// musico/mic/teclado/pedalera/amplificador/mix/side_fill/di/power/riser
// ("monitor" se renombra a "mix" a nivel de esquema; "power" se queda
// igual a nivel de tipo interno, solo cambia su etiqueta visible a "AC").
// "mic" queda en la lista porque el CHECK todavía lo acepta (compatibilidad
// del esquema), pero la paleta ya no lo ofrece -- la voz ahora es un
// atributo visual automático del propio ícono de músico/teclado (ver
// TIPOS_CON_VOZ_VISIBLE más abajo), no un ítem aparte para arrastrar.
export const TIPOS_ITEM = [
  "musico",
  "mic",
  "teclado",
  "pedalera",
  "amplificador",
  "mix",
  "side_fill",
  "di",
  "power",
  "riser",
] as const;

export type TipoItem = (typeof TIPOS_ITEM)[number];

export const ETIQUETA_TIPO: Record<TipoItem, string> = {
  musico: "Músico",
  mic: "Micrófono",
  teclado: "Teclado",
  pedalera: "Pedalera",
  amplificador: "Amplificador",
  // Brief §5: "Monitor" -> "Mix" (tipo interno ya migrado) y "Power" -> "AC"
  // (tipo interno sigue siendo "power", solo cambia el texto mostrado).
  mix: "Mix",
  side_fill: "Side Fill",
  di: "DI",
  power: "AC",
  riser: "Riser",
};

// Brief §1/§2/§4: musico/mic/teclado/pedalera llevan `plaza_id` (persona
// dueña del ícono); amplificador lleva `dispositivo_id` (asignación real en
// Seteos); el resto son elementos de escenario sin dueño, con `etiqueta`
// libre. Centralizado acá porque las 3 capas (stagePlotData validación
// server-side, actions.ts guard de etiqueta, StagePlotEditor gating de UI)
// necesitaban este mismo criterio -- antes cada una repetía a mano
// `tipo === "musico" || tipo === "mic"`.
const TIPOS_CON_PLAZA = new Set<TipoItem>(["musico", "mic", "teclado", "pedalera"]);
const TIPOS_CON_DISPOSITIVO = new Set<TipoItem>(["amplificador"]);

export function requierePlaza(tipo: TipoItem): boolean {
  return TIPOS_CON_PLAZA.has(tipo);
}

export function requiereDispositivo(tipo: TipoItem): boolean {
  return TIPOS_CON_DISPOSITIVO.has(tipo);
}

// Brief §1/§3: musico/teclado (y mic, legado) muestran el indicador de voz
// pegado al frente cuando corresponde -- ver `tieneVoz` en StagePlotItem.
export function puedeMostrarVoz(tipo: TipoItem): boolean {
  return tipo === "musico" || tipo === "teclado" || tipo === "mic";
}

// Etiqueta libre solo tiene sentido para los elementos de escenario sin
// dueño -- musico/mic/teclado/pedalera/amplificador resuelven su identidad
// desde datos reales (plaza o dispositivo), nunca desde texto capturado acá.
export function tieneEtiquetaEditable(tipo: TipoItem): boolean {
  return !requierePlaza(tipo) && !requiereDispositivo(tipo);
}

// Brief §2: forma por categoría -- distingue de un vistazo qué es cada
// ítem sin depender solo del color. StagePlotLienzo (DOM) y
// stagePlotExport.ts (SVG) leen esto mismo para no divergir.
export type FormaItem = "circulo" | "circulo-chico" | "rectangulo" | "rectangulo-punteado" | "rombo" | "triangulo" | "pedalera";

export const FORMA_TIPO: Record<TipoItem, FormaItem> = {
  musico: "circulo",
  mic: "circulo-chico",
  // Brief §3: "forma distinta, no circular" -- reusa el mismo rectángulo que
  // ya distingue Mix/Side Fill del círculo de músico, para no inventar una
  // séptima forma solo para esto.
  teclado: "rectangulo",
  pedalera: "pedalera",
  amplificador: "rectangulo",
  mix: "rectangulo",
  side_fill: "rectangulo",
  di: "rombo",
  power: "triangulo",
  // Brief §2 (Entrega 1): "para diferenciarlo visualmente del monitor -- es
  // una plataforma, no un objeto" -- contorno punteado en vez de relleno
  // sólido, ver COLOR_ESCENARIO/uso en Lienzo y export.
  riser: "rectangulo-punteado",
};

// Brief §3: musico/mic no llevan glifo fijo por tipo -- el glifo de
// músico sale del instrumento real de su plaza (ver GLIFO_INSTRUMENTO), y
// el de mic es simplemente "MIC". Teclado tiene su propio glifo fijo (no
// depende del instrumento real, siempre es teclado). Pedalera no lleva
// glifo -- dibuja la grilla de 6 casillas en su lugar (ver
// StagePlotLienzo/stagePlotExport). Amplificador usa un glifo genérico; su
// identidad real se transmite por color de marca + etiqueta, no por texto
// en el ícono.
export const GLIFO_TIPO: Record<TipoItem, string> = {
  musico: "",
  mic: "MIC",
  teclado: "TEC",
  pedalera: "",
  amplificador: "AMP",
  mix: "MIX",
  side_fill: "SDF",
  di: "DI",
  power: "AC",
  riser: "RSR",
};

// Brief §2 (Entrega 1) + §4/§5 (Entrega 2): "colores neutros consistentes
// para los elementos de escenario sin dueño" -- musico/mic/teclado/pedalera
// no están acá a propósito (usan el color de banda, son ítems de una
// persona, ver StagePlotLienzo/stagePlotExport); amplificador tampoco (usa
// los colores reales de marca del diseño asignado, ver colorDeItem).
export type TipoEscenario = Exclude<TipoItem, "musico" | "mic" | "teclado" | "pedalera" | "amplificador">;

export const COLOR_ESCENARIO: Record<TipoEscenario, string> = {
  mix: "oklch(0.5 0.02 55)",
  // Brief §5: "mismo criterio que Mix" -- misma familia neutra, tono propio
  // para poder distinguirlos uno al lado del otro en la paleta/lienzo.
  side_fill: "oklch(0.45 0.03 250)",
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
  otro: "OTR",
};
