"use client";

import { useState } from "react";
import type { StagePlotItem } from "@/lib/stagePlotData";
import { descargarStagePlotPng } from "./stagePlotExport";

const botonCls = "rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60";
const botonStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };

// Brief "Rediseño de Stage Plot — Entrega 1" §4/§5: las dos acciones ya no
// viven juntas en un solo componente -- "Copiar link" es la única acción
// (más "Editar") de la vista previa interna del superadmin/admin; el botón
// de descarga se corrió al link público, la única pantalla donde tiene
// sentido para quien la recibe (el sonidista del venue, sin cuenta en
// Malgesto). shareToken viaja server-side y se compone acá con
// window.location.origin porque el dominio de producción no está
// hardcodeado en ningún lado del repo.
export function BotonCopiarLink({ shareToken }: { shareToken: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiarLink = async () => {
    const url = `${window.location.origin}/plot/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button type="button" onClick={copiarLink} className={botonCls} style={botonStyle}>
      {copiado ? "¡Copiado!" : "Copiar link público"}
    </button>
  );
}

export function BotonDescargarImagen({ items, bandaNombre, bandaColor }: { items: StagePlotItem[]; bandaNombre: string; bandaColor: string }) {
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarStagePlotPng(items, bandaNombre, bandaColor);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <button type="button" onClick={descargar} disabled={descargando || items.length === 0} className={botonCls} style={botonStyle}>
      {descargando ? "Generando…" : "Descargar imagen (PNG)"}
    </button>
  );
}
