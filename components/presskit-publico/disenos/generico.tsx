"use client";

import type { PresskitPublico } from "@/lib/presskitData";
import { colorSeguro, dividirSemblanza, formatearFechaCorta } from "@/lib/presskitTexto";
import { BotonPdfDescarga } from "@/components/presskit-publico/BotonPdfDescarga";
import { GenericoPdfDocument } from "./generico-pdf";

// "use client": ver el comentario equivalente en disenos/juana-lr.tsx --
// pasar `GenericoPdfDocument` como prop a BotonPdfDescarga (Client
// Component) no es válido desde un Server Component.

// Brief "Presskit público: diseño independiente por banda" §3: respaldo
// para una banda que todavía no tiene su propio handoff de Design -- a
// propósito NO usa la identidad de ninguna banda existente (nada de Anton/
// Barlow/Space Grotesk ni acentos neón/punk). Reusa la misma paleta/
// tipografía que ya usa el resto de Malgesto App (oklch cream, Manrope +
// Bricolage Grotesque vía las variables globales de app/layout.tsx) para
// que una banda nueva se vea "con la cara por defecto de la app", nunca
// con el diseño de otra banda por accidente. Cuando esa banda reciba su
// propio handoff, sumar components/presskit-publico/disenos/<slug>.tsx (ver
// registro.ts) -- no editar este archivo para dársela acá.
const FONDO = "oklch(0.965 0.012 82)";
const TARJETA = "oklch(0.99 0.008 82)";
const BORDE = "oklch(0.89 0.013 78)";
const TEXTO = "oklch(0.24 0.02 55)";
const TEXTO_GRIS = "oklch(0.5 0.02 55)";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="font-mono" style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: TEXTO_GRIS, marginBottom: 16 }}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function DisenoGenerico({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor, "oklch(0.64 0.15 34)");
  const bio = datos.presskit.bioLarga?.trim() || null;
  const { titular, columnas } = bio ? dividirSemblanza(bio) : { titular: "", columnas: ["", ""] as [string, string] };
  const origenLinea = [datos.presskit.pais, datos.presskit.ciudad].filter(Boolean).join(" · ");
  const hayContacto = Boolean(datos.presskit.contactoTelefono || datos.presskit.contactoEmail);

  return (
    <div style={{ background: FONDO, color: TEXTO, fontFamily: "var(--font-manrope), sans-serif", minHeight: "100vh" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ position: "fixed", top: 16, left: 16, zIndex: 50 }}>
          <BotonPdfDescarga
            datos={datos}
            documento={GenericoPdfDocument}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              border: `1px solid ${BORDE}`,
              borderRadius: 999,
              background: TARJETA,
              color: TEXTO_GRIS,
              fontFamily: "'Space Mono', ui-monospace, monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <span>↓ Descargar PDF</span>
          </BotonPdfDescarga>
        </div>

        <header style={{ borderBottom: `3px solid ${acento}`, paddingBottom: 24 }}>
          <div className="font-mono" style={{ fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: TEXTO_GRIS }}>
            Presskit{origenLinea ? ` · ${origenLinea}` : ""}
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(36px,6vw,64px)", lineHeight: 1.02, fontFamily: "var(--font-bricolage), sans-serif", fontWeight: 800 }}>
            {datos.bandaNombre}
          </h1>
          {datos.bandaGenero && <p style={{ margin: "8px 0 0", color: TEXTO_GRIS }}>{datos.bandaGenero}</p>}
        </header>

        {datos.fotosBanda[0] && (
          // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage.
          <img
            src={datos.fotosBanda[0].url}
            alt={datos.bandaNombre}
            style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 16, marginTop: 32, border: `1px solid ${BORDE}` }}
          />
        )}

        {bio && (
          <Seccion titulo="Semblanza">
            {titular && <p style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 700, margin: "0 0 12px" }}>{titular}</p>}
            {columnas[0] && (
              <p style={{ fontSize: 16, lineHeight: 1.65, color: TEXTO_GRIS, margin: "0 0 12px" }}>
                {columnas[0]} {columnas[1]}
              </p>
            )}
          </Seccion>
        )}

        {datos.integrantes.length > 0 && (
          <Seccion titulo="Integrantes">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {datos.integrantes.map((i, idx) => (
                <div key={idx} style={{ padding: "10px 14px", borderRadius: 12, background: TARJETA, border: `1px solid ${BORDE}` }}>
                  {i.redSocialUrl ? (
                    <a href={i.redSocialUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: acento }}>
                      {i.nombre} ↗
                    </a>
                  ) : (
                    <span style={{ fontWeight: 700 }}>{i.nombre}</span>
                  )}
                  <div className="font-mono" style={{ fontSize: 11, color: TEXTO_GRIS, marginTop: 2 }}>
                    {i.instrumento}
                  </div>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {datos.fotosBanda.length > 1 && (
          <Seccion titulo="Fotos">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {datos.fotosBanda.slice(1).map((f, idx) => (
                // eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage.
                <img key={f.id} src={f.url} alt={`Foto ${idx + 2}`} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 10, border: `1px solid ${BORDE}` }} />
              ))}
            </div>
          </Seccion>
        )}

        {datos.fotosFlyer.length > 0 && (
          <Seccion titulo="Algunos de nuestros shows">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {datos.fotosFlyer.map((f, idx) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL remota de Supabase Storage. */}
                  <img src={f.url} alt={`Cartel ${idx + 1}`} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 10, border: `1px solid ${BORDE}` }} />
                </a>
              ))}
            </div>
          </Seccion>
        )}

        {datos.proximasFechas.length > 0 && (
          <Seccion titulo="Próximas fechas">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {datos.proximasFechas.map((f, idx) => (
                <div key={idx} style={{ display: "flex", gap: 16, padding: "12px 14px", borderRadius: 12, background: TARJETA, border: `1px solid ${BORDE}` }}>
                  <span className="font-mono" style={{ fontSize: 12, color: TEXTO_GRIS, minWidth: 120 }}>
                    {formatearFechaCorta(f.fechaInicio)}
                  </span>
                  <span style={{ fontWeight: 700 }}>{f.titulo}</span>
                  {f.lugarNombre && <span style={{ color: TEXTO_GRIS }}>{f.lugarNombre}</span>}
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {(datos.redes.length > 0 || hayContacto) && (
          <Seccion titulo="Redes y contacto">
            {datos.redes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: hayContacto ? 16 : 0 }}>
                {datos.redes.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "8px 14px", borderRadius: 999, background: acento, color: "oklch(0.99 0.01 82)", fontWeight: 700, fontSize: 14 }}
                  >
                    {r.plataforma}
                  </a>
                ))}
              </div>
            )}
            {hayContacto && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 700 }}>{datos.presskit.contactoNombre || datos.bandaNombre}</span>
                {datos.presskit.contactoTelefono && (
                  <a href={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} style={{ color: acento }}>
                    {datos.presskit.contactoTelefono}
                  </a>
                )}
                {datos.presskit.contactoEmail && (
                  <a href={`mailto:${datos.presskit.contactoEmail}`} style={{ color: acento }}>
                    {datos.presskit.contactoEmail}
                  </a>
                )}
              </div>
            )}
          </Seccion>
        )}
      </div>
    </div>
  );
}
