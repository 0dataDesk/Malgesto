"use client";

import { useState } from "react";
import type { StagePlotItem } from "@/lib/stagePlotData";
import { descargarStagePlotPng } from "./stagePlotExport";

const botonCls = "rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60";
const botonStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };

// Las dos formas de "compartir" del Brief: descarga de imagen (siempre
// disponible, cero dependencias nuevas) y copiar el link público de solo
// lectura /plot/[token] (fuera del proxy de auth a propósito — ver
// proxy.ts). shareToken viaja server-side y se compone acá con
// window.location.origin porque el dominio de producción no está
// hardcodeado en ningún lado del repo.
export function StagePlotAcciones({ items, bandaNombre, shareToken }: { items: StagePlotItem[]; bandaNombre: string; shareToken: string }) {
  const [descargando, setDescargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarStagePlotPng(items, bandaNombre);
    } finally {
      setDescargando(false);
    }
  };

  const copiarLink = async () => {
    const url = `${window.location.origin}/plot/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={descargar} disabled={descargando || items.length === 0} className={botonCls} style={botonStyle}>
        {descargando ? "Generando…" : "Descargar imagen (PNG)"}
      </button>
      <button type="button" onClick={copiarLink} className={botonCls} style={botonStyle}>
        {copiado ? "¡Copiado!" : "Copiar link público"}
      </button>
    </div>
  );
}
