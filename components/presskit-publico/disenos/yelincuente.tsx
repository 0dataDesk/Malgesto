"use client";

import type { PresskitPublico } from "@/lib/presskitData";
import { colorSeguro, tagsGenero, dividirSemblanza, extraerCita, extraerAnioFundacion, captionFoto, formatearFechaCorta } from "@/lib/presskitTexto";
import { EtiquetaSeccion } from "@/components/presskit-publico/EtiquetaSeccion";
import { BotonPdfDescarga } from "@/components/presskit-publico/BotonPdfDescarga";
import { YelincuentePdfDocument } from "./yelincuente-pdf";

// "use client": ver el comentario equivalente en disenos/juana-lr.tsx --
// pasar `YelincuentePdfDocument` como prop a BotonPdfDescarga (Client
// Component) no es válido desde un Server Component.

// Brief "Presskit público: diseño independiente por banda": diseño propio y
// exclusivo de Yelincuente -- oscuro/neón (Anton + Space Grotesk + Space
// Mono), puerto de "Yelincuente Presskit.dc.html" (Claude Design). Antes
// de este brief vivía como la única plantilla de /presskit-publico/[slug]
// (commit 7162641), lo que hacía que reemplazara el diseño de CUALQUIER
// otra banda -- ahora cada banda tiene su propio archivo (ver
// components/presskit-publico/registro.ts) y este es exclusivamente el de
// Yelincuente. `acento` sale de `bandas.color` (Yelincuente ya tiene el
// suyo propio cargado); `resalte` es lima fija de sistema (ver props
// "highlightColor" del propio diseño en Claude Design), no de marca.
const COLOR_BG = "#0b0809";
const COLOR_TEXTO = "#f3eee6";
const COLOR_RESALTE = "#d9ff3d";

export function DisenoYelincuente({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor, "#ff2e6b");

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
        @keyframes pkpub-yl-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pkpub-yl-drift { 0% { transform: translate(0,0) scale(1.06); } 50% { transform: translate(-2%,-1.5%) scale(1.12); } 100% { transform: translate(0,0) scale(1.06); } }
        .pkpub-yl-marquee { animation: pkpub-yl-slide 30s linear infinite; }
        .pkpub-yl-hero-foto { animation: pkpub-yl-drift 30s ease-in-out infinite; }
        a.pkpub-yl-link { color: ${COLOR_RESALTE}; text-decoration: none; }
        a.pkpub-yl-link:hover { color: ${acento}; }
        .pkpub-yl-integrante:hover { background: ${acento} !important; color: ${COLOR_BG} !important; }
        .pkpub-yl-red:hover { color: ${COLOR_RESALTE} !important; padding-left: 14px !important; }
        .pkpub-yl-flyer:hover { border-color: ${acento} !important; }
        .pkpub-yl-pdf:hover { color: ${COLOR_BG} !important; background: ${COLOR_RESALTE} !important; border-color: ${COLOR_RESALTE} !important; }
      `}</style>

      {/* Botón de PDF discreto, arriba a la izquierda -- brief del prompt
          fijo para Design: franja flotante translúcida sobre el héroe, sin
          competir con el resto del diseño. */}
      <div style={{ position: "fixed", top: 18, left: 18, zIndex: 50 }}>
        <BotonPdfDescarga
          datos={datos}
          documento={YelincuentePdfDocument}
          className="pkpub-yl-pdf"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            border: "1px solid rgba(243,238,230,.22)",
            borderRadius: 2,
            background: "rgba(11,8,9,.55)",
            backdropFilter: "blur(8px)",
            color: "rgba(243,238,230,.62)",
            fontFamily: "'Space Mono', ui-monospace, monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ display: "inline-block", width: 6, height: 6, border: "1px solid currentColor", transform: "rotate(45deg)" }} />
          <span>Descargar PDF — 1 hoja</span>
        </BotonPdfDescarga>
      </div>

      {/* HERO -- foto de fondo a pantalla completa, con degradado + tinte de
          acento y el nombre en Anton apoyado abajo. */}
      <section style={{ position: "relative", minHeight: "100svh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
        {fotoHero && (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
            <img
              src={fotoHero.url}
              alt=""
              className="pkpub-yl-hero-foto"
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
          <div className="pkpub-yl-marquee" style={{ display: "flex", width: "max-content", fontFamily: "Anton,sans-serif", textTransform: "uppercase", fontSize: "clamp(18px,2.4vw,30px)", letterSpacing: ".02em", whiteSpace: "nowrap" }}>
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

      {/* MANIFIESTO -- cita destacada sobre foto (última oración real de la
          semblanza, no inventada). */}
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
                    className="pkpub-yl-integrante"
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
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="pkpub-yl-flyer" style={{ display: "block", aspectRatio: "3/4", overflow: "hidden", border: "1px solid rgba(243,238,230,.2)" }}>
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
                      className="pkpub-yl-red"
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
                    <a href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} className="pkpub-yl-link" style={{ justifySelf: "start" }}>
                      {datos.presskit.contactoTelefono}
                    </a>
                  )}
                  {datos.presskit.contactoEmail && (
                    <a href={`mailto:${datos.presskit.contactoEmail}`} className="pkpub-yl-link" style={{ justifySelf: "start" }}>
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
