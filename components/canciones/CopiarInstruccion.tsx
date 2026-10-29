"use client";

import { useState } from "react";

// Copia la instrucción para pegarla en una conversación NUEVA de Cosmos y que
// esta cargue una canción (las capturas y la liga se pegan después de la instrucción).
const TEXTO = `Ejecuta orbita/encargos/cargar-cancion.md

Banda: Malgesto
Canción: <título> — <autor>
Liga de Spotify: <liga de la canción>

(Pega aquí las capturas o el texto con los acordes.)`;

export function CopiarInstruccion() {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(TEXTO);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          window.prompt("Copia esta instrucción:", TEXTO);
        }
      }}
      title="Copia la instrucción para cargar una canción nueva desde Cosmos"
      className="rounded-full px-3 py-1 text-[11px] font-bold"
      style={{ border: "1px solid oklch(0.89 0.008 85)", background: "oklch(0.99 0.006 85)", color: copiado ? "oklch(0.5 0.13 148)" : "oklch(0.24 0.044 262)", cursor: "pointer" }}
    >
      {copiado ? "Copiado ✓" : "⧉ Copiar instrucción para cargar una canción"}
    </button>
  );
}
