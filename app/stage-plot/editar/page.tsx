import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias } from "@/lib/malgestoEventos";
import { obtenerOCrearStagePlot, obtenerPlazasConPersonaDeBanda, obtenerAmplificadoresDeBanda } from "@/lib/stagePlotData";
import { StagePlotEditor } from "@/components/stagePlot/StagePlotEditor";

// Mismo patrón que /canciones/nueva: banda resuelta por ?banda=, con
// mismo criterio de acceso que Canciones (administrador/superadmin —
// requerirAccesoBloque en las mutaciones, esto es solo el gate de UI).
export default async function EditarStagePlotPage({
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
  if (!banda) redirect("/stage-plot");
  if (banda.rol !== "administrador" && banda.rol !== "superadmin") redirect(`/stage-plot?banda=${banda.bandaId}`);

  const [stagePlot, plazas, amplificadores] = await Promise.all([
    obtenerOCrearStagePlot(banda.bandaId),
    obtenerPlazasConPersonaDeBanda(banda.bandaId),
    obtenerAmplificadoresDeBanda(banda.bandaId),
  ]);

  return (
    <div className="min-h-screen box-border px-6 py-8 md:px-16 md:py-11" style={{ background: "oklch(0.965 0.012 82)", color: "oklch(0.24 0.02 55)" }}>
      <Link href={`/stage-plot?banda=${banda.bandaId}`} className="mb-6 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ {banda.bandaNombre} · Stage Plot
        </span>
      </Link>
      <StagePlotEditor
        bandaId={banda.bandaId}
        bandaColor={banda.color}
        stagePlotId={stagePlot.id}
        itemsIniciales={stagePlot.items}
        plazas={plazas}
        amplificadores={amplificadores}
      />
    </div>
  );
}
