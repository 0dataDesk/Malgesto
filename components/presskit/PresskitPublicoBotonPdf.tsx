"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoPdfDocument } from "./PresskitPublicoPdfDocument";

// Brief "Presskit — actualización de diseño (handoff punk de Design)" §2:
// mismo mecanismo de descarga de siempre (@react-pdf/renderer genera el
// blob en el cliente con los datos reales ya cargados por el server
// component), restyleado al link flotante discreto del nuevo handoff --
// texto chico en Space Mono, opacidad reducida hasta el hover, sin fondo ni
// borde de botón, para que no compita con el héroe sobre el que flota.
function slugSimple(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function PresskitPublicoBotonPdf({ datos }: { datos: PresskitPublico }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const descargar = async () => {
    setError(null);
    setGenerando(true);
    try {
      const blob = await pdf(<PresskitPublicoPdfDocument datos={datos} />).toBlob();
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
      <button
        type="button"
        onClick={descargar}
        disabled={generando}
        className="pkpub-pdf"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          borderBottom: "1px solid rgba(20,17,15,.35)",
          color: "#14110f",
          opacity: 0.62,
          fontFamily: "'Space Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "0 0 2px",
          cursor: generando ? "default" : "pointer",
        }}
      >
        <span style={{ fontSize: 13 }}>↓</span>
        <span>{generando ? "Generando…" : "Presskit 1 pág. (PDF)"}</span>
      </button>
      {error && <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontSize: 10, color: "#c81f0c" }}>{error}</span>}
    </div>
  );
}
