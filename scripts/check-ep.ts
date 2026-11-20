// Revisa la geometría y la validación del Mapa del EP. Corre con npm run check (antes de cada build).
import { INDICADORES, clamp, curvaSuave, nivelEfectivo, normalizarProyecto, tramosDe, nuevaPieza, type Pieza } from "../lib/epModelo";

const errores: string[] = [];
const falla = (m: string) => errores.push(m);

if (nivelEfectivo(90, 30) !== 100) falla("nivelEfectivo debe recortar a 100");
if (nivelEfectivo(10, -30) !== 0) falla("nivelEfectivo debe recortar a 0");
if (nivelEfectivo(50, 10) !== 60) falla("nivelEfectivo debe sumar el ajuste");
if (clamp(5, 0, 3) !== 3) falla("clamp");
if (INDICADORES.length !== 8 || new Set(INDICADORES.map((i) => i.campo)).size !== 8) falla("INDICADORES debe tener 8 campos distintos");
const sNueva = nuevaPieza().secciones[0] as unknown as Record<string, unknown>;
INDICADORES.forEach((i) => { if (sNueva[i.campo] !== 50) falla(`nuevaSeccion debe iniciar ${i.campo} en 50`); });

const a: Pieza = { ...nuevaPieza("A"), secciones: [{ ...nuevaPieza().secciones[0], compases: 8, nivel: 20 }, { ...nuevaPieza().secciones[0], compases: 24, nivel: 80 }] };
const b: Pieza = { ...nuevaPieza("B"), ajuste: -10, secciones: [{ ...nuevaPieza().secciones[0], compases: 16, nivel: 60 }] };
const t = tramosDe([a, b]);
if (t.length !== 3) falla("tramosDe debe dar una entrada por sección");
if (Math.abs(t[0].x1 - 8 / 48) > 1e-9 || Math.abs(t[2].x1 - 1) > 1e-9) falla("tramosDe debe repartir el ancho por compases");
if (t[2].nivel !== 50) falla("tramosDe debe aplicar el ajuste de la pieza");
if (tramosDe([a, b], 1).length !== 1 || tramosDe([a, b], 1)[0].x0 !== 0) falla("tramosDe de una sola pieza debe ocupar todo el ancho");
if (!curvaSuave([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]).startsWith("M0.0,0.0 C")) falla("curvaSuave debe empezar con M y curvas");

const ok = normalizarProyecto({ nombre: " X ", tipo: "album", historia: "h", piezas: [{ id: crypto.randomUUID(), titulo: "T", ajuste: 999, secciones: [{ id: crypto.randomUUID(), nombre: "S", compases: 0, nivel: -5, graves: 500, sub: 300, ritmo: -2, etapa: "inventada", instrumentos: ["Bajo", 3] }] }] });
const s0 = ok.piezas[0].secciones[0];
if (ok.nombre !== "X" || ok.tipo !== "album") falla("normalizarProyecto: nombre/tipo");
if (ok.piezas[0].ajuste !== 50 || s0.compases !== 1 || s0.nivel !== 0 || s0.graves !== 100 || s0.sub !== 100 || s0.ritmo !== 0 || s0.espacio !== 50) falla("normalizarProyecto debe recortar rangos y dar 50 a lo que falta");
if (s0.etapa !== "descubrimiento" || s0.instrumentos.length !== 1) falla("normalizarProyecto: etapa/instrumentos inválidos");
try {
  normalizarProyecto({ nombre: "x", piezas: [{ id: "no-es-uuid", secciones: [] }] });
  falla("normalizarProyecto debe rechazar ids inválidos");
} catch {}
try {
  const id = crypto.randomUUID();
  normalizarProyecto({ nombre: "x", piezas: [{ id, secciones: [] }, { id, secciones: [] }] });
  falla("normalizarProyecto debe rechazar ids repetidos");
} catch {}

if (errores.length > 0) {
  console.error("Mapa del EP: fallas\n- " + errores.join("\n- "));
  process.exit(1);
}
console.log("Mapa del EP: geometría y validación OK");
