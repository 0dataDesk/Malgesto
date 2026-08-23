"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoPdfDocument } from "./PresskitPublicoPdfDocument";

// Brief "Presskit — nuevo diseño para Yelincuente (Claude Design)": mismo
// mecanismo de descarga de siempre (@react-pdf/renderer genera el blob en
// el cliente con los datos reales ya cargados por el server component),
// restyleado a la píldora discreta del nuevo handoff -- fondo oscuro
// translúcido + blur, texto chico en Space Mono, sin protagonismo (hover
// pasa a lima, el acento de sistema, no el de marca), para que no compita
// con el héroe sobre el que flota.
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
          padding: "7px 12px",
          border: "1px solid rgba(243,238,230,.22)",
          borderRadius: 2,
          background: "rgba(11,8,9,.55)",
          backdropFilter: "blur(8px)",
          color: "rgba(243,238,230,.62)",
          fontFamily: "'Space Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: generando ? "default" : "pointer",
        }}
      >
        <span style={{ display: "inline-block", width: 6, height: 6, border: "1px solid currentColor", transform: "rotate(45deg)" }} />
        <span>{generando ? "Generando…" : "Descargar PDF — 1 hoja"}</span>
      </button>
      {error && <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontSize: 10, color: "#ff2e6b" }}>{error}</span>}
    </div>
  );
}
