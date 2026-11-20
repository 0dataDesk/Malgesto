// Revisa la geometría, los cálculos y la validación del Mapa del EP. Corre con npm run check (antes de cada build).
import { CAMPOS, CUERPO, NIVELES_INICIALES, NUCLEO, PESO_CUERPO, PESO_INTENSIDAD, conNivel, techoIntensidad, techoPeso, capaEntre, clamp, colorAnimo, curvaSuave, duracionSeg, formatoMSS, intensidad, nuevaPieza, normalizarProyecto, palabraDe, peso, tramosDe, type Pieza, type Seccion } from "../lib/epModelo";

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

// Niveles por canción: el 100 % de las escenas. El valor efectivo es nivel × porcentaje / 100 (un zoom del nivel fijado).
const n10: typeof NIVELES_INICIALES = { ...NIVELES_INICIALES, energia: 10, tension: 78 };
if (conNivel(100, 10) !== 10 || conNivel(50, 10) !== 5 || conNivel(80, 100) !== 80 || conNivel(0, 78) !== 0) falla("conNivel debe dar el porcentaje del nivel");
if (intensidad(sec({ energia: 100, tension: 100 }), n10) !== techoIntensidad(n10) || techoIntensidad(n10) !== 34) falla("el techo de la intensidad con energía 10 y tensión 78 debe ser 0.65×10 + 0.35×78 = 34");
if (peso(sec({ sub: 100, graves: 100, medios: 100, altos: 100 }), { ...NIVELES_INICIALES, sub: 50, altos: 20 }) !== techoPeso({ ...NIVELES_INICIALES, sub: 50, altos: 20 }) || techoPeso({ ...NIVELES_INICIALES, sub: 50, altos: 20 }) !== 73) falla("el techo del peso debe ser 15×0.2 + 25 + 30 + 30×0.5 = 73");
if (techoIntensidad(NIVELES_INICIALES) !== 100 || techoPeso(NIVELES_INICIALES) !== 100) falla("sin niveles fijados (100) el techo es 100");
// Ninguna escena pasa del techo de su canción, y mover el nivel de la canción conserva exacta la forma de sus escenas.
const forma = [10, 40, 90, 60];
const sube = forma.map((v) => conNivel(v, 80));
const baja = forma.map((v) => conNivel(v, 20));
if (sube.some((v, i) => v > 80 || (i > 0 && (v > sube[i - 1]) !== (forma[i] > forma[i - 1])))) falla("con nivel 80 ninguna escena pasa de 80 y se conserva el orden");
if (!(baja[0] <= baja[1] && baja[1] <= baja[2] && baja[2] >= baja[3])) falla("con nivel 20 se conserva la forma de las escenas");
const cancion: Pieza = { ...nuevaPieza("C"), niveles: { ...NIVELES_INICIALES, energia: 10 }, secciones: [sec({ compases: 8, energia: 30 }), sec({ compases: 8, energia: 100 })] };
const tn = tramosDe([cancion]);
if (tn[1].intensidad !== intensidad(cancion.secciones[1], cancion.niveles) || tn[1].intensidad > techoIntensidad(cancion.niveles)) falla("tramosDe debe usar los niveles de cada canción y no pasar su techo");
if (tramosDe([{ ...cancion, secciones: [sec({ animo: 100 })], niveles: { ...NIVELES_INICIALES, animo: 60 } }])[0].animo !== 60) falla("tramosDe debe dar el ánimo efectivo con el nivel de la canción");

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
if (Object.values(ok.piezas[0].niveles).some((v) => v !== 100)) falla("normalizarProyecto debe dar nivel 100 a lo que falta");
if (normalizarProyecto({ nombre: "x", piezas: [{ id: crypto.randomUUID(), niveles: { sub: 40, energia: 500, animo: "x" }, secciones: [] }] }).piezas[0].niveles.sub !== 40 || normalizarProyecto({ nombre: "x", piezas: [{ id: crypto.randomUUID(), niveles: { energia: 500 }, secciones: [] }] }).piezas[0].niveles.energia !== 100) falla("normalizarProyecto debe recortar los niveles");
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
