// Expansión de una canción en "vueltas" concretas y cálculo de la posición
// temporal durante la reproducción del modo lista horizontal (diseño Fase 2,
// Vista de Cancion.dc.html). Módulo puro — lo usa el componente cliente.

import type { CancionCompleta, SeccionBase } from "@/lib/cancionesData";
import { compasesDeSeccion, segundosPorCompas } from "@/lib/cancionTiempo";
import type { Nota, Modo, Calidad } from "@/lib/cancionTeoria";

export type VueltaExpandida = {
  plantillaId: string;
  seccionId: string;
  nombre: string;
  indice: number; // 1-based dentro de la sección
  deVueltas: number;
  esVariante: boolean;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpmEfectivo: number;
  compases: number;
  acordes: SeccionBase["acordes"];
  letra: SeccionBase["letra"];
  inicioCompas: number;
  inicioSegundos: number;
  duracionSegundos: number;
};

export function expandirCancion(cancion: CancionCompleta): VueltaExpandida[] {
  const out: VueltaExpandida[] = [];
  let compas = 0;
  let segundos = 0;
  for (const s of cancion.secciones) {
    for (let indice = 1; indice <= s.repiteVeces; indice++) {
      const override = s.repeticiones.find((r) => r.repeticionIndice === indice);
      const cuerpo: SeccionBase = override ?? s;
      const bpmEfectivo = cuerpo.bpm ?? cancion.bpm ?? 0;
      const compases = compasesDeSeccion(cuerpo);
      const duracionSegundos = bpmEfectivo > 0 ? compases * segundosPorCompas(bpmEfectivo) : 0;
      out.push({
        plantillaId: s.id,
        seccionId: cuerpo.id,
        nombre: s.nombre,
        indice,
        deVueltas: s.repiteVeces,
        esVariante: !!override,
        tonalidadNota: cuerpo.tonalidadNota ?? cancion.tonalidadNota,
        tonalidadModo: cuerpo.tonalidadModo ?? cancion.tonalidadModo,
        bpmEfectivo,
        compases,
        acordes: cuerpo.acordes,
        // La vista de escenario sigue la letra por líneas: los arreglos (tab) se quedan fuera.
        letra: cuerpo.letra.filter((l) => l.tipo !== "tab"),
        inicioCompas: compas,
        inicioSegundos: segundos,
        duracionSegundos,
      });
      compas += compases;
      segundos += duracionSegundos;
    }
  }
  return out;
}

export function totalCompases(vueltas: VueltaExpandida[]): number {
  const u = vueltas[vueltas.length - 1];
  return u ? u.inicioCompas + u.compases : 0;
}
export function duracionTotal(vueltas: VueltaExpandida[]): number {
  const u = vueltas[vueltas.length - 1];
  return u ? u.inicioSegundos + u.duracionSegundos : 0;
}

export type AcordeSimple = { notaRaiz: Nota; calidad: Calidad; notaBajo?: Nota | null; duracionCompases: number };

export type PosicionReproduccion = {
  idx: number;
  vuelta: VueltaExpandida;
  compasEnSeccion: number;
  compasGlobal: number;
  acorde: AcordeSimple;
  iAcorde: number;
  acordeSiguiente: AcordeSimple;
  restanteCompases: number; // hasta el próximo acorde
  siguienteVuelta: VueltaExpandida;
  cambiaSeccion: boolean;
  compasesASeccion: number; // hasta el fin del tramo de esta sección
  avanceSeccion: number; // 0..1 dentro del tramo de la sección
  lineaActiva: number;
};

const NEUTRO: AcordeSimple = { notaRaiz: "C", calidad: "mayor", duracionCompases: 1 };

export function posicionEn(vueltas: VueltaExpandida[], t: number): PosicionReproduccion | null {
  if (vueltas.length === 0) return null;
  let idx = 0;
  for (let i = 0; i < vueltas.length; i++) {
    if (t >= vueltas[i].inicioSegundos) idx = i;
  }
  const vuelta = vueltas[idx];
  const segPorCompas = vuelta.bpmEfectivo > 0 ? segundosPorCompas(vuelta.bpmEfectivo) : 0;
  const dentroCompas = segPorCompas > 0 ? (t - vuelta.inicioSegundos) / segPorCompas : 0;

  let acumulado = 0;
  let iAcorde = 0;
  for (let i = 0; i < vuelta.acordes.length; i++) {
    if (dentroCompas >= acumulado) iAcorde = i;
    acumulado += vuelta.acordes[i].duracionCompases;
  }
  let inicioAcorde = 0;
  for (let i = 0; i < iAcorde; i++) inicioAcorde += vuelta.acordes[i].duracionCompases;
  const acorde = vuelta.acordes[iAcorde] ?? NEUTRO;
  const restanteCompases = inicioAcorde + acorde.duracionCompases - dentroCompas;
  const siguienteVuelta = vueltas[idx + 1] ?? vueltas[0];
  const acordeSiguiente = vuelta.acordes[iAcorde + 1] ?? siguienteVuelta.acordes[0] ?? NEUTRO;

  // Tramo de la sección = todas las vueltas seguidas de la misma plantilla.
  let ini = idx;
  while (ini > 0 && vueltas[ini - 1].plantillaId === vuelta.plantillaId) ini--;
  let fin = idx;
  while (fin + 1 < vueltas.length && vueltas[fin + 1].plantillaId === vuelta.plantillaId) fin++;
  const inicioSeccionCompas = vueltas[ini].inicioCompas;
  const finSeccionCompas = vueltas[fin].inicioCompas + vueltas[fin].compases;
  const compasFlotanteGlobal = vuelta.inicioCompas + dentroCompas;
  const compasesASeccion = Math.max(0, finSeccionCompas - compasFlotanteGlobal);
  const avanceSeccion = Math.min(1, Math.max(0, (compasFlotanteGlobal - inicioSeccionCompas) / Math.max(1, finSeccionCompas - inicioSeccionCompas)));
  const cambiaSeccion = siguienteVuelta.plantillaId !== vuelta.plantillaId || Math.ceil(restanteCompases) >= Math.ceil(compasesASeccion);

  const nLineas = vuelta.letra.length;
  const lineaActiva = nLineas > 0 ? Math.min(nLineas - 1, Math.floor((dentroCompas / Math.max(1, vuelta.compases)) * nLineas)) : 0;

  return {
    idx,
    vuelta,
    compasEnSeccion: Math.floor(dentroCompas) + 1,
    compasGlobal: Math.floor(compasFlotanteGlobal) + 1,
    acorde,
    iAcorde,
    acordeSiguiente,
    restanteCompases,
    siguienteVuelta,
    cambiaSeccion,
    compasesASeccion,
    avanceSeccion,
    lineaActiva,
  };
}

export function mmss(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
