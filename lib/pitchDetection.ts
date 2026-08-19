// Detección de tono (algoritmo YIN, de Cheveigné & Kawahara 2002) — adaptado
// de jorge-malgesto/js/pitch-detection.js (github.com/0dataDesk/jorge-malgesto)
// para el afinador integrado a Seteos como pedal. Rango de búsqueda pensado
// para bajo 4 cuerdas (30-1200 Hz), igual que el original.
export function detectarTonoYIN(buffer: Float32Array, sampleRate: number, threshold = 0.12): number {
  const bufferSize = buffer.length;
  const halfBuffer = Math.floor(bufferSize / 2);

  const tauMin = Math.floor(sampleRate / 1200);
  const tauMax = Math.floor(sampleRate / 30);

  const yinBuffer = new Float32Array(halfBuffer);

  yinBuffer[0] = 1.0;
  let runningSum = 0;

  for (let tau = 1; tau < halfBuffer; tau++) {
    let delta = 0;
    for (let j = 0; j < halfBuffer; j++) {
      const diff = buffer[j] - buffer[j + tau];
      delta += diff * diff;
    }
    yinBuffer[tau] = delta;

    runningSum += yinBuffer[tau];
    yinBuffer[tau] = runningSum === 0 ? 1 : yinBuffer[tau] * (tau / runningSum);
  }

  let tau = tauMin;
  while (tau < tauMax) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < tauMax && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      const betterTau = interpolacionParabolica(yinBuffer, tau);
      return sampleRate / betterTau;
    }
    tau++;
  }

  return -1;
}

function interpolacionParabolica(array: Float32Array, tau: number): number {
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < array.length ? tau + 1 : tau;

  if (x0 === tau) return x2 === tau ? tau : array[tau] <= array[x2] ? tau : x2;
  if (x2 === tau) return array[tau] <= array[x0] ? tau : x0;

  const s0 = array[x0];
  const s1 = array[tau];
  const s2 = array[x2];

  return tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
}

const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQ = 440;
const A4_MIDI = 69;

export type NotaDetectada = { nombre: string; octava: number; cents: number; freq: number; midi: number };

export function frecuenciaANota(freq: number): NotaDetectada {
  const semitonos = 12 * Math.log2(freq / A4_FREQ);
  const midi = Math.round(A4_MIDI + semitonos);
  const cents = Math.round((semitonos - (midi - A4_MIDI)) * 100);
  const nombre = NOTAS[((midi % 12) + 12) % 12];
  const octava = Math.floor(midi / 12) - 1;
  return { nombre, octava, cents, freq, midi };
}

export type CuerdaBajo = { nombre: string; octava: number; freq: number };

export const CUERDAS_BAJO_ESTANDAR: CuerdaBajo[] = [
  { nombre: "E", octava: 1, freq: 41.2 },
  { nombre: "A", octava: 1, freq: 55.0 },
  { nombre: "D", octava: 2, freq: 73.42 },
  { nombre: "G", octava: 2, freq: 98.0 },
];

export const CUERDAS_BAJO_DROP_D: CuerdaBajo[] = [
  { nombre: "D", octava: 1, freq: 36.71 },
  { nombre: "A", octava: 1, freq: 55.0 },
  { nombre: "D", octava: 2, freq: 73.42 },
  { nombre: "G", octava: 2, freq: 98.0 },
];

export function cuerdaMasCercana(freq: number, dropD = false): CuerdaBajo {
  const cuerdas = dropD ? CUERDAS_BAJO_DROP_D : CUERDAS_BAJO_ESTANDAR;
  return cuerdas.reduce((cercana, c) => (Math.abs(c.freq - freq) < Math.abs(cercana.freq - freq) ? c : cercana), cuerdas[0]);
}
