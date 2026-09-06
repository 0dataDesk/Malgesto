// Posición temporal de secciones y compases (Brief "Fase 3: nueva vista de
// Canción", Fase 1 §3). Sin timestamps manuales: todo se calcula desde el
// BPM + los compases + el orden de las secciones. La app no captura compás
// (time signature), así que se asume 4/4 en todo el repertorio (cumbia /
// rock) — 4 tiempos por compás.
//
// Sin "server-only": lo usa tanto la data layer (posición para guardar en
// caché de lectura) como la vista horizontal (cliente) para el control de
// reproducción discreto.

const TIEMPOS_POR_COMPAS = 4;

// Compases efectivos de una sección: el número explícito si lo tiene, si no
// la suma de la duración de sus acordes (comportamiento previo a Fase 3).
// Vive acá (módulo puro, sin "server-only") porque lo necesitan tanto la
// data layer como las vistas cliente.
export function compasesDeSeccion(s: {
  numeroCompases: number | null;
  acordes: { duracionCompases: number }[];
}): number {
  if (s.numeroCompases !== null && s.numeroCompases > 0) return s.numeroCompases;
  return s.acordes.reduce((total, a) => total + Number(a.duracionCompases), 0);
}

export function segundosPorCompas(bpm: number): number {
  if (!bpm || bpm <= 0) return 0;
  return (TIEMPOS_POR_COMPAS * 60) / bpm;
}

// Una "vuelta" concreta de una sección ya expandida: qué sección es, en qué
// número de repetición va, cuántos compases dura esa vuelta y con qué BPM
// efectivo (el de la sección si tiene, si no el de la canción).
export type VueltaExpandida = {
  seccionId: string;
  nombre: string;
  indiceRepeticion: number; // 1-based
  totalRepeticiones: number;
  compases: number;
  bpmEfectivo: number;
  esRepeticionDesprendida: boolean;
};

export type VueltaConTiempo = VueltaExpandida & {
  inicioSegundos: number;
  duracionSegundos: number;
};

// Recorre las vueltas en orden y les asigna inicio/duración acumulados.
export function calcularTiempos(vueltas: VueltaExpandida[]): VueltaConTiempo[] {
  let acumulado = 0;
  return vueltas.map((v) => {
    const duracionSegundos = v.compases * segundosPorCompas(v.bpmEfectivo);
    const conTiempo: VueltaConTiempo = { ...v, inicioSegundos: acumulado, duracionSegundos };
    acumulado += duracionSegundos;
    return conTiempo;
  });
}

export function duracionTotalSegundos(vueltas: VueltaConTiempo[]): number {
  if (vueltas.length === 0) return 0;
  const ultima = vueltas[vueltas.length - 1];
  return ultima.inicioSegundos + ultima.duracionSegundos;
}
