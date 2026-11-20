// Revisa la geometría, los cálculos y la validación del Mapa del EP. Corre con npm run check (antes de cada build).
import { CAMPOS, referenciaDe, CUERPO, NUCLEO, PESO_CUERPO, PESO_INTENSIDAD, moverPromedio, promedioDe, promedioIntensidad, promedioPeso, capaEntre, clamp, colorAnimo, curvaSuave, duracionSeg, formatoMSS, intensidad, nuevaPieza, normalizarProyecto, palabraDe, peso, tramosDe, type Pieza, type Seccion } from "../lib/epModelo";

const errores: string[] = [];
const falla = (m: string) => errores.push(m);
const sec = (patch: Partial<Seccion>): Seccion => ({ ...nuevaPieza().secciones[0], ...patch });

if (clamp(5, 0, 3) !== 3) falla("clamp");
if (Math.abs(Object.values(PESO_CUERPO).reduce((a, b) => a + b, 0) - 1) > 1e-9) falla("los pesos del cuerpo deben sumar 1");
if (Math.abs(PESO_INTENSIDAD.energia + PESO_INTENSIDAD.tension - 1) > 1e-9) falla("los pesos de la intensidad deben sumar 1");

// Intensidad: 65 % energía + 35 % tensión. El ánimo no la cambia.
if (intensidad(sec({ energia: 100, tension: 100 })) !== 100 || intensidad(sec({ energia: 0, tension: 0 })) !== 0) falla("intensidad debe ir de 0 a 100");
if (intensidad(sec({ energia: 100, tension: 10 })) !== 69) falla("intensidad de la Cima debe ser 69");
if (intensidad(sec({ energia: 15, tension: 95 })) !== 43) falla("intensidad del Final debe ser 43 (la tensión lo sostiene)");
if (intensidad(sec({ energia: 40, tension: 40, animo: 0 })) !== intensidad(sec({ energia: 40, tension: 40, animo: 100 }))) falla("el ánimo no debe cambiar la intensidad");

// Peso: 30 sub + 30 graves + 25 medios + 15 altos.
if (peso(sec({ sub: 100, graves: 100, medios: 100, altos: 100 })) !== 100 || peso(sec({ sub: 0, graves: 0, medios: 0, altos: 0 })) !== 0) falla("peso debe ir de 0 a 100");
if (peso(sec({ sub: 100, graves: 100, medios: 0, altos: 0 })) !== 60) falla("sub y graves deben pesar 60 en total");
if (peso(sec({ sub: 0, graves: 0, medios: 0, altos: 100 })) !== 15) falla("los altos deben pesar 15");

// Promedio por canción: ponderado por compases; moverlo lleva el promedio al objetivo sin salirse de 0-100 y conservando el orden de las secciones.
const cancion: Pieza = { ...nuevaPieza("C"), secciones: [sec({ compases: 8, energia: 10 }), sec({ compases: 16, energia: 40 }), sec({ compases: 8, energia: 90 })] };
if (promedioDe(cancion, "energia") !== 45) falla("promedioDe debe ponderar por compases: (10×8 + 40×16 + 90×8) / 32 = 45");
for (const campo of CAMPOS) {
  for (const objetivo of [0, 10, 25, 45, 60, 80, 100]) {
    const n = moverPromedio(cancion, campo, objetivo);
    const prom = promedioDe(n, campo);
    if (Math.abs(prom - objetivo) > 2) falla(`moverPromedio(${campo}, ${objetivo}) dejó el promedio en ${prom}`);
    if (n.secciones.some((x) => x[campo] < 0 || x[campo] > 100)) falla(`moverPromedio(${campo}, ${objetivo}) se salió de 0-100`);
  }
}
const sube = moverPromedio(cancion, "energia", 80).secciones.map((x) => x.energia);
const baja = moverPromedio(cancion, "energia", 20).secciones.map((x) => x.energia);
if (!(sube[0] < sube[1] && sube[1] < sube[2]) || !(baja[0] < baja[1] && baja[1] < baja[2])) falla("moverPromedio debe conservar el orden de las secciones (su forma)");
if (sube.some((v, i) => v < cancion.secciones[i].energia) || baja.some((v, i) => v > cancion.secciones[i].energia)) falla("subir el promedio no debe bajar secciones, ni bajarlo subirlas");
if (moverPromedio(cancion, "energia", 45) !== cancion) falla("sin cambio de promedio no debe tocar la canción");
if (moverPromedio(cancion, "sub", 80).secciones.some((x, i) => x.energia !== cancion.secciones[i].energia)) falla("moverPromedio solo debe tocar el indicador pedido");
if (promedioIntensidad(cancion) !== Math.round((intensidad(cancion.secciones[0]) * 8 + intensidad(cancion.secciones[1]) * 16 + intensidad(cancion.secciones[2]) * 8) / 32)) falla("promedioIntensidad debe ponderar por compases");
if (promedioPeso({ ...cancion, secciones: [sec({ sub: 100, graves: 100, medios: 100, altos: 100 })] }) !== 100) falla("promedioPeso de todo al máximo debe ser 100");

// Referencia de la canción: el nivel elegido en la vista del EP; por defecto, su promedio.
const conRef: Pieza = { ...cancion, secciones: [sec({ compases: 8, energia: 10 }), sec({ compases: 8, energia: 30 })] };
if (referenciaDe(conRef).energia !== 20 || Object.keys(referenciaDe(conRef)).length !== 7) falla("referenciaDe debe dar el promedio de cada uno de los siete indicadores");
const refNorm = normalizarProyecto({ nombre: "x", piezas: [{ id: crypto.randomUUID(), referencia: { energia: 500, sub: 33, animo: "x" }, secciones: [{ id: crypto.randomUUID(), energia: 10, sub: 90, compases: 8 }] }] }).piezas[0].referencia;
if (refNorm.energia !== 100 || refNorm.sub !== 33) falla("normalizarProyecto debe recortar la referencia y conservarla");
if (refNorm.animo !== 50 || refNorm.altos !== 50) falla("sin referencia guardada, normalizarProyecto parte del promedio de la canción (aquí 50 por defecto)");

// Escalas: cada medidor dice qué es 0, qué es 100 y tiene cinco palabras distintas en el camino.
[...NUCLEO, ...CUERPO].forEach((m) => {
  if (!m.escala.cero || !m.escala.cien || new Set(m.escala.pasos).size !== 5) falla(`${m.nombre}: la escala debe tener 0, 100 y cinco palabras distintas`);
  if (palabraDe(m.escala, 0) !== m.escala.pasos[0] || palabraDe(m.escala, 100) !== m.escala.pasos[4] || palabraDe(m.escala, 20) !== m.escala.pasos[0] || palabraDe(m.escala, 21) !== m.escala.pasos[1] || palabraDe(m.escala, 50) !== m.escala.pasos[2]) falla(`${m.nombre}: palabraDe debe repartir 0-20, 21-40, 41-60, 61-80, 81-100`);
});

// Color del ánimo: distinto en los extremos, sin caer en verdes (hue entre 120 y 200 con croma notable).
const hueDe = (c: string) => Number(c.split(" ")[2]);
const croma = (c: string) => Number(c.split(" ")[1]);
if (colorAnimo(0) === colorAnimo(100)) falla("colorAnimo debe distinguir los extremos");
for (let v = 0; v <= 100; v += 5) {
  const c = colorAnimo(v);
  if (!c.startsWith("oklch(")) falla(`colorAnimo(${v}) inválido`);
  if (croma(c) > 0.06 && hueDe(c) > 120 && hueDe(c) < 200) falla(`colorAnimo(${v}) cae en verdes: ${c}`);
}

// Tramos: ancho proporcional a los compases.
const a: Pieza = { ...nuevaPieza("A"), secciones: [sec({ compases: 8, energia: 20 }), sec({ compases: 24, energia: 80 })] };
const b: Pieza = { ...nuevaPieza("B"), secciones: [sec({ compases: 16, energia: 60, tension: 40 })] };
const t = tramosDe([a, b]);
if (t.length !== 3) falla("tramosDe debe dar una entrada por sección");
if (Math.abs(t[0].x1 - 8 / 48) > 1e-9 || Math.abs(t[2].x1 - 1) > 1e-9) falla("tramosDe debe repartir el ancho por compases");
if (t[2].intensidad !== intensidad(b.secciones[0])) falla("tramosDe debe traer la intensidad calculada");
if (tramosDe([a, b], 1).length !== 1 || tramosDe([a, b], 1)[0].x0 !== 0) falla("tramosDe de una sola pieza debe ocupar todo el ancho");

// Duración.
if (duracionSeg(16, 70) !== 55 || duracionSeg(8, null) !== null) falla("duracionSeg: 16 compases a 70 BPM son 55 s");
if (formatoMSS(137) !== "2:17" || formatoMSS(5) !== "0:05") falla("formatoMSS");

// Curvas.
if (!curvaSuave([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }]).startsWith("M0.0,0.0 C")) falla("curvaSuave debe empezar con M y curvas");
const capa = capaEntre([{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 0, y: 5 }, { x: 1, y: 6 }]);
if (!capa.includes(" L1.0,6.0 C") || !capa.endsWith("Z")) falla("capaEntre debe bajar por la curva de abajo y cerrar");

// Validación.
const ok = normalizarProyecto({
  nombre: " X ",
  tipo: "album",
  historia: "h",
  piezas: [{ id: crypto.randomUUID(), titulo: "T", secciones: [{ id: crypto.randomUUID(), nombre: "S", compases: 0, energia: -5, sub: 300, altos: "x" }] }],
});
const s0 = ok.piezas[0].secciones[0];
if (ok.nombre !== "X" || ok.tipo !== "album") falla("normalizarProyecto: nombre/tipo");
if (s0.nombre !== "S" || s0.parte !== "") falla("normalizarProyecto: la escena es el nombre y la parte es un campo aparte (vacía si falta)");
if (normalizarProyecto({ nombre: "x", piezas: [{ id: crypto.randomUUID(), secciones: [{ id: crypto.randomUUID(), nombre: "Niebla", parte: " Intro " }] }] }).piezas[0].secciones[0].parte !== "Intro") falla("normalizarProyecto debe conservar la parte");
if (s0.compases !== 1 || s0.energia !== 0 || s0.sub !== 100 || s0.altos !== 50 || s0.animo !== 50) falla("normalizarProyecto debe recortar rangos y dar 50 a lo que falta");
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
console.log("Mapa del EP: cálculos, geometría y validación OK");
