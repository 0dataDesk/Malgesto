"use client";

import { useState, useTransition } from "react";
import type { Presskit } from "@/lib/presskitData";
import { actualizarLigaPublicadaAction, enviarPresskitAction } from "@/app/gestion/actions";

// Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados"
// §4: reemplaza los 3 estados anteriores (Actualizado/En revisión/Sin
// enviar, que comparaban actualizado_en contra enviado_en) por 4 -- la
// comparación relevante para "Actualizado" pasa a ser actualizado_en contra
// liga_actualizada_en, porque lo que le importa a quien mira el estatus es
// si la LIGA PUBLICADA ya refleja el contenido más reciente, no si Jorge
// mandó aviso a Design. Compartido entre la vista de nivel superior
// (/presskit, solo lectura) y Gestión > Bandas (DetalleBanda, donde además
// se edita).
export type EstadoPresskit = "sin_enviar" | "en_revision" | "publicado_pendiente" | "actualizado";

function tiempo(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

export function estadoPresskit(p: Pick<Presskit, "enviadoEn" | "actualizadoEn" | "ligaPublicada" | "ligaActualizadaEn">): EstadoPresskit {
  if (!p.enviadoEn) return "sin_enviar";
  if (!p.ligaPublicada) return "en_revision";
  return tiempo(p.actualizadoEn) > tiempo(p.ligaActualizadaEn) ? "publicado_pendiente" : "actualizado";
}

const ESTILOS: Record<EstadoPresskit, { background: string; color: string; texto: string }> = {
  sin_enviar: { background: "oklch(0.93 0.016 78)", color: "oklch(0.45 0.02 55)", texto: "Sin enviar" },
  en_revision: { background: "oklch(0.92 0.1 75)", color: "oklch(0.45 0.13 60)", texto: "En revisión" },
  publicado_pendiente: { background: "oklch(0.9 0.12 40)", color: "oklch(0.4 0.16 30)", texto: "Cambios pendientes" },
  actualizado: { background: "oklch(0.9 0.1 150)", color: "oklch(0.35 0.12 150)", texto: "Actualizado" },
};

export function EstadoBadge({ presskit }: { presskit: Pick<Presskit, "enviadoEn" | "actualizadoEn" | "ligaPublicada" | "ligaActualizadaEn"> }) {
  const s = ESTILOS[estadoPresskit(presskit)];
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: s.background, color: s.color }}>
      {s.texto}
    </span>
  );
}

// Brief §3: si liga_publicada tiene valor, "Visitar Presskit" + "Compartir"
// (nativo si el navegador lo soporta, si no copia al portapapeles); si está
// vacío, se muestran deshabilitados en vez de ocultarse -- así la persona
// entiende que la publicación todavía no existe, no que el botón se perdió.
export function VisitarCompartirPresskit({ liga }: { liga: string | null }) {
  const [copiado, setCopiado] = useState(false);

  const compartir = async () => {
    if (!liga) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Presskit", url: liga });
      } catch {
        // Cancelado desde el share sheet nativo -- no es un error real.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(liga);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // El portapapeles puede fallar por permisos del navegador -- la liga
      // ya queda visible para copiarla a mano.
    }
  };

  return (
    <div className="flex gap-2">
      <a
        href={liga ?? undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!liga}
        onClick={(e) => {
          if (!liga) e.preventDefault();
        }}
        className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold no-underline"
        style={
          liga
            ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
            : { background: "oklch(0.93 0.016 78)", color: "oklch(0.65 0.02 55)", cursor: "not-allowed" }
        }
      >
        Visitar Presskit
      </a>
      <button
        type="button"
        onClick={compartir}
        disabled={!liga}
        className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
      >
        {copiado ? "Copiado ✓" : "Compartir"}
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function Etiqueta({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
      {children}
    </label>
  );
}

// Brief "Presskit como bloque, Liga publicada en Bandas, acordeón de
// bloques" §2: se mudó de la pantalla de captura de Presskit (Brief
// "Presskit — vista propia..." §3) a DetalleBanda en Gestión > Bandas --
// mismos campos/lógica, solo cambia quién la monta (por eso vive acá, en el
// archivo compartido, y ya no como función local de PresskitCaptura.tsx).
// Brief "Ajustes: acordeón combinado en Bandas + botones de Presskit en su
// vista" §2: "Visitar"/"Compartir" salieron de acá -- son acciones de
// consumo para cualquier integrante, no de edición de admin, así que ahora
// viven solo en /presskit (VisitarCompartirPresskit, ver app/presskit/
// page.tsx). Esto queda como edición pura: el input + Guardar.
export function LigaPublicadaSeccion({
  bandaId,
  presskitId,
  ligaActual,
  onLiga,
}: {
  bandaId: string;
  presskitId: string;
  ligaActual: string | null;
  // Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4
  // estados" §3: además de la liga, avisa la nueva liga_actualizada_en --
  // espejada acá mismo (mismo criterio que marcarActualizado en
  // PresskitCaptura.tsx) para que el estatus reaccione sin esperar un
  // revalidatePath.
  onLiga: (liga: string | null, ligaActualizadaEn: string) => void;
}) {
  const [valor, setValor] = useState(ligaActual ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      try {
        const limpia = valor.trim() || null;
        await actualizarLigaPublicadaAction(bandaId, presskitId, limpia);
        onLiga(limpia, new Date().toISOString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la liga.");
      }
    });
  };

  return (
    <div>
      <Etiqueta>Liga publicada</Etiqueta>
      <p className="mb-2.5 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
        Pegá acá la URL una vez que Design entregue la página pública.
      </p>
      <div className="flex gap-1.5">
        <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="https://…" className={`${inputCls} flex-1`} style={inputStyle} />
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="shrink-0 rounded-lg px-3 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Guardar
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados"
// §2: si hay contenido editado (actualizadoEn no null) que todavía no se
// mandó -- ya sea porque nunca se envió, o porque se editó algo después del
// último envío -- hay algo pendiente de mandar. Exportada porque
// EnviarPresskitSeccion y su caller (DetalleBanda) la necesitan para
// decidir si mostrar el botón habilitado.
export function hayEnvioPendiente(enviadoEn: string | null, actualizadoEn: string | null): boolean {
  if (!actualizadoEn) return false;
  if (!enviadoEn) return true;
  return new Date(actualizadoEn).getTime() > new Date(enviadoEn).getTime();
}

// Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados"
// §1/§2: reemplaza el botón "Enviar a Presskit" que vivía en la pantalla de
// captura -- se mudó acá, justo debajo de Liga publicada en DetalleBanda,
// porque es Jorge (mismo nivel de acceso que el resto de Gestión > Bandas)
// quien decide cuándo avisarle a Design que hay una actualización, no quien
// simplemente está completando datos. Mismo documento/modal que antes
// (construirDocumentoPresskit vía enviarPresskitAction), solo cambia dónde
// vive el disparador.
export function EnviarPresskitSeccion({
  bandaId,
  presskitId,
  enviadoEn,
  actualizadoEn,
  onEnviado,
}: {
  bandaId: string;
  presskitId: string;
  enviadoEn: string | null;
  actualizadoEn: string | null;
  onEnviado: (enviadoEn: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [documento, setDocumento] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activo = hayEnvioPendiente(enviadoEn, actualizadoEn);

  const enviar = async () => {
    setError(null);
    setEnviando(true);
    try {
      const { enviadoEn: nuevo, documento: doc } = await enviarPresskitAction(bandaId, presskitId);
      onEnviado(nuevo);
      setDocumento(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar a Presskit.");
    } finally {
      setEnviando(false);
    }
  };

  const copiarDocumento = async () => {
    if (!documento) return;
    try {
      await navigator.clipboard.writeText(documento);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // El portapapeles puede fallar por permisos del navegador -- el texto
      // ya queda visible en el panel para copiarlo a mano.
    }
  };

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={enviar}
        disabled={!activo || enviando}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "oklch(0.24 0.02 55)", color: "oklch(0.96 0.012 82)" }}
      >
        {enviando ? "Enviando…" : "Enviar a Presskit"}
      </button>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}

      {documento && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setDocumento(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 rounded-2xl p-5"
            style={{ background: "oklch(0.99 0.008 82)", boxShadow: "0 24px 48px -16px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                Documento para Design
              </h3>
              <button type="button" onClick={() => setDocumento(null)} aria-label="Cerrar" className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
                ✕
              </button>
            </div>
            <textarea
              readOnly
              value={documento}
              onFocus={(e) => e.target.select()}
              className="min-h-[420px] flex-1 resize-none rounded-lg border p-3 font-mono text-xs"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={copiarDocumento}
              className="rounded-lg px-4 py-2.5 text-sm font-bold"
              style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
            >
              {copiado ? "Copiado ✓" : "Copiar al portapapeles"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
