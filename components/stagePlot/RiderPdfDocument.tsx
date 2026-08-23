import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { RiderTecnico, RiderInfo } from "@/lib/riderData";
import { ETIQUETA_CATEGORIA_BACKLINE } from "@/lib/riderCatalogo";

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider":
// puerto del contenido nuevo de la pestaña Rider (Backline, requerimientos
// de espacio, contra rider, contacto -- ver RiderInfoVista.tsx) a este
// documento, además del stage plot/Input List/resumen que ya traía (Brief
// "Rider técnico — vista previa completa + PDF de una página" §3). Mismo
// criterio de paleta/tipografía de siempre: hex (react-pdf no interpreta
// oklch), Helvetica sin fuentes custom. `imagenDataUrl` pasa a ser
// opcional -- una banda puede tener Rider capturado (Backline, espacio,
// contacto) sin haber armado su stage plot todavía.
const COLOR_FONDO = "#fdfaf5";
const COLOR_BORDE = "#e3d9c8";
const COLOR_TEXTO = "#2a2622";
const COLOR_MUTED = "#8a8175";
const COLOR_ACENTO = "#c2410c";

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
  seccion: { marginBottom: 16 },
  backlineFila: { marginBottom: 6 },
  backlineCategoria: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, color: COLOR_ACENTO },
  backlineEspecificacion: { fontSize: 9, marginTop: 1 },
  backlineMarca: { fontSize: 8, color: COLOR_MUTED, marginTop: 1 },
  espacioFila: { fontSize: 8.5, marginBottom: 2 },
  contactoFila: { flexDirection: "row", gap: 24 },
  contactoBloque: { flex: 1 },
});

export function RiderPdfDocument({
  rider,
  riderInfo,
  imagenDataUrl,
}: {
  rider: RiderTecnico;
  riderInfo: RiderInfo;
  imagenDataUrl: string | null;
}) {
  const hayEspacio = riderInfo.corrienteElectrica || riderInfo.resguardoInstrumentos || riderInfo.proyeccionVideoNota || riderInfo.tiempoMontaje;
  const hayContacto = riderInfo.contactoNombre || riderInfo.contactoTelefono || riderInfo.contactoEmail;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.bandaNombre}>{rider.bandaNombre}</Text>
            <Text style={styles.kicker}>RIDER TÉCNICO</Text>
          </View>
          <Text style={styles.fecha}>Generado el {rider.fechaGeneracion}</Text>
        </View>

        {riderInfo.backline.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Backline</Text>
            {riderInfo.backline.map((item) => (
              <View key={item.id} style={styles.backlineFila}>
                <Text style={styles.backlineCategoria}>{ETIQUETA_CATEGORIA_BACKLINE[item.categoria]}</Text>
                <Text style={styles.backlineEspecificacion}>{item.especificacion}</Text>
                {item.marcaSugerida && <Text style={styles.backlineMarca}>Marca sugerida: {item.marcaSugerida}</Text>}
              </View>
            ))}
          </View>
        )}

        {hayEspacio && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Requerimientos de espacio</Text>
            {riderInfo.corrienteElectrica && <Text style={styles.espacioFila}>Corriente eléctrica: {riderInfo.corrienteElectrica}</Text>}
            {riderInfo.resguardoInstrumentos && (
              <Text style={styles.espacioFila}>
                Espacio para resguardar instrumentos{riderInfo.resguardoNota ? ` — ${riderInfo.resguardoNota}` : ""}
              </Text>
            )}
            {riderInfo.proyeccionVideoNota && <Text style={styles.espacioFila}>Proyección de video: {riderInfo.proyeccionVideoNota}</Text>}
            {riderInfo.tiempoMontaje && <Text style={styles.espacioFila}>Tiempo de montaje/prueba de audio: {riderInfo.tiempoMontaje}</Text>}
          </View>
        )}

        {imagenDataUrl && (
          <View style={styles.imagenWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image acá es el componente PDF de @react-pdf/renderer, no un <img> HTML; no tiene prop alt. */}
            <Image src={imagenDataUrl} style={styles.imagen} />
          </View>
        )}

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

        {riderInfo.contraRiderNota && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Contra rider</Text>
            <Text style={styles.espacioFila}>{riderInfo.contraRiderNota}</Text>
          </View>
        )}

        {hayContacto && (
          <View style={styles.contactoFila}>
            <View style={styles.contactoBloque}>
              <Text style={styles.seccionTitulo}>Contacto de requerimientos</Text>
              {riderInfo.contactoNombre && <Text style={styles.resumenLinea}>{riderInfo.contactoNombre}</Text>}
              {riderInfo.contactoTelefono && <Text style={styles.resumenLinea}>{riderInfo.contactoTelefono}</Text>}
              {riderInfo.contactoEmail && (
                <Link src={`mailto:${riderInfo.contactoEmail}`} style={[styles.resumenLinea, { color: COLOR_TEXTO }]}>
                  {riderInfo.contactoEmail}
                </Link>
              )}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
