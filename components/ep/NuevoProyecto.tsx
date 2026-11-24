"use client";

import { useState, useTransition } from "react";
import { crearProyectoAction } from "@/app/musical/actions";

const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";

export function NuevoProyecto({ bandaId, compacto = false }: { bandaId: string; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(!compacto);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"ep" | "album">("ep");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-xs font-bold" style={{ color: MUTED }}>
        + Otro proyecto (EP o álbum)
      </button>
    );
  }
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            await crearProyectoAction(bandaId, nombre, tipo);
          } catch (err) {
            if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
            setError(err instanceof Error ? err.message : "No se pudo crear.");
          }
        });
      }}
    >
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del proyecto"
        maxLength={120}
        className="rounded-xl px-3 py-2 text-sm"
        style={{ border: "1px solid oklch(0.89 0.008 85)", background: "oklch(0.99 0.005 85)", color: INK }}
      />
      <select value={tipo} onChange={(e) => setTipo(e.target.value as "ep" | "album")} className="rounded-xl px-2 py-2 text-sm" style={{ border: "1px solid oklch(0.89 0.008 85)", background: "oklch(0.99 0.005 85)", color: INK }}>
        <option value="ep">EP</option>
        <option value="album">Álbum</option>
      </select>
      <button type="submit" disabled={pending} className="rounded-xl px-4 py-2 text-sm font-bold" style={{ background: "oklch(0.64 0.170 28)", color: "oklch(0.99 0.006 85)" }}>
        {pending ? "Creando…" : "Crear"}
      </button>
      {error && <span className="text-xs" style={{ color: "oklch(0.5 0.18 25)" }}>{error}</span>}
    </form>
  );
}
