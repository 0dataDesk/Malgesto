import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerBandaPorSlugPresskit, obtenerPresskitPublico, type PresskitPublico } from "@/lib/presskitData";
import { resolverDiseno } from "@/components/presskit-publico/registro";

// Brief "Presskit público: diseño independiente por banda": esta ruta
// resuelve los datos reales (misma lógica de siempre -- presskits,
// presskit_fotos, presskit_redes, integrantes, próximas fechas) y delega
// TODO el layout/identidad visual al componente de diseño de esa banda
// puntual (ver components/presskit-publico/registro.ts) -- antes había un
// solo diseño compartido acá mismo, lo que hacía que actualizar el de una
// banda le cambiara el aspecto a todas las demás. Deliberadamente fuera de
// proxy.ts (mismo criterio que /plot/[token]): sin sesión ni membresía, la
// única forma de acceso es conocer el slug.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) return {};
  return {
    title: `${banda.bandaNombre} — Presskit`,
    description: banda.bandaGenero ? `Presskit de ${banda.bandaNombre} (${banda.bandaGenero}).` : `Presskit de ${banda.bandaNombre}.`,
  };
}

export default async function PresskitPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const banda = await obtenerBandaPorSlugPresskit(slug);
  if (!banda) notFound();

  const datos: PresskitPublico = await obtenerPresskitPublico(banda.bandaId, banda.bandaNombre, banda.bandaGenero, banda.bandaColor);
  const { Diseno } = resolverDiseno(slug);

  return <Diseno datos={datos} />;
}
