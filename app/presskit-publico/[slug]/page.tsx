import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerBandaPorSlugPresskit, obtenerPresskitPublico, type PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoBotonPdf } from "@/components/presskit/PresskitPublicoBotonPdf";

// Brief "Presskit — actualización de diseño (handoff punk de Design)":
// puerto del proyecto "Presskit Juana LR punk" (Claude Design,
// Presskit Juana LR.dc.html) a esta misma ruta -- reemplaza la identidad
// visual anterior (negro/Archivo Black) por la nueva (cream/Anton/Barlow +
// rojo·amarillo), con datos reales de Supabase en vez de contenido pegado a
// mano. Genérica para cualquier banda futura: `acento` sale de
// `bandas.color` (no del rojo fijo del mockup, que era solo el color propio
// de Juana LR); el amarillo sí queda fijo -- es un tono de resalte del
// sistema visual, no de marca. El texto curado del mockup (semblanza en dos
// columnas, cita/caption breve, cinta de géneros) no vive en ninguna tabla
// propia -- se deriva acá mismo con heurísticas simples (oraciones, no NLP)
// para que seguir funcionando cuando una banda futura publique la suya.
// Deliberadamente fuera de proxy.ts (mismo criterio que /plot/[token]): sin
// sesión ni membresía, la única forma de acceso es conocer el slug.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) return {};
  return {
    title: `${banda.bandaNombre} — Presskit`,
    description: banda.bandaGenero ? `Presskit de ${banda.bandaNombre} (${banda.bandaGenero}).` : `Presskit de ${banda.bandaNombre}.`,
  };
}

const COLOR_BG = "#ece7dd";
const COLOR_INK = "#14110f";
const COLOR_HILITE = "#f2e14c";

function colorSeguro(c: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^oklch\([\d.\s%]+\)$/i.test(c) ? c : "#8b1e2b";
}

// Brief §3: los tags de género vienen de un solo campo texto
// (bandas.genero) -- para Juana LR ya se carga como "Punk | Ska | Rock
// Alternativo | Garage", pero acepta cualquier separador común (coma,
// slash, medio punto) para que una banda futura no dependa de usar "|".
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

function extraerAnioFundacion(bio: string): string | null {
  const m = bio.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

// Brief §2: el caption corto sobre la foto de héroe (mockup: "Más de una
// década sin pedir permiso") es una frase curada a mano por Design, no un
// extracto literal de la semblanza -- para que una banda futura sin ese
// tipo de redacción no se quede sin caption ni con un extracto
// desproporcionado, se compone acá con datos ya estructurados (año +
// primer tag de género) en vez de intentar adivinar la frase ideal desde
// texto libre.
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
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color, marginBottom: 22 }}>
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
  const anio = bio ? extraerAnioFundacion(bio) : null;
  const tags = tagsGenero(datos.bandaGenero);
  const caption = captionFoto(anio, tags);
  const origenPartes = [datos.presskit.pais, datos.presskit.ciudad].filter((v): v is string => Boolean(v));
  const origenLinea = origenPartes.join(" · ");

  // Brief "Las fotos de banda/conceptuales se usan como material visual
  // (fondo, ambientación), no como una galería enumerada": en vez de listar
  // todas las fotosBanda en una grilla, cada una cumple un rol puntual de
  // ambientación -- [0] foto de héroe, [1] acorte decorativo junto a la
  // semblanza, [2] marca/logo en la esquina del héroe (mix-blend-mode:
  // multiply, pensado para un PNG con fondo transparente). Una banda con
  // menos de 3 fotos de banda simplemente no ve los roles que le faltan --
  // ninguno es obligatorio.
  const fotoHero = datos.fotosBanda[0] ?? null;
  const fotoSemblanza = datos.fotosBanda[1] ?? null;
  const fotoLogo = datos.fotosBanda[2] ?? null;

  const hayIntegrantes = datos.integrantes.length > 0;
  const hayFechas = datos.proximasFechas.length > 0;
  const hayFlyers = datos.fotosFlyer.length > 0;
  const hayRedes = datos.redes.length > 0;
  const hayOrigenBloque = Boolean(origenLinea || anio);
  const hayContacto = Boolean(datos.presskit.contactoTelefono || datos.presskit.contactoEmail);

  const marquee = tags.length > 0 ? tags : datos.bandaGenero ? [datos.bandaGenero] : [];

  return (
    <div style={{ background: COLOR_BG, color: COLOR_INK, fontFamily: "Barlow,sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,400;0,600;0,800;1,400&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes pkpub-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pkpub-marquee { animation: pkpub-slide 26s linear infinite; }
        a.pkpub-link { color: ${acento}; text-decoration: none; }
        a.pkpub-link:hover { color: ${COLOR_INK}; background: ${COLOR_HILITE}; }
        .pkpub-integrante:hover { background: ${acento} !important; color: ${COLOR_BG} !important; }
        .pkpub-red:hover { background: ${COLOR_HILITE} !important; color: ${COLOR_INK} !important; border-color: ${COLOR_HILITE} !important; }
        .pkpub-flyer:hover { border-color: ${acento} !important; }
        .pkpub-pdf:hover { opacity: 1 !important; border-bottom-color: ${acento} !important; color: ${acento} !important; }
      `}</style>

      {/* Botón de PDF discreto, arriba a la izquierda -- brief §2: en su
          propia franja flotante sobre el héroe, sin competir con el resto
          del diseño (acá no hay barra de marca/nav: el mockup punk es un
          scroll continuo, sin anclas de sección). */}
      <div style={{ position: "fixed", top: 0, left: 0, zIndex: 50, padding: "14px 18px" }}>
        <PresskitPublicoBotonPdf datos={datos} />
      </div>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "grid", gridTemplateColumns: fotoHero ? "1.05fr .95fr" : "1fr", borderBottom: `3px solid ${COLOR_INK}` }}>
        <div style={{ padding: "96px 44px 40px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 32 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", display: "flex", gap: 18, flexWrap: "wrap", opacity: 0.7 }}>
            <span>Presskit</span>
            {origenLinea && (
              <>
                <span>·</span>
                <span>{origenLinea}</span>
              </>
            )}
            {anio && (
              <>
                <span>·</span>
                <span>Desde {anio}</span>
              </>
            )}
          </div>
          <div>
            <h1
              style={{
                fontFamily: "Anton,sans-serif",
                fontWeight: 400,
                fontSize: "clamp(48px,8vw,132px)",
                lineHeight: 0.86,
                letterSpacing: "-.02em",
                textTransform: "uppercase",
                margin: "0 0 18px 0",
              }}
            >
              {datos.bandaNombre}
            </h1>
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 26 }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", background: COLOR_INK, color: COLOR_BG, padding: "5px 11px" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Rol de logo (brief §1): tercera foto de banda, tratada como
              marca sobre fondo transparente -- se oculta sola si esa banda
              no cargó una tercera foto. */}
          {fotoLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage.
            <img src={fotoLogo.url} alt={`Logo ${datos.bandaNombre}`} style={{ width: "min(280px,55%)", height: "auto", mixBlendMode: "multiply", alignSelf: "flex-start" }} />
          )}
        </div>
        {fotoHero && (
          <div style={{ position: "relative", background: COLOR_INK, overflow: "hidden", borderLeft: `3px solid ${COLOR_INK}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
            <img
              src={fotoHero.url}
              alt={datos.bandaNombre}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.2) brightness(.95)" }}
            />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(200deg, color-mix(in srgb, ${acento} 32%, transparent), rgba(20,17,15,.15) 55%, rgba(20,17,15,.55))` }} />
            {caption && (
              <div style={{ position: "absolute", left: 0, bottom: 26, background: COLOR_HILITE, color: COLOR_INK, fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", padding: "7px 14px" }}>
                {caption}
              </div>
            )}
          </div>
        )}
      </section>

      {/* MARQUEE */}
      {marquee.length > 0 && (
        <div style={{ background: acento, color: COLOR_BG, borderBottom: `3px solid ${COLOR_INK}`, overflow: "hidden", padding: "11px 0" }}>
          <div className="pkpub-marquee" style={{ display: "flex", width: "max-content", fontFamily: "Anton,sans-serif", textTransform: "uppercase", fontSize: 22, letterSpacing: ".06em", whiteSpace: "nowrap" }}>
            {[0, 1].map((rep) => (
              <div key={rep} style={{ display: "flex", gap: 26, padding: "0 22px" }} aria-hidden={rep === 1 || undefined}>
                {marquee.map((m, idx) => (
                  <span key={idx}>{m} ·</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEMBLANZA */}
      {bio && (
        <section id="semblanza" style={{ display: "grid", gridTemplateColumns: fotoSemblanza ? "1.4fr .6fr" : "1fr", gap: 56, padding: "76px 44px", borderBottom: `3px solid ${COLOR_INK}`, alignItems: "start" }}>
          <div>
            <EtiquetaSeccion numero="01" titulo="Semblanza" color={acento} />
            {titular && <p style={{ fontFamily: "Barlow,sans-serif", fontSize: 25, lineHeight: 1.34, fontWeight: 600, margin: "0 0 26px 0", maxWidth: "22ch" }}>{titular}</p>}
            {(columnas[0] || columnas[1]) && (
              <div style={{ columnCount: 2, columnGap: 38, fontSize: 16.5, lineHeight: 1.62 }}>
                {columnas[0] && <p style={{ margin: "0 0 15px 0" }}>{columnas[0]}</p>}
                {columnas[1] && <p style={{ margin: 0 }}>{columnas[1]}</p>}
              </div>
            )}
          </div>
          {fotoSemblanza && (
            <div style={{ position: "relative", paddingTop: 18 }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%) rotate(-3deg)", width: 88, height: 26, background: "rgba(242,225,76,.85)", border: "1px solid rgba(20,17,15,.15)", zIndex: 2 }} />
              {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
              <img
                src={fotoSemblanza.url}
                alt=""
                style={{ width: "100%", height: "auto", display: "block", transform: "rotate(1.4deg)", border: `3px solid ${COLOR_INK}`, boxShadow: "10px 12px 0 rgba(20,17,15,.16)" }}
              />
            </div>
          )}
        </section>
      )}

      {/* ORIGEN + INTEGRANTES */}
      {(hayOrigenBloque || hayIntegrantes) && (
        <section style={{ display: "grid", gridTemplateColumns: hayOrigenBloque && hayIntegrantes ? "0.34fr 0.66fr" : "1fr", borderBottom: `3px solid ${COLOR_INK}` }}>
          {hayOrigenBloque && (
            <div style={{ padding: "70px 44px", background: COLOR_INK, color: COLOR_BG }}>
              <EtiquetaSeccion numero="02" titulo="Origen" color={COLOR_HILITE} />
              {origenPartes.length > 0 && (
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: 46, lineHeight: 0.98, textTransform: "uppercase" }}>
                  {origenPartes.map((parte, idx) => (
                    <div key={idx}>{parte}</div>
                  ))}
                </div>
              )}
              {anio && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".12em", marginTop: 20, opacity: 0.75 }}>Activos desde {anio}</div>}
            </div>
          )}
          {hayIntegrantes && (
            <div style={{ padding: "70px 44px" }}>
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
                      borderTop: "1px solid rgba(20,17,15,.25)",
                      borderBottom: idx === datos.integrantes.length - 1 ? "1px solid rgba(20,17,15,.25)" : undefined,
                    }}
                  >
                    {i.redSocialUrl ? (
                      <a
                        href={i.redSocialUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: "Anton,sans-serif", fontSize: 34, textTransform: "uppercase", lineHeight: 1, color: acento, borderBottom: `3px solid ${acento}` }}
                      >
                        {i.nombre} ↗
                      </a>
                    ) : (
                      <span style={{ fontFamily: "Anton,sans-serif", fontSize: 34, textTransform: "uppercase", lineHeight: 1 }}>{i.nombre}</span>
                    )}
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.8 }}>{i.instrumento}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ESCENARIOS / FLYERS -- brief "los flyers llevan contexto, no se
          muestran sueltos": encabezado + copy explicando qué son antes de
          la grilla, en vez de una grilla suelta sin marco. */}
      {hayFlyers && (
        <section style={{ padding: "76px 44px", borderBottom: `3px solid ${COLOR_INK}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30, flexWrap: "wrap", marginBottom: 34 }}>
            <div>
              <EtiquetaSeccion numero="04" titulo="Escenarios" color={acento} />
              <h2 style={{ fontFamily: "Anton,sans-serif", fontSize: "clamp(38px,5.4vw,70px)", lineHeight: 0.94, textTransform: "uppercase", margin: 0 }}>
                Algunos de
                <br />
                nuestros shows
              </h2>
            </div>
            <p style={{ fontFamily: "'Space Mono',monospace", fontSize: 12.5, lineHeight: 1.7, maxWidth: "34ch", margin: 0, opacity: 0.78 }}>
              Carteles de algunos de los eventos más importantes en los que hemos tocado.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 18 }}>
            {datos.fotosFlyer.map((f, idx) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-flyer" style={{ display: "block", aspectRatio: "3/4", overflow: "hidden", border: `3px solid ${COLOR_INK}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
                <img src={f.url} alt={`Cartel de show ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PRÓXIMAS FECHAS */}
      {hayFechas && (
        <section style={{ padding: "70px 44px", background: COLOR_HILITE, borderBottom: `3px solid ${COLOR_INK}` }}>
          <EtiquetaSeccion numero="05" titulo="Próximas fechas" color={COLOR_INK} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {datos.proximasFechas.map((f, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 34,
                  flexWrap: "wrap",
                  padding: "22px 0",
                  borderTop: `3px solid ${COLOR_INK}`,
                  borderBottom: idx === datos.proximasFechas.length - 1 ? `3px solid ${COLOR_INK}` : undefined,
                }}
              >
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", minWidth: 200 }}>{formatearFechaCorta(f.fechaInicio)}</div>
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: "clamp(34px,4.6vw,58px)", lineHeight: 1, textTransform: "uppercase" }}>{f.titulo}</div>
                {f.lugarNombre && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.75 }}>{f.lugarNombre}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LINKS + CONTACTO */}
      {(hayRedes || hayContacto) && (
        <section id="contacto" style={{ background: COLOR_INK, color: COLOR_BG, padding: "76px 44px 44px 44px" }}>
          <div style={{ display: "grid", gridTemplateColumns: hayRedes && hayContacto ? "1.1fr .9fr" : "1fr", gap: 60, alignItems: "start" }}>
            {hayRedes && (
              <div>
                <EtiquetaSeccion numero="06" titulo="Escúchanos / síguenos" color={COLOR_HILITE} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {datos.redes.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="pkpub-red"
                      style={{ fontFamily: "Anton,sans-serif", fontSize: 22, textTransform: "uppercase", color: COLOR_BG, border: "2px solid rgba(236,231,221,.35)", padding: "12px 14px", display: "block" }}
                    >
                      {r.plataforma} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
            {hayContacto && (
              <div>
                <EtiquetaSeccion numero="07" titulo="Contacto" color={COLOR_HILITE} />
                <div style={{ fontFamily: "Anton,sans-serif", fontSize: 34, textTransform: "uppercase", marginBottom: 16 }}>{datos.presskit.contactoNombre || datos.bandaNombre}</div>
                <div style={{ display: "grid", gap: 8, fontFamily: "'Space Mono',monospace", fontSize: 14, letterSpacing: ".04em" }}>
                  {datos.presskit.contactoTelefono && (
                    <a href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} className="pkpub-link" style={{ color: COLOR_BG, borderBottom: "1px solid rgba(236,231,221,.35)", justifySelf: "start" }}>
                      {datos.presskit.contactoTelefono}
                    </a>
                  )}
                  {datos.presskit.contactoEmail && (
                    <a href={`mailto:${datos.presskit.contactoEmail}`} className="pkpub-link" style={{ color: COLOR_BG, borderBottom: "1px solid rgba(236,231,221,.35)", justifySelf: "start" }}>
                      {datos.presskit.contactoEmail}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginTop: 64, paddingTop: 18, borderTop: "1px solid rgba(236,231,221,.25)", fontFamily: "'Space Mono',monospace", fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", opacity: 0.6 }}>
            <span>{datos.bandaNombre}</span>
            <span>{tags.join(" · ")}</span>
            <span>{origenLinea}</span>
          </div>
        </section>
      )}
    </div>
  );
}
