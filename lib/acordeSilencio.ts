// Un silencio se guarda como un "acorde" con `silencio = true` (ocupa compases o tiempos pero no suena ningún acorde).
import { simboloAcorde, colorRaizAcorde, type Nota, type Calidad } from "@/lib/cancionTeoria";

export const COLOR_SILENCIO = "hsl(40 8% 90%)";
export const SIMBOLO_SILENCIO = "𝄽";

type ConSilencio = { notaRaiz: Nota; calidad: Calidad; notaBajo?: Nota | null; silencio?: boolean };

export function simboloOSilencio(a: ConSilencio): string {
  return a.silencio ? SIMBOLO_SILENCIO : simboloAcorde(a.notaRaiz, a.calidad, a.notaBajo);
}
export function colorOSilencio(a: ConSilencio): string {
  return a.silencio ? COLOR_SILENCIO : colorRaizAcorde(a.notaRaiz, a.calidad);
}
