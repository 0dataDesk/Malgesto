import Link from "next/link";
import type { Membresia } from "@/lib/bloques";
import { EmojiOPunto } from "@/components/ui/EmojiOPunto";

// Brief "Selector '¿Qué banda?' — mismo diseño de tarjeta que Gestión >
// Bandas (sin bloques)": mismo lenguaje visual que la tarjeta de banda de
// Gestión (commit 82ebfa0) -- grid de 2 columnas, acento de color en el
// borde superior en vez de rellenar toda la tarjeta, badge circular. Sin la
// fila de pills de bloques activos (no aplica acá, esto es un selector, no
// la ficha de administración de la banda). El fondo del badge es siempre el
// color de banda -- EmojiOPunto cubre el caso sin emoji (queda como un punto
// sólido del mismo color, sin la inicial que sí usa BadgeBanda en Gestión).
// `children` es para contenido extra por pantalla (ej. el balance en
// Finanzas, ver feedback-malgesto-finanzas-band-selector) sin bifurcar el
// componente entero por eso.
export function TarjetaSeleccionarBanda({
  membresia,
  href,
  children,
}: {
  membresia: Membresia;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center no-underline"
      style={{
        background: "oklch(0.99 0.008 82)",
        border: "1px solid oklch(0.89 0.013 78)",
        borderTop: `4px solid ${membresia.color}`,
      }}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: membresia.color }}>
        <EmojiOPunto emoji={membresia.emoji} color={membresia.color} size={56} fontSize={28} />
      </div>
      <div className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
        {membresia.bandaNombre}
      </div>
      {membresia.genero && (
        <div className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
          {membresia.genero}
        </div>
      )}
      {children}
    </Link>
  );
}
