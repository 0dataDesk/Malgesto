// Mapa del EP: modelo y geometría puros (sin DB), usados por el servidor y por el cliente.
//
// Cada sección guarda siete valores 0-100 que Jorge mueve:
//   Núcleo  → Energía, Ánimo, Tensión
//   Cuerpo  → Altos, Medios, Graves, Sub
// Las dos líneas de la gráfica se calculan solas de esos valores:
//   Intensidad (núcleo) = 65 % Energía + 35 % Tensión; el Ánimo no sube ni baja la línea, la tiñe (oscuro → luminoso).
//   Peso (cuerpo)       = 30 % Sub + 30 % Graves + 25 % Medios + 15 % Altos (lo grave pesa más).
// Respaldo: modelo de activación y valencia (Russell, Thayer) para el núcleo; práctica de mezcla para el cuerpo.
// Los porcentajes son decisión de diseño y se pueden ajustar aquí.
// El tamaño de cada sección son sus compases: el ancho en la gráfica es proporcional y la duración sale del BPM (4/4).

export type CampoNucleo = "energia" | "animo" | "tension";
export type CampoCuerpo = "altos" | "medios" | "graves" | "sub";
export type CampoValor = CampoNucleo | CampoCuerpo;

export const CAMPOS: CampoValor[] = ["energia", "animo", "tension", "altos", "medios", "graves", "sub"];

export const PESO_INTENSIDAD = { energia: 0.65, tension: 0.35 } as const;
// De arriba a abajo, como se ven y se sienten las frecuencias.
export const PESO_CUERPO: Record<CampoCuerpo, number> = { altos: 0.15, medios: 0.25, graves: 0.3, sub: 0.3 };

// Cada medidor dice qué significa el 0, qué significa el 100 y cómo se llama cada quinto del camino (0-20, 21-40, 41-60, 61-80, 81-100).
export type Escala = { cero: string; cien: string; pasos: [string, string, string, string, string] };

export const NUCLEO: { campo: CampoNucleo; nombre: string; ayuda: string; escala: Escala }[] = [
  { campo: "energia", nombre: "Energía", ayuda: "Qué tanta fuerza y actividad hay. Sube la línea de Intensidad.", escala: { cero: "calma total", cien: "éxtasis", pasos: ["calma", "suave", "en marcha", "intensa", "éxtasis"] } },
  { campo: "animo", nombre: "Ánimo", ayuda: "Cómo se siente. No sube la línea: la tiñe de azul oscuro a ámbar.", escala: { cero: "oscuro", cien: "luminoso", pasos: ["oscuro", "sombrío", "neutro", "cálido", "luminoso"] } },
  { campo: "tension", nombre: "Tensión", ayuda: "Qué tan sin resolver está. Sube la línea y le da textura rayada.", escala: { cero: "resuelto", cien: "en suspenso", pasos: ["resuelto", "asentado", "inquieto", "tenso", "en suspenso"] } },
];

export const CUERPO: { campo: CampoCuerpo; nombre: string; ayuda: string; hz: string; escala: Escala }[] = [
  { campo: "altos", nombre: "Altos", ayuda: "Arriba de 2 kHz: hi-hats, flauta, metales brillantes, aire.", hz: "2 kHz en adelante", escala: { cero: "sin brillo", cien: "aire total", pasos: ["apagado", "oscuro", "presente", "brillante", "aire total"] } },
  { campo: "medios", nombre: "Medios", ayuda: "250 Hz a 2 kHz: skank, órgano, caja, la armonía.", hz: "250 Hz-2 kHz", escala: { cero: "hueco", cien: "muy lleno", pasos: ["hueco", "escaso", "presente", "lleno", "muy lleno"] } },
  { campo: "graves", nombre: "Graves", ayuda: "60 a 250 Hz: el bajo y el bombo, el cuerpo de la canción.", hz: "60-250 Hz", escala: { cero: "sin graves", cien: "potentes", pasos: ["sin cuerpo", "ligeros", "firmes", "profundos", "potentes"] } },
  { campo: "sub", nombre: "Sub", ayuda: "30 a 60 Hz: lo que se siente en el pecho (tuba, sub).", hz: "30-60 Hz", escala: { cero: "sin sub", cien: "el piso vibra", pasos: ["sin sub", "apenas", "se nota", "en el pecho", "el piso vibra"] } },
];

// Palabra que describe un valor dentro de su escala (0-20, 21-40, 41-60, 61-80, 81-100).
export const palabraDe = (escala: Escala, valor: number) => escala.pasos[Math.min(4, Math.max(0, Math.ceil(valor / 20) - 1))];

export type Seccion = {
  id: string;
  // Parte de la canción (Intro, Verso, Dub, Coro, Puente…). Lo que debe hacer sentir va en `transmite` (la intención).
  nombre: string;
  compases: number;
  energia: number;
  animo: number;
  tension: number;
  altos: number;
  medios: number;
  graves: number;
  sub: number;
  armonia: string;
  transmite: string;
};

export type Pieza = {
  id: string;
  titulo: string;
  tonalidad: string;
  bpm: number | null;
  idea: string;
  secciones: Seccion[];
};

export type Proyecto = {
  id: string;
  bandaId: string;
  nombre: string;
  tipo: "ep" | "album";
  historia: string;
  // Marca de la última vez que se guardó (updated_at): impide que una pantalla vieja pise lo nuevo.
  version: string;
  piezas: Pieza[];
};

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const intensidad = (s: Pick<Seccion, "energia" | "tension">) => clamp(Math.round(PESO_INTENSIDAD.energia * s.energia + PESO_INTENSIDAD.tension * s.tension), 0, 100);

export const contribuciones = (s: Pick<Seccion, CampoCuerpo>): Record<CampoCuerpo, number> => ({
  altos: PESO_CUERPO.altos * s.altos,
  medios: PESO_CUERPO.medios * s.medios,
  graves: PESO_CUERPO.graves * s.graves,
  sub: PESO_CUERPO.sub * s.sub,
});

export const peso = (s: Pick<Seccion, CampoCuerpo>) => {
  const c = contribuciones(s);
  return clamp(Math.round(c.altos + c.medios + c.graves + c.sub), 0, 100);
};

// Promedio general de una canción: lo que se espera de ella en cada indicador. Sale de sus secciones (ponderado por compases)
// y se puede mover desde la vista del EP completo: todas sus secciones suben o bajan juntas y conservan su forma.
export const promedioDe = (pieza: Pieza, campo: CampoValor): number => {
  const total = pieza.secciones.reduce((a, s) => a + Math.max(1, s.compases), 0);
  if (total === 0) return 0;
  return Math.round(pieza.secciones.reduce((a, s) => a + s[campo] * Math.max(1, s.compases), 0) / total);
};

// Mueve el promedio de una canción en un indicador hasta `objetivo` sin salirse de 0-100 y sin aplanar la forma:
// subir acerca cada sección a 100 en la misma proporción; bajar la acerca a 0.
export function moverPromedio(pieza: Pieza, campo: CampoValor, objetivo: number): Pieza {
  const meta = clamp(Math.round(objetivo), 0, 100);
  const actual = promedioDe(pieza, campo);
  if (meta === actual) return pieza;
  const f = meta > actual ? (meta - actual) / (100 - actual) : (actual - meta) / actual;
  const secciones = pieza.secciones.map((s) => {
    const v = s[campo];
    const nuevo = meta > actual ? v + (100 - v) * f : v - v * f;
    return { ...s, [campo]: clamp(Math.round(nuevo), 0, 100) };
  });
  return { ...pieza, secciones };
}

// Promedio (ponderado por compases) de las dos líneas calculadas de una canción.
export const promedioIntensidad = (pieza: Pieza) => {
  const total = pieza.secciones.reduce((a, s) => a + Math.max(1, s.compases), 0);
  return total === 0 ? 0 : Math.round(pieza.secciones.reduce((a, s) => a + intensidad(s) * Math.max(1, s.compases), 0) / total);
};
export const promedioPeso = (pieza: Pieza) => {
  const total = pieza.secciones.reduce((a, s) => a + Math.max(1, s.compases), 0);
  return total === 0 ? 0 : Math.round(pieza.secciones.reduce((a, s) => a + peso(s) * Math.max(1, s.compases), 0) / total);
};

// Duración en segundos de N compases en 4/4 a un BPM (null si no hay BPM).
export const duracionSeg = (compases: number, bpm: number | null) => (bpm && bpm > 0 ? Math.round((compases * 4 * 60) / bpm) : null);
export const formatoMSS = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;

// Color del Ánimo: azul oscuro (0) → neutro (40-60) → ámbar (100). Se mezcla en el espacio a/b de OKLCH para no pasar por verdes.
const RAMPA_ANIMO: { v: number; L: number; C: number; h: number }[] = [
  { v: 0, L: 0.3, C: 0.1, h: 268 },
  { v: 40, L: 0.55, C: 0.04, h: 262 },
  { v: 60, L: 0.66, C: 0.04, h: 90 },
  { v: 100, L: 0.8, C: 0.16, h: 78 },
];
const rad = (g: number) => (g * Math.PI) / 180;

export function colorAnimo(valor: number, alfa = 1): string {
  const v = clamp(valor, 0, 100);
  let i = 0;
  while (i < RAMPA_ANIMO.length - 2 && v > RAMPA_ANIMO[i + 1].v) i++;
  const a = RAMPA_ANIMO[i];
  const b = RAMPA_ANIMO[i + 1];
  const t = (v - a.v) / (b.v - a.v);
  const ax = a.C * Math.cos(rad(a.h));
  const ay = a.C * Math.sin(rad(a.h));
  const bx = b.C * Math.cos(rad(b.h));
  const by = b.C * Math.sin(rad(b.h));
  const x = ax + (bx - ax) * t;
  const y = ay + (by - ay) * t;
  const L = a.L + (b.L - a.L) * t;
  const C = Math.hypot(x, y);
  const h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)}${alfa < 1 ? ` / ${alfa}` : ""})`;
}

export type Tramo = {
  pieza: number;
  seccion: number;
  x0: number; // 0..1 dentro del proyecto (o de la pieza en vista de una sola canción)
  x1: number;
  xc: number;
  intensidad: number;
  peso: number;
  animo: number;
  tension: number;
  contrib: Record<CampoCuerpo, number>;
};

// Reparte el ancho según los compases de cada sección. Con `soloPieza` solo se dibuja esa pieza.
export function tramosDe(piezas: Pieza[], soloPieza: number | null = null): Tramo[] {
  const lista: { p: number; s: number; compases: number }[] = [];
  piezas.forEach((pz, p) => {
    if (soloPieza !== null && p !== soloPieza) return;
    pz.secciones.forEach((sc, s) => lista.push({ p, s, compases: Math.max(1, sc.compases) }));
  });
  const total = lista.reduce((a, t) => a + t.compases, 0);
  if (total === 0) return [];
  let acc = 0;
  return lista.map(({ p, s, compases }) => {
    const sc = piezas[p].secciones[s];
    const x0 = acc / total;
    acc += compases;
    const x1 = acc / total;
    return { pieza: p, seccion: s, x0, x1, xc: (x0 + x1) / 2, intensidad: intensidad(sc), peso: peso(sc), animo: sc.animo, tension: sc.tension, contrib: contribuciones(sc) };
  });
}

export type Punto = { x: number; y: number };

// Curva siempre suave: entre cada par de puntos va una S (Bézier con tangente horizontal en cada punto).
// Nunca hay tramos rectos entre valores distintos, ni esquinas, ni se pasa de los valores de los puntos.
export function curvaSuave(puntos: Punto[]): string {
  if (puntos.length === 0) return "";
  const f = (n: number) => n.toFixed(1);
  if (puntos.length === 1) return `M${f(puntos[0].x)},${f(puntos[0].y)}`;
  let d = `M${f(puntos[0].x)},${f(puntos[0].y)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const mx = (a.x + b.x) / 2;
    d += ` C${f(mx)},${f(a.y)} ${f(mx)},${f(b.y)} ${f(b.x)},${f(b.y)}`;
  }
  return d;
}

// Capa entre dos curvas (la de arriba y la de abajo, ambas de izquierda a derecha), para el área apilada del cuerpo.
export function capaEntre(arriba: Punto[], abajo: Punto[]): string {
  if (arriba.length === 0 || abajo.length === 0) return "";
  const ida = curvaSuave(arriba);
  const vuelta = curvaSuave([...abajo].reverse()).replace(/^M/, "L");
  return `${ida} ${vuelta} Z`;
}

export function nuevaSeccion(nombre = "Verso"): Seccion {
  return { id: crypto.randomUUID(), nombre, compases: 8, energia: 50, animo: 50, tension: 50, altos: 50, medios: 50, graves: 50, sub: 50, armonia: "", transmite: "" };
}

export function nuevaPieza(titulo = "Nueva canción"): Pieza {
  return { id: crypto.randomUUID(), titulo, tonalidad: "", bpm: null, idea: "", secciones: [nuevaSeccion("Intro")] };
}

export function totalCompases(p: Pieza): number {
  return p.secciones.reduce((a, s) => a + s.compases, 0);
}

// Valida y normaliza un proyecto que llega del cliente (el servidor nunca confía en lo que recibe).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const ent = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), min, max) : def);

export function normalizarProyecto(entrada: unknown): Omit<Proyecto, "id" | "bandaId" | "version"> {
  const e = entrada as Record<string, unknown> | null;
  if (!e || typeof e !== "object") throw new Error("Proyecto inválido.");
  const piezasIn = Array.isArray(e.piezas) ? e.piezas : [];
  if (piezasIn.length > 12) throw new Error("Demasiadas canciones (máx. 12).");
  const idsVistos = new Set<string>();
  const unico = (id: unknown) => {
    if (typeof id !== "string" || !UUID.test(id) || idsVistos.has(id)) throw new Error("Identificador inválido.");
    idsVistos.add(id);
    return id;
  };
  const piezas: Pieza[] = piezasIn.map((raw) => {
    const p = raw as Record<string, unknown>;
    const secIn = Array.isArray(p.secciones) ? p.secciones : [];
    if (secIn.length > 40) throw new Error("Demasiadas secciones en una canción (máx. 40).");
    return {
      id: unico(p.id),
      titulo: txt(p.titulo, 120).trim() || "Sin título",
      tonalidad: txt(p.tonalidad, 40),
      bpm: p.bpm === null || p.bpm === undefined ? null : ent(p.bpm, 20, 300, 70),
      idea: txt(p.idea, 1000),
      secciones: secIn.map((rs) => {
        const s = rs as Record<string, unknown>;
        return {
          id: unico(s.id),
          nombre: txt(s.nombre, 120).trim() || "Sección",
          compases: ent(s.compases, 1, 512, 8),
          energia: ent(s.energia, 0, 100, 50),
          animo: ent(s.animo, 0, 100, 50),
          tension: ent(s.tension, 0, 100, 50),
          altos: ent(s.altos, 0, 100, 50),
          medios: ent(s.medios, 0, 100, 50),
          graves: ent(s.graves, 0, 100, 50),
          sub: ent(s.sub, 0, 100, 50),
          armonia: txt(s.armonia, 1000),
          transmite: txt(s.transmite, 1000),
        };
      }),
    };
  });
  return {
    nombre: txt(e.nombre, 120).trim() || "Sin nombre",
    tipo: e.tipo === "album" ? "album" : "ep",
    historia: txt(e.historia, 4000),
    piezas,
  };
}
