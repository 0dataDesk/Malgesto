// Revisa las reglas puras de Lírico (modelo). Corre con npm run check (antes de cada build).
import { ESTADOS_IDEA, MAX, elegir, limpiar, parOrdenado, resumenPorTecnica, titulo } from "../lib/liricoModelo";

const errores: string[] = [];
const falla = (m: string) => errores.push(m);

if (elegir("basura", ESTADOS_IDEA, "semilla") !== "semilla") falla("elegir debe caer al valor por defecto con un valor inválido");
if (elegir("letra", ESTADOS_IDEA, "semilla") !== "letra") falla("elegir debe aceptar un valor válido");
if (elegir(42, ESTADOS_IDEA, "semilla") !== "semilla") falla("elegir debe rechazar lo que no es texto");
if (limpiar("a".repeat(MAX.titulo + 50), MAX.titulo).length !== MAX.titulo) falla("limpiar debe recortar al máximo");
if (limpiar("a\r\nb", 10) !== "a\nb") falla("limpiar debe normalizar saltos de línea");
if (limpiar(null, 10) !== "") falla("limpiar de algo que no es texto debe dar vacío");
if (titulo("   ") !== "") falla("un título de solo espacios debe quedar vacío");
const [x, y] = parOrdenado("b", "a");
if (x !== "a" || y !== "b" || parOrdenado("a", "b").join() !== "a,b") falla("parOrdenado debe ordenar siempre el par igual");
const r = resumenPorTecnica([
  { tecnica: "premisa", estado: "dominada" },
  { tecnica: "premisa", estado: "por_reforzar" },
  { tecnica: "prosodia", estado: "en_curso" },
]);
if (r.get("premisa")?.total !== 2 || r.get("premisa")?.dominadas !== 1 || r.get("premisa")?.porReforzar !== 1) falla("resumenPorTecnica debe contar total, dominadas y por reforzar");
if (r.get("prosodia")?.total !== 1 || r.has("rima")) falla("resumenPorTecnica solo debe incluir las técnicas vistas");

if (errores.length > 0) {
  console.error("Lírico: fallas en las reglas:\n- " + errores.join("\n- "));
  process.exit(1);
}
console.log("Lírico: reglas OK");
