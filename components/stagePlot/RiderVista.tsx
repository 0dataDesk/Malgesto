"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { RiderTecnico } from "@/lib/riderData";
import { generarStagePlotPngDataUrl } from "./stagePlotExport";
import { RiderPdfDocument } from "./RiderPdfDocument";

const botonCls = "rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60";
const botonStyle = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };

function slugBanda(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Brief "Rider técnico — vista previa completa + PDF de una página": una
// sola vista de rider, reusada tanto por la preview interna
// (app/stage-plot/page.tsx) como por el link público (app/plot/[token]/
// page.tsx) -- mismo contenido, mismo botón de descarga en las dos (§4,
// mismo criterio que ya regía para la imagen sola en Entrega 1). La imagen
// del stage plot se genera UNA sola vez acá (client-side, reusando
// generarStagePlotPngDataUrl de stagePlotExport.ts -- §2.2, "no
// reconstruir el render") y ese mismo data URL alimenta tanto el <img> en
// pantalla como el <Image> embebido en el PDF, así los dos coinciden
// exactamente en vez de generarse por separado.
export function RiderVista({ rider }: { rider: RiderTecnico }) {
  const [imagenDataUrl, setImagenDataUrl] = useState<string | null>(null);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    generarStagePlotPngDataUrl(rider.items, rider.bandaNombre, rider.bandaColor)
      .then((url) => {
        if (!cancelado) setImagenDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setErrorImagen("No se pudo generar la imagen del stage plot.");
      });
    return () => {
      cancelado = true;
    };
  }, [rider.items, rider.bandaNombre, rider.bandaColor]);

  const descargarPdf = async () => {
    if (!imagenDataUrl) return;
    setErrorPdf(null);
    setGenerandoPdf(true);
    try {
      const blob = await pdf(<RiderPdfDocument rider={rider} imagenDataUrl={imagenDataUrl} />).toBlob();
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

  const hayResumen = rider.amplificadores.length > 0 || rider.pedales.length > 0 || rider.escenario.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl p-5" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <div className="mb-3 flex items-end justify-between gap-3 border-b pb-3" style={{ borderColor: "oklch(0.89 0.013 78)" }}>
          <div>
            <h2
              className="text-xl font-extrabold"
              style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "oklch(0.24 0.02 55)" }}
            >
              {rider.bandaNombre}
            </h2>
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Stage Plot &amp; Rider Técnico
            </div>
          </div>
          <div className="shrink-0 text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
            Generado el {rider.fechaGeneracion}
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          {imagenDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generado en cliente (canvas), no un asset estático de Next.
            <img src={imagenDataUrl} alt={`Stage plot de ${rider.bandaNombre}`} className="w-full max-w-xl rounded-lg" />
          ) : errorImagen ? (
            <p className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
              {errorImagen}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
              Generando imagen…
            </p>
          )}
        </div>

        {rider.canales.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.02 55)" }}>
              Input List
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr
                  className="border-b text-[10px] uppercase tracking-wide"
                  style={{ borderColor: "oklch(0.24 0.02 55)", color: "oklch(0.55 0.02 55)" }}
                >
                  <th className="w-10 py-1 font-mono font-bold">Ch</th>
                  <th className="py-1 font-mono font-bold">Fuente</th>
                  <th className="py-1 font-mono font-bold">Mic / DI</th>
                </tr>
              </thead>
              <tbody>
                {rider.canales.map((c) => (
                  <tr key={c.numero} className="border-b" style={{ borderColor: "oklch(0.91 0.013 78)" }}>
                    <td className="py-1.5 font-mono font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                      {c.numero}
                    </td>
                    <td className="py-1.5" style={{ color: "oklch(0.3 0.02 55)" }}>
                      {c.fuente}
                    </td>
                    <td className="py-1.5" style={{ color: "oklch(0.55 0.02 55)" }}>
                      {c.mic ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hayResumen && (
          <div>
            <h3 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.02 55)" }}>
              Resumen de equipo
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {rider.amplificadores.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
                    Amplificadores
                  </div>
                  <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
                    {rider.amplificadores.map((a, idx) => (
                      <li key={idx}>
                        {a.disenoNombre} — {a.nombrePersona}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rider.pedales.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
                    Pedaleras
                  </div>
                  <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
                    {rider.pedales.map((p, idx) => (
                      <li key={idx}>
                        {p.nombrePersona}: {p.cantidad} pedal{p.cantidad === 1 ? "" : "es"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rider.escenario.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-bold" style={{ color: "oklch(0.35 0.02 55)" }}>
                    Escenario
                  </div>
                  <ul className="flex flex-col gap-0.5 text-xs" style={{ color: "oklch(0.4 0.02 55)" }}>
                    {rider.escenario.map((e) => (
                      <li key={e.tipo}>
                        {e.etiqueta}: {e.cantidad}
                        {e.etiquetas.length > 0 ? ` (${e.etiquetas.join(", ")})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={descargarPdf} disabled={!imagenDataUrl || generandoPdf} className={botonCls} style={botonStyle}>
          {generandoPdf ? "Generando PDF…" : "Descargar PDF"}
        </button>
        {errorPdf && (
          <span className="text-xs" style={{ color: "oklch(0.6 0.15 25)" }}>
            {errorPdf}
          </span>
        )}
      </div>
    </div>
  );
}
