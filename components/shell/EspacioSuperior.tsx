"use client";

import { useOcultarAlScrollear } from "@/lib/useOcultarAlScrollear";

// Brief "Colapsar el espacio superior reservado cuando el menú se oculta":
// el menú flotante de arriba ya se oculta al scrollear (commit 6097044),
// pero el pt-20 fijo que cada pantalla reservaba para no quedar tapada por
// él no se reducía, dejando un hueco en blanco del tamaño del menú. Este
// wrapper reusa el mismo `oculto` que ya mueve/desvanece el menú (mismo
// hook, mismo umbral de scroll) y anima el paddingTop en vez de una clase
// fija: 80px con el menú visible, 24px con el menú oculto -- la transición
// coincide con la del menú (200ms) para que el contenido "suba" en sincro
// con la desaparición, no de golpe.
export function EspacioSuperior({
  children,
  maxWidth = "max-w-2xl",
  className = "",
}: {
  children: React.ReactNode;
  maxWidth?: string;
  // Clases extra para el div raíz -- ej. "w-full shrink-0" en CalendarioShell,
  // donde este wrapper es el hijo no-scrolleable de un flex-col y necesita
  // esas clases para no encogerse cuando el contenido total excede la altura
  // de pantalla (ver el otro div hermano, con overflow-y-auto propio).
  className?: string;
}) {
  const oculto = useOcultarAlScrollear();
  return (
    <div
      className={`mx-auto ${maxWidth} px-5 ${className}`.trim()}
      style={{ paddingTop: oculto ? 24 : 80, transition: "padding-top 200ms" }}
    >
      {children}
    </div>
  );
}
