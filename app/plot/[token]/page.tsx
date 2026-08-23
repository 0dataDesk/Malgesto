import { notFound } from "next/navigation";
import { obtenerStagePlotPorToken } from "@/lib/stagePlotData";
import { construirRider, obtenerRiderInfo } from "@/lib/riderData";
import { RiderTecnicoModulo } from "@/components/stagePlot/RiderTecnicoModulo";

// Ruta pública a propósito (Brief Stage Plot §5, "link público de solo
// lectura") — deliberadamente fuera de proxy.ts/proxyClient.ts (ver
// comentarios ahí), pensada para el sonidista del venue, que no tiene
// cuenta en Malgesto. Sin chequeo de sesión ni de membresía: el único
// control de acceso es conocer el share_token (uuid, no adivinable, uno
// por banda, ver migración stage_plot_habilitado_y_share_token). Brief
// "Rider Técnico: renombrar módulo + rediseñar contenido de Rider": mismo
// RiderTecnicoModulo que la vista interna (app/stage-plot/page.tsx), acá
// siempre `puedeEditar={false}` -- ni Rider ni Stage son editables desde
// el link público, solo lectura.
export default async function StagePlotPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await obtenerStagePlotPorToken(token);
  if (!resultado) notFound();

  const { stagePlot, bandaNombre, bandaColor } = resultado;
  const [rider, riderInfo] = await Promise.all([
    construirRider(stagePlot, stagePlot.bandaId, bandaNombre, bandaColor),
    obtenerRiderInfo(stagePlot.id),
  ]);

  return (
    <div className="min-h-screen pb-12" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="mb-4 font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          Rider Técnico
        </div>

        <RiderTecnicoModulo
          bandaId={stagePlot.bandaId}
          bandaColor={bandaColor}
          puedeEditar={false}
          stagePlotId={stagePlot.id}
          itemsIniciales={stagePlot.items}
          rider={rider}
          riderInfo={riderInfo}
          plazas={[]}
          amplificadores={[]}
          shareToken={null}
        />
      </div>
    </div>
  );
}
