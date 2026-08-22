import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";

// Brief "Presskit — vista pública real dentro de Malgesto App": versión de
// una página tamaño carta para descargar desde el botón discreto de la
// página pública (PresskitPublicoBotonPdf.tsx) -- mismo enfoque que
// RiderPdfDocument.tsx (@react-pdf/renderer, generado con datos reales en
// vez de un archivo exportado a mano de Design). A diferencia de la página
// web (que reproduce la identidad visual puntual del diseño de Juana LR,
// negro/rojo/Archivo Black), este documento usa una paleta neutra +
// `bandaColor` (bandas.color, el mismo acento que ya usa Stage Plot) como
// único color de marca -- así sirve tal cual para cualquier banda futura
// que publique su propio /presskit-publico/[slug], no solo para esta.
// Solo `import type` de lib/presskitData.ts: ese módulo es "server-only" y
// este documento se renderiza client-side (ver PresskitPublicoBotonPdf.tsx,
// mismo criterio que RiderVista.tsx con lib/riderData.ts) -- un import de
// valor real rompería el build.
const COLOR_FONDO = "#fdfaf5";
const COLOR_BORDE = "#e3d9c8";
const COLOR_TEXTO = "#2a2622";
const COLOR_MUTED = "#8a8175";

function truncar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const styles = StyleSheet.create({
  page: { padding: 34, backgroundColor: COLOR_FONDO, fontSize: 9.5, color: COLOR_TEXTO, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, borderBottomWidth: 2.5, paddingBottom: 12 },
  bandaNombre: { fontSize: 26, fontFamily: "Helvetica-Bold" },
  kicker: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginTop: 4 },
  origen: { fontSize: 9, color: COLOR_MUTED },
  cuerpo: { flexDirection: "row", gap: 22, marginBottom: 20 },
  columnaTexto: { flex: 1.15, gap: 16 },
  columnaFoto: { flex: 0.85 },
  foto: { width: "100%", height: 220, objectFit: "cover", borderRadius: 4 },
  seccionTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, color: COLOR_MUTED },
  texto: { fontSize: 10, lineHeight: 1.5 },
  linea: { fontSize: 9.5, lineHeight: 1.6 },
  footer: { flexDirection: "row", gap: 22, borderTopWidth: 1.5, borderTopColor: COLOR_BORDE, paddingTop: 14, marginTop: "auto" },
  footerBloque: { flex: 1, gap: 3 },
  link: { fontSize: 9.5, lineHeight: 1.7, color: COLOR_TEXTO, textDecoration: "none" },
  generado: { position: "absolute", bottom: 20, right: 34, fontSize: 7.5, color: COLOR_MUTED },
});

export function PresskitPublicoPdfDocument({ datos }: { datos: PresskitPublico }) {
  const acento = datos.bandaColor;
  const fotoPrincipal = datos.fotosBanda[0]?.url ?? null;
  const semblanzaBreve = datos.presskit.bioLarga ? truncar(datos.presskit.bioLarga, 520) : null;
  const origen = [datos.presskit.ciudad, datos.presskit.pais].filter(Boolean).join(", ");
  const hayContacto = datos.presskit.contactoNombre || datos.presskit.contactoTelefono || datos.presskit.contactoEmail;
  const generadoEl = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

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

        <Text style={styles.generado}>Generado el {generadoEl}</Text>
      </Page>
    </Document>
  );
}
