import { Document, Page, View, Text, Image, Link, Font, StyleSheet } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";

// Brief "Presskit — nuevo diseño para Yelincuente (Claude Design)": puerto
// del proyecto "Yelincuente One Sheet.dc.html" (Claude Design) a este
// documento -- reemplaza la paleta cream/tinta anterior (handoff de Juana
// LR) por la oscura/neón de este nuevo handoff, mismo criterio de las dos
// veces: el diseño más reciente de Design se vuelve la plantilla
// compartida, no una piel aparte por banda. Los .ttf de Anton/Space Mono ya
// vivían en /public/fonts; se suma la variable de Space Grotesk (única
// fuente que ofrece el repo oficial google/fonts para esta familia -- sin
// instancias estáticas por peso, así que acá se usa un solo peso en vez de
// declarar bold/semibold que no se aplicarían de verdad). Solo `import
// type` de lib/presskitData.ts: ese módulo es "server-only" y este
// documento se renderiza client-side (ver PresskitPublicoBotonPdf.tsx) --
// un import de valor real rompería el build.
Font.register({
  family: "Anton",
  fonts: [{ src: "/fonts/Anton-Regular.ttf" }],
});
Font.register({
  family: "Space Grotesk",
  fonts: [{ src: "/fonts/SpaceGrotesk-Variable.ttf" }],
});
Font.register({
  family: "Space Mono",
  fonts: [
    { src: "/fonts/SpaceMono-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/SpaceMono-Bold.ttf", fontWeight: 700 },
  ],
});

const COLOR_BG = "#0b0809";
const COLOR_TEXTO = "#f3eee6";
const COLOR_RESALTE = "#d9ff3d";
const COLOR_BORDE = "rgba(243,238,230,0.16)";

function colorSeguro(c: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : "#ff2e6b";
}

function tagsGenero(genero: string | null): string[] {
  if (!genero) return [];
  return genero
    .split(/[|,·/]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

function truncar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function extraerCita(bio: string): string | null {
  const oraciones = bio.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const ultima = oraciones[oraciones.length - 1]?.replace(/[.!?]+$/, "").trim();
  return ultima ? `“${ultima}”` : null;
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLOR_BG, color: COLOR_TEXTO, fontFamily: "Space Grotesk" },
  hero: { height: 210, position: "relative" },
  heroFoto: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" },
  heroVelo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(11,8,9,0.42)" },
  heroTop: { position: "absolute", top: 16, left: 26, right: 26, flexDirection: "row", justifyContent: "space-between" },
  heroKicker: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: "rgba(243,238,230,0.85)" },
  heroBottom: { position: "absolute", left: 26, right: 26, bottom: 14 },
  heroTags: { fontFamily: "Space Mono", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 },
  heroNombre: { fontFamily: "Anton", fontSize: 56, lineHeight: 0.86, letterSpacing: -0.5, textTransform: "uppercase", color: COLOR_TEXTO },
  cuerpo: { flexDirection: "row", gap: 22, padding: "22px 26px 18px" },
  columnaIzq: { flex: 1.5, gap: 10 },
  columnaDer: { flex: 1, gap: 12 },
  seccionTitulo: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 },
  semblanzaLead: { fontSize: 11, lineHeight: 1.35 },
  semblanzaCuerpo: { fontSize: 9, lineHeight: 1.5, color: "rgba(243,238,230,0.75)" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  tag: { fontFamily: "Space Mono", fontSize: 7, letterSpacing: 1, textTransform: "uppercase", borderWidth: 1, borderColor: COLOR_BORDE, borderRadius: 999, padding: "3px 8px" },
  cita: { fontFamily: "Anton", fontSize: 20, lineHeight: 1, textTransform: "uppercase", marginTop: "auto", paddingTop: 12, borderTopWidth: 1, borderTopColor: COLOR_BORDE },
  fotoLateral: { width: "100%", height: 100, objectFit: "cover" },
  fotoGrande: { width: "100%", flex: 1, objectFit: "cover", minHeight: 60 },
  integranteNombre: { fontFamily: "Anton", fontSize: 16, textTransform: "uppercase", lineHeight: 1 },
  integranteInstrumento: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: "rgba(243,238,230,0.65)", marginTop: 2 },
  textoOrigen: { fontSize: 9.5, color: "rgba(243,238,230,0.8)" },
  contactoNombre: { fontSize: 9.5, color: "rgba(243,238,230,0.8)" },
  contactoLinea: { fontFamily: "Space Mono", fontSize: 10, marginTop: 2 },
  pie: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, backgroundColor: COLOR_RESALTE, color: COLOR_BG, padding: "12px 26px", marginTop: "auto" },
  redes: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  red: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  redPlataforma: { fontFamily: "Anton", fontSize: 11, textTransform: "uppercase" },
  redDetalle: { fontFamily: "Space Mono", fontSize: 8 },
  pieNota: { fontFamily: "Space Mono", fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.7 },
});

export function PresskitPublicoPdfDocument({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor);
  const tags = tagsGenero(datos.bandaGenero);
  const bio = datos.presskit.bioLarga?.trim() || null;
  const semblanzaLead = bio ? truncar(bio, 220) : null;
  const semblanzaResto = bio ? truncar(bio.slice(semblanzaLead?.length ?? 0), 340) : null;
  const cita = bio ? extraerCita(bio) : null;
  const origen = [datos.presskit.pais, datos.presskit.ciudad].filter(Boolean).join(" · ");
  const hayContacto = datos.presskit.contactoTelefono || datos.presskit.contactoEmail;
  const fotoHero = datos.fotosBanda[0]?.url ?? null;
  const fotoLateral = datos.fotosBanda[1]?.url ?? null;
  const fotoGrande = datos.fotosBanda[2]?.url ?? datos.fotosBanda[1]?.url ?? null;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Franja de héroe: foto + nombre superpuesto */}
        <View style={styles.hero}>
          {fotoHero && (
            // eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt.
            <Image src={fotoHero} style={styles.heroFoto} />
          )}
          <View style={styles.heroVelo} />
          <View style={styles.heroTop}>
            <Text style={styles.heroKicker}>Presskit — One sheet</Text>
            {origen && <Text style={[styles.heroKicker, { color: COLOR_RESALTE }]}>{origen}</Text>}
          </View>
          <View style={styles.heroBottom}>
            {tags.length > 0 && <Text style={[styles.heroTags, { color: acento }]}>{tags.join(" · ")}</Text>}
            <Text style={styles.heroNombre}>{datos.bandaNombre}</Text>
          </View>
        </View>

        {/* Cuerpo: semblanza + cita (izq) / foto + integrantes + origen + contacto + foto (der) */}
        <View style={styles.cuerpo}>
          <View style={styles.columnaIzq}>
            <Text style={[styles.seccionTitulo, { color: acento }]}>Semblanza</Text>
            {semblanzaLead && <Text style={styles.semblanzaLead}>{semblanzaLead}</Text>}
            {semblanzaResto && <Text style={styles.semblanzaCuerpo}>{semblanzaResto}</Text>}
            {tags.length > 0 && (
              <View style={styles.tags}>
                {tags.map((t) => (
                  <Text key={t} style={styles.tag}>
                    {t}
                  </Text>
                ))}
              </View>
            )}
            {cita && <Text style={styles.cita}>{cita}</Text>}
          </View>

          <View style={styles.columnaDer}>
            {fotoLateral && (
              <View>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
                <Image src={fotoLateral} style={styles.fotoLateral} />
              </View>
            )}
            {datos.integrantes.length > 0 && (
              <View>
                <Text style={[styles.seccionTitulo, { color: acento }]}>Integrantes</Text>
                {datos.integrantes.map((i, idx) => (
                  <View key={idx} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                    <Text style={styles.integranteNombre}>{i.nombre}</Text>
                    <Text style={styles.integranteInstrumento}>{i.instrumento}</Text>
                  </View>
                ))}
              </View>
            )}
            {origen && (
              <View>
                <Text style={[styles.seccionTitulo, { color: acento }]}>Origen</Text>
                <Text style={styles.textoOrigen}>{origen}</Text>
              </View>
            )}
            {hayContacto && (
              <View>
                <Text style={[styles.seccionTitulo, { color: acento }]}>Contacto</Text>
                <Text style={styles.contactoNombre}>{datos.presskit.contactoNombre || datos.bandaNombre}</Text>
                {datos.presskit.contactoTelefono && (
                  <Link src={`tel:${datos.presskit.contactoTelefono.replace(/\s+/g, "")}`} style={[styles.contactoLinea, { color: COLOR_RESALTE }]}>
                    {datos.presskit.contactoTelefono}
                  </Link>
                )}
                {datos.presskit.contactoEmail && (
                  <Link src={`mailto:${datos.presskit.contactoEmail}`} style={[styles.contactoLinea, { color: COLOR_RESALTE }]}>
                    {datos.presskit.contactoEmail}
                  </Link>
                )}
              </View>
            )}
            {fotoGrande && (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt.
              <Image src={fotoGrande} style={styles.fotoGrande} />
            )}
          </View>
        </View>

        {/* Pie: redes en barra de resalte */}
        {(datos.redes.length > 0 || datos.proximasFechas.length > 0) && (
          <View style={styles.pie}>
            {datos.redes.length > 0 && (
              <View style={styles.redes}>
                {datos.redes.map((r) => (
                  <Link key={r.id} src={r.url} style={styles.red}>
                    <Text style={styles.redPlataforma}>{r.plataforma}</Text>
                  </Link>
                ))}
              </View>
            )}
            <Text style={styles.pieNota}>
              {datos.proximasFechas[0]
                ? `Próxima fecha: ${new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(datos.proximasFechas[0].fechaInicio))}`
                : "Sin fechas próximas registradas"}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
