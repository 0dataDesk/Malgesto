import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerBandaPorSlugPresskit, obtenerPresskitPublico, type PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoBotonPdf } from "@/components/presskit/PresskitPublicoBotonPdf";

// Brief "Presskit — vista pública real dentro de Malgesto App": puerto del
// diseño importado de Claude Design (proyecto "Presskit de Juana LR",
// Presskit Juana LR.dc.html) a una ruta real de Malgesto App, con datos
// reales de Supabase en vez de contenido pegado a mano -- deliberadamente
// fuera de proxy.ts (mismo criterio que /plot/[token], ver ese archivo):
// sin sesión ni membresía, la única forma de acceso es conocer el slug
// (nombre de la banda "slugificado", ver slugificarNombreBanda en
// lib/presskitData.ts). El texto curado del mockup (semblanza en dos
// columnas, cita destacada, cinta de géneros) no vive en ninguna tabla
// propia -- se deriva acá mismo de bio_larga con heurísticas simples
// (oraciones, no NLP) para que la página siga funcionando cuando una banda
// futura publique la suya con su propia semblanza, no solo con la de Juana
// LR. Cada sección se oculta si esa banda todavía no cargó ese contenido en
// vez de mostrar un hueco vacío.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) return {};
  return {
    title: `${banda.bandaNombre} — Presskit`,
    description: banda.bandaGenero ? `Presskit de ${banda.bandaNombre} (${banda.bandaGenero}).` : `Presskit de ${banda.bandaNombre}.`,
  };
}

function colorSeguro(c: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) || /^oklch\([\d.\s%]+\)$/i.test(c) ? c : "#8b1e2b";
}

// Heurística de oraciones (no NLP): agrupa oraciones hasta sumar ~140
// caracteres para el titular en negrita (mismo tamaño que ocupaba el
// arranque de la semblanza en el mockup original), reparte el resto en dos
// columnas parejas.
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

// La última oración suele ser la más "cerrada"/quotable de una semblanza
// escrita como texto corrido -- funcionó bien para Juana LR ("...no pide
// permiso para ser escuchada...") sin necesitar ninguna marca especial en
// el texto.
function extraerCita(bio: string): string | null {
  const oraciones = bio.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const ultima = oraciones[oraciones.length - 1]?.replace(/[.!?]+$/, "").trim();
  return ultima ? `“${ultima}”` : null;
}

function extraerAnioFundacion(bio: string): string | null {
  const m = bio.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

function categoriaPlataforma(plataforma: string): "Música" | "Redes" | "Link" {
  const p = plataforma.toLowerCase();
  if (/spotify|apple\s*music|youtube|soundcloud|bandcamp|deezer|tidal/.test(p)) return "Música";
  if (/instagram|tiktok|facebook|threads|twitter|^x$/.test(p)) return "Redes";
  return "Link";
}

function formatearFechaCorta(iso: string): string {
  const partes = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(new Date(iso));
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${obtener("day")} ${obtener("month").replace(".", "").toUpperCase()} ${obtener("year")}`;
}

function MetaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span>{etiqueta}</span>
      <span style={{ color: "#f2ede1", fontSize: 15, letterSpacing: ".1em" }}>{valor}</span>
    </div>
  );
}

function FilaContacto({ etiqueta, valor, href }: { etiqueta: string; valor: string; href?: string }) {
  const estiloFila = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    padding: "18px 0",
    borderBottom: "3px solid #0d0c0b",
    color: "#0d0c0b",
  } as const;
  const contenido = (
    <>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#6c6559" }}>
        {etiqueta}
      </span>
      <span style={{ fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(15px,1.6vw,22px)", textTransform: "uppercase" }}>{valor}</span>
    </>
  );
  return href ? (
    <a href={href} className="pkpub-link" style={estiloFila}>
      {contenido}
    </a>
  ) : (
    <div style={estiloFila}>{contenido}</div>
  );
}

function seccionHeader(titulo: string, badge: string, acento: string) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 36 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "'Archivo Black',sans-serif",
          textTransform: "uppercase",
          fontSize: "clamp(30px,4.5vw,64px)",
          lineHeight: 0.9,
          letterSpacing: "-.02em",
        }}
      >
        {titulo}
      </h2>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".25em", textTransform: "uppercase", color: acento }}>{badge}</span>
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

  const origenLinea = [datos.presskit.pais, datos.presskit.ciudad].filter(Boolean).join(" · ");
  const kicker = [origenLinea, anio].filter(Boolean).join(" · ");
  const tagline = datos.bandaGenero
    ? `${datos.bandaGenero} desde ${[datos.presskit.ciudad, datos.presskit.pais].filter(Boolean).join(", ") || "algún lugar"}.`
    : "";
  const fotoHero = datos.fotosBanda[0]?.url ?? null;

  const hayIntegrantes = datos.integrantes.length > 0;
  const hayFotos = datos.fotosBanda.length > 0;
  const hayFechas = datos.proximasFechas.length > 0;
  const hayFlyers = datos.fotosFlyer.length > 0;
  const hayRedes = datos.redes.length > 0;

  const redPrincipal = datos.redes.find((r) => categoriaPlataforma(r.plataforma) === "Música") ?? datos.redes[0] ?? null;
  const etiquetaCta = redPrincipal
    ? categoriaPlataforma(redPrincipal.plataforma) === "Música"
      ? "Escuchar"
      : categoriaPlataforma(redPrincipal.plataforma) === "Redes"
        ? "Seguir en"
        : "Visitar"
    : null;

  const marquee = datos.bandaGenero ? Array.from({ length: 6 }, () => datos.bandaGenero as string) : [];

  const anchors: { href: string; label: string }[] = [];
  if (bio) anchors.push({ href: "#semblanza", label: "Semblanza" });
  if (hayIntegrantes) anchors.push({ href: "#banda", label: "Banda" });
  if (hayFotos) anchors.push({ href: "#fotos", label: "Fotos" });
  if (hayFechas) anchors.push({ href: "#fechas", label: "Fechas" });
  anchors.push({ href: "#contacto", label: "Contacto" });

  return (
    <div style={{ background: "#0d0c0b", color: "#f2ede1", fontFamily: "'Archivo',sans-serif", overflowX: "hidden", minHeight: "100vh" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:ital,wght@0,400;0,600;0,800;1,400&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes pkpub-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pkpub-marquee { animation: pkpub-marquee 22s linear infinite; }
        .pkpub-hover-accent:hover { background: ${acento} !important; color: #0d0c0b !important; }
        .pkpub-hover-invert:hover { background: #f2ede1 !important; color: #0d0c0b !important; }
        .pkpub-hover-border:hover { border-color: ${acento} !important; }
        .pkpub-link:hover { color: ${acento} !important; }
      `}</style>

      {/* Franja utilitaria + nav de marca -- brief del prompt fijo (Design):
          botón de PDF discreto arriba a la izquierda, en su propia franja
          oscura/neutra separada de la barra de marca (protagonista, en el
          acento de la banda), para que no compita visualmente con ella. */}
      <div style={{ position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ background: "#0d0c0b", borderBottom: "1px solid #262320", padding: "6px 20px" }}>
          <PresskitPublicoBotonPdf datos={datos} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            padding: "10px 24px",
            background: acento,
            color: "#0d0c0b",
            borderBottom: "3px solid #0d0c0b",
          }}
        >
          <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase" }}>
            {datos.bandaNombre}
            {datos.bandaGenero ? ` · ${datos.bandaGenero}` : ""}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {anchors.map((a) => (
              <a key={a.href} href={a.href} style={{ color: "#0d0c0b" }}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section style={{ position: "relative", borderBottom: `3px solid ${acento}` }}>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: fotoHero ? "1.15fr .85fr" : "1fr", minHeight: "72vh" }}>
          <div style={{ padding: "64px 40px 48px 48px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
            {kicker && (
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, letterSpacing: ".3em", textTransform: "uppercase", color: acento }}>{kicker}</div>
            )}
            <h1
              style={{
                margin: 0,
                fontFamily: "'Archivo Black',sans-serif",
                textTransform: "uppercase",
                lineHeight: 0.86,
                letterSpacing: "-.03em",
                fontSize: "clamp(48px,7.5vw,116px)",
              }}
            >
              {datos.bandaNombre}
            </h1>
            {tagline && <p style={{ margin: 0, maxWidth: "34ch", fontSize: 19, lineHeight: 1.45, color: "#c9c2b4" }}>{tagline}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {redPrincipal && (
                <a
                  href={redPrincipal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="pkpub-hover-invert"
                  style={{
                    background: acento,
                    color: "#0d0c0b",
                    fontFamily: "'Space Mono',monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    padding: "14px 20px",
                  }}
                >
                  {etiquetaCta} {redPrincipal.plataforma}
                </a>
              )}
              <a
                href="#contacto"
                className="pkpub-hover-invert"
                style={{
                  border: "2px solid #f2ede1",
                  color: "#f2ede1",
                  fontFamily: "'Space Mono',monospace",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  padding: "12px 20px",
                }}
              >
                Booking
              </a>
            </div>
          </div>
          {fotoHero && (
            <div style={{ position: "relative", borderLeft: `3px solid ${acento}`, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URLs remotas de Supabase Storage; mismo criterio (<img> plano) que PresskitCaptura.tsx. */}
              <img src={fotoHero} alt={datos.bandaNombre} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(1) contrast(1.2)" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${acento} 28%, transparent), rgba(13,12,11,.55))`,
                }}
              />
            </div>
          )}
        </div>

        {marquee.length > 0 && (
          <div style={{ display: "flex", background: "#f2ede1", color: "#0d0c0b", borderTop: "3px solid #0d0c0b", overflow: "hidden" }}>
            <div
              className="pkpub-marquee"
              style={{ display: "flex", width: "max-content", padding: "12px 0", fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: 15, letterSpacing: ".06em", whiteSpace: "nowrap" }}
            >
              {[0, 1].map((rep) => (
                <div key={rep} style={{ display: "flex", gap: 44, padding: "0 22px" }} aria-hidden={rep === 1 || undefined}>
                  {marquee.map((m, idx) => (
                    <span key={idx} style={{ color: idx % 2 === 1 ? acento : undefined }}>
                      {m}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Semblanza */}
      {bio && (
        <section id="semblanza" style={{ padding: "88px 48px", borderBottom: "3px solid #262320" }}>
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Space Mono',monospace",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".3em",
                textTransform: "uppercase",
                color: acento,
                position: "sticky",
                top: 80,
              }}
            >
              Semblanza
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, maxWidth: "78ch" }}>
              {titular && (
                <p style={{ margin: 0, fontFamily: "'Archivo Black',sans-serif", fontSize: "clamp(22px,2.2vw,32px)", lineHeight: 1.2, letterSpacing: "-.01em" }}>
                  {titular}
                </p>
              )}
              {(columnas[0] || columnas[1]) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 34 }}>
                  {columnas[0] && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#c9c2b4" }}>{columnas[0]}</p>}
                  {columnas[1] && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#c9c2b4" }}>{columnas[1]}</p>}
                </div>
              )}
              {cita && (
                <div style={{ borderTop: `3px solid ${acento}`, borderBottom: `3px solid ${acento}`, padding: "22px 0", marginTop: 8 }}>
                  <p style={{ margin: 0, fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: "clamp(20px,2.6vw,38px)", lineHeight: 1, letterSpacing: "-.02em", color: acento }}>
                    {cita}
                  </p>
                </div>
              )}
              <div style={{ display: "flex", gap: 56, flexWrap: "wrap", fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#8d8578" }}>
                {datos.bandaGenero && <MetaDato etiqueta="Género" valor={datos.bandaGenero} />}
                {datos.presskit.pais && <MetaDato etiqueta="País" valor={datos.presskit.pais} />}
                {datos.presskit.ciudad && <MetaDato etiqueta="Ciudad" valor={datos.presskit.ciudad} />}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Banda / Integrantes */}
      {hayIntegrantes && (
        <section id="banda" style={{ padding: "88px 48px", borderBottom: "3px solid #262320", background: "#f2ede1", color: "#0d0c0b" }}>
          {seccionHeader("Integrantes", String(datos.integrantes.length).padStart(2, "0"), acento)}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 3, background: "#0d0c0b", border: "3px solid #0d0c0b" }}>
            {datos.integrantes.map((i, idx) => (
              <div
                key={idx}
                className="pkpub-hover-accent"
                style={{ background: "#f2ede1", padding: "28px 22px", display: "grid", gridTemplateRows: "auto 1fr auto", gap: 10, minHeight: 180 }}
              >
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".22em", color: "#7a7368" }}>{String(idx + 1).padStart(2, "0")}</span>
                <h3 style={{ margin: 0, fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: 26, lineHeight: 0.95 }}>{i.nombre}</h3>
                <p style={{ margin: 0, fontFamily: "'Space Mono',monospace", fontSize: 12, lineHeight: 1.4, letterSpacing: ".14em", textTransform: "uppercase" }}>{i.instrumento}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fotos de banda */}
      {hayFotos && (
        <section id="fotos" style={{ padding: "88px 48px", borderBottom: "3px solid #262320" }}>
          {seccionHeader("Fotos de banda", "Prensa", acento)}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {datos.fotosBanda.map((f, idx) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-hover-border" style={{ display: "block", border: "3px solid #f2ede1", aspectRatio: "4/5", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URLs remotas de Supabase Storage. */}
                <img src={f.url} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Próximas fechas */}
      {hayFechas && (
        <section id="fechas" style={{ padding: "88px 48px", borderBottom: "3px solid #262320", background: acento, color: "#0d0c0b" }}>
          {seccionHeader("Próximas fechas", String(new Date().getFullYear()), "#0d0c0b")}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {datos.proximasFechas.map((f, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  gap: 24,
                  alignItems: "baseline",
                  padding: "20px 0",
                  borderTop: "3px solid #0d0c0b",
                  borderBottom: idx === datos.proximasFechas.length - 1 ? "3px solid #0d0c0b" : undefined,
                }}
              >
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>
                  {formatearFechaCorta(f.fechaInicio)}
                </span>
                <span style={{ fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: "clamp(18px,2.2vw,28px)", lineHeight: 1.05 }}>
                  {f.titulo}
                  {f.lugarNombre ? ` — ${f.lugarNombre}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flyers */}
      {hayFlyers && (
        <section style={{ padding: "88px 48px", borderBottom: "3px solid #262320" }}>
          {seccionHeader("Flyers", String(datos.fotosFlyer.length).padStart(2, "0"), acento)}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {datos.fotosFlyer.map((f, idx) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-hover-border" style={{ display: "block", border: "3px solid #262320", aspectRatio: "3/4", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- URLs remotas de Supabase Storage. */}
                <img src={f.url} alt={`Flyer ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Escúchanos / Síguenos */}
      {hayRedes && (
        <section style={{ padding: "88px 48px", borderBottom: "3px solid #262320" }}>
          <h2 style={{ margin: "0 0 36px", fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: "clamp(30px,4.5vw,64px)", lineHeight: 0.9, letterSpacing: "-.02em" }}>
            Escúchanos
            <br />
            <span style={{ color: acento }}>Síguenos</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 3, background: "#262320", border: "3px solid #262320" }}>
            {datos.redes.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="pkpub-hover-accent"
                style={{ background: "#0d0c0b", color: "#f2ede1", padding: "26px 22px", display: "grid", gridTemplateRows: "1fr auto", gap: 8 }}
              >
                <span style={{ fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: 22 }}>{r.plataforma}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", opacity: 0.6 }}>
                  {categoriaPlataforma(r.plataforma)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Contacto */}
      <section id="contacto" style={{ padding: "88px 48px 64px", background: "#f2ede1", color: "#0d0c0b" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "end" }}>
          <div>
            <h2 style={{ margin: "0 0 24px", fontFamily: "'Archivo Black',sans-serif", textTransform: "uppercase", fontSize: "clamp(36px,6vw,84px)", lineHeight: 0.86, letterSpacing: "-.03em" }}>
              Contacto
              <br />
              <span style={{ color: acento }}>&amp; booking</span>
            </h2>
            <p style={{ margin: 0, fontFamily: "'Space Mono',monospace", fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", color: "#6c6559" }}>
              {datos.bandaNombre}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", borderTop: "3px solid #0d0c0b" }}>
            {datos.presskit.contactoEmail && <FilaContacto etiqueta="Email" valor={datos.presskit.contactoEmail} href={`mailto:${datos.presskit.contactoEmail}`} />}
            {datos.presskit.contactoTelefono && (
              <FilaContacto etiqueta="Teléfono" valor={datos.presskit.contactoTelefono} href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} />
            )}
            {origenLinea && <FilaContacto etiqueta="Origen" valor={origenLinea} />}
          </div>
        </div>
        <div
          style={{
            marginTop: 64,
            borderTop: "3px solid #0d0c0b",
            paddingTop: 16,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "'Space Mono',monospace",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: "#6c6559",
          }}
        >
          <span>{datos.bandaNombre} — Presskit</span>
          <span>{[datos.bandaGenero, datos.presskit.pais].filter(Boolean).join(" · ")}</span>
        </div>
      </section>
    </div>
  );
}
