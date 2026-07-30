import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerCancionCompleta } from "@/lib/cancionesData";
import { CancionForm } from "@/components/canciones/CancionForm";

export default async function EditarCancionPage({
  params,
}: {
  params: Promise<{ cancionId: string }>;
}) {
  const { cancionId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const cancion = await obtenerCancionCompleta(cancionId);
  if (!cancion) notFound();

  const banda = membresias.find((m) => m.bandaId === cancion.bandaId);
  if (!banda) notFound();

  return (
    <div
      className="flex h-screen flex-col box-border px-6 py-8 md:px-16 md:py-11"
      style={{ background: "oklch(0.965 0.012 82)", color: "oklch(0.24 0.02 55)" }}
    >
      <Link href={`/canciones/${cancionId}`} className="mb-1.5 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ {banda.bandaNombre} · {cancion.titulo}
        </span>
      </Link>
      <div className="mb-8 text-[32px] font-extrabold" style={{ fontFamily: "var(--font-bricolage), sans-serif" }}>
        Editar canción
      </div>
      <div className="min-h-0 flex-1">
        <CancionForm bandaId={banda.bandaId} cancionExistente={cancion} />
      </div>
    </div>
  );
}
