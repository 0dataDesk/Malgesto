import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { reintentarAcceso, cerrarSesion } from "@/app/auth/actions";

export default async function SinAccesoPage() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const inicial = user.email[0].toUpperCase();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ background: "oklch(0.965 0.012 82)" }}
    >
      <div
        className="flex h-[74px] w-[74px] items-center justify-center rounded-full"
        style={{ background: "oklch(0.74 0.12 78 / 0.18)", border: "2px solid oklch(0.74 0.12 78)" }}
      >
        <div
          className="relative h-[22px] w-[22px] rounded-full"
          style={{ border: "3px solid oklch(0.6 0.1 72)" }}
        >
          <span
            className="absolute left-1/2 top-[3px] -translate-x-1/2"
            style={{ width: 2.5, height: 9, background: "oklch(0.6 0.1 72)" }}
          />
        </div>
      </div>

      <h1
        className="mt-6 text-[28px] font-extrabold tracking-tight"
        style={{ color: "oklch(0.24 0.02 55)" }}
      >
        Aún no tienes acceso
      </h1>
      <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed" style={{ color: "oklch(0.48 0.02 55)" }}>
        Tu correo no está en ninguna invitación todavía. Le avisamos al administrador — aparecerás en su
        lista de pendientes.
      </p>

      <div
        className="mt-6 flex items-center gap-2.5 rounded-2xl px-4 py-3"
        style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {inicial}
        </span>
        <span className="text-[13px]" style={{ color: "oklch(0.3 0.02 55)", fontFamily: "monospace" }}>
          {user.email}
        </span>
      </div>

      <div className="mt-8 flex w-full max-w-[300px] flex-col gap-2.5">
        <form action={reintentarAcceso}>
          <button
            type="submit"
            className="w-full rounded-2xl px-4 py-3.5 text-[15px] font-semibold"
            style={{ background: "oklch(0.24 0.02 55)", color: "oklch(0.96 0.012 82)" }}
          >
            Volver a intentar
          </button>
        </form>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="w-full rounded-2xl px-4 py-3.5 text-sm font-semibold"
            style={{ color: "oklch(0.5 0.02 55)" }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
