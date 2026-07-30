"use client";

import { useState } from "react";
import Link from "next/link";
import type { BandaSimple, PersonaPendiente, Integrante, Plaza } from "@/lib/gestionData";
import type { Lugar } from "@/lib/lugaresData";
import { BandasPanel } from "./BandasPanel";
import { IntegrantesPanel } from "./IntegrantesPanel";
import { LugaresPanel } from "./LugaresPanel";

const SECCIONES = ["bandas", "integrantes", "lugares"] as const;
type Seccion = (typeof SECCIONES)[number];
const ETIQUETA_SECCION: Record<Seccion, string> = { bandas: "Bandas", integrantes: "Integrantes", lugares: "Lugares" };

// Pantalla 15 "Escritorio · Gestión" (Brief 7, reseccionada en Brief 8 §2,
// "Cuartos de ensayo" renombrado a "Lugares" en Brief 9 §12): tres secciones
// en vez de una sola pantalla scrolleable.
export function GestionShell({
  bandas,
  personasPendientes,
  integrantes,
  lugares,
  plazas,
}: {
  bandas: BandaSimple[];
  personasPendientes: PersonaPendiente[];
  integrantes: Integrante[];
  lugares: Lugar[];
  plazas: Plaza[];
}) {
  const [seccion, setSeccion] = useState<Seccion>("bandas");

  return (
    <div className="min-h-screen pb-20" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-2xl px-5 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/inicio" className="text-sm no-underline" style={{ color: "oklch(0.6 0.02 55)" }}>
            ‹ Inicio
          </Link>
        </div>
        <h2
          className="text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
        >
          Gestión
        </h2>

        <div className="mt-4 flex gap-1 rounded-[12px] p-[3px]" style={{ background: "oklch(0.93 0.016 78)" }}>
          {SECCIONES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeccion(s)}
              className="flex-1 rounded-[9px] px-2 py-2 text-xs font-bold"
              style={{
                background: seccion === s ? "oklch(0.24 0.02 55)" : "transparent",
                color: seccion === s ? "oklch(0.96 0.012 82)" : "oklch(0.45 0.02 55)",
              }}
            >
              {ETIQUETA_SECCION[s]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {seccion === "bandas" && <BandasPanel bandas={bandas} plazas={plazas} />}
          {seccion === "integrantes" && (
            <IntegrantesPanel
              bandas={bandas}
              personasPendientes={personasPendientes}
              integrantes={integrantes}
              plazas={plazas}
            />
          )}
          {seccion === "lugares" && <LugaresPanel bandas={bandas} lugares={lugares} />}
        </div>
      </div>
    </div>
  );
}
