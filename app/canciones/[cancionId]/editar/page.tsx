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

  // Brief "Nuevo nivel de rol": editar canciones es ahora solo para
  // administrador/superadmin — un miembro simple vuelve a la vista final
  // (sigue pudiendo verla) en vez de ver un formulario que igual rechazará.
  if (banda.rol !== "administrador" && banda.rol !== "superadmin") redirect(`/canciones/${cancionId}`);

  return (
    <div
      className="min-h-screen box-border px-6 py-8 md:px-16 md:py-8"
      style={{ background: "oklch(0.965 0.007 85)", color: "oklch(0.24 0.044 262)" }}
    >
      <Link href={`/canciones/${cancionId}`} className="mb-4 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.044 262)" }}>
          ‹ {banda.bandaNombre} · {cancion.titulo}
        </span>
      </Link>
      <CancionForm bandaId={banda.bandaId} cancionExistente={cancion} />
    </div>
  );
}
