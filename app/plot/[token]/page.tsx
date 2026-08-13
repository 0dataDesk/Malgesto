import { notFound } from "next/navigation";
import { obtenerStagePlotPorToken } from "@/lib/stagePlotData";
import { construirRider } from "@/lib/riderData";
import { RiderVista } from "@/components/stagePlot/RiderVista";

// Ruta pública a propósito (Brief Stage Plot §5, "link público de solo
// lectura") — deliberadamente fuera de proxy.ts/proxyClient.ts (ver
// comentarios ahí), pensada para el sonidista del venue, que no tiene
// cuenta en Malgesto. Sin chequeo de sesión ni de membresía: el único
// control de acceso es conocer el share_token (uuid, no adivinable, uno
// por banda, ver migración stage_plot_habilitado_y_share_token). Brief
// "Rider técnico — vista previa completa + PDF de una página": esta
// pantalla deja de mostrar solo el lienzo + descarga de imagen -- ahora es
// el rider completo, mismo contenido que la preview interna (ver
// app/stage-plot/page.tsx).
export default async function StagePlotPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await obtenerStagePlotPorToken(token);
  if (!resultado) notFound();

  const { stagePlot, bandaNombre, bandaColor } = resultado;
  const rider = stagePlot.items.length > 0 ? await construirRider(stagePlot, stagePlot.bandaId, bandaNombre, bandaColor) : null;

  return (
    <div className="min-h-screen pb-12" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="mb-4 font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          Stage Plot
        </div>

        {rider ? (
          <RiderVista rider={rider} />
        ) : (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Esta banda todavía no armó su stage plot.
          </p>
        )}
      </div>
    </div>
  );
}
