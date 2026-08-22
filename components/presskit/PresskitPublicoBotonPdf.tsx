"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { PresskitPublico } from "@/lib/presskitData";
import { PresskitPublicoPdfDocument } from "./PresskitPublicoPdfDocument";

// Brief "Presskit — vista pública real dentro de Malgesto App", trasladando
// la instrucción del prompt fijo para Design (PROMPT_DESIGN_PRESSKIT en
// lib/presskitData.ts) a la página real: botón discreto arriba a la
// izquierda, que no compita con el resto del diseño -- por eso vive en su
// propia franja utilitaria oscura y angosta ANTES de la barra de navegación
// de la marca (roja, protagonista), no mezclado con ella. Mismo mecanismo
// de descarga que RiderVista.tsx: @react-pdf/renderer genera el blob en el
// cliente con los datos reales ya cargados por el server component
// (app/presskit-publico/[slug]/page.tsx), sin depender de un archivo
// exportado a mano desde Design.
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
        style={{
          background: "transparent",
          border: "1px solid #3a3630",
          color: "#8d8578",
          fontFamily: "'Space Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "4px 10px",
          borderRadius: 999,
          cursor: generando ? "default" : "pointer",
        }}
      >
        {generando ? "Generando…" : "↓ Resumen PDF"}
      </button>
      {error && (
        <span style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontSize: 10, color: "#ff2d1f" }}>{error}</span>
      )}
    </div>
  );
}
