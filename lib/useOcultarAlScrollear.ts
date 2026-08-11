"use client";

import { useEffect, useState } from "react";

// Extraído de TabBar.tsx (Brief "Colapsar el espacio superior reservado
// cuando el menú se oculta") para reusarse también en EspacioSuperior sin
// duplicar el listener de scroll -- misma lógica, sin cambios. Se escucha en
// capture phase sobre window: los eventos de scroll no burbujean, pero en
// fase de captura sí se detectan aunque el scroll ocurra en un div interno
// (el layout de Calendario, con su propio overflow-y-auto) en vez de en la
// ventana entera (el resto de las vistas, con scroll normal de documento) —
// un solo mecanismo cubre ambos casos sin plumbing por página.
export function useOcultarAlScrollear(): boolean {
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    const onScroll = (e: Event) => {
      const top = e.target instanceof Document ? window.scrollY : (e.target as HTMLElement).scrollTop;
      setOculto(top > 8);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);
  return oculto;
}
