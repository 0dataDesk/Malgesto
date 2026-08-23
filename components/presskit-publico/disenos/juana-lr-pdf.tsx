import { Document, Page, View, Text, Image, Link, Font, StyleSheet } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";
import { colorSeguro, tagsGenero, truncarTexto } from "@/lib/presskitTexto";

// Brief "Presskit público: diseño independiente por banda": PDF de una
// página propio y exclusivo de Juana LR (puerto de "Presskit Juana LR - Una
// Pagina.dc.html", restaurado desde antes de que el handoff de Yelincuente
// compartiera un solo documento entre bandas). Los .ttf de Anton/Barlow/
// Space Mono viven en /public/fonts (bajados del repo oficial google/fonts)
// en vez de resolverlos desde Google Fonts en runtime: @react-pdf/renderer
// corre client-side (ver BotonPdfDescarga.tsx) y necesita una URL de
// archivo de fuente real, no una hoja de estilos CSS. Solo `import type` de
// lib/presskitData.ts: ese módulo es "server-only" y este documento se
// renderiza client-side -- un import de valor real rompería el build.
Font.register({
  family: "Anton",
  fonts: [{ src: "/fonts/Anton-Regular.ttf" }],
});
Font.register({
  family: "Barlow",
  fonts: [
    { src: "/fonts/Barlow-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Barlow-SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/Barlow-ExtraBold.ttf", fontWeight: 800 },
  ],
});
Font.register({
  family: "Space Mono",
  fonts: [
    { src: "/fonts/SpaceMono-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/SpaceMono-Bold.ttf", fontWeight: 700 },
  ],
});

const COLOR_BG = "#ece7dd";
const COLOR_INK = "#14110f";
const COLOR_HILITE = "#f2e14c";
const COLOR_BORDE = "rgba(20,17,15,0.25)";

const styles = StyleSheet.create({
  page: { backgroundColor: COLOR_BG, color: COLOR_INK, fontFamily: "Barlow" },
  header: { flexDirection: "row", borderBottomWidth: 3, borderBottomColor: COLOR_INK },
  headerTexto: { flex: 1, padding: "26px 26px 20px 30px", justifyContent: "space-between", gap: 14 },
  kicker: { fontFamily: "Space Mono", fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 },
  bandaNombre: { fontFamily: "Anton", fontSize: 46, lineHeight: 0.95, textTransform: "uppercase" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", backgroundColor: COLOR_INK, color: COLOR_BG, padding: "3px 7px" },
  headerFoto: { flex: 0.86, minHeight: 250 },
  cinta: { fontFamily: "Anton", textTransform: "uppercase", fontSize: 13, letterSpacing: 1.5, padding: "6px 30px", borderBottomWidth: 3, borderBottomColor: COLOR_INK },
  seccion: { padding: "20px 30px 18px 30px", borderBottomWidth: 3, borderBottomColor: COLOR_INK },
  seccionTitulo: { fontFamily: "Space Mono", fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  semblanzaCuerpo: { fontSize: 10, lineHeight: 1.45 },
  cuerpo: { flexDirection: "row", borderBottomWidth: 3, borderBottomColor: COLOR_INK },
  columnaIzq: { flex: 0.62, padding: "18px 26px 18px 30px" },
  columnaDer: { flex: 0.38, borderLeftWidth: 3, borderLeftColor: COLOR_INK, alignItems: "center", justifyContent: "center", padding: 16 },
  integranteFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLOR_BORDE },
  integranteNombre: { fontFamily: "Anton", fontSize: 17, textTransform: "uppercase" },
  integranteInstrumento: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 },
  fechaCaja: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 10, backgroundColor: COLOR_HILITE, padding: "8px 10px", marginTop: 14 },
  fechaFecha: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  fechaTitulo: { fontFamily: "Anton", fontSize: 15, textTransform: "uppercase" },
  fechaLugar: { fontFamily: "Space Mono", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", opacity: 0.75 },
  foto: { width: "100%", height: "auto" },
  pie: { flexDirection: "row", gap: 26, backgroundColor: COLOR_INK, color: COLOR_BG, padding: "18px 30px 16px 30px" },
  pieBloque: { flex: 1 },
  pieLabel: { fontFamily: "Space Mono", fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: COLOR_HILITE, marginBottom: 9 },
  redes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  red: { fontFamily: "Anton", fontSize: 11, textTransform: "uppercase", color: COLOR_BG, borderWidth: 1.5, borderColor: "rgba(236,231,221,0.4)", padding: "4px 8px", textDecoration: "none" },
  contactoNombre: { fontFamily: "Anton", fontSize: 15, textTransform: "uppercase", marginBottom: 5 },
  contactoLinea: { fontFamily: "Space Mono", fontSize: 9, color: COLOR_BG, textDecoration: "none" },
});

export function JuanaLRPdfDocument({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor, "#8b1e2b");
  const tags = tagsGenero(datos.bandaGenero);
  const fotoHero = datos.fotosBanda[0]?.url ?? null;
  const semblanzaBreve = datos.presskit.bioLarga ? truncarTexto(datos.presskit.bioLarga, 480) : null;
  const origen = [datos.presskit.pais, datos.presskit.ciudad].filter(Boolean).join(", ");
  const proximaFecha = datos.proximasFechas[0] ?? null;
  const fechaFormateada = proximaFecha
    ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(proximaFecha.fechaInicio))
    : null;
  const hayContacto = datos.presskit.contactoTelefono || datos.presskit.contactoEmail;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: nombre + tags de género, foto a la derecha */}
        <View style={styles.header}>
          <View style={styles.headerTexto}>
            <Text style={styles.kicker}>Presskit{origen ? ` · ${origen}` : ""}</Text>
            <Text style={styles.bandaNombre}>{datos.bandaNombre}</Text>
            {tags.length > 0 && (
              <View style={styles.tags}>
                {tags.map((t) => (
                  <Text key={t} style={styles.tag}>
                    {t}
                  </Text>
                ))}
              </View>
            )}
          </View>
          {fotoHero && (
            <View style={[styles.headerFoto, { backgroundColor: COLOR_INK, borderLeftWidth: 3, borderLeftColor: COLOR_INK }]}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
              <Image src={fotoHero} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </View>
          )}
        </View>

        {/* Cinta de acento con los tags de género */}
        {tags.length > 0 && <Text style={[styles.cinta, { backgroundColor: acento, color: COLOR_BG }]}>{tags.join(" · ")}</Text>}

        {/* Semblanza */}
        {semblanzaBreve && (
          <View style={styles.seccion}>
            <Text style={[styles.seccionTitulo, { color: acento }]}>Semblanza</Text>
            <Text style={styles.semblanzaCuerpo}>{semblanzaBreve}</Text>
          </View>
        )}

        {/* Integrantes + próxima fecha / logo */}
        <View style={styles.cuerpo}>
          <View style={styles.columnaIzq}>
            {datos.integrantes.length > 0 && (
              <>
                <Text style={[styles.seccionTitulo, { color: acento }]}>Integrantes</Text>
                {datos.integrantes.map((i, idx) => (
                  <View key={idx} style={styles.integranteFila}>
                    {i.redSocialUrl ? (
                      <Link src={i.redSocialUrl} style={[styles.integranteNombre, { color: acento, textDecoration: "none" }]}>
                        {i.nombre}
                      </Link>
                    ) : (
                      <Text style={styles.integranteNombre}>{i.nombre}</Text>
                    )}
                    <Text style={styles.integranteInstrumento}>{i.instrumento}</Text>
                  </View>
                ))}
              </>
            )}
            {proximaFecha && (
              <>
                <Text style={[styles.seccionTitulo, { color: acento, marginTop: 16 }]}>Próxima fecha</Text>
                <View style={styles.fechaCaja}>
                  <Text style={styles.fechaFecha}>{fechaFormateada}</Text>
                  <Text style={styles.fechaTitulo}>{proximaFecha.titulo}</Text>
                  {proximaFecha.lugarNombre && <Text style={styles.fechaLugar}>{proximaFecha.lugarNombre}</Text>}
                </View>
              </>
            )}
          </View>
          {datos.fotosBanda[2] && (
            <View style={styles.columnaDer}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
              <Image src={datos.fotosBanda[2].url} style={styles.foto} />
            </View>
          )}
        </View>

        {/* Pie: redes + contacto */}
        {(datos.redes.length > 0 || hayContacto) && (
          <View style={styles.pie}>
            {datos.redes.length > 0 && (
              <View style={styles.pieBloque}>
                <Text style={styles.pieLabel}>Escúchanos / síguenos</Text>
                <View style={styles.redes}>
                  {datos.redes.map((r) => (
                    <Link key={r.id} src={r.url} style={styles.red}>
                      {r.plataforma}
                    </Link>
                  ))}
                </View>
              </View>
            )}
            {hayContacto && (
              <View style={styles.pieBloque}>
                <Text style={styles.pieLabel}>Contacto</Text>
                <Text style={styles.contactoNombre}>{datos.presskit.contactoNombre || datos.bandaNombre}</Text>
                {datos.presskit.contactoTelefono && <Text style={styles.contactoLinea}>{datos.presskit.contactoTelefono}</Text>}
                {datos.presskit.contactoEmail && <Text style={styles.contactoLinea}>{datos.presskit.contactoEmail}</Text>}
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
