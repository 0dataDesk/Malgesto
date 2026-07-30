"use client";

import { useEffect } from "react";

// Brief 12 §3: recuerda la última banda vista en Canciones durante la
// sesión del navegador (cookie sin Max-Age — se borra sola al cerrar el
// navegador), para que volver desde /canciones (sin ?banda=, ej. tocando el
// tab de abajo) no vuelva siempre a la primera banda.
export function RecordarBandaActiva({ bandaId }: { bandaId: string }) {
  useEffect(() => {
    document.cookie = `malgesto_banda_canciones=${bandaId}; path=/; SameSite=Lax`;
  }, [bandaId]);

  return null;
}
