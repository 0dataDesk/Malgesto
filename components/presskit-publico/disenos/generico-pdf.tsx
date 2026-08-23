import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";
import { colorSeguro, truncarTexto } from "@/lib/presskitTexto";

// Brief "Presskit público: diseño independiente por banda" §3: respaldo
// neutro para una banda sin handoff propio todavía -- usa Helvetica
// (integrada en @react-pdf/renderer, sin archivos que registrar) en vez de
// una tipografía de marca, a propósito: es el "PDF por defecto", no el de
// ninguna banda existente.
const COLOR_BG = "#fdfaf5";
const COLOR_TEXTO = "#2a2622";
const COLOR_MUTED = "#8a8175";
const COLOR_BORDE = "#e3d9c8";

const styles = StyleSheet.create({
  page: { padding: 34, backgroundColor: COLOR_BG, color: COLOR_TEXTO, fontFamily: "Helvetica", fontSize: 9.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, borderBottomWidth: 2, paddingBottom: 12 },
  bandaNombre: { fontSize: 24, fontFamily: "Helvetica-Bold" },
  kicker: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginTop: 4 },
  origen: { fontSize: 9, color: COLOR_MUTED },
  cuerpo: { flexDirection: "row", gap: 20, marginBottom: 20 },
  columnaTexto: { flex: 1.15, gap: 14 },
  columnaFoto: { flex: 0.85 },
  foto: { width: "100%", height: 200, objectFit: "cover", borderRadius: 4 },
  seccionTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, color: COLOR_MUTED },
  texto: { fontSize: 10, lineHeight: 1.5 },
  linea: { fontSize: 9.5, lineHeight: 1.6 },
  footer: { flexDirection: "row", gap: 20, borderTopWidth: 1, borderTopColor: COLOR_BORDE, paddingTop: 14, marginTop: "auto" },
  footerBloque: { flex: 1, gap: 3 },
  link: { fontSize: 9.5, lineHeight: 1.7, color: COLOR_TEXTO, textDecoration: "none" },
});

export function GenericoPdfDocument({ datos }: { datos: PresskitPublico }) {
  const acento = colorSeguro(datos.bandaColor, "#8a8175");
  const fotoPrincipal = datos.fotosBanda[0]?.url ?? null;
  const semblanzaBreve = datos.presskit.bioLarga ? truncarTexto(datos.presskit.bioLarga, 520) : null;
  const origen = [datos.presskit.ciudad, datos.presskit.pais].filter(Boolean).join(", ");
  const hayContacto = datos.presskit.contactoNombre || datos.presskit.contactoTelefono || datos.presskit.contactoEmail;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: acento }]}>
          <View>
            <Text style={styles.bandaNombre}>{datos.bandaNombre}</Text>
            {datos.bandaGenero && <Text style={[styles.kicker, { color: acento }]}>{datos.bandaGenero.toUpperCase()}</Text>}
          </View>
          {origen && <Text style={styles.origen}>{origen}</Text>}
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.columnaTexto}>
            {semblanzaBreve && (
              <View>
                <Text style={styles.seccionTitulo}>Semblanza</Text>
                <Text style={styles.texto}>{semblanzaBreve}</Text>
              </View>
            )}
            {datos.integrantes.length > 0 && (
              <View>
                <Text style={styles.seccionTitulo}>Integrantes</Text>
                {datos.integrantes.map((i, idx) => (
                  <Text key={idx} style={styles.linea}>
                    • {i.nombre} — {i.instrumento}
                  </Text>
                ))}
              </View>
            )}
          </View>
          {fotoPrincipal && (
            <View style={styles.columnaFoto}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
              <Image src={fotoPrincipal} style={styles.foto} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {hayContacto && (
            <View style={styles.footerBloque}>
              <Text style={styles.seccionTitulo}>Contacto</Text>
              {datos.presskit.contactoNombre && <Text style={styles.linea}>{datos.presskit.contactoNombre}</Text>}
              {datos.presskit.contactoTelefono && <Text style={styles.linea}>{datos.presskit.contactoTelefono}</Text>}
              {datos.presskit.contactoEmail && <Text style={styles.linea}>{datos.presskit.contactoEmail}</Text>}
            </View>
          )}
          {datos.redes.length > 0 && (
            <View style={styles.footerBloque}>
              <Text style={styles.seccionTitulo}>Links</Text>
              {datos.redes.map((r) => (
                <Link key={r.id} src={r.url} style={styles.link}>
                  {r.plataforma}
                </Link>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
