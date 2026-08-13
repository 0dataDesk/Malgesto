"use client";

import { useState, useTransition } from "react";
import type { StagePlotItem, PlazaConPersona, AmplificadorAsignado } from "@/lib/stagePlotData";
import {
  ETIQUETA_TIPO,
  GLIFO_TIPO,
  GLIFO_INSTRUMENTO,
  FORMA_TIPO,
  COLOR_ESCENARIO,
  COLOR_PEDALERA,
  tieneEtiquetaEditable,
  type TipoEscenario,
} from "@/lib/stagePlotCatalogo";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { crearItemAction, moverItemAction, actualizarEtiquetaItemAction, actualizarRotacionItemAction, eliminarItemAction } from "@/app/stage-plot/actions";
import { StagePlotLienzo, IconoConVoz, tamanoForma, type PayloadNuevoItem } from "./StagePlotLienzo";

const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

const PLACEHOLDER_ETIQUETA: Record<TipoEscenario, string> = {
  mix: 'Ej. "Mix 1", "Mix 3 stereo"',
  side_fill: 'Ej. "Mix 7" (se numera igual que Mix)',
  di: 'Ej. "DI bajo"',
  power: 'Ej. "AC 1 - stage right"',
  riser: 'Ej. "2x1m, 40cm alto"',
};

// Tamaño fijo del "ícono pequeño de referencia" dentro de cada chip (Brief
// "paleta unificada..." §3) -- toda forma real (44x44 el círculo de músico,
// 104x76 el Riser, 23x15 la pedalera...) se escala para caber acá, así el
// chip nunca cambia de tamaño según qué represente.
const ICONO_CHIP_PX = 30;

// Chip arrastrable genérico de la paleta (Brief "Rediseño de Stage Plot —
// Entrega 1" §1): arrastrado con Drag and Drop nativo, mismo mecanismo de
// siempre (sin dependencias nuevas), pero ahora el payload es JSON
// (tipo + plazaId/dispositivoId) en vez de un tipo suelto -- ver
// PayloadNuevoItem en StagePlotLienzo. Brief "Stage Plot — ajustes
// visuales" §1: una vez que un integrante o amplificador ya está en el
// lienzo, su tarjeta se atenúa y deja de poder arrastrarse de nuevo -- no
// tiene sentido repetir a la misma persona o el mismo amplificador dos
// veces (libera espacio visual también). Escenario nunca pasa `disabled`
// (ver PaletaIconos): esos ítems sí se repiten. Brief "paleta unificada..."
// §3: TODOS los chips (Integrantes/Seteo/Escenario) usan este mismo
// formato de píldora -- antes Escenario mostraba la figura real (círculo/
// triángulo/rombo) a tamaño completo como si fuera su propio botón, y eso
// se veía inconsistente con el resto ("como un juego para bebés"). Acá el
// ícono es siempre chico y va DENTRO de la píldora, escalado a
// ICONO_CHIP_PX sin importar el tamaño real de la forma -- la figura real a
// tamaño completo solo se ve una vez que el ítem está en el lienzo.
function ChipArrastrable({
  payload,
  forma,
  color,
  glifo,
  colorBorde,
  tieneVoz,
  cantidadPedales,
  rotacion,
  titulo,
  subtitulo,
  disabled = false,
}: {
  payload: PayloadNuevoItem;
  forma: Parameters<typeof IconoConVoz>[0]["forma"];
  color: string;
  glifo: string;
  colorBorde?: string;
  tieneVoz?: boolean;
  cantidadPedales?: number;
  rotacion?: number;
  titulo: string;
  subtitulo?: string;
  disabled?: boolean;
}) {
  const { w, h } = tamanoForma(forma);
  // Nunca agranda (formas ya chicas como DI/pedalera se ven en su tamaño
  // real), solo achica las grandes (Riser, círculo de músico) para que
  // quepan en el mismo footprint que las demás.
  const escala = Math.min(1, ICONO_CHIP_PX / w, ICONO_CHIP_PX / h);
  return (
    <div
      draggable={!disabled}
      onDragStart={
        disabled
          ? undefined
          : (e) => {
              e.dataTransfer.setData("text/stage-plot-nuevo", JSON.stringify(payload));
              e.dataTransfer.effectAllowed = "copy";
            }
      }
      className="flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3"
      style={{
        background: "oklch(0.99 0.008 82)",
        border: "1px solid oklch(0.86 0.016 78)",
        opacity: disabled ? 0.42 : 1,
        cursor: disabled ? "default" : "grab",
        filter: disabled ? "grayscale(0.4)" : undefined,
      }}
    >
      <div className="flex shrink-0 items-center justify-center" style={{ width: ICONO_CHIP_PX, height: ICONO_CHIP_PX }}>
        <div style={{ transform: escala < 1 ? `scale(${escala})` : undefined }}>
          <IconoConVoz forma={forma} color={color} glifo={glifo} colorBorde={colorBorde} tieneVoz={tieneVoz} cantidadPedales={cantidadPedales} rotacion={rotacion} />
        </div>
      </div>
      <div className="leading-tight">
        {/* Brief §1: instrumento como dato principal, más visible que el
            nombre -- por eso va primero y en negrita, el nombre queda
            secundario debajo. */}
        <div className="text-xs font-bold" style={{ color: "oklch(0.28 0.02 55)" }}>
          {titulo}
        </div>
        {subtitulo && (
          <div className="text-[10px]" style={{ color: "oklch(0.55 0.02 55)" }}>
            {subtitulo}
          </div>
        )}
      </div>
    </div>
  );
}

// Brief "paleta unificada, acordeones..." §2: mismo acordeón que ya usa
// Gestión > Integrantes (AcordeonGrupo en components/gestion/
// IntegrantesPanel.tsx) -- ese patrón vive replicado localmente en cada
// pantalla que lo necesita, no extraído a un componente compartido, mismo
// criterio acá. Cerrado por defecto: la motivación explícita del brief es
// no obligar a scrollear tanta paleta antes de llegar al lienzo.
const BG_SUNKEN = "oklch(0.965 0.012 82)";
const BORDE_SUNKEN = "oklch(0.9 0.012 78)";

function SeccionAcordeon({
  titulo,
  count,
  abierto,
  onToggle,
  children,
}: {
  titulo: string;
  count?: number;
  abierto: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl" style={{ background: BG_SUNKEN, border: `1px solid ${BORDE_SUNKEN}` }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
        <span className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          {titulo}
          {count !== undefined && ` (${count})`}
        </span>
        <span
          className="text-xs"
          style={{ color: "oklch(0.5 0.02 55)", transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        >
          ▾
        </span>
      </button>
      {abierto && <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

// Brief §6: 3 orientaciones de Mix en la paleta -- mismo tipo="mix", la
// diferencia es la rotación inicial con la que se coloca (0°=arriba, la que
// ya existía; ±90° las 2 nuevas).
const VARIANTES_MIX: { flecha: string; rotacion: number }[] = [
  { flecha: "↑", rotacion: 0 },
  { flecha: "←", rotacion: -90 },
  { flecha: "→", rotacion: 90 },
];

// Brief §5: Side Fill L/R espejadas -- mismo tipo="side_fill" y misma forma
// base que Mix, rotaciones opuestas (±45°) para que apunten hacia el centro
// del escenario desde cada lado.
const VARIANTES_SIDE_FILL: { lado: "L" | "R"; rotacion: number }[] = [
  { lado: "L", rotacion: 45 },
  { lado: "R", rotacion: -45 },
];

const TIPOS_ESCENARIO_SIMPLES: Exclude<TipoEscenario, "side_fill" | "mix">[] = ["di", "power", "riser"];

// Brief "Stage Plot — Entrega 2" §1: paleta generada desde datos reales de
// la banda -- "Integrantes" (musico/teclado, una sola variante fija por
// combinación real de voz), "Seteo" (amplificadores + pedaleras -- Brief
// "paleta unificada..." §1: pedalera se muda acá, antes vivía en
// Integrantes, porque sale del mismo conteo de Seteos que los
// amplificadores) y "Escenario" (genéricos: Mix en 3 orientaciones, Side
// Fill L/R espejadas, DI/AC/Riser). "Micrófono" como sección aparte queda
// obsoleta (Entrega 1) -- la voz ahora es un atributo visual automático del
// propio ícono, ver IconoConVoz. Brief "ajustes visuales" §1: `items` (lo
// que ya está en el lienzo) determina qué tarjetas de Integrantes/Seteo se
// deshabilitan -- Escenario nunca se deshabilita, se repite libremente.
function PaletaIconos({
  plazas,
  amplificadores,
  bandaColor,
  items,
}: {
  plazas: PlazaConPersona[];
  amplificadores: AmplificadorAsignado[];
  bandaColor: string;
  items: StagePlotItem[];
}) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const toggle = (titulo: string) => setAbiertos((prev) => ({ ...prev, [titulo]: !prev[titulo] }));

  const plazasIntegranteUsadas = new Set(items.filter((i) => i.tipo === "musico" || i.tipo === "teclado").map((i) => i.plazaId));
  const plazasPedaleraUsadas = new Set(items.filter((i) => i.tipo === "pedalera").map((i) => i.plazaId));
  const dispositivosUsados = new Set(items.filter((i) => i.tipo === "amplificador").map((i) => i.dispositivoId));
  // Brief §3: teclado nunca ofrece pedalera aunque la persona tenga pedales
  // en Seteos (mismo criterio que antes, solo que ahora filtrado acá en vez
  // de en el loop de Integrantes).
  const pedaleras = plazas.filter((p) => p.instrumento !== "teclado_piano" && p.cantidadPedales > 0);

  return (
    <div className="flex flex-col gap-2.5">
      <SeccionAcordeon titulo="Integrantes" count={plazas.length} abierto={!!abiertos.Integrantes} onToggle={() => toggle("Integrantes")}>
        {plazas.length === 0 ? (
          <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
            Esta banda todavía no tiene integrantes con instrumento asignado.
          </p>
        ) : (
          plazas.map((p) => {
            const esTeclado = p.instrumento === "teclado_piano";
            return (
              <ChipArrastrable
                key={p.plazaId}
                payload={{ tipo: esTeclado ? "teclado" : "musico", plazaId: p.plazaId, dispositivoId: null }}
                forma={esTeclado ? "rectangulo" : "circulo"}
                color={bandaColor}
                glifo={esTeclado ? GLIFO_TIPO.teclado : GLIFO_INSTRUMENTO[p.instrumento]}
                tieneVoz={p.tieneVoz}
                titulo={etiquetaPlaza(p.instrumento, p.etiqueta)}
                subtitulo={p.nombrePersona}
                disabled={plazasIntegranteUsadas.has(p.plazaId)}
              />
            );
          })
        )}
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Seteo" count={amplificadores.length + pedaleras.length} abierto={!!abiertos.Seteo} onToggle={() => toggle("Seteo")}>
        {amplificadores.length === 0 && pedaleras.length === 0 ? (
          <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay amplificadores ni pedaleras asignados en Seteos.
          </p>
        ) : (
          <>
            {amplificadores.map((a) => (
              <ChipArrastrable
                key={a.dispositivoId}
                payload={{ tipo: "amplificador", plazaId: null, dispositivoId: a.dispositivoId }}
                forma="rectangulo-plano"
                color={a.colorFondo}
                colorBorde={a.colorAcento}
                glifo={GLIFO_TIPO.amplificador}
                titulo={a.disenoNombre}
                subtitulo={a.nombrePersona}
                disabled={dispositivosUsados.has(a.dispositivoId)}
              />
            ))}
            {pedaleras.map((p) => (
              <ChipArrastrable
                key={`pedalera_${p.plazaId}`}
                payload={{ tipo: "pedalera", plazaId: p.plazaId, dispositivoId: null }}
                forma="pedalera"
                color={COLOR_PEDALERA}
                glifo=""
                cantidadPedales={p.cantidadPedales}
                // Brief §12: mismo patrón visual que instrumento/
                // amplificador -- nombre del recurso arriba, dueño abajo.
                titulo="Pedalera"
                subtitulo={p.nombrePersona}
                disabled={plazasPedaleraUsadas.has(p.plazaId)}
              />
            ))}
          </>
        )}
      </SeccionAcordeon>

      <SeccionAcordeon titulo="Escenario" abierto={!!abiertos.Escenario} onToggle={() => toggle("Escenario")}>
        {VARIANTES_MIX.map((v) => (
          <ChipArrastrable
            key={`mix_${v.rotacion}`}
            payload={{ tipo: "mix", plazaId: null, dispositivoId: null, rotacion: v.rotacion }}
            forma={FORMA_TIPO.mix}
            color={COLOR_ESCENARIO.mix}
            glifo={GLIFO_TIPO.mix}
            rotacion={v.rotacion}
            titulo={`${ETIQUETA_TIPO.mix} ${v.flecha}`}
          />
        ))}
        {TIPOS_ESCENARIO_SIMPLES.map((tipo) => (
          <ChipArrastrable
            key={tipo}
            payload={{ tipo, plazaId: null, dispositivoId: null }}
            forma={FORMA_TIPO[tipo]}
            color={COLOR_ESCENARIO[tipo]}
            glifo={GLIFO_TIPO[tipo]}
            titulo={ETIQUETA_TIPO[tipo]}
          />
        ))}
        {VARIANTES_SIDE_FILL.map((v) => (
          <ChipArrastrable
            key={`side_fill_${v.lado}`}
            payload={{ tipo: "side_fill", plazaId: null, dispositivoId: null, etiqueta: v.lado, rotacion: v.rotacion }}
            forma={FORMA_TIPO.side_fill}
            color={COLOR_ESCENARIO.side_fill}
            glifo={GLIFO_TIPO.side_fill}
            rotacion={v.rotacion}
            titulo={`${ETIQUETA_TIPO.side_fill} ${v.lado}`}
          />
        ))}
      </SeccionAcordeon>
    </div>
  );
}

function etiquetaSeleccionado(item: StagePlotItem): string {
  if (item.tipo === "amplificador") return `${item.disenoNombre} · ${item.nombrePersona}`;
  if (item.tipo === "pedalera") return `Pedalera · ${item.nombrePersona}`;
  return `${item.instrumento} · ${item.nombrePersona}`;
}

export function StagePlotEditor({
  bandaId,
  bandaColor,
  stagePlotId,
  itemsIniciales,
  plazas,
  amplificadores,
}: {
  bandaId: string;
  bandaColor: string;
  stagePlotId: string;
  itemsIniciales: StagePlotItem[];
  plazas: PlazaConPersona[];
  amplificadores: AmplificadorAsignado[];
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [etiquetaDraft, setEtiquetaDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seleccionado = items.find((i) => i.id === seleccionadoId) ?? null;
  // Brief §3 (Entrega 1) / Entrega 2: solo los elementos de escenario sin
  // dueño llevan etiqueta editable -- el resto resuelve su identidad desde
  // la plaza o dispositivo asignado.
  const etiquetaEditable = seleccionado && tieneEtiquetaEditable(seleccionado.tipo);

  const seleccionar = (itemId: string) => {
    setSeleccionadoId(itemId);
    setEtiquetaDraft(items.find((i) => i.id === itemId)?.etiqueta ?? "");
  };

  const soltarNuevo = ({ tipo, plazaId, dispositivoId, etiqueta, rotacion }: PayloadNuevoItem, posX: number, posY: number) => {
    setError(null);
    startTransition(async () => {
      try {
        const item = await crearItemAction(bandaId, stagePlotId, tipo, plazaId, dispositivoId, etiqueta ?? null, posX, posY, rotacion ?? 0);
        setItems((prev) => [...prev, item]);
        seleccionar(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el ícono.");
      }
    });
  };

  const soltarMover = (itemId: string, posX: number, posY: number) => {
    // Optimista: la posición se ve al soltar, sin esperar la vuelta del
    // server action — coherente con que esto es un reposicionamiento
    // visual, no una operación con riesgo de datos (a diferencia de
    // Finanzas, ver memoria de proyecto).
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, posX, posY } : i)));
    startTransition(async () => {
      try {
        await moverItemAction(bandaId, itemId, posX, posY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la posición.");
      }
    });
  };

  const guardarEtiqueta = () => {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await actualizarEtiquetaItemAction(bandaId, seleccionado.id, etiquetaDraft);
        setItems((prev) => prev.map((i) => (i.id === seleccionado.id ? { ...i, etiqueta: etiquetaDraft.trim() || null } : i)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la etiqueta.");
      }
    });
  };

  // Brief "paleta unificada..." §6: la rotación con la que se coloca Mix/
  // Side Fill desde la paleta (0/±45/±90) queda editable después -- suma/
  // resta 45° sobre el valor actual, igual patrón optimista que
  // soltarMover (se ve al toque, la persistencia va atrás).
  const rotarSeleccionado = (delta: number) => {
    if (!seleccionado) return;
    setError(null);
    const nuevaRotacion = seleccionado.rotacion + delta;
    setItems((prev) => prev.map((i) => (i.id === seleccionado.id ? { ...i, rotacion: nuevaRotacion } : i)));
    startTransition(async () => {
      try {
        await actualizarRotacionItemAction(bandaId, seleccionado.id, nuevaRotacion);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la rotación.");
      }
    });
  };

  const eliminarSeleccionado = () => {
    if (!seleccionado) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarItemAction(bandaId, seleccionado.id);
        setItems((prev) => prev.filter((i) => i.id !== seleccionado.id));
        setSeleccionadoId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el ícono.");
      }
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-bricolage), sans-serif" }}>
          Editar Stage Plot
        </h1>
        <p className="mb-3 text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
          Arrastrá un ícono de la paleta al lienzo para colocarlo. Ya puesto, se puede volver a arrastrar para reposicionarlo, o tocarlo para
          editarle la etiqueta o eliminarlo.
        </p>
        <PaletaIconos plazas={plazas} amplificadores={amplificadores} bandaColor={bandaColor} items={items} />
      </div>

      <StagePlotLienzo
        items={items}
        bandaColor={bandaColor}
        interactivo
        seleccionadoId={seleccionadoId}
        onSeleccionarItem={seleccionar}
        onSoltarNuevo={soltarNuevo}
        onSoltarMover={soltarMover}
      />

      {seleccionado && (
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{ETIQUETA_TIPO[seleccionado.tipo]} seleccionado</span>
            <button type="button" onClick={() => setSeleccionadoId(null)} className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
              Cerrar
            </button>
          </div>

          {etiquetaEditable ? (
            <>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
                Etiqueta (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  value={etiquetaDraft}
                  onChange={(e) => setEtiquetaDraft(e.target.value)}
                  placeholder={PLACEHOLDER_ETIQUETA[seleccionado.tipo as TipoEscenario]}
                  className={inputCls}
                  style={inputStyle}
                  maxLength={60}
                />
                <button
                  type="button"
                  onClick={guardarEtiqueta}
                  disabled={pending}
                  className="shrink-0 rounded-lg px-4 text-sm font-bold disabled:opacity-60"
                  style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
                >
                  Guardar
                </button>
              </div>
            </>
          ) : (
            // Brief §3 (Entrega 1): nombre + instrumento/diseño leídos de la
            // plaza o dispositivo, no editables como texto libre acá -- si
            // hace falta cambiarlos, se edita en Gestión/Seteos, no acá.
            <p className="text-sm" style={{ color: "oklch(0.35 0.02 55)" }}>
              {etiquetaSeleccionado(seleccionado)}
            </p>
          )}

          {/* Brief §6: "la rotación queda editable después de colocado" --
              solo mix/side_fill fueron diseñados con orientación en mente,
              el resto de las formas no gana nada rotando. */}
          {(seleccionado.tipo === "mix" || seleccionado.tipo === "side_fill") && (
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.02 55)" }}>
                Orientación
              </span>
              <button
                type="button"
                onClick={() => rotarSeleccionado(-45)}
                disabled={pending}
                className="rounded-lg px-2.5 py-1 text-sm font-bold disabled:opacity-60"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                ↺ 45°
              </button>
              <button
                type="button"
                onClick={() => rotarSeleccionado(45)}
                disabled={pending}
                className="rounded-lg px-2.5 py-1 text-sm font-bold disabled:opacity-60"
                style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
              >
                45° ↻
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={eliminarSeleccionado}
            disabled={pending}
            className="mt-3 text-sm font-bold disabled:opacity-60"
            style={{ color: "oklch(0.5 0.18 25)" }}
          >
            Eliminar del lienzo
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm" style={{ color: "oklch(0.6 0.15 25)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
