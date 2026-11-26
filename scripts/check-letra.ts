// Revisa la lógica de una sola captura de acordes (ciclos de la fila y acordes de la letra).
import { iniciosDeSilaba, paradasDeMovimiento, agruparCiclos, cambiarVeces, reemplazarEnCiclo, quitarEnCiclo, repetirUltimos, ubicarAcordes, sincronizarLetra, moverFrontera, cambiarTexto, moverPosicion, type AcordeFila, type LineaLetra } from "../lib/cancionLetra";
import type { Nota, Calidad } from "../lib/cancionTeoria";

const errores: string[] = [];
const falla = (m: string) => errores.push(m);
const a = (n: Nota, c: Calidad = "mayor", d = 1): AcordeFila => ({ notaRaiz: n, calidad: c, notaBajo: null, duracionCompases: d });
const nombres = (ac: AcordeFila[]) => ac.map((x) => `${x.notaRaiz}${x.calidad === "menor" ? "m" : ""}${x.duracionCompases !== 1 ? `:${x.duracionCompases}` : ""}`).join(" ");

// Coro de "A Un Minuto de Ti": G4 D4 Am C, luego G D Am C ×7 y el último C de 2 compases.
const coro: AcordeFila[] = [a("G", "mayor", 4), a("D", "mayor", 4), a("A", "menor"), a("C")];
for (let i = 0; i < 7; i++) coro.push(a("G"), a("D"), a("A", "menor"), a("C"));
coro.push(a("G"), a("D"), a("A", "menor"), a("C", "mayor", 2));
const items = agruparCiclos(coro);
const resumen = items.map((x) => (x.tipo === "acorde" ? `a${x.i}` : `c${x.inicio}x${x.largo}x${x.veces}`)).join(" ");
if (resumen !== "a0 a1 a2 a3 c4x4x7 a32 a33 a34 a35") falla(`ciclos del coro: ${resumen}`);

// Cambiar un acorde del ciclo cambia todas sus repeticiones; veces ±; quitar.
const base = [a("G"), a("D"), a("A", "menor"), a("C"), a("G"), a("D"), a("A", "menor"), a("C")];
const ciclo = agruparCiclos(base)[0];
if (ciclo.tipo !== "ciclo" || ciclo.largo !== 4 || ciclo.veces !== 2) falla("ciclo simple ×2");
else {
  if (nombres(reemplazarEnCiclo(base, ciclo, 1, { notaRaiz: "E" })) !== "G E Am C G E Am C") falla("reemplazar en ciclo");
  if (nombres(cambiarVeces(base, ciclo, 3)) !== "G D Am C G D Am C G D Am C") falla("más veces");
  if (nombres(cambiarVeces(base, ciclo, 1)) !== "G D Am C") falla("menos veces");
  if (nombres(quitarEnCiclo(base, ciclo, 3)) !== "G D Am G D Am") falla("quitar en ciclo");
}
if (nombres(repetirUltimos([a("G"), a("D")], 2, 3)) !== "G D G D G D") falla("repetir últimos");

// Ubicar acordes: el primero al inicio, los demás al inicio de una palabra.
const pos = ubicarAcordes("Voy a arder braceo en espiral", [1, 1, 1, 1]);
if (pos[0] !== 0 || pos.some((p, i) => i > 0 && p < pos[i - 1])) falla(`ubicar: ${pos}`);
if (moverPosicion("uno dos tres", 4, 1) !== 8 || moverPosicion("uno dos tres", 4, -1) !== 1) falla("mover posición");
// Sílabas: el acorde puede entrar en «ré» de «Llegaré» o en la coma de «No, que».
const sil = (p: string) => iniciosDeSilaba(p).join();
const casos: [string, string][] = [["Llegaré", "0,3,5"], ["solo", "0,2"], ["hasta", "0,3"], ["umbral", "0,2"], ["cuento", "0,4"], ["atreveré", "0,1,4,6"], ["puedo", "0,3"], ["perder", "0,3"], ["soy", "0"], ["que", "0"], ["guitarra", "0,3,5"], ["país", "0,2"], ["construir", "0,4"]];
for (const [p, esperado] of casos) if (sil(p) !== esperado) falla(`sílabas de «${p}»: ${sil(p)} (debía ser ${esperado})`);
if (paradasDeMovimiento("No, que puedo perder").slice(0, 3).join() !== "0,2,4") falla(`paradas de «No, que»: ${paradasDeMovimiento("No, que puedo perder")}`);
if (moverPosicion("Llegaré, solo hasta el umbral", 0, 1) !== 3) falla("de «Lle» a «ga»");

// Letra: 8 acordes en 2 líneas = 4 y 4; se pasa uno de una a otra; un cambio de acorde arriba se ve en la letra.
const prog = [a("G"), a("D"), a("A", "menor"), a("C"), a("G"), a("D"), a("A", "menor"), a("C")];
const lin = (t: string): LineaLetra => ({ texto: t, tipo: "letra", acordes: [] });
let letra = sincronizarLetra([lin("Voy a arder braceo en espiral"), lin("Me vuelvo a repetir")], prog);
if (letra.map((l) => l.acordes.length).join() !== "4,4") falla(`reparto parejo: ${letra.map((l) => l.acordes.length)}`);
letra = moverFrontera(letra, prog, 0, 1);
if (letra.map((l) => l.acordes.length).join() !== "5,3") falla(`pasar un acorde: ${letra.map((l) => l.acordes.length)}`);
if (letra[1].acordes[0].notaRaiz !== "D" || letra[1].acordes[0].calidad !== "mayor") falla("la línea 2 empieza en el acorde 6 (D)");
const prog2 = prog.map((x, i) => (i === 1 ? { ...x, notaRaiz: "E" as Nota } : x));
if (sincronizarLetra(letra, prog2)[0].acordes[1].notaRaiz !== "E") falla("el cambio de acorde arriba debe verse en la letra");
const nueva = cambiarTexto(letra, prog, 1, "Me vuelvo a repetir otra vez ahora");
if (nueva[1].acordes.length !== 3 || nueva[1].acordes[0].posicion !== 0) falla("cambiar texto reubica");
if (sincronizarLetra([{ texto: "x", tipo: "letra", acordes: [] }], []).length !== 1) falla("sin acordes arriba no rompe");

if (errores.length) {
  console.error(`\n✗ ${errores.length} problema(s) en la captura única:\n` + errores.map((e) => " - " + e).join("\n"));
  process.exit(1);
}
console.log("✓ Captura única de acordes (ciclos y letra) correcta.");
