import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { CancionForm } from "@/components/canciones/CancionForm";

export default async function NuevaCancionPage({
  searchParams,
}: {
  searchParams: Promise<{ banda?: string }>;
}) {
  const { banda: bandaId } = await searchParams;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const banda = membresias.find((m) => m.bandaId === bandaId) ?? membresias[0];
  if (!banda) notFound();

  // Brief "Nuevo nivel de rol": crear canciones es ahora solo para
  // administrador/superadmin — quien entre acá sin ese rol vuelve a la
  // lista en vez de ver un formulario que igual va a rechazar el server.
  if (banda.rol !== "administrador" && banda.rol !== "superadmin") redirect(`/canciones?banda=${banda.bandaId}`);

  return (
    <div
      className="min-h-screen box-border px-6 py-8 md:px-16 md:py-8"
      style={{ background: "oklch(0.965 0.007 85)", color: "oklch(0.24 0.044 262)" }}
    >
      <Link href={`/canciones?banda=${banda.bandaId}`} className="mb-1.5 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.044 262)" }}>
          ‹ {banda.bandaNombre}
        </span>
      </Link>
      <div className="mb-5 text-[32px] font-extrabold" style={{ fontFamily: "var(--font-fraunces), sans-serif" }}>
        Agregar canción
      </div>
      <CancionForm bandaId={banda.bandaId} />
    </div>
  );
}
