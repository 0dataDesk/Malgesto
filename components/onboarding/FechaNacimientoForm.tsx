"use client";

import { useState, useTransition } from "react";
import { guardarFechaNacimientoAction } from "@/app/onboarding/actions";

export function FechaNacimientoForm({ next }: { next?: string }) {
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    if (!fecha) {
      setError("Ingresá una fecha.");
      return;
    }
    startTransition(async () => {
      try {
        await guardarFechaNacimientoAction(fecha, next);
      } catch (e) {
        // redirect() lanza internamente una excepción de control de flujo de
        // Next.js que no debe tratarse como error de la app.
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) {
          setError(e.message);
        } else if (!(e instanceof Error)) {
          throw e;
        }
      }
    });
  };

  return (
    <div
      className="flex w-full max-w-[360px] flex-col gap-5 rounded-2xl p-6"
      style={{ background: "oklch(0.99 0.008 82)", boxShadow: "0 20px 40px -16px rgba(0,0,0,0.4)" }}
    >
      <div>
        <h1
          className="text-[24px] font-extrabold tracking-tight"
          style={{ color: "oklch(0.24 0.02 55)", fontFamily: "var(--font-bricolage), sans-serif" }}
        >
          Un dato más
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "oklch(0.5 0.02 55)" }}>
          Necesitamos tu fecha de nacimiento para armar los cumpleaños de la banda. Se pide una sola vez.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm" style={{ color: "oklch(0.5 0.02 55)" }}>
        Fecha de nacimiento
        <input
          type="date"
          value={fecha}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending || !fecha}
        onClick={onSubmit}
        className="w-full rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
      >
        {pending ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
