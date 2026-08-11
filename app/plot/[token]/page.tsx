import { notFound } from "next/navigation";
import { obtenerStagePlotPorToken } from "@/lib/stagePlotData";
import { StagePlotLienzo } from "@/components/stagePlot/StagePlotLienzo";
import { BotonDescargarImagen } from "@/components/stagePlot/StagePlotAcciones";

// Ruta pública a propósito (Brief Stage Plot §5, "link público de solo
// lectura") — deliberadamente fuera de proxy.ts/proxyClient.ts (ver
// comentarios ahí), pensada para el sonidista del venue, que no tiene
// cuenta en Malgesto. Sin chequeo de sesión ni de membresía: el único
// control de acceso es conocer el share_token (uuid, no adivinable, uno
// por banda, ver migración stage_plot_habilitado_y_share_token).
export default async function StagePlotPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resultado = await obtenerStagePlotPorToken(token);
  if (!resultado) notFound();

  const { stagePlot, bandaNombre, bandaColor } = resultado;

  return (
    <div className="min-h-screen pb-12" style={{ background: "oklch(0.965 0.012 82)" }}>
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.5 0.02 55)" }}>
          Stage Plot
        </div>
        <h1
          className="mt-1 text-[30px] font-extrabold tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: bandaColor }}
        >
          {bandaNombre}
        </h1>

        <div className="mt-4">
          {stagePlot.items.length === 0 ? (
            <p className="mb-3 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Esta banda todavía no armó su stage plot.
            </p>
          ) : null}
          <StagePlotLienzo items={stagePlot.items} bandaColor={bandaColor} />
        </div>

        {/* Brief "Rediseño de Stage Plot — Entrega 1" §5: la descarga vive
            acá -- es la única pantalla que ve quien recibe el link
            (sonidista del venue, sin cuenta en Malgesto). */}
        {stagePlot.items.length > 0 && (
          <div className="mt-4">
            <BotonDescargarImagen items={stagePlot.items} bandaNombre={bandaNombre} bandaColor={bandaColor} />
          </div>
        )}
      </div>
    </div>
  );
}
