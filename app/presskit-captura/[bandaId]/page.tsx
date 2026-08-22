import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerAuth } from "@/lib/supabase/serverClient";
import { obtenerMembresias, esSuperadminDeMembresias, bloqueVisible } from "@/lib/malgestoEventos";
import { obtenerBandasTodas } from "@/lib/gestionData";
import { obtenerOCrearPresskit, obtenerFotos, obtenerRedes } from "@/lib/presskitData";
import { obtenerPlazasConPersonaDeBanda } from "@/lib/stagePlotData";
import { PresskitCaptura } from "@/components/presskit/PresskitCaptura";

// Pantalla de captura/edición de datos del presskit (Brief "Presskit —
// vista de captura de datos"; movida a vista propia por Brief "Presskit —
// vista propia, estatus, liga publicada" §1): ni vista pública ni diseño
// visual, eso lo resuelve Design por separado usando el resumen que exporta
// el botón "Enviar a Presskit". El punto de entrada es el botón "Editar" de
// /presskit, el módulo de nivel superior (ya no el botón "Presskit" de
// Gestión > Bandas, que se quitó).
// Brief "Presskit: el botón 'Editar' también para admin de banda": el gate
// ya no es superadmin global -- también entra quien sea administrador de
// ESTA banda puntual (mismo mecanismo que ya usan Canciones/Stage Plot:
// membresía + rol, ver bloqueVisible/requerirAccesoBloque), con el bloque
// presskit visible para esa persona en esa banda. Superadmin conserva
// acceso a cualquier banda sin depender de bloqueVisible (ver `superadmin
// ||` más abajo).
export default async function PresskitCapturaPage({
  params,
}: {
  params: Promise<{ bandaId: string }>;
}) {
  const { bandaId } = await params;
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const membresias = await obtenerMembresias(user.id);
  if (membresias.length === 0) redirect("/sin-acceso");

  const superadmin = esSuperadminDeMembresias(membresias);
  const membresiaBanda = membresias.find((m) => m.bandaId === bandaId);
  const esAdminDeBanda = membresiaBanda?.rol === "administrador" && bloqueVisible(membresiaBanda, "presskit", superadmin);
  if (!superadmin && !esAdminDeBanda) redirect("/inicio");

  const bandas = await obtenerBandasTodas();
  const banda = bandas.find((b) => b.id === bandaId);
  if (!banda) redirect("/presskit");

  const presskit = await obtenerOCrearPresskit(bandaId);
  const [fotos, redes, integrantes] = await Promise.all([
    obtenerFotos(presskit.id),
    obtenerRedes(presskit.id),
    obtenerPlazasConPersonaDeBanda(bandaId),
  ]);

  return (
    <div className="min-h-screen box-border px-6 py-8 md:px-16 md:py-11" style={{ background: "oklch(0.965 0.012 82)", color: "oklch(0.24 0.02 55)" }}>
      <Link href={`/presskit?banda=${bandaId}`} className="mb-6 flex w-fit items-center gap-3.5 no-underline">
        <span className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          ‹ {banda.nombre} · Presskit
        </span>
      </Link>
      <PresskitCaptura
        banda={{ id: banda.id, nombre: banda.nombre, genero: banda.genero }}
        presskit={presskit}
        fotosIniciales={fotos}
        redesIniciales={redes}
        integrantes={integrantes}
      />
    </div>
  );
}
