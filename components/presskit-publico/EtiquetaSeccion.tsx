// Etiqueta numerada de sección ("01 — Semblanza"), idéntica entre los
// diseños que ya la usan -- lo único que cambia por banda es el color
// (recibido como prop), así que vive compartida en vez de repetirse en
// cada archivo de components/presskit-publico/disenos/*.
export function EtiquetaSeccion({ numero, titulo, color }: { numero: string; titulo: string; color: string }) {
  return (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color, marginBottom: 22 }}>
      {numero} — {titulo}
    </div>
  );
}
