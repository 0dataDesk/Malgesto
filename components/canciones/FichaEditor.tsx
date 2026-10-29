"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CancionCompleta } from "@/lib/cancionesData";
import { actualizarFichaAction, eliminarCancionAction } from "@/app/canciones/actions";
import { FichaCampos, fichaAInput, fichaDesdeCancion, type FichaEstado } from "./FichaCampos";

// Ventana "Editar" del modo Estudio: una tarjeta centrada sobre la canción (no
// una vista aparte). Guarda solo la ficha; la estructura vive en su propia vista.

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const INK = "oklch(0.24 0.044 262)";
const LINE = "oklch(0.89 0.008 85)";
const ACCENT = "oklch(0.64 0.170 28)";

export function FichaEditor({ cancion, bandaNombre, onCerrar }: { cancion: CancionCompleta; bandaNombre: string; onCerrar: () => void }) {
  const router = useRouter();
  const [ficha, setFicha] = useState<FichaEstado>(() => fichaDesdeCancion(cancion));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  const guardar = (despues: "cerrar" | "estructura") => {
    setError(null);
    const input = fichaAInput(ficha);
    if (typeof input === "string") {
      setError(input);
      return;
    }
    startTransition(async () => {
      try {
        await actualizarFichaAction(cancion.id, cancion.bandaId, input);
        if (despues === "estructura") router.push(`/canciones/${cancion.id}/editar`);
        else {
          router.refresh();
          onCerrar();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${cancion.titulo}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.24 0.044 262 / 0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="flex max-h-full w-full flex-col overflow-hidden rounded-2xl" style={{ maxWidth: 620, background: "oklch(0.965 0.007 85)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)", color: INK }}>
        <div className="flex items-center gap-2 px-5 pt-4">
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.5 0.044 262)" }}>{bandaNombre} · Editar</span>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="ml-auto rounded-full px-2 text-lg leading-none" style={{ color: "oklch(0.5 0.044 262)" }}>
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <FichaCampos ficha={ficha} onCambio={(patch) => setFicha((f) => ({ ...f, ...patch }))} compasesCalculados={cancion.compasesCalculados} />

          <button
            type="button"
            disabled={pending}
            onClick={() => guardar("estructura")}
            className="mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold disabled:opacity-50"
            style={{ background: INK, color: "oklch(0.965 0.007 85)" }}
          >
            <span>Estructura de la canción</span>
            <span aria-hidden>→</span>
          </button>
          {error && <div className="mt-3 text-sm" style={{ color: "oklch(0.55 0.18 25)" }}>{error}</div>}
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-3" style={{ borderColor: LINE }}>
          <button type="button" disabled={pending} onClick={() => guardar("cerrar")} className="rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50" style={{ background: ACCENT, color: "oklch(0.99 0.006 85)" }}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Eliminar «${cancion.titulo}»? No se puede deshacer.`)) return;
              startTransition(() => {
                void eliminarCancionAction(cancion.id, cancion.bandaId);
              });
            }}
            className="ml-auto rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ border: "1px solid oklch(0.6 0.15 25 / 0.45)", color: "oklch(0.5 0.18 25)", background: "transparent" }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
