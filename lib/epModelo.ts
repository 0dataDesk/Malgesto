// Mapa del EP: modelo y geometría puros (sin DB), usados por el servidor y por el cliente.
// Un proyecto (EP o álbum) tiene piezas (canciones planeadas) y cada pieza tiene secciones.
// La emoción de una sección es su `nivel` (0-100) más el `ajuste` de su pieza, recortada a 0-100.

export type Etapa = "desconocido" | "descubrimiento" | "tension" | "jubilo" | "suspenso";

export const ETAPAS: { id: Etapa; nombre: string; color: string; fondo: string }[] = [
  { id: "desconocido", nombre: "Lo desconocido", color: "oklch(0.42 0.06 262)", fondo: "oklch(0.90 0.025 262)" },
  { id: "descubrimiento", nombre: "Descubrimiento", color: "oklch(0.52 0.09 200)", fondo: "oklch(0.91 0.035 200)" },
  { id: "tension", nombre: "Tensión", color: "oklch(0.55 0.13 60)", fondo: "oklch(0.92 0.045 80)" },
  { id: "jubilo", nombre: "Júbilo", color: "oklch(0.60 0.17 28)", fondo: "oklch(0.92 0.050 35)" },
  { id: "suspenso", nombre: "Suspenso", color: "oklch(0.45 0.12 310)", fondo: "oklch(0.90 0.035 310)" },
];

export const etapaDe = (id: string) => ETAPAS.find((e) => e.id === id) ?? ETAPAS[1];

// Instrumentos del proyecto agrupados por banda de frecuencia (las frecuencias mandan en la estructura).
export const BANDAS_FRECUENCIA: { nombre: string; instrumentos: string[] }[] = [
  { nombre: "Sub", instrumentos: ["Tuba", "Sub"] },
  { nombre: "Graves", instrumentos: ["Bajo", "Bombo"] },
  { nombre: "Medios", instrumentos: ["Skank", "Órgano", "Rim/Caja", "Percusión"] },
  { nombre: "Altos", instrumentos: ["Melódica", "Flauta", "Metales", "Hi-hats", "Sirena"] },
];
export const INSTRUMENTOS: string[] = BANDAS_FRECUENCIA.flatMap((b) => b.instrumentos);

// Las frecuencias van de arriba (altos) a abajo (sub), como se ven y se sienten.
// Valores que Jorge mueve (0-100) en cada sección. La emoción (`nivel`) es la curva principal;
// los demás se dibujan como filas debajo de la curva. Cosmo los lee para armar tempo, tono, estructura y MIDI.
export type CampoValor = "nivel" | "sub" | "graves" | "medios" | "altos" | "tension" | "espacio" | "densidad" | "ritmo";

export const INDICADOR_EMOCION = { campo: "nivel" as CampoValor, nombre: "Emoción", ayuda: "Qué tan intensa se siente la sección: 0 calma total, 100 éxtasis." };

export const INDICADORES: { campo: CampoValor; nombre: string; ayuda: string; grupo: "Frecuencias" | "Carácter" }[] = [
  { campo: "altos", nombre: "Altos", ayuda: "Altos (arriba de 2 kHz): hi-hats, flauta, metales brillantes, aire.", grupo: "Frecuencias" },
  { campo: "medios", nombre: "Medios", ayuda: "Medios (250 Hz-2 kHz): skank, órgano, caja, la armonía.", grupo: "Frecuencias" },
  { campo: "graves", nombre: "Graves", ayuda: "Graves (60-250 Hz): el bajo y el bombo, el cuerpo de la canción.", grupo: "Frecuencias" },
  { campo: "sub", nombre: "Sub", ayuda: "Frecuencias más graves (30-60 Hz): lo que se siente en el pecho (tuba, sub).", grupo: "Frecuencias" },
  { campo: "tension", nombre: "Tensión", ayuda: "0 resuelto y estable, 100 sin resolver: algo está por pasar.", grupo: "Carácter" },
  { campo: "espacio", nombre: "Espacio", ayuda: "0 seco y cercano, 100 mucho eco y aire (el dub).", grupo: "Carácter" },
  { campo: "densidad", nombre: "Densidad", ayuda: "0 casi no suena nada, 100 suena todo a la vez.", grupo: "Carácter" },
  { campo: "ritmo", nombre: "Ritmo", ayuda: "0 pulso mínimo y quieto, 100 muy movido y bailable.", grupo: "Carácter" },
];

export type Seccion = {
  id: string;
  // Forma musical (Intro, Verso, Dub, Coro, Puente...). Lo que se siente va en `transmite` (la intención).
  nombre: string;
  compases: number;
  nivel: number;
  sub: number;
  graves: number;
  medios: number;
  altos: number;
  tension: number;
  espacio: number;
  densidad: number;
  ritmo: number;
  etapa: Etapa;
  instrumentos: string[];
  armonia: string;
  transmite: string;
};

export type Pieza = {
  id: string;
  titulo: string;
  ajuste: number;
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
  piezas: Pieza[];
};

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const nivelEfectivo = (nivel: number, ajuste: number) => clamp(Math.round(nivel + ajuste), 0, 100);

export type Tramo = {
  pieza: number;
  seccion: number;
  x0: number; // 0..1 dentro del proyecto (o de la pieza en vista de una sola canción)
  x1: number;
  xc: number;
  nivel: number; // efectivo
  graves: number;
  etapa: Etapa;
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
    return {
      pieza: p,
      seccion: s,
      x0,
      x1,
      xc: (x0 + x1) / 2,
      nivel: nivelEfectivo(sc.nivel, piezas[p].ajuste),
      graves: sc.graves,
      etapa: sc.etapa,
    };
  });
}

export type Punto = { x: number; y: number };

// Curva suave (Catmull-Rom convertida a Bézier) que pasa por todos los puntos.
export function curvaSuave(puntos: Punto[]): string {
  if (puntos.length === 0) return "";
  if (puntos.length === 1) return `M${puntos[0].x.toFixed(1)},${puntos[0].y.toFixed(1)}`;
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(puntos[0].x)},${f(puntos[0].y)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
}

export function nuevaSeccion(nombre = "Nueva sección"): Seccion {
  return { id: crypto.randomUUID(), nombre, compases: 8, nivel: 50, sub: 50, graves: 50, medios: 50, altos: 50, tension: 50, espacio: 50, densidad: 50, ritmo: 50, etapa: "descubrimiento", instrumentos: [], armonia: "", transmite: "" };
}

export function nuevaPieza(titulo = "Nueva canción"): Pieza {
  return { id: crypto.randomUUID(), titulo, ajuste: 0, tonalidad: "", bpm: null, idea: "", secciones: [nuevaSeccion("Inicio")] };
}

export function totalCompases(p: Pieza): number {
  return p.secciones.reduce((a, s) => a + s.compases, 0);
}

// Valida y normaliza un proyecto que llega del cliente (el servidor nunca confía en lo que recibe).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETAPAS_VALIDAS = new Set<string>(ETAPAS.map((e) => e.id));
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const ent = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), min, max) : def);

export function normalizarProyecto(entrada: unknown): Omit<Proyecto, "id" | "bandaId"> {
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
      ajuste: ent(p.ajuste, -50, 50, 0),
      tonalidad: txt(p.tonalidad, 40),
      bpm: p.bpm === null || p.bpm === undefined ? null : ent(p.bpm, 20, 300, 70),
      idea: txt(p.idea, 1000),
      secciones: secIn.map((rs) => {
        const s = rs as Record<string, unknown>;
        const instr = Array.isArray(s.instrumentos) ? s.instrumentos.filter((i): i is string => typeof i === "string").map((i) => i.slice(0, 40)).slice(0, 30) : [];
        return {
          id: unico(s.id),
          nombre: txt(s.nombre, 120).trim() || "Sección",
          compases: ent(s.compases, 1, 512, 8),
          nivel: ent(s.nivel, 0, 100, 50),
          sub: ent(s.sub, 0, 100, 50),
          graves: ent(s.graves, 0, 100, 50),
          medios: ent(s.medios, 0, 100, 50),
          altos: ent(s.altos, 0, 100, 50),
          tension: ent(s.tension, 0, 100, 50),
          espacio: ent(s.espacio, 0, 100, 50),
          densidad: ent(s.densidad, 0, 100, 50),
          ritmo: ent(s.ritmo, 0, 100, 50),
          etapa: (ETAPAS_VALIDAS.has(String(s.etapa)) ? s.etapa : "descubrimiento") as Etapa,
          instrumentos: instr,
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
