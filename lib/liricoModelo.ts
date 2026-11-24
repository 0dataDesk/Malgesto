// Lírico: aula de composición lírica. Modelo puro (sin base de datos): tipos, valores válidos y limpieza de entradas.
// Orden de los datos y tablas: supabase/migrations/20261124100000_lirico.sql.

export const ORIGENES = ["paginas", "ideas", "notion", "chat", "nueva"] as const;
export type Origen = (typeof ORIGENES)[number];
export const ETIQUETA_ORIGEN: Record<Origen, string> = { paginas: "Páginas", ideas: "Ideas", notion: "Notion", chat: "Conversación", nueva: "Nueva" };

export const ESTADOS_IDEA = ["semilla", "en_trabajo", "letra", "archivada"] as const;
export type EstadoIdea = (typeof ESTADOS_IDEA)[number];
export const ETIQUETA_ESTADO_IDEA: Record<EstadoIdea, string> = { semilla: "Semilla", en_trabajo: "En trabajo", letra: "Ya es letra", archivada: "Archivada" };

export const ESTADOS_LETRA = ["borrador", "en_revision", "terminada"] as const;
export type EstadoLetra = (typeof ESTADOS_LETRA)[number];
export const ETIQUETA_ESTADO_LETRA: Record<EstadoLetra, string> = { borrador: "Borrador", en_revision: "En revisión", terminada: "Terminada" };

export const ESTADOS_LECCION = ["propuesta", "en_curso", "dominada", "por_reforzar"] as const;
export type EstadoLeccion = (typeof ESTADOS_LECCION)[number];
export const ETIQUETA_ESTADO_LECCION: Record<EstadoLeccion, string> = { propuesta: "Propuesta", en_curso: "En curso", dominada: "Dominada", por_reforzar: "Por reforzar" };

export const RESULTADOS = ["pendiente", "hecho", "funciono", "no_funciono", "reforzar"] as const;
export type Resultado = (typeof RESULTADOS)[number];
export const ETIQUETA_RESULTADO: Record<Resultado, string> = { pendiente: "Pendiente", hecho: "Hecho", funciono: "Funcionó", no_funciono: "No funcionó", reforzar: "Reforzar" };

export const MAX = { titulo: 160, corto: 600, texto: 20000 } as const;

export type Tecnica = { clave: string; orden: number; nombre: string; resumen: string; cuerpo: string };
export type Ejercicio = { id: string; orden: number; consigna: string; respuesta: string; correccion: string; resultado: Resultado };
export type Leccion = { id: string; letraId: string | null; tecnica: string; objetivo: string; contenido: string; estado: EstadoLeccion; ejercicios: Ejercicio[] };
export type Version = { id: string; numero: number; texto: string; nota: string; autor: "jorge" | "cosmo"; creada: string };
export type Letra = { id: string; titulo: string; objetivo: string; premisa: string; angulo: string; planoLiteral: string; planoFigurado: string; estado: EstadoLetra; versiones: Version[] };
export type Conexion = { id: string; otraId: string; otraTitulo: string; motivo: string };
export type IdeaResumen = { id: string; titulo: string; origen: Origen; estado: EstadoIdea; actualizada: string };
export type Idea = IdeaResumen & { texto: string; origenRef: string; letras: Letra[]; lecciones: Leccion[]; conexiones: Conexion[] };

export function elegir<T extends string>(valor: unknown, validos: readonly T[], porDefecto: T): T {
  return typeof valor === "string" && (validos as readonly string[]).includes(valor) ? (valor as T) : porDefecto;
}

export function limpiar(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.replace(/\r\n/g, "\n").slice(0, max) : "";
}

export function titulo(valor: unknown): string {
  return limpiar(valor, MAX.titulo).trim();
}

// Una conexión se guarda con el par ordenado (idea_a < idea_b) para que no haya duplicados invertidos.
export function parOrdenado(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Qué técnicas se han visto: por técnica, cuántas lecciones hay y en qué estado está la más reciente.
export function resumenPorTecnica(lecciones: { tecnica: string; estado: EstadoLeccion }[]): Map<string, { total: number; dominadas: number; porReforzar: number }> {
  const m = new Map<string, { total: number; dominadas: number; porReforzar: number }>();
  for (const l of lecciones) {
    const r = m.get(l.tecnica) ?? { total: 0, dominadas: 0, porReforzar: 0 };
    r.total += 1;
    if (l.estado === "dominada") r.dominadas += 1;
    if (l.estado === "por_reforzar") r.porReforzar += 1;
    m.set(l.tecnica, r);
  }
  return m;
}
