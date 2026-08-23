import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerBandaPorSlugPresskit, obtenerPresskitPublico, type PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoBotonPdf } from "@/components/presskit/PresskitPublicoBotonPdf";

// Brief "Presskit — nuevo diseño para Yelincuente (Claude Design)": segunda
// vez que un handoff de Design reemplaza la piel visual completa de esta
// ruta (la primera fue el punk de Juana LR) -- mismo criterio de las dos
// veces: el diseño MÁS RECIENTE que llega de Design se convierte en la
// plantilla compartida de /presskit-publico/[slug], no una piel aparte por
// banda. Por eso Juana LR (banda completa, varios integrantes, flyers)
// también pasa a verse con esta identidad oscura/neón en vez de la
// cream/roja anterior -- es la consecuencia esperada de "ruta genérica",
// no un efecto secundario a evitar. `acento` sigue saliendo de
// `bandas.color` (para Yelincuente, un dorado/oliva #b6ab2f ya cargado
// aparte del ejemplo rosa del mockup); `resalte` es un tono de sistema fijo
// (lima, ver props "highlightColor" del propio diseño en Claude Design),
// no de marca, mismo criterio que el amarillo fijo de la piel anterior.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) return {};
  return {
    title: `${banda.bandaNombre} — Presskit`,
    description: banda.bandaGenero ? `Presskit de ${banda.bandaNombre} (${banda.bandaGenero}).` : `Presskit de ${banda.bandaNombre}.`,
  };
}

const COLOR_BG = "#0b0809";
const COLOR_TEXTO = "#f3eee6";
const COLOR_RESALTE = "#d9ff3d";

function colorSeguro(c: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^oklch\([\d.\s%]+\)$/i.test(c) ? c : "#ff2e6b";
}

// Brief §3: los tags de género vienen de un solo campo texto (bandas.genero)
// -- acepta cualquier separador común para que una banda futura no dependa
// de usar uno específico.
function tagsGenero(genero: string | null): string[] {
  if (!genero) return [];
  return genero
    .split(/[|,·\/]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

// Heurística de oraciones (no NLP): agrupa oraciones hasta sumar ~140
// caracteres para el titular en negrita, reparte el resto en dos columnas
// parejas.
function dividirSemblanza(bio: string): { titular: string; columnas: [string, string] } {
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
// la más "cerrada"/quotable -- funcionó para Juana LR y para Yelincuente
// ("...la música como acto de subversión festiva") sin necesitar ninguna
// marca especial en el texto real.
function extraerCita(bio: string): string | null {
  const oraciones = bio.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const ultima = oraciones[oraciones.length - 1]?.replace(/[.!?]+$/, "").trim();
  return ultima ? `“${ultima}”` : null;
}

// Brief "Presskit — nuevo diseño para Yelincuente": una banda/artista puede
// mencionar OTROS años en su semblanza que no son el de arranque -- ej.
// Yelincuente cita "el tema 'Delincuente' de Los Hitters (1967)" antes de
// "Músico desde 2004". Preferir el año que sigue a "desde" (patrón típico
// en español para marcar un punto de partida) evita agarrar el primer año
// que aparezca en el texto sin importar de qué habla.
function extraerAnioFundacion(bio: string): string | null {
  const conDesde = bio.match(/\bdesde\s+((?:19|20)\d{2})\b/i);
  if (conDesde) return conDesde[1];
  const cualquiera = bio.match(/\b(?:19|20)\d{2}\b/);
  return cualquiera ? cualquiera[0] : null;
}

// Brief §2: el caption corto sobre la foto de héroe es una frase curada a
// mano por Design en cada mockup, no un extracto literal de la semblanza --
// se compone acá con datos ya estructurados (año + primer tag) en vez de
// intentar adivinar la frase ideal desde texto libre.
function captionFoto(anio: string | null, tags: string[]): string | null {
  if (anio) return `Activos desde ${anio}`;
  return tags[0] ?? null;
}

function formatearFechaCorta(iso: string): string {
  const partes = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(new Date(iso));
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${obtener("day")} ${obtener("month").replace(".", "").toUpperCase()} ${obtener("year")}`;
}

function EtiquetaSeccion({ numero, titulo, color }: { numero: string; titulo: string; color: string }) {
  return (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".26em", textTransform: "uppercase", color, marginBottom: 20 }}>
      {numero} — {titulo}
    </div>
  );
}

export default async function PresskitPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) notFound();

  const datos: PresskitPublico = await obtenerPresskitPublico(banda.bandaId, banda.bandaNombre, banda.bandaGenero, banda.bandaColor);
  const acento = colorSeguro(datos.bandaColor);

  const bio = datos.presskit.bioLarga?.trim() || null;
  const { titular, columnas } = bio ? dividirSemblanza(bio) : { titular: "", columnas: ["", ""] as [string, string] };
  const cita = bio ? extraerCita(bio) : null;
  const anio = bio ? extraerAnioFundacion(bio) : null;
  const tags = tagsGenero(datos.bandaGenero);
  const caption = captionFoto(anio, tags);
  const origenPartes = [datos.presskit.pais, datos.presskit.ciudad].filter((v): v is string => Boolean(v));
  const origenLinea = origenPartes.join(" · ");

  // Brief "Las fotos de banda/conceptuales se usan como material visual, no
  // como galería enumerada": cada foto de banda cumple un rol puntual --
  // [0] héroe de fondo, [1] acento junto a la semblanza, [2] fondo del
  // "manifiesto" (cita destacada). Una banda con menos de 3 fotos de banda
  // simplemente no ve los roles que le faltan; ninguno es obligatorio.
  const fotoHero = datos.fotosBanda[0] ?? null;
  const fotoSemblanza = datos.fotosBanda[1] ?? null;
  const fotoManifiesto = datos.fotosBanda[2] ?? null;

  const hayIntegrantes = datos.integrantes.length > 0;
  const hayFechas = datos.proximasFechas.length > 0;
  const hayFlyers = datos.fotosFlyer.length > 0;
  const hayRedes = datos.redes.length > 0;
  const hayOrigenBloque = Boolean(origenLinea || anio);
  const hayContacto = Boolean(datos.presskit.contactoTelefono || datos.presskit.contactoEmail);

  const marquee = tags.length > 0 ? tags : datos.bandaGenero ? [datos.bandaGenero] : [];

  return (
    <div style={{ background: COLOR_BG, color: COLOR_TEXTO, fontFamily: "'Space Grotesk',system-ui,sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes pkpub-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pkpub-drift { 0% { transform: translate(0,0) scale(1.06); } 50% { transform: translate(-2%,-1.5%) scale(1.12); } 100% { transform: translate(0,0) scale(1.06); } }
        .pkpub-marquee { animation: pkpub-slide 30s linear infinite; }
        .pkpub-hero-foto { animation: pkpub-drift 30s ease-in-out infinite; }
        a.pkpub-link { color: ${COLOR_RESALTE}; text-decoration: none; }
        a.pkpub-link:hover { color: ${acento}; }
        .pkpub-integrante:hover { background: ${acento} !important; color: ${COLOR_BG} !important; }
        .pkpub-red:hover { color: ${COLOR_RESALTE} !important; padding-left: 14px !important; }
        .pkpub-flyer:hover { border-color: ${acento} !important; }
        .pkpub-pdf:hover { color: ${COLOR_BG} !important; background: ${COLOR_RESALTE} !important; border-color: ${COLOR_RESALTE} !important; }
      `}</style>

      {/* Botón de PDF discreto, arriba a la izquierda -- brief del prompt
          fijo para Design: franja flotante translúcida sobre el héroe, sin
          competir con el resto del diseño. */}
      <div style={{ position: "fixed", top: 18, left: 18, zIndex: 50 }}>
        <PresskitPublicoBotonPdf datos={datos} />
      </div>

      {/* HERO -- foto de fondo a pantalla completa (a diferencia de la piel
          anterior, que partía la pantalla en dos columnas texto/foto), con
          degradado + tinte de acento y el nombre en Anton apoyado abajo. */}
      <section style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
        {fotoHero && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
            <img
              src={fotoHero.url}
              alt=""
              className="pkpub-hero-foto"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 32%", filter: "saturate(1.2) contrast(1.06)" }}
            />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,8,9,.72) 0%, rgba(11,8,9,.28) 40%, rgba(11,8,9,.92) 88%, #0b0809 100%)" }} />
        <div style={{ position: "absolute", inset: 0, mixBlendMode: "color", background: `linear-gradient(135deg, color-mix(in srgb, ${acento} 40%, transparent), color-mix(in srgb, ${COLOR_RESALTE} 25%, transparent))` }} />

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "76px clamp(20px,4vw,56px) 0", fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(243,238,230,.72)", gap: 16, flexWrap: "wrap" }}>
          <span>Presskit</span>
          {origenLinea && <span style={{ color: COLOR_RESALTE }}>{origenLinea}</span>}
        </div>

        <div style={{ position: "relative", flex: 1 }} />

        <div style={{ position: "relative", padding: "0 clamp(20px,4vw,56px) clamp(24px,4vw,56px)" }}>
          {tags.length > 0 && (
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "clamp(10px,1vw,12px)", letterSpacing: ".4em", textTransform: "uppercase", color: acento, marginBottom: "clamp(8px,1.4vw,18px)" }}>
              {tags.join(" · ")}
            </div>
          )}
          <h1
            style={{
              margin: 0,
              fontFamily: "Anton,sans-serif",
              fontWeight: 400,
              fontSize: "clamp(48px,11vw,196px)",
              lineHeight: 0.84,
              letterSpacing: "-.02em",
              textTransform: "uppercase",
              textShadow: `0 0 60px color-mix(in srgb, ${acento} 40%, transparent)`,
            }}
          >
            {datos.bandaNombre}
          </h1>
          {(anio || origenPartes.length > 0) && (
            <div style={{ marginTop: "clamp(14px,2vw,28px)", display: "flex", flexWrap: "wrap", gap: "10px 14px", alignItems: "center" }}>
              {anio && (
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", padding: "6px 12px", border: "1px solid rgba(243,238,230,.28)", borderRadius: 999 }}>
                  Desde {anio}
                </span>
              )}
              {origenPartes.map((p) => (
                <span key={p} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", padding: "6px 12px", border: "1px solid rgba(243,238,230,.28)", borderRadius: 999 }}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CINTA DE GÉNEROS */}
      {marquee.length > 0 && (
        <div style={{ background: COLOR_RESALTE, color: COLOR_BG, padding: "12px 0", overflow: "hidden", borderTop: "1px solid #0b0809", borderBottom: "1px solid #0b0809" }}>
          <div className="pkpub-marquee" style={{ display: "flex", width: "max-content", fontFamily: "Anton,sans-serif", textTransform: "uppercase", fontSize: "clamp(18px,2.4vw,30px)", letterSpacing: ".02em", whiteSpace: "nowrap" }}>
            {[0, 1].map((rep) => (
              <div key={rep} style={{ display: "flex", gap: 34, paddingRight: 34 }} aria-hidden={rep === 1 || undefined}>
                {marquee.map((m, idx) => (
                  <span key={idx}>
                    {m}
                    {idx < marquee.length - 1 ? " ·" : ""}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEMBLANZA */}
      {bio && (
        <section style={{ display: "grid", gridTemplateColumns: fotoSemblanza ? "1.4fr .6fr" : "1fr", gap: "clamp(32px,5vw,72px)", padding: "clamp(56px,9vw,140px) clamp(20px,4vw,56px)", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <EtiquetaSeccion numero="01" titulo="Semblanza" color={acento} />
            {titular && (
              <p style={{ margin: 0, fontSize: "clamp(21px,2.3vw,32px)", lineHeight: 1.32, fontWeight: 300, maxWidth: "34ch" }}>
                {titular}
              </p>
            )}
            {(columnas[0] || columnas[1]) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 16, lineHeight: 1.7, color: "rgba(243,238,230,.72)", maxWidth: "56ch" }}>
                {columnas[0] && <p style={{ margin: 0 }}>{columnas[0]}</p>}
                {columnas[1] && <p style={{ margin: 0 }}>{columnas[1]}</p>}
              </div>
            )}
          </div>
          {fotoSemblanza && (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
              <img src={fotoSemblanza.url} alt="" style={{ width: "100%", display: "block", filter: "grayscale(1) contrast(1.12)", border: "1px solid rgba(243,238,230,.14)" }} />
              <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen", background: `linear-gradient(200deg, color-mix(in srgb, ${acento} 28%, transparent), transparent 60%)`, pointerEvents: "none" }} />
              {caption && (
                <div style={{ position: "absolute", left: -10, bottom: -14, background: acento, color: COLOR_BG, fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", padding: "6px 10px" }}>
                  {caption}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* MANIFIESTO -- cita destacada sobre foto, brief §2: frase real de la
          semblanza (última oración), no inventada. */}
      {cita && (
        <section style={{ position: "relative", overflow: "hidden", padding: "clamp(60px,10vw,150px) clamp(20px,4vw,56px)" }}>
          {fotoManifiesto && (
            // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage.
            <img src={fotoManifiesto.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5, filter: "grayscale(.3)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: fotoManifiesto ? "linear-gradient(90deg, #0b0809 0%, rgba(11,8,9,.35) 55%, rgba(11,8,9,.85) 100%)" : "none" }} />
          <blockquote style={{ position: "relative", margin: 0, maxWidth: "20ch", fontFamily: "Anton,sans-serif", fontSize: "clamp(32px,6vw,96px)", lineHeight: 0.96, textTransform: "uppercase", color: COLOR_TEXTO }}>
            {cita}
          </blockquote>
        </section>
      )}

      {/* ORIGEN + INTEGRANTES */}
      {(hayOrigenBloque || hayIntegrantes) && (
        <section style={{ display: "grid", gridTemplateColumns: hayOrigenBloque && hayIntegrantes ? "0.34fr 0.66fr" : "1fr", borderTop: "1px solid rgba(243,238,230,.14)", borderBottom: "1px solid rgba(243,238,230,.14)" }}>
          {hayOrigenBloque && (
            <div style={{ padding: "clamp(48px,7vw,90px) clamp(20px,4vw,44px)", background: `color-mix(in srgb, ${acento} 10%, ${COLOR_BG})` }}>
              <EtiquetaSeccion numero="02" titulo="Origen" color={COLOR_RESALTE} />
              {origenPartes.length > 0 && (
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: "clamp(28px,3.2vw,46px)", lineHeight: 0.98, textTransform: "uppercase" }}>
                  {origenPartes.map((parte, idx) => (
                    <div key={idx}>{parte}</div>
                  ))}
                </div>
              )}
              {anio && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".12em", marginTop: 20, opacity: 0.75 }}>Activos desde {anio}</div>}
            </div>
          )}
          {hayIntegrantes && (
            <div style={{ padding: "clamp(48px,7vw,90px) clamp(20px,4vw,44px)" }}>
              <EtiquetaSeccion numero="03" titulo="Integrantes" color={acento} />
              <div>
                {datos.integrantes.map((i, idx) => (
                  <div
                    key={idx}
                    className="pkpub-integrante"
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 20,
                      padding: "16px 14px",
                      marginInline: -14,
                      borderTop: "1px solid rgba(243,238,230,.16)",
                      borderBottom: idx === datos.integrantes.length - 1 ? "1px solid rgba(243,238,230,.16)" : undefined,
                    }}
                  >
                    {i.redSocialUrl ? (
                      <a
                        href={i.redSocialUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: "Anton,sans-serif", fontSize: 32, textTransform: "uppercase", lineHeight: 1, color: acento, borderBottom: `3px solid ${acento}` }}
                      >
                        {i.nombre} ↗
                      </a>
                    ) : (
                      <span style={{ fontFamily: "Anton,sans-serif", fontSize: 32, textTransform: "uppercase", lineHeight: 1 }}>{i.nombre}</span>
                    )}
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.75 }}>{i.instrumento}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ESCENARIOS / FLYERS -- brief "los flyers llevan contexto, no se
          muestran sueltos": encabezado + copy antes de la grilla. */}
      {hayFlyers && (
        <section style={{ padding: "clamp(56px,9vw,120px) clamp(20px,4vw,56px)", borderBottom: "1px solid rgba(243,238,230,.14)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30, flexWrap: "wrap", marginBottom: 34 }}>
            <div>
              <EtiquetaSeccion numero="04" titulo="Escenarios" color={acento} />
              <h2 style={{ fontFamily: "Anton,sans-serif", fontSize: "clamp(34px,5vw,64px)", lineHeight: 0.94, textTransform: "uppercase", margin: 0 }}>
                Algunos de
                <br />
                nuestros shows
              </h2>
            </div>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 12.5, lineHeight: 1.7, maxWidth: "34ch", margin: 0, opacity: 0.7 }}>
              Carteles de algunos de los eventos más importantes en los que hemos tocado.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {datos.fotosFlyer.map((f, idx) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-flyer" style={{ display: "block", aspectRatio: "3/4", overflow: "hidden", border: "1px solid rgba(243,238,230,.2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
                <img src={f.url} alt={`Cartel de show ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PRÓXIMAS FECHAS */}
      {hayFechas && (
        <section style={{ padding: "clamp(48px,7vw,90px) clamp(20px,4vw,56px)", background: COLOR_RESALTE, color: COLOR_BG }}>
          <EtiquetaSeccion numero="05" titulo="Próximas fechas" color={COLOR_BG} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {datos.proximasFechas.map((f, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 34,
                  flexWrap: "wrap",
                  padding: "20px 0",
                  borderTop: "1px solid rgba(11,8,9,.3)",
                  borderBottom: idx === datos.proximasFechas.length - 1 ? "1px solid rgba(11,8,9,.3)" : undefined,
                }}
              >
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", minWidth: 200 }}>{formatearFechaCorta(f.fechaInicio)}</div>
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: "clamp(28px,4vw,50px)", lineHeight: 1, textTransform: "uppercase" }}>{f.titulo}</div>
                {f.lugarNombre && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.7 }}>{f.lugarNombre}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ESCÚCHALO + CONTACTO */}
      {(hayRedes || hayContacto) && (
        <section style={{ padding: "clamp(56px,9vw,120px) clamp(20px,4vw,56px) 60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: hayRedes && hayContacto ? "1.1fr .9fr" : "1fr", gap: 60, alignItems: "start" }}>
            {hayRedes && (
              <div>
                <EtiquetaSeccion numero="06" titulo="Escúchalo" color={acento} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {datos.redes.map((r, idx) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="pkpub-red"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 16,
                        padding: "16px 4px",
                        borderTop: "1px solid rgba(243,238,230,.16)",
                        borderBottom: idx === datos.redes.length - 1 ? "1px solid rgba(243,238,230,.16)" : undefined,
                        fontFamily: "Anton,sans-serif",
                        fontSize: "clamp(24px,3vw,40px)",
                        textTransform: "uppercase",
                        color: COLOR_TEXTO,
                        transition: "padding-left .15s",
                      }}
                    >
                      <span>{r.plataforma}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: ".2em", color: "rgba(243,238,230,.5)" }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {hayContacto && (
              <div>
                <EtiquetaSeccion numero="07" titulo="Contacto" color={acento} />
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: 32, textTransform: "uppercase", marginBottom: 12 }}>{datos.presskit.contactoNombre || datos.bandaNombre}</div>
                <div style={{ display: "grid", gap: 8, fontFamily: "'Space Mono',monospace", fontSize: 14, letterSpacing: ".04em" }}>
                  {datos.presskit.contactoTelefono && (
                    <a href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} className="pkpub-link" style={{ justifySelf: "start" }}>
                      {datos.presskit.contactoTelefono}
                    </a>
                  )}
                  {datos.presskit.contactoEmail && (
                    <a href={`mailto:${datos.presskit.contactoEmail}`} className="pkpub-link" style={{ justifySelf: "start" }}>
                      {datos.presskit.contactoEmail}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginTop: 64, paddingTop: 18, borderTop: "1px solid rgba(243,238,230,.16)", fontFamily: "'Space Mono',monospace", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", opacity: 0.55 }}>
            <span>{datos.bandaNombre}</span>
            <span>{tags.join(" · ")}</span>
            <span>{origenLinea}</span>
          </div>
        </section>
      )}
    </div>
  );
}
