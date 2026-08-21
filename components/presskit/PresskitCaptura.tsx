"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Presskit, PresskitFoto, PresskitRed, ActualizacionPresskit } from "@/lib/presskitData";
import type { PlazaConPersona } from "@/lib/stagePlotData";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { PLATAFORMAS_COMUNES, PLATAFORMA_OTRA } from "@/lib/plataformaCatalogo";
import { partesEnZonaApp } from "@/lib/zonaHoraria";
import { MESES } from "@/lib/eventoUI";
import {
  actualizarPresskitAction,
  subirFotoPresskitAction,
  eliminarFotoPresskitAction,
  agregarRedPresskitAction,
  eliminarRedPresskitAction,
  marcarPresskitEnviadoAction,
} from "@/app/presskit-captura/actions";
import { EstadoBadge } from "@/components/presskit/PresskitEstado";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function Etiqueta({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
      {children}
    </label>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
      {children}
    </div>
  );
}

function ErrorTexto({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
      {mensaje}
    </p>
  );
}

function formatearFecha(iso: string): string {
  const p = partesEnZonaApp(iso);
  return `${p.dia} de ${MESES[p.mes].toLowerCase()} de ${p.anio}`;
}

type BandaResumen = { id: string; nombre: string; genero: string | null };

function GaleriaFotos({
  bandaId,
  presskitId,
  fotos,
  onFotos,
  onCambio,
}: {
  bandaId: string;
  presskitId: string;
  fotos: PresskitFoto[];
  onFotos: (f: PresskitFoto[]) => void;
  onCambio: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subirArchivos = async (archivos: FileList) => {
    setError(null);
    setSubiendo(true);
    let orden = fotos.length;
    let actuales = fotos;
    try {
      for (const archivo of Array.from(archivos)) {
        const formData = new FormData();
        formData.set("bandaId", bandaId);
        formData.set("presskitId", presskitId);
        formData.set("orden", String(orden));
        formData.set("archivo", archivo);
        const foto = await subirFotoPresskitAction(formData);
        actuales = [...actuales, foto];
        onFotos(actuales);
        orden++;
      }
      if (archivos.length > 0) onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const quitar = (foto: PresskitFoto) => {
    startTransition(async () => {
      try {
        await eliminarFotoPresskitAction(bandaId, presskitId, foto.id, foto.storagePath);
        onFotos(fotos.filter((f) => f.id !== foto.id));
        onCambio();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar la foto.");
      }
    });
  };

  return (
    <div>
      <Etiqueta>Fotos</Etiqueta>
      <p className="mb-2.5 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
        Mínimo 3 fotos, en distintas orientaciones (horizontal y vertical) — la banda puede subir más.
      </p>

      {fotos.length > 0 && (
        <div className="mb-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((f) => (
            <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg" style={{ border: "1px solid oklch(0.88 0.013 78)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => quitar(f)}
                disabled={pending}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "rgba(0,0,0,0.55)", color: "oklch(0.99 0.01 82)" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0 && subirArchivos(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-60"
        style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
      >
        {subiendo ? "Subiendo…" : "+ Agregar fotos"}
      </button>

      <ErrorTexto mensaje={error} />
    </div>
  );
}

function LinksDePlataformas({
  bandaId,
  presskitId,
  redes,
  onRedes,
  onCambio,
}: {
  bandaId: string;
  presskitId: string;
  redes: PresskitRed[];
  onRedes: (r: PresskitRed[]) => void;
  onCambio: () => void;
}) {
  const [plataforma, setPlataforma] = useState<string>(PLATAFORMAS_COMUNES[0]);
  const [otraPlataforma, setOtraPlataforma] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esOtra = plataforma === PLATAFORMA_OTRA;

  const agregar = () => {
    setError(null);
    const nombrePlataforma = esOtra ? otraPlataforma.trim() : plataforma;
    if (!nombrePlataforma) {
      setError("Elegí o escribí una plataforma.");
      return;
    }
    if (!url.trim()) {
      setError("Pegá el link.");
      return;
    }
    startTransition(async () => {
      try {
        const red = await agregarRedPresskitAction(bandaId, presskitId, nombrePlataforma, url.trim(), redes.length);
        onRedes([...redes, red]);
        onCambio();
        setUrl("");
        setOtraPlataforma("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el link.");
      }
    });
  };

  const quitar = (redId: string) => {
    startTransition(async () => {
      try {
        await eliminarRedPresskitAction(bandaId, presskitId, redId);
        onRedes(redes.filter((r) => r.id !== redId));
        onCambio();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar el link.");
      }
    });
  };

  return (
    <div>
      <Etiqueta>Links de plataformas</Etiqueta>
      <p className="mb-2.5 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
        Redes sociales y streaming, todo junto — Spotify, YouTube, Instagram, TikTok, etc.
      </p>

      {redes.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {redes.map((r) => (
            <span
              key={r.id}
              className="flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-xs font-semibold"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
            >
              {r.plataforma}: <a href={r.url} target="_blank" rel="noreferrer" className="max-w-[200px] truncate no-underline" style={{ color: "oklch(0.5 0.14 34)" }}>{r.url}</a>
              <button
                type="button"
                onClick={() => quitar(r.id)}
                disabled={pending}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ background: "oklch(0.85 0.016 78)" }}
                aria-label="Quitar link"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className={inputCls} style={{ ...inputStyle, flex: "0 0 auto", width: "auto" }}>
          {PLATAFORMAS_COMUNES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={PLATAFORMA_OTRA}>{PLATAFORMA_OTRA}</option>
        </select>
        {esOtra && (
          <input
            value={otraPlataforma}
            onChange={(e) => setOtraPlataforma(e.target.value)}
            placeholder="Nombre de la plataforma"
            className={inputCls}
            style={{ ...inputStyle, width: 160 }}
          />
        )}
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={`${inputCls} flex-1`} style={{ ...inputStyle, minWidth: 160 }} />
        <button
          type="button"
          onClick={agregar}
          disabled={pending}
          className="shrink-0 rounded-lg px-3 text-sm font-bold disabled:opacity-60"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          +
        </button>
      </div>
      <ErrorTexto mensaje={error} />
    </div>
  );
}

export function PresskitCaptura({
  banda,
  presskit: presskitInicial,
  fotosIniciales,
  redesIniciales,
  integrantes,
}: {
  banda: BandaResumen;
  presskit: Presskit;
  fotosIniciales: PresskitFoto[];
  redesIniciales: PresskitRed[];
  integrantes: PlazaConPersona[];
}) {
  const [presskit, setPresskit] = useState(presskitInicial);
  const [bioLarga, setBioLarga] = useState(presskitInicial.bioLarga ?? "");
  const [pais, setPais] = useState(presskitInicial.pais ?? "");
  const [ciudad, setCiudad] = useState(presskitInicial.ciudad ?? "");
  const [contactoNombre, setContactoNombre] = useState(presskitInicial.contactoNombre ?? "");
  const [contactoTelefono, setContactoTelefono] = useState(presskitInicial.contactoTelefono ?? "");
  const [contactoEmail, setContactoEmail] = useState(presskitInicial.contactoEmail ?? "");

  const [fotos, setFotos] = useState(fotosIniciales);
  const [redes, setRedes] = useState(redesIniciales);

  const [pendingGuardar, startTransitionGuardar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Brief DetalleBanda §5 (mismo criterio): el botón flotante muestra
  // "Guardado" un instante en vez de desaparecer de golpe apenas
  // hayCambios pasa a false por el propio guardado.
  const [estadoGuardado, setEstadoGuardado] = useState<"idle" | "guardado">("idle");
  const [enviando, setEnviando] = useState(false);
  const [documento, setDocumento] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (estadoGuardado !== "guardado") return;
    const t = setTimeout(() => setEstadoGuardado("idle"), 1400);
    return () => clearTimeout(t);
  }, [estadoGuardado]);

  const hayCambios =
    bioLarga.trim() !== (presskit.bioLarga ?? "") ||
    pais.trim() !== (presskit.pais ?? "") ||
    ciudad.trim() !== (presskit.ciudad ?? "") ||
    contactoNombre.trim() !== (presskit.contactoNombre ?? "") ||
    contactoTelefono.trim() !== (presskit.contactoTelefono ?? "") ||
    contactoEmail.trim() !== (presskit.contactoEmail ?? "");

  const cambiosActuales = (): ActualizacionPresskit => ({
    bioLarga: bioLarga.trim() || null,
    pais: pais.trim() || null,
    ciudad: ciudad.trim() || null,
    contactoNombre: contactoNombre.trim() || null,
    contactoTelefono: contactoTelefono.trim() || null,
    contactoEmail: contactoEmail.trim() || null,
  });

  // Brief "Presskit — vista propia, estatus, liga publicada" §2: espeja acá
  // el mismo `actualizado_en = ahora()` que cada mutación de contenido ya
  // hace en el servidor (ver tocarActualizado en lib/presskitData.ts), para
  // que la leyenda de estatus reaccione al toque sin esperar un
  // revalidatePath. GaleriaFotos/LinksDePlataformas lo llaman vía onCambio.
  const marcarActualizado = () => setPresskit((p) => ({ ...p, actualizadoEn: new Date().toISOString() }));

  const guardar = () => {
    setError(null);
    startTransitionGuardar(async () => {
      try {
        const cambios = cambiosActuales();
        await actualizarPresskitAction(banda.id, presskit.id, cambios);
        setPresskit((p) => ({ ...p, ...cambios, actualizadoEn: new Date().toISOString() }));
        setEstadoGuardado("guardado");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const enviarAPresskit = async () => {
    setError(null);
    setEnviando(true);
    try {
      let presskitActual = presskit;
      if (hayCambios) {
        const cambios = cambiosActuales();
        await actualizarPresskitAction(banda.id, presskit.id, cambios);
        presskitActual = { ...presskit, ...cambios };
      }
      // Brief "Presskit: documento completo para Design...": el documento ya
      // no se arma acá con los datos del cliente (podían quedar desalineados
      // con lo recién guardado, y no incluían próximas fechas) -- lo devuelve
      // hecho la propia action, con la misma función que se usa para pedidos
      // directos a Code fuera de la app.
      const { enviadoEn, documento: doc } = await marcarPresskitEnviadoAction(banda.id, presskit.id);
      presskitActual = { ...presskitActual, enviadoEn, actualizadoEn: enviadoEn };
      setPresskit(presskitActual);
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
      // El portapapeles puede fallar por permisos del navegador -- el
      // texto ya queda visible en el panel para copiarlo a mano.
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-3 pb-24">
      <Tarjeta>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
              {banda.nombre}
            </div>
            {banda.genero && (
              <div className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
                {banda.genero}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <EstadoBadge presskit={presskit} />
            {presskit.enviadoEn && (
              <span className="text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
                Enviado el {formatearFecha(presskit.enviadoEn)}
              </span>
            )}
          </div>
        </div>
      </Tarjeta>

      {/* Brief "Presskit como bloque, Liga publicada en Bandas, acordeón de
          bloques" §4: Integrantes (solo lectura, automático) se mueve acá
          arriba, justo debajo de Nombre/Género -- antes vivía después de
          Contacto. "Liga publicada" se sacó de esta pantalla (se mudó a
          DetalleBanda en Gestión > Bandas, ver PresskitEstado.tsx). */}
      <Tarjeta>
        <Etiqueta>Integrantes</Etiqueta>
        {integrantes.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay integrantes con instrumento asignado en Gestión &gt; Integrantes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {integrantes.map((i) => (
              <span key={i.plazaId} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}>
                {i.nombrePersona} · {etiquetaPlaza(i.instrumento, i.etiqueta)}
              </span>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Semblanza</Etiqueta>
        <textarea
          value={bioLarga}
          onChange={(e) => setBioLarga(e.target.value)}
          rows={6}
          placeholder="Historia, estilo, trayectoria de la banda…"
          className={`${inputCls} resize-y`}
          style={inputStyle}
        />

        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <Etiqueta>País</Etiqueta>
            <input value={pais} onChange={(e) => setPais(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. México" />
          </div>
          <div className="flex-1">
            <Etiqueta>Ciudad</Etiqueta>
            <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. Guadalajara" />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta>
        <GaleriaFotos bandaId={banda.id} presskitId={presskit.id} fotos={fotos} onFotos={setFotos} onCambio={marcarActualizado} />
      </Tarjeta>

      <Tarjeta>
        <LinksDePlataformas bandaId={banda.id} presskitId={presskit.id} redes={redes} onRedes={setRedes} onCambio={marcarActualizado} />
      </Tarjeta>

      <Tarjeta>
        <Etiqueta>Contacto</Etiqueta>
        <div className="flex flex-col gap-2.5">
          <input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder="Nombre" className={inputCls} style={inputStyle} />
          <input value={contactoTelefono} onChange={(e) => setContactoTelefono(e.target.value)} placeholder="Teléfono" className={inputCls} style={inputStyle} />
          <input
            value={contactoEmail}
            onChange={(e) => setContactoEmail(e.target.value)}
            placeholder="Correo"
            type="email"
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </Tarjeta>

      <button
        type="button"
        onClick={enviarAPresskit}
        disabled={enviando}
        className="rounded-2xl px-4 py-3 text-sm font-bold disabled:opacity-60"
        style={{ background: "oklch(0.24 0.02 55)", color: "oklch(0.96 0.012 82)" }}
      >
        {enviando ? "Enviando…" : presskit.enviadoEn ? "Volver a enviar a Presskit" : "Enviar a Presskit"}
      </button>

      <ErrorTexto mensaje={error} />

      {(hayCambios || estadoGuardado === "guardado") && (
        <button
          type="button"
          onClick={guardar}
          disabled={pendingGuardar || estadoGuardado === "guardado"}
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-90"
          style={{
            background: estadoGuardado === "guardado" ? "oklch(0.6 0.14 150)" : "oklch(0.64 0.15 34)",
            color: "oklch(0.99 0.01 82)",
            boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)",
          }}
        >
          {pendingGuardar ? "Guardando…" : estadoGuardado === "guardado" ? "Guardado ✓" : "Guardar cambios"}
        </button>
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
