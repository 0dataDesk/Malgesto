// Brief "Presskit público: diseño independiente por banda" §2: helpers de
// derivación de texto/color compartidos entre TODOS los diseños de
// /presskit-publico/[slug] -- son la parte de "obtención/forma de los
// datos reales" que el brief pide no duplicar; lo que sí es propio de cada
// banda es el layout/JSX que los usa (ver components/presskit-publico/
// disenos/*). Sin "server-only": son funciones puras sin I/O, no hay razón
// para prohibir su uso desde un componente cliente si hiciera falta.

export function colorSeguro(c: string, fallback: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^oklch\([\d.\s%]+\)$/i.test(c) ? c : fallback;
}

// Los tags de género vienen de un solo campo texto (bandas.genero) -- acepta
// cualquier separador común para que una banda futura no dependa de usar
// uno específico.
export function tagsGenero(genero: string | null): string[] {
  if (!genero) return [];
  return genero
    .split(/[|,·/]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

// Heurística de oraciones (no NLP): agrupa oraciones hasta sumar ~140
// caracteres para un titular/lead, reparte el resto en dos columnas
// parejas.
export function dividirSemblanza(bio: string): { titular: string; columnas: [string, string] } {
  const oraciones = bio.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (oraciones.length === 0) return { titular: "", columnas: ["", ""] };
  let i = 0;
  let acumulado = "";
  while (i < oraciones.length) {
    acumulado = acumulado ? `${acumulado} ${oraciones[i]}` : oraciones[i];
    i++;
    if (acumulado.length >= 140) break;
  }
  const resto = oraciones.slice(i);
  const mitad = Math.ceil(resto.length / 2);
  return { titular: acumulado, columnas: [resto.slice(0, mitad).join(" "), resto.slice(mitad).join(" ")] };
}

// La última oración de una semblanza escrita como texto corrido suele ser
// la más "cerrada"/quotable -- sin necesitar ninguna marca especial en el
// texto real.
export function extraerCita(bio: string): string | null {
  const oraciones = bio.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const ultima = oraciones[oraciones.length - 1]?.replace(/[.!?]+$/, "").trim();
  return ultima ? `“${ultima}”` : null;
}

// Fix real (detectado probando con la semblanza de Yelincuente): una
// banda/artista puede mencionar OTROS años en su semblanza que no son el de
// arranque -- ej. "el tema 'Delincuente' de Los Hitters (1967)" antes de
// "Músico desde 2004". Preferir el año que sigue a "desde" evita agarrar el
// primer año que aparezca en el texto sin importar de qué habla.
export function extraerAnioFundacion(bio: string): string | null {
  const conDesde = bio.match(/\bdesde\s+((?:19|20)\d{2})\b/i);
  if (conDesde) return conDesde[1];
  const cualquiera = bio.match(/\b(?:19|20)\d{2}\b/);
  return cualquiera ? cualquiera[0] : null;
}

// El caption corto sobre la foto de héroe es una frase curada a mano por
// Design en cada mockup, no un extracto literal de la semblanza -- se
// compone acá con datos ya estructurados (año + primer tag) en vez de
// intentar adivinar la frase ideal desde texto libre.
export function captionFoto(anio: string | null, tags: string[]): string | null {
  if (anio) return `Activos desde ${anio}`;
  return tags[0] ?? null;
}

export function formatearFechaCorta(iso: string): string {
  const partes = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(new Date(iso));
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${obtener("day")} ${obtener("month").replace(".", "").toUpperCase()} ${obtener("year")}`;
}

export function truncarTexto(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
