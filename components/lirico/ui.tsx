"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Resultado } from "@/app/lirico/actions";

export const INK = "oklch(0.24 0.044 262)";
export const MUTED = "oklch(0.5 0.044 262)";
export const LINEA = "1px solid oklch(0.89 0.008 85)";
export const CAMPO = { border: LINEA, background: "oklch(0.99 0.005 85)", color: INK } as const;

// Ejecuta una acción del servidor, muestra su error y refresca los datos de la pantalla.
export function useAccion() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  function correr(f: () => Promise<Resultado>, alExito?: () => void) {
    setError(null);
    setGuardado(false);
    start(async () => {
      const r = await f();
      if (!r.ok) { setError(r.mensaje); return; }
      setGuardado(true);
      alExito?.();
      router.refresh();
    });
  }
  return { pending, error, guardado, correr };
}

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{children}</div>;
}

export function Boton({ children, pending, onClick, type = "button", suave = false }: { children: React.ReactNode; pending?: boolean; onClick?: () => void; type?: "button" | "submit"; suave?: boolean }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      className="rounded-xl px-3.5 py-1.5 text-xs font-bold"
      style={suave ? { background: "oklch(0.93 0.010 85)", color: INK } : { background: "oklch(0.64 0.170 28)", color: "oklch(0.99 0.006 85)" }}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function Estado({ error, guardado }: { error: string | null; guardado: boolean }) {
  if (error) return <span className="text-xs" style={{ color: "oklch(0.5 0.18 25)" }}>{error}</span>;
  if (guardado) return <span className="text-xs" style={{ color: MUTED }}>Guardado</span>;
  return null;
}
