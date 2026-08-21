"use client";

import { useState } from "react";
import type { Presskit } from "@/lib/presskitData";

// Brief "Presskit — vista propia, estatus, liga publicada" §2: 3 estados
// posibles según enviado_en/actualizado_en. Compartido entre la vista de
// nivel superior (/presskit, solo lectura) y la pantalla de captura
// (/presskit-captura/[bandaId], donde además se edita).
export type EstadoPresskit = "sin_enviar" | "actualizado" | "en_revision";

export function estadoPresskit(p: Pick<Presskit, "enviadoEn" | "actualizadoEn">): EstadoPresskit {
  if (!p.enviadoEn) return "sin_enviar";
  if (!p.actualizadoEn) return "actualizado";
  return new Date(p.actualizadoEn).getTime() > new Date(p.enviadoEn).getTime() ? "en_revision" : "actualizado";
}

const ESTILOS: Record<EstadoPresskit, { background: string; color: string; texto: string }> = {
  sin_enviar: { background: "oklch(0.93 0.016 78)", color: "oklch(0.45 0.02 55)", texto: "Sin enviar" },
  actualizado: { background: "oklch(0.9 0.1 150)", color: "oklch(0.35 0.12 150)", texto: "Actualizado" },
  en_revision: { background: "oklch(0.92 0.1 75)", color: "oklch(0.45 0.13 60)", texto: "En revisión" },
};

export function EstadoBadge({ presskit }: { presskit: Pick<Presskit, "enviadoEn" | "actualizadoEn"> }) {
  const s = ESTILOS[estadoPresskit(presskit)];
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: s.background, color: s.color }}>
      {s.texto}
    </span>
  );
}

// Brief §3: si liga_publicada tiene valor, "Visitar Presskit" + "Compartir"
// (nativo si el navegador lo soporta, si no copia al portapapeles); si está
// vacío, se muestran deshabilitados en vez de ocultarse -- así la persona
// entiende que la publicación todavía no existe, no que el botón se perdió.
export function VisitarCompartirPresskit({ liga }: { liga: string | null }) {
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    if (!liga) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Presskit", url: liga });
      } catch {
        // Cancelado desde el share sheet nativo -- no es un error real.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(liga);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // El portapapeles puede fallar por permisos del navegador -- la liga
      // ya queda visible para copiarla a mano.
    }
  };

  return (
    <div className="flex gap-2">
      <a
        href={liga ?? undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!liga}
        onClick={(e) => {
          if (!liga) e.preventDefault();
        }}
        className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold no-underline"
        style={
          liga
            ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
            : { background: "oklch(0.93 0.016 78)", color: "oklch(0.65 0.02 55)", cursor: "not-allowed" }
        }
      >
        Visitar Presskit
      </a>
      <button
        type="button"
        onClick={compartir}
        disabled={!liga}
        className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
      >
        {copiado ? "Copiado ✓" : "Compartir"}
      </button>
    </div>
  );
}
