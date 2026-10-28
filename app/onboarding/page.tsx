import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { FechaNacimientoForm } from "@/components/onboarding/FechaNacimientoForm";

// Paso bloqueante de primer login (o primera visita tras este cambio):
// proxy.ts redirige acá a cualquier usuario autenticado sin
// malgesto.personas.fecha_nacimiento antes de dejarlo entrar al resto de la
// app — ver lib/supabase/proxyClient.ts. Una vez guardada no se vuelve a
// pedir.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, oklch(0.42 0.07 262) 0%, oklch(0.32 0.06 262) 45%, oklch(0.22 0.045 262) 100%)",
      }}
    >
      <FechaNacimientoForm next={next} />
    </div>
  );
}
