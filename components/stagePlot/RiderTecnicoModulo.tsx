"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { StagePlotItem, PlazaConPersona, AmplificadorAsignado } from "@/lib/stagePlotData";
import type { RiderTecnico, RiderInfo } from "@/lib/riderData";
import { generarStagePlotPngDataUrl } from "./stagePlotExport";
import { RiderPdfDocument } from "./RiderPdfDocument";
import { StagePlotEditor } from "./StagePlotEditor";
import { InputListVista } from "./InputListVista";
import { ResumenEquipoVista } from "./ResumenEquipoVista";
import { RiderInfoVista } from "./RiderInfoVista";
import { BotonCopiarLink } from "./StagePlotAcciones";

type Pestana = "rider" | "stage" | "input";

const TEXTO_GRIS = "oklch(0.5 0.02 55)";

function slugBanda(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function PestanaBoton({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold"
      style={activo ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" } : { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
    >
      {children}
    </button>
  );
}

// Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider":
// un solo módulo con tres pestañas (Rider/Stage/Input) en vez de tres
// pantallas sueltas (antes: RiderVista mezclaba imagen+Input List+resumen
// en una tarjeta, y "Stage Plot — editar" vivía en una ruta aparte,
// /stage-plot/editar) -- Paso 5, "coherencia visual del módulo completo".
// La imagen del plot se genera UNA sola vez acá (igual que la vieja
// RiderVista), reusada tanto para la vista estática (Stage, si !puedeEditar)
// como para el PDF -- StagePlotEditor (Stage, si puedeEditar) es el canvas
// interactivo real, no una copia. Reusado tanto por la vista interna
// (app/stage-plot/page.tsx, puedeEditar según rol) como por el link
// público (app/plot/[token]/page.tsx, siempre solo lectura).
export function RiderTecnicoModulo({
  bandaId,
  bandaColor,
  puedeEditar,
  stagePlotId,
  itemsIniciales,
  rider,
  riderInfo,
  plazas,
  amplificadores,
  shareToken,
}: {
  bandaId: string;
  bandaColor: string;
  puedeEditar: boolean;
  stagePlotId: string;
  itemsIniciales: StagePlotItem[];
  rider: RiderTecnico;
  riderInfo: RiderInfo;
  plazas: PlazaConPersona[];
  amplificadores: AmplificadorAsignado[];
  shareToken: string | null;
}) {
  const [pestana, setPestana] = useState<Pestana>("rider");
  const [imagenDataUrl, setImagenDataUrl] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  const hayItems = itemsIniciales.length > 0;

  useEffect(() => {
    if (!hayItems) return;
    let cancelado = false;
    generarStagePlotPngDataUrl(rider.items, rider.bandaNombre, bandaColor)
      .then((url) => {
        if (!cancelado) setImagenDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setErrorImagen("No se pudo generar la imagen del stage plot.");
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rider.items/bandaNombre son estables por render; hayItems ya cubre el único caso real de recálculo (agregar el primer ítem).
  }, [hayItems]);

  const descargarPdf = async () => {
    setErrorPdf(null);
    setGenerandoPdf(true);
    try {
      const blob = await pdf(<RiderPdfDocument rider={rider} riderInfo={riderInfo} imagenDataUrl={imagenDataUrl} />).toBlob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `rider-tecnico-${slugBanda(rider.bandaNombre)}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorPdf("No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl p-5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "oklch(0.89 0.013 78)" }}>
          <div className="flex gap-1.5 overflow-x-auto">
            <PestanaBoton activo={pestana === "rider"} onClick={() => setPestana("rider")}>
              Rider
            </PestanaBoton>
            <PestanaBoton activo={pestana === "stage"} onClick={() => setPestana("stage")}>
              Stage
            </PestanaBoton>
            <PestanaBoton activo={pestana === "input"} onClick={() => setPestana("input")}>
              Input
            </PestanaBoton>
          </div>
          <div className="shrink-0 text-[10px]" style={{ color: TEXTO_GRIS }}>
            Generado el {rider.fechaGeneracion}
          </div>
        </div>

        {pestana === "rider" && <RiderInfoVista bandaId={bandaId} stagePlotId={stagePlotId} riderInfo={riderInfo} puedeEscribir={puedeEditar} />}

        {pestana === "stage" && (
          <div className="flex flex-col gap-4">
            {puedeEditar ? (
              <StagePlotEditor
                bandaId={bandaId}
                bandaColor={bandaColor}
                stagePlotId={stagePlotId}
                itemsIniciales={itemsIniciales}
                plazas={plazas}
                amplificadores={amplificadores}
              />
            ) : hayItems ? (
              <div className="flex justify-center">
                {imagenDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL generado en cliente (canvas), no un asset estático de Next.
                  <img src={imagenDataUrl} alt={`Stage plot de ${rider.bandaNombre}`} className="w-full max-w-xl rounded-lg" />
                ) : errorImagen ? (
                  <p className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
                    {errorImagen}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: TEXTO_GRIS }}>
                    Generando imagen…
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: TEXTO_GRIS }}>
                Todavía no hay un stage plot armado.
              </p>
            )}
            <ResumenEquipoVista amplificadores={rider.amplificadores} pedales={rider.pedales} escenario={rider.escenario} />
          </div>
        )}

        {pestana === "input" && <InputListVista canales={rider.canales} />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={descargarPdf}
          disabled={generandoPdf}
          className="rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          {generandoPdf ? "Generando PDF…" : "Descargar PDF"}
        </button>
        {puedeEditar && shareToken && <BotonCopiarLink shareToken={shareToken} />}
        {errorPdf && (
          <span className="text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>
            {errorPdf}
          </span>
        )}
      </div>
    </div>
  );
}
