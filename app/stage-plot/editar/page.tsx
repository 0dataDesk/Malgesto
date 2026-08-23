import { redirect } from "next/navigation";

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider"
// §5: ya no hay una ruta aparte para editar el plot -- Paso 5 pedía que las
// tres secciones (Rider/Stage/Input) se sientan como un solo módulo, no
// pantallas sueltas pegadas, así que el canvas interactivo (StagePlotEditor)
// se movió DENTRO de la pestaña "Stage" de /stage-plot (ver
// RiderTecnicoModulo.tsx), condicionado a `puedeEditar` en vez de vivir en
// su propia página. Esta ruta se queda solo como redirect por si algún
// link/bookmark viejo la sigue apuntando.
export default async function EditarStagePlotRedirect({
  searchParams,
}: {
  searchParams: Promise<{ banda?: string }>;
}) {
  const { banda } = await searchParams;
  redirect(banda ? `/stage-plot?banda=${banda}` : "/stage-plot");
}
