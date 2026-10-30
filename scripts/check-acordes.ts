// Revisa la biblioteca de acordes del Modo Estudio. Corre antes de cada build (npm run check):
// si una forma no suena como el acorde que dice ser, o no cabe en el diagrama, el despliegue se detiene.
import { NOTAS, CALIDADES, simboloAcorde, semitonosDeCalidad, type Nota, type Calidad } from "../lib/cancionTeoria";
import {
  INSTRUMENTOS_ESTUDIO,
  variantesDeAcorde,
  inicioDiagrama,
  CATALOGO_GUITARRA,
  CATALOGO_GUITARRA_BARRA,
  CATALOGO_UKULELE,
  type Afinacion,
  type Forma,
  type NombreInstrumento,
} from "../lib/estudioInstrumentos";

const errores: string[] = [];
const falla = (m: string) => errores.push(m);

const clasePc = (raiz: Nota, calidad: Calidad) => semitonosDeCalidad(calidad).map((s) => (NOTAS.indexOf(raiz) + s) % 12);
const sonando = (f: (number | null)[], af: Afinacion) => f.map((t, i) => (t === null ? null : (af.cuerdas[i] + t) % 12));
const masGrave = (f: (number | null)[], af: Afinacion) => {
  const i = f.findIndex((t) => t !== null);
  return i < 0 ? -1 : (af.cuerdas[i] + (f[i] as number)) % 12;
};
const descr = (f: Forma | (number | null)[]) => (Array.isArray(f) ? f : f.trastes).map((t) => (t === null ? "x" : t)).join(",");

// Una forma de cuerdas debe: tener todas las notas del acorde, no traer notas ajenas (salvo el bajo de un acorde con barra),
// empezar en el bajo correcto y caber en el diagrama (5 trastes de alto).
function revisa(nombre: string, trastes: (number | null)[], af: Afinacion, raiz: Nota, calidad: Calidad, bajo: Nota | null, reentrante: boolean) {
  const clase = clasePc(raiz, calidad);
  const pcs = sonando(trastes, af).filter((x): x is number => x !== null);
  const bajoPc = bajo ? NOTAS.indexOf(bajo) : clase[0];
  const permitidas = bajo ? [...clase, bajoPc] : clase;
  // En acordes de cuatro notas o más se acepta omitir la quinta (voicing normal); ninguna otra nota puede faltar.
  const quintaPc = (NOTAS.indexOf(raiz) + 7) % 12;
  // El add9 se toca normalmente sin la tercera (Cadd9 = x35533 de la hoja de Disarm).
  const terceraPc = (NOTAS.indexOf(raiz) + 4) % 12;
  for (const c of clase) if (!pcs.includes(c) && !(clase.length >= 4 && c === quintaPc) && !(calidad === "add9" && c === terceraPc)) return falla(`${nombre} [${descr(trastes)}]: falta la nota ${NOTAS[c]}`);
  for (const p of pcs) if (!permitidas.includes(p)) return falla(`${nombre} [${descr(trastes)}]: trae la nota ajena ${NOTAS[p]}`);
  if (!reentrante && masGrave(trastes, af) !== bajoPc) return falla(`${nombre} [${descr(trastes)}]: la nota más grave es ${NOTAS[masGrave(trastes, af)]} y debía ser ${NOTAS[bajoPc]}`);
  const pisados = trastes.filter((t): t is number => t !== null && t > 0);
  const abiertas = trastes.some((t) => t === 0);
  const max = pisados.length ? Math.max(...pisados) : 0;
  const min = pisados.length ? Math.min(...pisados) : 0;
  if (abiertas && max > 5) falla(`${nombre} [${descr(trastes)}]: tiene cuerdas al aire y pasa del traste 5 (no cabe en el diagrama)`);
  // El diagrama dibuja 5 trastes desde `inicioDiagrama`: todo dedo debe caer dentro y, con cuerdas al aire, debe verse la cejilla.
  const ini = inicioDiagrama(trastes);
  if (max > ini + 4) falla(`${nombre} [${descr(trastes)}]: el diagrama (desde el traste ${ini}) no alcanza a dibujar el traste ${max}`);
  if (abiertas && ini !== 1) falla(`${nombre} [${descr(trastes)}]: el diagrama arranca en el traste ${ini} aunque la forma tiene cuerdas al aire (se vería desacomodada)`);
  if (max - min > 5) falla(`${nombre} [${descr(trastes)}]: abre más de 5 trastes`);
  if (max > 14) falla(`${nombre} [${descr(trastes)}]: pasa del traste 14`);
}

const desdeTexto = (t: string) => t.split("").map((c) => (c === "x" ? null : Number(c)));
const guitarra = INSTRUMENTOS_ESTUDIO.guitarra.afinaciones.find((a) => a.id === "estandar")!;
const ukulele = INSTRUMENTOS_ESTUDIO.ukulele.afinaciones[0];

// 1) Catálogos a mano: cada símbolo debe sonar como dice.
const SIMBOLOS = (() => {
  const mapa = new Map<string, { raiz: Nota; calidad: Calidad; bajo: Nota | null }>();
  for (const raiz of NOTAS) for (const calidad of CALIDADES) mapa.set(simboloAcorde(raiz, calidad), { raiz, calidad, bajo: null });
  for (const raiz of NOTAS) for (const calidad of CALIDADES) for (const bajo of NOTAS) mapa.set(simboloAcorde(raiz, calidad, bajo), { raiz, calidad, bajo: bajo === raiz ? null : bajo });
  return mapa;
})();
for (const [sim, texto] of Object.entries(CATALOGO_GUITARRA)) {
  const d = SIMBOLOS.get(sim);
  if (!d) falla(`catálogo de guitarra: "${sim}" no es un acorde conocido`);
  else revisa(`catálogo guitarra ${sim}`, desdeTexto(texto), guitarra, d.raiz, d.calidad, null, false);
}
for (const [sim, texto] of Object.entries(CATALOGO_GUITARRA_BARRA)) {
  const d = SIMBOLOS.get(sim);
  if (!d || !d.bajo) falla(`catálogo con barra: "${sim}" no es un acorde con barra conocido`);
  else revisa(`catálogo con barra ${sim}`, desdeTexto(texto), guitarra, d.raiz, d.calidad, d.bajo, false);
}
for (const [sim, texto] of Object.entries(CATALOGO_UKULELE)) {
  const d = SIMBOLOS.get(sim);
  if (!d) falla(`catálogo de ukulele: "${sim}" no es un acorde conocido`);
  else revisa(`catálogo ukulele ${sim}`, desdeTexto(texto), ukulele, d.raiz, d.calidad, null, true);
}

// 2) Todo acorde, en toda afinación ofrecida, debe tener al menos una forma y todas deben ser correctas.
let total = 0;
for (const inst of Object.keys(INSTRUMENTOS_ESTUDIO) as NombreInstrumento[]) {
  for (const af of INSTRUMENTOS_ESTUDIO[inst].afinaciones) {
    for (const raiz of NOTAS) {
      for (const calidad of CALIDADES) {
        const nombre = `${inst}/${af.id} ${simboloAcorde(raiz, calidad)}`;
        const formas = variantesDeAcorde(inst, af, raiz, calidad);
        if (formas.length === 0) {
          falla(`${nombre}: sin ninguna forma`);
          continue;
        }
        for (const f of formas) {
          total++;
          if (inst === "bajo") {
            const pcs = sonando(f.trastes, af).filter((x): x is number => x !== null);
            if (!pcs.includes(NOTAS.indexOf(raiz))) falla(`${nombre} [${descr(f)}]: no toca la raíz`);
          } else revisa(nombre, f.trastes, af, raiz, calidad, null, inst === "ukulele");
        }
      }
    }
  }
}

// 3) Acordes con bajo (guitarra): la forma debe empezar en el bajo.
const CON_BARRA: [Nota, Calidad, Nota][] = [["D", "sus4", "F#"], ["D", "sus2", "F#"], ["D", "mayor", "F#"], ["G", "mayor", "B"], ["C", "mayor", "G"], ["A", "menor", "G"], ["E", "menor", "B"], ["A", "mayor", "C#"], ["B", "menor", "A"], ["F", "mayor", "A"]];
for (const [raiz, calidad, bajo] of CON_BARRA) {
  const nombre = `guitarra ${simboloAcorde(raiz, calidad, bajo)}`;
  const formas = variantesDeAcorde("guitarra", guitarra, raiz, calidad, bajo);
  if (formas.length === 0) falla(`${nombre}: sin ninguna forma`);
  for (const f of formas) revisa(nombre, f.trastes, guitarra, raiz, calidad, bajo, false);
}

// 3b) Casos que ya fallaron: el G de Drop D (5,2,0,0,0,3) se dibujaba desde el traste 2 aunque tiene cuerdas al aire.
if (inicioDiagrama([5, 2, 0, 0, 0, 3]) !== 1) falla("el diagrama del G de Drop D [5,2,0,0,0,3] debe arrancar en la cejilla (traste 1)");
if (inicioDiagrama([null, 3, 5, 5, 5, 3]) !== 1) falla("la forma [x,3,5,5,5,3] cabe en 5 trastes: debe arrancar en el traste 1");
if (inicioDiagrama([null, null, 8, 7, 6, 6]) !== 6) falla("la forma [x,x,8,7,6,6] pasa del quinto traste: debe arrancar en el traste 6");

// 4) Una forma de la hoja (personalizada) con la cantidad de cuerdas equivocada se ignora, no rompe.
if (variantesDeAcorde("guitarra", guitarra, "D", "mayor", null, [0, 0, 0]).some((f) => f.origen === "hoja")) falla("una forma de hoja con 3 cuerdas no debió aceptarse");

if (errores.length) {
  console.error(`\n✗ ${errores.length} problema(s) en la biblioteca de acordes:\n` + errores.slice(0, 60).map((e) => " - " + e).join("\n") + (errores.length > 60 ? `\n ... y ${errores.length - 60} más` : ""));
  process.exit(1);
}
console.log(`✓ Biblioteca de acordes correcta (${total} formas revisadas, ${Object.keys(CATALOGO_GUITARRA).length + Object.keys(CATALOGO_GUITARRA_BARRA).length + Object.keys(CATALOGO_UKULELE).length} del catálogo).`);
