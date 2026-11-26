// Revisa la lógica de una sola captura de acordes (ciclos de la fila y acordes de la letra).
import { iniciosDeSilaba, paradasDeMovimiento, agruparCiclos, filaDesdeAcordes, expandirFila, agruparUltimos, deshacerCiclo, ubicarAcordes, sincronizarLetra, moverFrontera, cambiarTexto, moverPosicion, type AcordeFila, type LineaLetra } from "../lib/cancionLetra";
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

// La fila que se edita no se agrupa sola: ida y vuelta, ciclos explícitos, deshacer.
const fila0 = filaDesdeAcordes(coro);
if (nombres(expandirFila(fila0)) !== nombres(coro)) falla("expandir la fila debe devolver los mismos acordes");
let fila: ReturnType<typeof filaDesdeAcordes> = [];
for (const x of [a("E", "menor"), a("G", "mayor", 6), a("C", "mayor", 2), a("G", "mayor", 6), a("C", "mayor", 2)]) fila = [...fila, { tipo: "acorde", a: x }];
if (fila.some((x) => x.tipo === "ciclo")) falla("agregar acordes iguales no debe agruparlos solo");
const conCiclo = agruparUltimos(fila, 2, 2);
if (conCiclo.length !== 4 || conCiclo[3].tipo !== "ciclo") falla("agrupar los últimos 2 en un ciclo ×2");
if (conCiclo[3].tipo === "ciclo" && (conCiclo[3].bloque.length !== 2 || conCiclo[3].veces !== 2)) falla("el ciclo trae 2 acordes ×2");
if (nombres(expandirFila(conCiclo)) !== "Em G:6 C:2 G:6 C:2 G:6 C:2") falla(`expandir con ciclo: ${nombres(expandirFila(conCiclo))}`);
if (nombres(expandirFila(deshacerCiclo(conCiclo, 3))) !== nombres(expandirFila(conCiclo)) || deshacerCiclo(conCiclo, 3).some((x) => x.tipo === "ciclo")) falla("deshacer el ciclo");
if (agruparUltimos(conCiclo, 2, 2) !== conCiclo) falla("sin acordes sueltos al final no se agrupa nada");

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
