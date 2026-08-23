"use client";

import type { PresskitPublico } from "@/lib/presskitData";
import { colorSeguro, tagsGenero, dividirSemblanza, extraerAnioFundacion, captionFoto, formatearFechaCorta } from "@/lib/presskitTexto";
import { EtiquetaSeccion } from "@/components/presskit-publico/EtiquetaSeccion";
import { BotonPdfDescarga } from "@/components/presskit-publico/BotonPdfDescarga";
import { JuanaLRPdfDocument } from "./juana-lr-pdf";

// "use client": DisenoJuanaLR pasa `JuanaLRPdfDocument` (una referencia a
// componente, no un elemento renderizado) como prop a BotonPdfDescarga -- un
// Server Component no puede pasar una función/referencia a componente como
// dato a un Client Component ("Functions cannot be passed directly to
// Client Components"). Nada acá depende de APIs de servidor: `datos` ya
// llega resuelto desde app/presskit-publico/[slug]/page.tsx.

// Brief "Presskit público: diseño independiente por banda": diseño propio y
// exclusivo de Juana LR -- cream/Anton/Barlow/Space Mono + rojo·amarillo,
// el que se validó y quedó publicado en `liga_publicada` antes de que el
// handoff de Yelincuente lo pisara al compartir un solo componente entre
// bandas (ver el historial antes de 7162641 para el original). Restaurado
// tal cual estaba, solo reapuntando a los helpers/componentes ahora
// compartidos (lib/presskitTexto.ts, EtiquetaSeccion, BotonPdfDescarga) en
// vez de tenerlos declarados localmente.
const COLOR_BG = "#ece7dd";
const COLOR_INK = "#14110f";
const COLOR_HILITE = "#f2e14c";

export function DisenoJuanaLR({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor, "#8b1e2b");

  const bio = datos.presskit.bioLarga?.trim() || null;
  const { titular, columnas } = bio ? dividirSemblanza(bio) : { titular: "", columnas: ["", ""] as [string, string] };
  const anio = bio ? extraerAnioFundacion(bio) : null;
  const tags = tagsGenero(datos.bandaGenero);
  const caption = captionFoto(anio, tags);
  const origenPartes = [datos.presskit.pais, datos.presskit.ciudad].filter((v): v is string => Boolean(v));
  const origenLinea = origenPartes.join(" · ");

  // Brief "Las fotos de banda/conceptuales se usan como material visual
  // (fondo, ambientación), no como una galería enumerada": cada foto de
  // banda cumple un rol puntual -- [0] foto de héroe, [1] acento decorativo
  // junto a la semblanza, [2] marca/logo en la esquina del héroe
  // (mix-blend-mode: multiply). Una banda con menos de 3 fotos de banda
  // simplemente no ve los roles que le faltan.
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
        @keyframes pkpub-jlr-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pkpub-jlr-marquee { animation: pkpub-jlr-slide 26s linear infinite; }
        a.pkpub-jlr-link { color: ${acento}; text-decoration: none; }
        a.pkpub-jlr-link:hover { color: ${COLOR_INK}; background: ${COLOR_HILITE}; }
        .pkpub-jlr-integrante:hover { background: ${acento} !important; color: ${COLOR_BG} !important; }
        .pkpub-jlr-red:hover { background: ${COLOR_HILITE} !important; color: ${COLOR_INK} !important; border-color: ${COLOR_HILITE} !important; }
        .pkpub-jlr-flyer:hover { border-color: ${acento} !important; }
        .pkpub-jlr-pdf:hover { opacity: 1 !important; border-bottom-color: ${acento} !important; color: ${acento} !important; }
      `}</style>

      {/* Botón de PDF discreto, arriba a la izquierda -- franja flotante
          sobre el héroe, sin competir con el resto del diseño (acá no hay
          barra de marca/nav: el mockup punk es un scroll continuo, sin
          anclas de sección). */}
      <div style={{ position: "fixed", top: 0, left: 0, zIndex: 50, padding: "14px 18px" }}>
        <BotonPdfDescarga
          datos={datos}
          documento={JuanaLRPdfDocument}
          className="pkpub-jlr-pdf"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(20,17,15,.35)",
            color: "#14110f",
            opacity: 0.62,
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "0 0 2px",
          }}
        >
          <span style={{ fontSize: 13 }}>↓</span>
          <span>Presskit 1 pág. (PDF)</span>
        </BotonPdfDescarga>
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
          <div className="pkpub-jlr-marquee" style={{ display: "flex", width: "max-content", fontFamily: "Anton,sans-serif", textTransform: "uppercase", fontSize: 22, letterSpacing: ".06em", whiteSpace: "nowrap" }}>
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
                    className="pkpub-jlr-integrante"
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

      {/* ESCENARIOS / FLYERS -- los flyers llevan contexto, no se muestran
          sueltos: encabezado + copy explicando qué son antes de la
          grilla. */}
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
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-jlr-flyer" style={{ display: "block", aspectRatio: "3/4", overflow: "hidden", border: `3px solid ${COLOR_INK}` }}>
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
                      className="pkpub-jlr-red"
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
                    <a href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} className="pkpub-jlr-link" style={{ color: COLOR_BG, borderBottom: "1px solid rgba(236,231,221,.35)", justifySelf: "start" }}>
                      {datos.presskit.contactoTelefono}
                    </a>
                  )}
                  {datos.presskit.contactoEmail && (
                    <a href={`mailto:${datos.presskit.contactoEmail}`} className="pkpub-jlr-link" style={{ color: COLOR_BG, borderBottom: "1px solid rgba(236,231,221,.35)", justifySelf: "start" }}>
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
