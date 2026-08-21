"use client";

import { useState, useTransition } from "react";
import type { Presskit } from "@/lib/presskitData";
import { actualizarLigaPublicadaAction } from "@/app/presskit-captura/actions";

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

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function Etiqueta({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
      {children}
    </label>
  );
}

// Brief "Presskit como bloque, Liga publicada en Bandas, acordeón de
// bloques" §2: se mudó de la pantalla de captura de Presskit (Brief
// "Presskit — vista propia..." §3) a DetalleBanda en Gestión > Bandas --
// mismos campos/lógica, solo cambia quién la monta (por eso vive acá, en el
// archivo compartido, y ya no como función local de PresskitCaptura.tsx).
// Brief "Ajustes: acordeón combinado en Bandas + botones de Presskit en su
// vista" §2: "Visitar"/"Compartir" salieron de acá -- son acciones de
// consumo para cualquier integrante, no de edición de admin, así que ahora
// viven solo en /presskit (VisitarCompartirPresskit, ver app/presskit/
// page.tsx). Esto queda como edición pura: el input + Guardar.
export function LigaPublicadaSeccion({
  bandaId,
  presskitId,
  ligaActual,
  onLiga,
}: {
  bandaId: string;
  presskitId: string;
  ligaActual: string | null;
  onLiga: (liga: string | null) => void;
}) {
  const [valor, setValor] = useState(ligaActual ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      try {
        const limpia = valor.trim() || null;
        await actualizarLigaPublicadaAction(bandaId, presskitId, limpia);
        onLiga(limpia);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la liga.");
      }
    });
  };

  return (
    <div>
      <Etiqueta>Liga publicada</Etiqueta>
      <p className="mb-2.5 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
        Pegá acá la URL una vez que Design entregue la página pública.
      </p>
      <div className="flex gap-1.5">
        <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="https://…" className={`${inputCls} flex-1`} style={inputStyle} />
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="shrink-0 rounded-lg px-3 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Guardar
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
