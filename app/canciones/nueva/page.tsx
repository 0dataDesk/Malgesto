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

  return (
    <div className="flex h-screen flex-col box-border px-6 py-8 md:px-16 md:py-11" style={{ color: "oklch(0.95 0.005 260)" }}>
      <Link href="/canciones" className="mb-1.5 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.6 0.01 260)" }}>
          ‹ {banda.bandaNombre}
        </span>
      </Link>
      <div className="mb-8 text-[32px] font-extrabold">Agregar canción</div>
      <div className="min-h-0 flex-1">
        <CancionForm bandaId={banda.bandaId} />
      </div>
    </div>
  );
}
