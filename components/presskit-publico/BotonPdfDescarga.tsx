"use client";

import { useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { pdf } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";

// Brief "Presskit público: diseño independiente por banda" §2: mecanismo de
// descarga compartido (generar el blob con @react-pdf/renderer y disparar
// la descarga) -- es lógica de interacción, no identidad visual, así que
// vive acá una sola vez en vez de repetirse en cada diseño de banda. Lo que
// SÍ es propio de cada banda es el documento PDF que se le pasa (`documento`)
// y el look del botón (`className`/`style`/`children`, para que el ícono y
// la etiqueta -- que difieren entre diseños -- los arme cada uno). `children`
// es un ReactNode estático (el estado "listo"), no una función: los
// componentes de diseño son Server Components, y una función no se puede
// pasar de un Server Component a este Client Component -- React la rechaza
// ("Functions cannot be passed directly to Client Components"). El estado
// "generando" se resuelve acá adentro con un texto fijo en vez de un
// render-prop.
function slugSimple(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function BotonPdfDescarga({
  datos,
  documento: Documento,
  className,
  style,
  children,
}: {
  datos: PresskitPublico;
  documento: ComponentType<{ datos: PresskitPublico }>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setError(null);
    setGenerando(true);
    try {
      const blob = await pdf(<Documento datos={datos} />).toBlob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `presskit-${slugSimple(datos.bandaNombre)}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo generar el PDF.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" onClick={descargar} disabled={generando} className={className} style={style}>
        {generando ? "Generando…" : children}
      </button>
      {error && <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontSize: 10, color: "#c81f0c" }}>{error}</span>}
    </div>
  );
}
