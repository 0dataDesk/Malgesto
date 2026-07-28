"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browserClient";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    setError(null);
    setPending(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setPending(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, oklch(0.64 0.15 34) 0%, oklch(0.56 0.15 24) 42%, oklch(0.4 0.11 30) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 top-16 h-52 w-52 rounded-full"
        style={{ background: "oklch(0.74 0.12 78 / 0.3)" }}
      />
      <div
        className="pointer-events-none absolute -left-12 top-64 h-36 w-36 rounded-full"
        style={{ background: "oklch(0.6 0.13 12 / 0.35)" }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-[22px] font-extrabold"
          style={{
            background: "oklch(0.99 0.01 82)",
            color: "oklch(0.64 0.15 34)",
            fontSize: 44,
            boxShadow: "0 20px 40px -16px rgba(0,0,0,0.4)",
          }}
        >
          M
        </div>
        <h1
          className="mt-6 text-[38px] font-extrabold tracking-tight"
          style={{ color: "oklch(0.99 0.01 82)" }}
        >
          Malgesto App
        </h1>
        <p
          className="mt-3 max-w-[280px] text-[15px] leading-relaxed"
          style={{ color: "oklch(0.99 0.01 82 / 0.85)" }}
        >
          El taller de tus bandas: repertorio, fechas, sets y seteos en un solo lugar.
        </p>
      </div>

      <div className="relative px-8 pb-12">
        <button
          type="button"
          onClick={entrar}
          disabled={pending}
          className="mx-auto flex w-full max-w-[340px] items-center justify-center gap-3 rounded-2xl px-4 py-4 font-bold disabled:opacity-70"
          style={{
            background: "oklch(0.99 0.01 82)",
            color: "oklch(0.24 0.02 55)",
            fontSize: 16,
            boxShadow: "0 16px 30px -14px rgba(0,0,0,0.4)",
          }}
        >
          <span
            className="h-5 w-5 rounded-full"
            style={{
              background:
                "conic-gradient(oklch(0.64 0.17 25) 0deg 90deg, oklch(0.74 0.14 85) 90deg 180deg, oklch(0.7 0.13 145) 180deg 270deg, oklch(0.6 0.14 250) 270deg 360deg)",
            }}
          />
          {pending ? "Conectando…" : "Continuar con Google"}
        </button>
        {error && (
          <p className="mx-auto mt-3 max-w-[340px] text-center text-sm" style={{ color: "oklch(0.9 0.01 82)" }}>
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.99 0.01 82 / 0.7)" }} />
          <span className="text-[11px] tracking-wide" style={{ color: "oklch(0.99 0.01 82 / 0.8)" }}>
            Acceso solo por invitación
          </span>
        </div>
      </div>
    </div>
  );
}
