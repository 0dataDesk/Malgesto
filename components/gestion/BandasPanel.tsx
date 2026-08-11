"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import type { BandaSimple, ActualizacionBanda, Plaza } from "@/lib/gestionData";
import { INSTRUMENTOS, ETIQUETA_INSTRUMENTO, etiquetaPlaza, type Instrumento } from "@/lib/instrumentoCatalogo";
import { textoLegibleSobre } from "@/lib/colorContraste";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { crearBandaAction, actualizarBandaAction, crearPlazaAction, eliminarPlazaAction } from "@/app/gestion/actions";

// Mismo valor que el DEFAULT de bandas.color en la base -- lo que recibe una
// banda recién creada hasta que alguien la abra y le elija un color propio.
const COLOR_DEFECTO = "oklch(0.64 0.15 34)";

// Brief "Rediseño de Gestión > Bandas" §3: la tarjeta ya no tiñe su fondo
// con el color de banda (ver dirección de diseño del brief), así que el
// fondo del pill vuelve a necesitar contraste propio -- gris neutro, el
// mismo tono que usan los chips inactivos (ToggleChip) y las opciones de
// InstrumentoDropdown, en vez de blanco casi idéntico al de la tarjeta.
const PILL_BLOQUE = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)", border: "1px solid oklch(0.87 0.013 78)" };

function esHexValido(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

// Acepta con o sin "#" adelante -- normaliza a "#RRGGBB" en mayúsculas, o
// null si lo tipeado todavía no es un hex válido de 6 dígitos.
function normalizarHex(texto: string): string | null {
  const t = texto.trim();
  const conHash = t.startsWith("#") ? t : `#${t}`;
  return esHexValido(conHash) ? conHash.toUpperCase() : null;
}

// Brief "Rediseño de Gestión > Bandas" §7: se saca la paleta/sliders y
// queda solo el swatch nativo (<input type="color">, que internamente ya
// habla en hex) + un campo de texto hex editable al lado -- bandas.color
// puede seguir teniendo un valor oklch(...) viejo hasta que alguien lo
// edite acá, por eso el swatch cae a un gris neutro cuando el valor
// guardado no es hex válido. El campo de texto solo empuja el cambio hacia
// arriba (y por lo tanto solo se guarda) cuando el hex tipeado es válido;
// mientras tanto se marca en rojo sin tocar el `color` real de la banda.
function SelectorColorBanda({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  // Estado local en vez de derivarlo de `value` vía efecto: este selector
  // siempre monta de cero por banda (la lista desmonta DetalleBanda al
  // volver), así que el único resync que hace falta es cuando el swatch
  // nativo cambia el color -- por eso el swatch actualiza `texto` a mano en
  // su propio onChange en vez de depender de un efecto que sincronice desde
  // `value`.
  const [texto, setTexto] = useState(value);

  const manejarTexto = (v: string) => {
    setTexto(v);
    const normalizado = normalizarHex(v);
    if (normalizado) onChange(normalizado);
  };

  const valido = normalizarHex(texto) !== null;

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="color"
        value={esHexValido(value) ? value : "#888888"}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value);
        }}
        aria-label="Color de la banda"
        className="h-8 w-8 cursor-pointer rounded-md border p-0.5"
        style={{ borderColor: "oklch(0.88 0.013 78)" }}
      />
      <input
        value={texto}
        onChange={(e) => manejarTexto(e.target.value)}
        placeholder="#RRGGBB"
        maxLength={7}
        className="w-full rounded-md border px-1 py-0.5 text-center font-mono text-[10px] outline-none"
        style={{
          background: "oklch(0.99 0.008 82)",
          borderColor: valido ? "oklch(0.88 0.013 78)" : "oklch(0.65 0.18 25)",
          color: "oklch(0.3 0.02 55)",
        }}
      />
    </div>
  );
}

// Brief "Rediseño de Gestión > Bandas" §6: clickear el box del emoji abre
// directamente el picker (emoji-picker-react), sin un paso o campo aparte.
// El panel se centra en pantalla (en vez de anclado bajo el box) para no
// depender de cuánto espacio quede a los costados -- este selector vive en
// una columna angosta (ver DetalleBanda §5) que puede estar cerca del borde
// de la pantalla en mobile.
function SelectorEmojiBanda({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Elegir emoji de la banda"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border text-lg"
        style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", opacity: value ? 1 : 0.4 }}
      >
        {value || "🙂"}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setAbierto(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 48px -16px rgba(0,0,0,0.4)" }}>
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => {
                onChange(data.emoji);
                setAbierto(false);
              }}
              theme={Theme.LIGHT}
              width={300}
              height={380}
              previewConfig={{ showPreview: false }}
            />
          </div>
        </div>
      )}
    </>
  );
}

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

function MiniLabel({ children }: { children: string }) {
  return (
    <span className="mb-1 block text-center font-mono text-[9px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
      {children}
    </span>
  );
}

// Selector estilizado de instrumento (Brief 13 §4): mismo patrón de
// trigger + panel de chips que AcordeSelector, en vez del <select> nativo
// del navegador que quedaba desentonado con el resto de Gestión.
function InstrumentoDropdown({
  value,
  opciones,
  onSeleccionar,
}: {
  value: Instrumento;
  opciones: readonly Instrumento[];
  onSeleccionar: (instrumento: Instrumento) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
        style={inputStyle}
      >
        <span>{ETIQUETA_INSTRUMENTO[value]}</span>
        <span style={{ color: "oklch(0.6 0.02 55)" }}>▾</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div
            className="absolute z-20 mt-1.5 w-full rounded-xl p-2"
            style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" }}
          >
            <div className="flex flex-wrap gap-1.5">
              {opciones.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSeleccionar(i);
                    setAbierto(false);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  style={
                    i === value
                      ? { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }
                      : { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }
                  }
                >
                  {ETIQUETA_INSTRUMENTO[i]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InstrumentosDeLaBanda({ bandaId, plazas, onPlazas }: { bandaId: string; plazas: Plaza[]; onPlazas: (p: Plaza[]) => void }) {
  // Brief 13 §3/Brief 14 §1: un instrumento del catálogo fijo se agrega una
  // sola vez por banda, así que desaparece de las opciones una vez agregado
  // — "otro" es la excepción, se puede repetir con etiquetas distintas.
  const usados = new Set(plazas.map((p) => p.instrumento));
  const opciones = INSTRUMENTOS.filter((i) => i === "otro" || !usados.has(i));

  const [instrumentoElegido, setInstrumentoElegido] = useState<Instrumento | null>(null);
  const instrumento = instrumentoElegido && opciones.includes(instrumentoElegido) ? instrumentoElegido : opciones[0];
  const esOtro = instrumento === "otro";

  const [etiqueta, setEtiqueta] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const agregar = () => {
    setError(null);
    if (esOtro && !etiqueta.trim()) {
      setError('Escribí una etiqueta para "Otro".');
      return;
    }
    startTransition(async () => {
      try {
        const nueva = await crearPlazaAction(bandaId, instrumento, esOtro ? etiqueta.trim() : null);
        onPlazas([...plazas, nueva]);
        setEtiqueta("");
        setInstrumentoElegido(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el instrumento.");
      }
    });
  };

  const quitar = (plazaId: string) => {
    startTransition(async () => {
      try {
        await eliminarPlazaAction(plazaId);
        onPlazas(plazas.filter((p) => p.id !== plazaId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo quitar el instrumento.");
      }
    });
  };

  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
        Instrumentos
      </span>
      {plazas.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no hay instrumentos definidos para esta banda.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {plazas.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-xs font-semibold"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
            >
              {etiquetaPlaza(p.instrumento, p.etiqueta)}
              <button
                type="button"
                onClick={() => quitar(p.id)}
                disabled={pending}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                style={{ background: "oklch(0.85 0.016 78)" }}
                aria-label="Quitar instrumento"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5">
        <InstrumentoDropdown value={instrumento} opciones={opciones} onSeleccionar={setInstrumentoElegido} />
        {esOtro && (
          <input
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Etiqueta"
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
        )}
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
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function DetalleBanda({
  banda,
  plazas,
  onVolver,
  onActualizada,
  onPlazas,
}: {
  banda: BandaSimple;
  plazas: Plaza[];
  onVolver: () => void;
  onActualizada: (b: BandaSimple) => void;
  onPlazas: (p: Plaza[]) => void;
}) {
  const [nombre, setNombre] = useState(banda.nombre);
  const [color, setColor] = useState(banda.color);
  const [emoji, setEmoji] = useState(banda.emoji ?? "");
  const [genero, setGenero] = useState(banda.genero ?? "");
  const numeroIntegrantesInicial = banda.numeroIntegrantes !== null ? String(banda.numeroIntegrantes) : "";
  const [numeroIntegrantes, setNumeroIntegrantes] = useState(numeroIntegrantesInicial);
  const [canciones, setCanciones] = useState(banda.cancionesHabilitado);
  const [setlist, setSetlist] = useState(banda.setlistHabilitado);
  const [seteos, setSeteos] = useState(banda.seteosHabilitado);
  const [finanzas, setFinanzas] = useState(banda.finanzasHabilitado);
  const [stagePlot, setStagePlot] = useState(banda.stagePlotHabilitado);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Brief §5: el botón flotante muestra "Guardado" un instante después de
  // guardar en vez de desaparecer de golpe -- si solo mirara `hayCambios`
  // desaparecería apenas onActualizada() sincroniza el estado local con la
  // banda ya guardada, sin alcanzar a mostrar la confirmación.
  const [estadoGuardado, setEstadoGuardado] = useState<"idle" | "guardado">("idle");

  useEffect(() => {
    if (estadoGuardado !== "guardado") return;
    const t = setTimeout(() => setEstadoGuardado("idle"), 1400);
    return () => clearTimeout(t);
  }, [estadoGuardado]);

  const hayCambios =
    nombre.trim() !== banda.nombre ||
    color !== banda.color ||
    (emoji.trim() || null) !== banda.emoji ||
    (genero.trim() || null) !== banda.genero ||
    numeroIntegrantes !== numeroIntegrantesInicial ||
    canciones !== banda.cancionesHabilitado ||
    setlist !== banda.setlistHabilitado ||
    seteos !== banda.seteosHabilitado ||
    finanzas !== banda.finanzasHabilitado ||
    stagePlot !== banda.stagePlotHabilitado;

  const guardar = () => {
    if (!nombre.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const cambios: ActualizacionBanda = {
          nombre: nombre.trim(),
          color,
          emoji: emoji.trim() || null,
          genero: genero.trim() || null,
          numeroIntegrantes: numeroIntegrantes.trim() === "" ? null : Number(numeroIntegrantes),
          cancionesHabilitado: canciones,
          setlistHabilitado: setlist,
          seteosHabilitado: seteos,
          finanzasHabilitado: finanzas,
          stagePlotHabilitado: stagePlot,
        };
        await actualizarBandaAction(banda.id, cambios);
        onActualizada({ ...banda, ...cambios });
        setEstadoGuardado("guardado");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onVolver} className="text-left text-sm" style={{ color: "oklch(0.6 0.02 55)" }}>
        ‹ Bandas
      </button>

      <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
          Nombre
        </label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} style={inputStyle} />

        {/* Brief §5: Género ocupa 2/3 de la fila, Color/Emoji/Integrantes
            comparten el tercio restante entre los tres (~1/9 cada uno). */}
        <div className="mt-3 flex gap-3">
          <div className="flex-[2]">
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
              Género
            </label>
            <input value={genero} onChange={(e) => setGenero(e.target.value)} className={inputCls} style={inputStyle} placeholder="Ej. Cumbia, Rock…" />
          </div>
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <MiniLabel>Color</MiniLabel>
              <SelectorColorBanda value={color} onChange={setColor} />
            </div>
            <div className="flex-1">
              <MiniLabel>Emoji</MiniLabel>
              <SelectorEmojiBanda value={emoji} onChange={setEmoji} />
            </div>
            <div className="flex-1">
              <MiniLabel>Integrantes</MiniLabel>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numeroIntegrantes}
                onChange={(e) => setNumeroIntegrantes(e.target.value.replace(/\D/g, "").slice(0, 2))}
                className="w-full rounded-md border px-1 py-1.5 text-center text-xs outline-none"
                style={inputStyle}
                placeholder="—"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ToggleChip label="Calendario" active dot={false} onClick={() => {}} />
          <ToggleChip label="Canciones" active={canciones} onClick={() => setCanciones((v) => !v)} />
          <ToggleChip label="Set List" active={setlist} onClick={() => setSetlist((v) => !v)} />
          <ToggleChip label="Seteos" active={seteos} onClick={() => setSeteos((v) => !v)} />
          <ToggleChip label="Finanzas" active={finanzas} onClick={() => setFinanzas((v) => !v)} />
          <ToggleChip label="Stage Plot" active={stagePlot} onClick={() => setStagePlot((v) => !v)} />
        </div>

        {error && (
          <p className="mt-2 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <InstrumentosDeLaBanda bandaId={banda.id} plazas={plazas} onPlazas={onPlazas} />
      </div>

      {(hayCambios || estadoGuardado === "guardado") && (
        <button
          type="button"
          onClick={guardar}
          disabled={pending || estadoGuardado === "guardado"}
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-90"
          style={{
            background: estadoGuardado === "guardado" ? "oklch(0.6 0.14 150)" : "oklch(0.64 0.15 34)",
            color: "oklch(0.99 0.01 82)",
            boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)",
          }}
        >
          {pending ? "Guardando…" : estadoGuardado === "guardado" ? "Guardado ✓" : "Guardar cambios"}
        </button>
      )}
    </div>
  );
}

// Brief §4: reemplaza el bloque fijo "Crear banda nueva" (input + botón
// siempre visible) por un FAB que se transforma in-place en un campo de
// texto + botón de check al tocarlo -- mismo patrón que un FAB estándar de
// "crear", pero sin abrir una pantalla ni modal aparte.
function BotonCrearBanda({ onCreada }: { onCreada: (id: string, nombre: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  const cancelar = () => {
    setAbierto(false);
    setNombre("");
    setError(null);
  };

  const confirmar = () => {
    if (!nombre.trim()) {
      setError("Ponele un nombre a la banda.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const id = await crearBandaAction(nombre.trim());
        onCreada(id, nombre.trim());
        setAbierto(false);
        setNombre("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo crear la banda.");
      }
    });
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Crear banda nueva"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold"
        style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
      >
        +
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={cancelar} />
      <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-1.5">
        {error && (
          <p
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: "oklch(0.99 0.01 82)", color: "oklch(0.55 0.15 25)", boxShadow: "0 8px 20px -10px rgba(0,0,0,0.35)" }}
          >
            {error}
          </p>
        )}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded-full py-1.5 pl-4 pr-1.5"
          style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.5)" }}
        >
          <input
            ref={inputRef}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar();
              if (e.key === "Escape") cancelar();
            }}
            placeholder="Nombre de la banda"
            className="w-44 bg-transparent text-sm outline-none"
            style={{ color: "oklch(0.24 0.02 55)" }}
          />
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            aria-label="Crear banda"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold disabled:opacity-60"
            style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
          >
            {pending ? "…" : "✓"}
          </button>
        </div>
      </div>
    </>
  );
}

// Brief §8: bloques posibles por banda son Calendario (siempre activo) +
// los 5 toggleables -- se cuenta así en vez de a mano en cada uso para que
// el criterio de orden y una futura visualización usen la misma fuente.
function contarBloquesActivos(b: BandaSimple): number {
  return 1 + [b.cancionesHabilitado, b.setlistHabilitado, b.seteosHabilitado, b.finanzasHabilitado, b.stagePlotHabilitado].filter(Boolean).length;
}

// Brief §3: badge circular del emoji de la banda, protagonista visual --
// el color de banda va acá con fuerza (fondo del círculo), no en toda la
// tarjeta (ver dirección de diseño del brief). Sin emoji capturado, cae a
// la inicial del nombre para que el círculo nunca se vea vacío.
function BadgeBanda({ banda }: { banda: BandaSimple }) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
      style={{ background: banda.color, color: banda.emoji ? undefined : textoLegibleSobre(banda.color) }}
    >
      {banda.emoji || banda.nombre.charAt(0).toUpperCase()}
    </div>
  );
}

export function BandasPanel({ bandas: bandasIniciales, plazas: plazasIniciales }: { bandas: BandaSimple[]; plazas: Plaza[] }) {
  const [bandas, setBandas] = useState(bandasIniciales);
  const [plazas, setPlazas] = useState(plazasIniciales);
  const [bandaSeleccionadaId, setBandaSeleccionadaId] = useState<string | null>(null);
  const [verArchivadas, setVerArchivadas] = useState(false);

  const bandaSeleccionada = bandas.find((b) => b.id === bandaSeleccionadaId) ?? null;

  const bandaCreada = (id: string, nombre: string) => {
    setBandas((prev) => [
      ...prev,
      {
        id,
        nombre,
        color: COLOR_DEFECTO,
        emoji: null,
        genero: null,
        numeroIntegrantes: null,
        archivada: false,
        cancionesHabilitado: true,
        setlistHabilitado: true,
        seteosHabilitado: true,
        finanzasHabilitado: true,
        stagePlotHabilitado: true,
      },
    ]);
    // Brief §4: al crear, aterriza directo en la pantalla de configuración
    // de la banda recién creada -- mismo patrón in-page que usa el resto
    // del panel para "navegar" entre lista y detalle (sin ruta aparte).
    setBandaSeleccionadaId(id);
  };

  if (bandaSeleccionada) {
    return (
      <DetalleBanda
        banda={bandaSeleccionada}
        plazas={plazas.filter((p) => p.bandaId === bandaSeleccionada.id)}
        onVolver={() => setBandaSeleccionadaId(null)}
        onActualizada={(actualizada) => setBandas((prev) => prev.map((x) => (x.id === actualizada.id ? actualizada : x)))}
        onPlazas={(nuevas) => setPlazas((prev) => [...prev.filter((p) => p.bandaId !== bandaSeleccionada.id), ...nuevas])}
      />
    );
  }

  // Brief §8: de mayor a menor cantidad de bloques activos, alfabético
  // como desempate (el orden que ya traía `bandas` desde obtenerBandasTodas).
  const listado = bandas
    .filter((b) => b.archivada === verArchivadas)
    .slice()
    .sort((a, b) => contarBloquesActivos(b) - contarBloquesActivos(a) || a.nombre.localeCompare(b.nombre));

  return (
    <div className="flex flex-col gap-3 pb-20">
      <button
        type="button"
        onClick={() => setVerArchivadas((v) => !v)}
        className="self-start text-xs font-semibold"
        style={{ color: "oklch(0.6 0.02 55)" }}
      >
        {verArchivadas ? "‹ Ver bandas activas" : "Ver archivadas"}
      </button>

      {listado.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          {verArchivadas ? "No hay bandas archivadas." : "Todavía no hay bandas."}
        </p>
      ) : (
        // Brief §3: grid de 2 columnas, tarjetas cuadradas en vez de la
        // lista vertical de barras completas.
        <div className="grid grid-cols-2 gap-3">
          {listado.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBandaSeleccionadaId(b.id)}
              className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center"
              style={{
                background: "oklch(0.99 0.008 82)",
                border: "1px solid oklch(0.89 0.013 78)",
                borderTop: `4px solid ${b.color}`,
              }}
            >
              <BadgeBanda banda={b} />
              <div className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
                {b.nombre}
              </div>
              {b.genero && (
                <div className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                  {b.genero}
                </div>
              )}
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                  Calendario
                </span>
                {b.cancionesHabilitado && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                    Canciones
                  </span>
                )}
                {b.setlistHabilitado && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                    Set List
                  </span>
                )}
                {b.seteosHabilitado && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                    Seteos
                  </span>
                )}
                {b.finanzasHabilitado && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                    Finanzas
                  </span>
                )}
                {b.stagePlotHabilitado && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={PILL_BLOQUE}>
                    Stage Plot
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <BotonCrearBanda onCreada={bandaCreada} />
    </div>
  );
}
