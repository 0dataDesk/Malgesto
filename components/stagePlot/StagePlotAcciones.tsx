"use client";

import { useState } from "react";

const botonCls = "rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60";
const botonStyle = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };

// Brief "Rediseño de Stage Plot — Entrega 1" §4/§5: "Copiar link" es la
// única acción (más "Editar") de la vista previa interna del superadmin/
// admin. shareToken viaja server-side y se compone acá con
// window.location.origin porque el dominio de producción no está
// hardcodeado en ningún lado del repo. Brief "Rider técnico — vista previa
// completa + PDF de una página": el botón de descarga (antes acá,
// "BotonDescargarImagen") pasó a "Descargar PDF" y vive en RiderVista.tsx
// -- ya no es solo la imagen suelta, es el rider completo (imagen + Input
// List + resumen), y necesita el mismo PNG ya generado para mostrar en
// pantalla, así que tiene más sentido resuelto ahí que en un botón aparte.
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
