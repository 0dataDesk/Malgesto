import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { RiderTecnico } from "@/lib/riderData";

// Brief "Rider técnico — vista previa completa + PDF de una página" §3: PDF
// de una sola página con el mismo diseño/orden que la vista web
// (RiderVista.tsx) -- encabezado, imagen del stage plot, Input List,
// resumen de equipo. Paleta en hex (react-pdf no interpreta oklch) tomada
// directo de construirSvg en stagePlotExport.ts para que el documento se
// vea de una sola pieza con la imagen embebida, no como dos estilos
// distintos pegados. Sin fuentes custom -- Helvetica (siempre disponible
// en react-pdf sin embeber archivos) alcanza para el criterio "profesional/
// editorial" sin la complejidad de cargar tipografías propias.
const COLOR_FONDO = "#fdfaf5";
const COLOR_BORDE = "#e3d9c8";
const COLOR_TEXTO = "#2a2622";
const COLOR_MUTED = "#8a8175";

const styles = StyleSheet.create({
  page: { padding: 32, backgroundColor: COLOR_FONDO, fontSize: 9, color: COLOR_TEXTO, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLOR_BORDE,
    paddingBottom: 10,
  },
  bandaNombre: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  kicker: { fontSize: 8, letterSpacing: 2, color: COLOR_MUTED, marginTop: 3 },
  fecha: { fontSize: 8, color: COLOR_MUTED },
  imagenWrap: { alignItems: "center", marginBottom: 16 },
  imagen: { width: 480, height: 300 },
  seccionTitulo: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  tabla: { marginBottom: 16 },
  filaHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR_TEXTO, paddingBottom: 3, marginBottom: 3 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLOR_BORDE, paddingVertical: 3 },
  headerCelda: { fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.5, color: COLOR_MUTED },
  colCanal: { width: 26, fontFamily: "Helvetica-Bold" },
  colFuente: { flex: 1 },
  colMic: { width: 150, color: COLOR_MUTED },
  resumenFila: { flexDirection: "row", gap: 18 },
  resumenBloque: { flex: 1 },
  resumenSubtitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  resumenLinea: { fontSize: 8.5, marginBottom: 2, color: COLOR_TEXTO },
});

export function RiderPdfDocument({ rider, imagenDataUrl }: { rider: RiderTecnico; imagenDataUrl: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.bandaNombre}>{rider.bandaNombre}</Text>
            <Text style={styles.kicker}>STAGE PLOT &amp; RIDER TÉCNICO</Text>
          </View>
          <Text style={styles.fecha}>Generado el {rider.fechaGeneracion}</Text>
        </View>

        <View style={styles.imagenWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
          <Image src={imagenDataUrl} style={styles.imagen} />
        </View>

        {rider.canales.length > 0 && (
          <View style={styles.tabla}>
            <Text style={styles.seccionTitulo}>Input List</Text>
            <View style={styles.filaHeader}>
              <Text style={[styles.colCanal, styles.headerCelda]}>Ch</Text>
              <Text style={[styles.colFuente, styles.headerCelda]}>Fuente</Text>
              <Text style={[styles.colMic, styles.headerCelda]}>Mic / DI</Text>
            </View>
            {rider.canales.map((c) => (
              <View key={c.numero} style={styles.fila}>
                <Text style={styles.colCanal}>{c.numero}</Text>
                <Text style={styles.colFuente}>{c.fuente}</Text>
                <Text style={styles.colMic}>{c.mic ?? ""}</Text>
              </View>
            ))}
          </View>
        )}

        {(rider.amplificadores.length > 0 || rider.pedales.length > 0 || rider.escenario.length > 0) && (
          <View>
            <Text style={styles.seccionTitulo}>Resumen de equipo</Text>
            <View style={styles.resumenFila}>
              {rider.amplificadores.length > 0 && (
                <View style={styles.resumenBloque}>
                  <Text style={styles.resumenSubtitulo}>Amplificadores</Text>
                  {rider.amplificadores.map((a, idx) => (
                    <Text key={idx} style={styles.resumenLinea}>
                      • {a.disenoNombre} — {a.nombrePersona}
                    </Text>
                  ))}
                </View>
              )}
              {rider.pedales.length > 0 && (
                <View style={styles.resumenBloque}>
                  <Text style={styles.resumenSubtitulo}>Pedaleras</Text>
                  {rider.pedales.map((p, idx) => (
                    <Text key={idx} style={styles.resumenLinea}>
                      • {p.nombrePersona}: {p.cantidad} pedal{p.cantidad === 1 ? "" : "es"}
                    </Text>
                  ))}
                </View>
              )}
              {rider.escenario.length > 0 && (
                <View style={styles.resumenBloque}>
                  <Text style={styles.resumenSubtitulo}>Escenario</Text>
                  {rider.escenario.map((e) => (
                    <Text key={e.tipo} style={styles.resumenLinea}>
                      • {e.etiqueta}: {e.cantidad}
                      {e.etiquetas.length > 0 ? ` (${e.etiquetas.join(", ")})` : ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
