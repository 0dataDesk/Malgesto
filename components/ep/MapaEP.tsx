"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guardarMapaAction } from "@/app/ep/actions";
import {
  CUERPO,
  NUCLEO,
  PESO_CUERPO,
  PESO_INTENSIDAD,
  capaEntre,
  clamp,
  colorAnimo,
  conNivel,
  curvaSuave,
  duracionSeg,
  formatoMSS,
  intensidad,
  nuevaPieza,
  nuevaSeccion,
  palabraDe,
  peso,
  techoIntensidad,
  techoPeso,
  totalCompases,
  tramosDe,
  type CampoCuerpo,
  type CampoValor,
  type Escala,
  type Pieza,
  type Proyecto,
  type Seccion,
} from "@/lib/epModelo";

// Mapa del EP. Siete indicadores (núcleo: Energía, Ánimo, Tensión; cuerpo: Altos, Medios, Graves, Sub) a dos niveles:
//  - Vista del EP completo: el NIVEL de cada indicador para cada canción (su 100 %; p. ej. Energía 10 = «calma»). Parte de la propuesta de Cosmo.
//  - Vista de una canción: cada barra es un ZOOM de ese nivel: ahí se asigna cuánto de él usa cada escena (0-100 %).
//    El valor que se oye y se dibuja es el efectivo: nivel de la canción × porcentaje de la escena / 100.
// Las gráficas no se editan: se calculan. Intensidad = 65 % Energía + 35 % Tensión (color = Ánimo, rayas = Tensión);
// Peso = capas apiladas por banda de frecuencia. El ancho de cada escena es proporcional a sus compases. Ver lib/epModelo.ts.
// Cosmo lee los niveles, los porcentajes, los compases y la intención para proponer estructura, tempo, tono y MIDI de cada escena.

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const INK = "oklch(0.24 0.044 262)";
const MUTED = "oklch(0.5 0.044 262)";
const LINE = "oklch(0.89 0.008 85)";
const ACCENT = "oklch(0.64 0.170 28)";
const CARD = "oklch(0.99 0.005 85)";
const CELDA = "oklch(0.94 0.010 262)";

// Capas del cuerpo, de grave (oscuro y denso) a agudo (claro y aéreo).
const COLOR_CAPA: Record<CampoCuerpo, string> = {
  sub: "oklch(0.30 0.09 285)",
  graves: "oklch(0.42 0.12 15)",
  medios: "oklch(0.66 0.14 55)",
  altos: "oklch(0.86 0.09 95)",
};
const ORDEN_APILADO: CampoCuerpo[] = ["sub", "graves", "medios", "altos"]; // de abajo hacia arriba
const HACHURA_CSS = `repeating-linear-gradient(135deg, ${INK} 0 2px, transparent 2px 6px)`;

const FORMAS = ["Intro", "Entrada", "Verso", "Pre-coro", "Coro", "Dub", "Puente", "Cima", "Break", "Final", "Salida"];

// Geometría vertical fija; el ancho se ajusta a la pantalla.
const L = 74;
const R = 30;
const T1 = 56; // panel del núcleo
const PH1 = 170;
const T2 = T1 + PH1 + 46; // panel del cuerpo
const PH2 = 110;
const TIRA_Y = T2 + PH2 + 12; // tira de secciones
const TIRA_H = 40;
const H = TIRA_Y + TIRA_H + 10;

const yN = (v: number) => T1 + (1 - v / 100) * PH1;
const yC = (v: number) => T2 + (1 - v / 100) * PH2;
const recorta = (s: string, n: number) => (n <= 0 ? "" : s.length > n ? (n <= 1 ? "" : s.slice(0, n - 1) + "…") : s);

const rangoStyle = { accentColor: ACCENT } as const;
const inputStyle = { border: `1px solid ${LINE}`, background: CARD, color: INK, borderRadius: 12 } as const;
const miniBoton = { background: "oklch(0.93 0.010 85)", color: MUTED, borderRadius: 8 } as const;

type Sel = { p: number; s: number } | null;
type Estado = "guardado" | "pendiente" | "guardando" | "error";

function estiloMedidor(campo: CampoValor, valor: number): { relleno: string; textura?: string } {
  if (campo === "energia") return { relleno: ACCENT };
  if (campo === "animo") return { relleno: colorAnimo(valor) };
  if (campo === "tension") return { relleno: "oklch(0.80 0.03 262)", textura: HACHURA_CSS };
  return { relleno: COLOR_CAPA[campo] };
}

// Caja para escribir el valor (0-100). Se puede borrar y escribir de nuevo; ↑/↓ suman o restan 1 (con Mayús, 10); al salir vuelve al valor real.
function CajaValor({ valor, onCambio, deshabilitado, nombre, ancho = 44, onInicio, onFin }: { valor: number; onCambio: (v: number) => void; deshabilitado: boolean; nombre: string; ancho?: number; onInicio?: () => void; onFin?: () => void }) {
  const [texto, setTexto] = useState(String(valor));
  const enfocada = useRef(false);
  useEffect(() => {
    if (!enfocada.current) setTexto(String(valor));
  }, [valor]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={texto}
      disabled={deshabilitado}
      aria-label={`${nombre}: valor de 0 a 100`}
      title="Escribe un valor de 0 a 100"
      maxLength={3}
      className="rounded-md px-1 py-0.5 text-center text-[12px] font-bold"
      style={{ width: ancho, fontFamily: MONO, color: INK, border: `1px solid ${LINE}`, background: CARD }}
      onFocus={(e) => {
        enfocada.current = true;
        e.currentTarget.select();
        onInicio?.();
      }}
      onChange={(e) => {
        const limpio = e.target.value.replace(/\D/g, "").slice(0, 3);
        if (limpio === "") {
          setTexto("");
          return;
        }
        const n = clamp(parseInt(limpio, 10), 0, 100);
        setTexto(String(n));
        onCambio(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const n = clamp((parseInt(texto, 10) || 0) + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1), 0, 100);
          setTexto(String(n));
          onCambio(n);
        }
      }}
      onBlur={() => {
        enfocada.current = false;
        setTexto(String(valor));
        onFin?.();
      }}
    />
  );
}

// Medidor vertical: se arrastra (o con las flechas) y el valor llena la columna de abajo hacia arriba.
//  - Completo (detalle de sección): a su lado dice qué es el 100 (arriba), qué es el 0 (abajo) y, a la altura del nivel, cómo se llama lo elegido.
//  - Compacto (nivel de cada canción en la vista general): valor arriba, nombre y la palabra del nivel abajo.
//  - Zoom (`nivel`): la barra es el porcentaje (0-100) del nivel fijado para la canción; el 100 % de la barra es ese nivel.
function Medidor({ nombre, ayuda, valor, onCambio, deshabilitado, relleno, textura, escala, nivel, compacto = false, onInicio, onFin }: { nombre: string; ayuda: string; valor: number; onCambio: (v: number) => void; deshabilitado: boolean; relleno: string; textura?: string; escala: Escala; nivel?: number; compacto?: boolean; onInicio?: () => void; onFin?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const poner = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    onCambio(clamp(Math.round((1 - (clientY - r.top) / r.height) * 100), 0, 100));
  };
  const zoom = nivel !== undefined;
  const efectivo = zoom ? conNivel(valor, nivel) : valor;
  const ALTO = compacto ? 120 : 150;
  const yPalabra = clamp(ALTO - (valor / 100) * ALTO, 9, ALTO - 9);
  const pista = (
    <div
      ref={ref}
      role="slider"
      tabIndex={deshabilitado ? -1 : 0}
      aria-label={nombre}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      aria-valuetext={zoom ? `${valor} % de ${nivel}: ${palabraDe(escala, efectivo)}` : `${valor}: ${palabraDe(escala, valor)}`}
      className="relative shrink-0 overflow-hidden"
      style={{ width: compacto ? 30 : 34, height: ALTO, borderRadius: 10, background: CELDA, border: `1px solid ${LINE}`, touchAction: "none", cursor: deshabilitado ? "default" : "ns-resize", outline: "none" }}
      onFocus={() => onInicio?.()}
      onBlur={() => onFin?.()}
      onPointerDown={(e) => {
        if (deshabilitado) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onInicio?.();
        poner(e.clientY);
      }}
      onPointerMove={(e) => {
        if (deshabilitado || e.buttons !== 1) return;
        poner(e.clientY);
      }}
      onKeyDown={(e) => {
        if (deshabilitado) return;
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          onCambio(clamp(valor + 2, 0, 100));
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          onCambio(clamp(valor - 2, 0, 100));
        }
      }}
    >
      <div className="absolute inset-x-0 bottom-0" style={{ height: `${valor}%`, background: relleno }} />
      {textura && <div className="absolute inset-x-0 bottom-0" style={{ height: `${valor}%`, backgroundImage: textura, opacity: 0.55 }} />}
      {[25, 50, 75].map((m) => (
        <div key={m} className="absolute inset-x-0" style={{ bottom: `${m}%`, height: 1, background: INK, opacity: 0.18 }} />
      ))}
    </div>
  );

  if (compacto) {
    return (
      <div className="flex w-[50px] flex-col items-center gap-1" title={`${ayuda} (0 ${escala.cero}, 100 ${escala.cien})`}>
        <CajaValor valor={valor} onCambio={onCambio} deshabilitado={deshabilitado} nombre={nombre} ancho={40} onInicio={onInicio} onFin={onFin} />
        {pista}
        <span className="text-[10px] font-bold" style={{ fontFamily: MONO, color: MUTED }}>{nombre}</span>
        <span className="text-center text-[9.5px] leading-tight" style={{ fontFamily: MONO, color: INK, minHeight: 24 }}>{palabraDe(escala, efectivo)}</span>
      </div>
    );
  }
  return (
    <div className="flex w-[118px] flex-col gap-1" title={ayuda}>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-bold" style={{ fontFamily: MONO, color: MUTED }}>{nombre}</span>
        <span className="flex items-center gap-0.5">
          <CajaValor valor={valor} onCambio={onCambio} deshabilitado={deshabilitado} nombre={nombre} onInicio={onInicio} onFin={onFin} />
          {zoom && <span className="text-[10px]" style={{ fontFamily: MONO, color: MUTED }}>%</span>}
        </span>
      </div>
      <div className="flex gap-1.5">
        {pista}
        <div className="relative min-w-0 flex-1 text-[9.5px] leading-tight" style={{ fontFamily: MONO, color: MUTED, height: ALTO }}>
          {valor < 70 && <div className="absolute left-0 top-0">{zoom ? `100 % = ${nivel}` : `100 · ${escala.cien}`}{zoom && <><br />{palabraDe(escala, nivel)}</>}</div>}
          {valor > 30 && <div className="absolute bottom-0 left-0">{zoom ? "0 % = nada" : `0 · ${escala.cero}`}</div>}
          <div className="absolute left-0 right-0 font-bold" style={{ top: yPalabra, transform: "translateY(-50%)", color: INK, fontSize: 11 }}>
            ◂ {palabraDe(escala, efectivo)}{zoom ? ` · ${efectivo}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapaEP({ inicial, puedeEscribir }: { inicial: Proyecto; puedeEscribir: boolean }) {
  const [proy, setProy] = useState<Proyecto>(inicial);
  const [sel, setSel] = useState<Sel>(inicial.piezas[0]?.secciones[0] ? { p: 0, s: 0 } : null);
  const [vista, setVista] = useState<number | null>(null); // null = EP completo; número = una sola canción
  const [estado, setEstado] = useState<Estado>("guardado");
  const [errorMsg, setErrorMsg] = useState("");
  const [desactualizado, setDesactualizado] = useState(false);
  const primera = useRef(true);
  const ultimo = useRef(proy);
  ultimo.current = proy;
  const versionRef = useRef(inicial.version);
  const enVuelo = useRef(false);
  const sucio = useRef(false);

  // La gráfica ocupa todo el ancho disponible (mínimo 820 px; por debajo se desplaza).
  const cajaRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(1000);
  useEffect(() => {
    const el = cajaRef.current;
    if (!el) return;
    setAncho(Math.floor(el.clientWidth));
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = Math.max(820, ancho);
  const PW = W - L - R;
  const xDe = (f: number) => L + f * PW;

  // Guardado en cola: una sola petición a la vez, con la versión de la última que salió bien.
  const guardar = async () => {
    if (enVuelo.current) {
      sucio.current = true;
      return;
    }
    enVuelo.current = true;
    setEstado("guardando");
    try {
      const r = await guardarMapaAction(ultimo.current.bandaId, ultimo.current.id, ultimo.current, versionRef.current);
      if (r.ok) {
        versionRef.current = r.version;
        setEstado("guardado");
      } else if (r.desactualizado) {
        sucio.current = false;
        setDesactualizado(true);
        setEstado("error");
      } else {
        setErrorMsg(r.mensaje);
        setEstado("error");
      }
    } catch {
      setErrorMsg("No se pudo guardar.");
      setEstado("error");
    } finally {
      enVuelo.current = false;
      if (sucio.current) {
        sucio.current = false;
        void guardar();
      }
    }
  };

  // Autoguardado: 0.9 s después del último cambio.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (!puedeEscribir || desactualizado) return;
    setEstado("pendiente");
    const t = setTimeout(() => void guardar(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proy, puedeEscribir, desactualizado]);

  const soloPieza = vista !== null && proy.piezas[vista] ? vista : null;
  const tramos = useMemo(() => tramosDe(proy.piezas, soloPieza), [proy.piezas, soloPieza]);

  const cambiarSeccion = (p: number, s: number, patch: Partial<Seccion>) =>
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: pz.secciones.map((sc, j) => (j !== s ? sc : { ...sc, ...patch })) })) }));
  const cambiarPieza = (p: number, patch: Partial<Pieza>) => setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, ...patch })) }));
  const cambiarNivel = (p: number, campo: CampoValor, v: number) =>
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, niveles: { ...pz.niveles, [campo]: v } })) }));

  // Geometría del núcleo (línea de Intensidad)
  const ptsN = tramos.map((t) => ({ x: xDe(t.xc), y: yN(t.intensidad) }));
  const lineaN = ptsN.length > 0 ? curvaSuave([{ x: xDe(0), y: ptsN[0].y }, ...ptsN, { x: xDe(1), y: ptsN[ptsN.length - 1].y }]) : "";
  const areaN = lineaN ? `${lineaN} L${xDe(1)},${yN(0)} L${xDe(0)},${yN(0)} Z` : "";

  // Geometría del cuerpo (capas apiladas; el borde de arriba es el Peso)
  const capas = useMemo(() => {
    if (tramos.length === 0) return [] as { campo: CampoCuerpo; d: string; techo: { x: number; y: number }[] }[];
    const acumulado = tramos.map((t) => {
      let suma = 0;
      const porCampo = {} as Record<CampoCuerpo, [number, number]>;
      ORDEN_APILADO.forEach((c) => {
        const base = suma;
        suma += t.contrib[c];
        porCampo[c] = [base, suma];
      });
      return porCampo;
    });
    const extiende = (puntos: { x: number; y: number }[]) => [{ x: L, y: puntos[0].y }, ...puntos, { x: W - R, y: puntos[puntos.length - 1].y }];
    return ORDEN_APILADO.map((c) => {
      const arriba = extiende(tramos.map((t, i) => ({ x: L + t.xc * (W - L - R), y: yC(acumulado[i][c][1]) })));
      const abajo = extiende(tramos.map((t, i) => ({ x: L + t.xc * (W - L - R), y: yC(acumulado[i][c][0]) })));
      return { campo: c, d: capaEntre(arriba, abajo), techo: arriba };
    });
  }, [tramos, W]);

  // Límites de cada canción en la vista actual.
  const limites: { pieza: number; x0: number; x1: number }[] = [];
  tramos.forEach((t) => {
    const ult = limites[limites.length - 1];
    if (ult && ult.pieza === t.pieza) ult.x1 = t.x1;
    else limites.push({ pieza: t.pieza, x0: t.x0, x1: t.x1 });
  });

  const enDetalle = vista !== null;
  const seleccionada = sel && proy.piezas[sel.p]?.secciones[sel.s] ? sel : null;
  const secSel = seleccionada ? proy.piezas[seleccionada.p].secciones[seleccionada.s] : null;
  const pzSel = seleccionada ? proy.piezas[seleccionada.p] : null;
  const numeroSel = seleccionada ? tramos.findIndex((t) => t.pieza === seleccionada.p && t.seccion === seleccionada.s) + 1 : 0;
  const totalEP = proy.piezas.reduce((a, pz) => a + totalCompases(pz), 0);

  const elegir = (p: number, s: number) => {
    if (vista === null) setVista(p);
    setSel({ p, s });
  };
  const agregarPieza = () => {
    setProy((pr) => ({ ...pr, piezas: [...pr.piezas, nuevaPieza(`Canción ${pr.piezas.length + 1}`)] }));
    setSel({ p: proy.piezas.length, s: 0 });
  };
  const eliminarPieza = (p: number) => {
    if (!window.confirm(`¿Eliminar "${proy.piezas[p].titulo}" y todas sus escenas?`)) return;
    setProy((pr) => ({ ...pr, piezas: pr.piezas.filter((_, i) => i !== p) }));
    setSel(null);
    setVista(null);
  };
  const moverPieza = (p: number, d: number) => {
    const q = p + d;
    if (q < 0 || q >= proy.piezas.length) return;
    setProy((pr) => {
      const piezas = [...pr.piezas];
      [piezas[p], piezas[q]] = [piezas[q], piezas[p]];
      return { ...pr, piezas };
    });
    setSel(null);
    setVista(null);
  };
  const insertarSeccion = (p: number, despuesDe: number) => {
    const nueva = nuevaSeccion("Nueva escena", "Verso");
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: [...pz.secciones.slice(0, despuesDe + 1), nueva, ...pz.secciones.slice(despuesDe + 1)] })) }));
    setSel({ p, s: despuesDe + 1 });
  };
  const eliminarSeccion = (p: number, s: number) => {
    if (proy.piezas[p].secciones.length <= 1) return;
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: pz.secciones.filter((_, j) => j !== s) })) }));
    setSel({ p, s: Math.max(0, s - 1) });
  };
  const moverSeccion = (p: number, s: number, d: number) => {
    const q = s + d;
    if (q < 0 || q >= proy.piezas[p].secciones.length) return;
    setProy((pr) => ({
      ...pr,
      piezas: pr.piezas.map((pz, i) => {
        if (i !== p) return pz;
        const secciones = [...pz.secciones];
        [secciones[s], secciones[q]] = [secciones[q], secciones[s]];
        return { ...pz, secciones };
      }),
    }));
    setSel({ p, s: q });
  };
  const duplicarSeccion = (p: number, s: number) => {
    const orig = proy.piezas[p].secciones[s];
    const copia: Seccion = { ...orig, id: crypto.randomUUID() };
    setProy((pr) => ({ ...pr, piezas: pr.piezas.map((pz, i) => (i !== p ? pz : { ...pz, secciones: [...pz.secciones.slice(0, s + 1), copia, ...pz.secciones.slice(s + 1)] })) }));
    setSel({ p, s: s + 1 });
  };

  const textoEstado = !puedeEscribir ? "Solo lectura" : estado === "guardado" ? "Guardado" : estado === "guardando" ? "Guardando…" : estado === "pendiente" ? "Cambios sin guardar…" : desactualizado ? "Pantalla desactualizada" : errorMsg || "No se pudo guardar";

  const compasesPieza = pzSel ? totalCompases(pzSel) : 0;
  const durSec = secSel && pzSel ? duracionSeg(secSel.compases, pzSel.bpm) : null;

  // Vista general: el nivel de cada indicador para una canción (compactos). Detalle: cuánto de ese nivel usa la escena (zoom).
  const gruposPieza = (p: number) => {
    const pz = proy.piezas[p];
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-3">
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>Núcleo</div>
          <div className="mt-1.5 flex gap-1">
            {NUCLEO.map((n) => {
              const v = pz.niveles[n.campo];
              const e = estiloMedidor(n.campo, v);
              return <Medidor key={n.campo} compacto nombre={n.nombre} ayuda={n.ayuda} escala={n.escala} valor={v} onCambio={(x) => cambiarNivel(p, n.campo, x)} deshabilitado={!puedeEscribir} relleno={e.relleno} textura={e.textura} />;
            })}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>Cuerpo</div>
          <div className="mt-1.5 flex gap-1">
            {CUERPO.map((c) => {
              const v = pz.niveles[c.campo];
              const e = estiloMedidor(c.campo, v);
              return <Medidor key={c.campo} compacto nombre={c.nombre} ayuda={`${c.ayuda} (${c.hz})`} escala={c.escala} valor={v} onCambio={(x) => cambiarNivel(p, c.campo, x)} deshabilitado={!puedeEscribir} relleno={e.relleno} />;
            })}
          </div>
        </div>
      </div>
    );
  };

  const gruposSeccion = () => {
    if (!secSel || !seleccionada || !pzSel) return null;
    const nv = pzSel.niveles;
    const ponerValor = (campo: CampoValor, v: number) => cambiarSeccion(seleccionada.p, seleccionada.s, { [campo]: v } as Partial<Seccion>);
    return (
      <div className="flex flex-wrap gap-x-8 gap-y-5">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>Núcleo</span>
            <span className="text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
              Intensidad <b style={{ color: INK }}>{intensidad(secSel, nv)}</b>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {NUCLEO.map((n) => {
              const e = estiloMedidor(n.campo, conNivel(secSel[n.campo], nv[n.campo]));
              return <Medidor key={n.campo} nombre={n.nombre} ayuda={`${n.ayuda} (nivel de la canción: ${nv[n.campo]})`} escala={n.escala} valor={secSel[n.campo]} nivel={nv[n.campo]} onCambio={(v) => ponerValor(n.campo, v)} deshabilitado={!puedeEscribir} relleno={e.relleno} textura={e.textura} />;
            })}
          </div>
          <div className="mt-1.5 max-w-[22rem] text-[10px] leading-snug" style={{ color: MUTED }}>
            Intensidad = {Math.round(PESO_INTENSIDAD.energia * 100)} % energía + {Math.round(PESO_INTENSIDAD.tension * 100)} % tensión. El ánimo la tiñe.
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>Cuerpo</span>
            <span className="text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
              Peso <b style={{ color: INK }}>{peso(secSel, nv)}</b>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {CUERPO.map((c) => {
              const e = estiloMedidor(c.campo, conNivel(secSel[c.campo], nv[c.campo]));
              return <Medidor key={c.campo} nombre={c.nombre} ayuda={`${c.ayuda} (${c.hz}; nivel de la canción: ${nv[c.campo]})`} escala={c.escala} valor={secSel[c.campo]} nivel={nv[c.campo]} onCambio={(v) => ponerValor(c.campo, v)} deshabilitado={!puedeEscribir} relleno={e.relleno} />;
            })}
          </div>
          <div className="mt-1.5 max-w-[30rem] text-[10px] leading-snug" style={{ color: MUTED }}>
            Peso = {CUERPO.slice().reverse().map((c) => `${Math.round(PESO_CUERPO[c.campo] * 100)} % ${c.nombre.toLowerCase()}`).join(" + ")}. Lo grave pesa más.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-3">
      {desactualizado && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm" style={{ background: "oklch(0.95 0.04 60)", border: "1px solid oklch(0.8 0.1 60)", color: INK }}>
          <span>Esta pantalla quedó desactualizada (se guardó una versión más nueva) y no guardó tus últimos cambios para no pisarla.</span>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: ACCENT, color: "oklch(0.99 0.006 85)" }}>
            Recargar
          </button>
        </div>
      )}

      {/* Nombre, historia y estado de guardado */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={proy.nombre}
            onChange={(e) => setProy({ ...proy, nombre: e.target.value })}
            disabled={!puedeEscribir}
            maxLength={120}
            aria-label="Nombre del proyecto"
            className="min-w-0 flex-1 bg-transparent py-1 text-xl font-bold"
            style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK, outline: "none", borderBottom: puedeEscribir ? `1px dashed ${MUTED}` : "none" }}
          />
          {puedeEscribir && <span aria-hidden style={{ color: MUTED }}>✎</span>}
        </label>
        <span className="shrink-0 text-[11px]" style={{ fontFamily: MONO, color: estado === "error" ? "oklch(0.5 0.18 25)" : MUTED }}>
          {textoEstado}
        </span>
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs font-bold" style={{ color: MUTED }}>
          La historia del proyecto
        </summary>
        <textarea
          value={proy.historia}
          onChange={(e) => setProy({ ...proy, historia: e.target.value })}
          disabled={!puedeEscribir}
          rows={4}
          maxLength={4000}
          placeholder="Qué viaje cuenta el proyecto, de dónde parte y a dónde llega."
          className="mt-1.5 w-full p-3 text-sm"
          style={inputStyle}
        />
      </details>

      {/* Filtros: todo el EP o una canción */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setVista(null)} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: vista === null ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85)", color: vista === null ? "oklch(0.99 0.006 85)" : MUTED }}>
          EP completo
        </button>
        {proy.piezas.map((pz, i) => (
          <button key={pz.id} type="button" onClick={() => { setVista(i); setSel({ p: i, s: 0 }); }} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: vista === i ? "oklch(0.27 0.05 262)" : "oklch(0.93 0.010 85)", color: vista === i ? "oklch(0.99 0.006 85)" : MUTED }}>
            {i + 1}. {recorta(pz.titulo, 16)}
          </button>
        ))}
      </div>

      {/* Gráfica (calculada), leyenda y mesa de medidores, en una sola tarjeta */}
      <div className="mt-2.5 overflow-hidden rounded-2xl" style={{ background: CARD, border: `1px solid ${LINE}` }}>
        <div ref={cajaRef} className="overflow-x-auto">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Intensidad y peso de cada escena, calculados de los medidores" style={{ display: "block" }}>
            <defs>
              <linearGradient id="ep-animo" gradientUnits="userSpaceOnUse" x1={xDe(0)} x2={xDe(1)} y1="0" y2="0">
                {tramos.length > 0 && <stop offset="0" stopColor={colorAnimo(tramos[0].animo)} />}
                {tramos.map((t, i) => (
                  <stop key={i} offset={t.xc} stopColor={colorAnimo(t.animo)} />
                ))}
                {tramos.length > 0 && <stop offset="1" stopColor={colorAnimo(tramos[tramos.length - 1].animo)} />}
              </linearGradient>
              <linearGradient id="ep-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="1" stopColor="white" stopOpacity="0.6" />
              </linearGradient>
              <pattern id="ep-hachura" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke={INK} strokeWidth="1.7" />
              </pattern>
              <pattern id="ep-puntos" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1" fill="white" />
              </pattern>
              <clipPath id="ep-recorte-area">
                <path d={areaN} />
              </clipPath>
            </defs>

            {/* Franja por canción (alterna tono) con su título arriba */}
            {limites.map((lim, i) => (
              <g key={lim.pieza}>
                <rect x={xDe(lim.x0)} y={T1 - 8} width={(lim.x1 - lim.x0) * PW} height={TIRA_Y + TIRA_H - T1 + 12} fill={i % 2 === 0 ? "oklch(0.975 0.006 85)" : "oklch(0.945 0.012 262)"} />
                {i > 0 && <line x1={xDe(lim.x0)} x2={xDe(lim.x0)} y1={6} y2={H - 4} stroke={INK} strokeOpacity="0.3" strokeDasharray="2 4" />}
                <text x={xDe((lim.x0 + lim.x1) / 2)} y={16} fontSize="12" fontWeight="700" textAnchor="middle" fill={INK} style={{ fontFamily: "var(--font-fraunces), sans-serif" }}>
                  {lim.pieza + 1}. {recorta(proy.piezas[lim.pieza].titulo, Math.max(8, Math.floor(((lim.x1 - lim.x0) * PW) / 8)))}
                </text>
              </g>
            ))}

            {/* NÚCLEO · Intensidad */}
            <text x={L - 8} y={T1 - 14} fontSize="10" fontWeight="700" textAnchor="end" fill={INK} style={{ fontFamily: MONO }}>NÚCLEO</text>
            <text x={L + 4} y={T1 - 14} fontSize="10" fill={MUTED} style={{ fontFamily: MONO }}>Intensidad · altura = energía y tensión · color = ánimo · rayas = tensión{enDetalle ? "" : " · raya punteada = techo de cada canción"}</text>
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={yN(v)} y2={yN(v)} stroke="oklch(0.78 0.02 262)" strokeOpacity={v === 0 ? 0.7 : 0.35} strokeDasharray={v === 0 ? undefined : "3 5"} />
                <text x={L - 8} y={yN(v) + 3} fontSize="9" textAnchor="end" fill={MUTED} style={{ fontFamily: MONO }}>{v}</text>
              </g>
            ))}
            {areaN && <path d={areaN} fill="url(#ep-animo)" fillOpacity="0.78" />}
            {areaN && <path d={areaN} fill="url(#ep-fade)" />}
            {tramos.map((t, i) => (
              <rect key={i} x={xDe(t.x0)} y={T1} width={(t.x1 - t.x0) * PW} height={PH1} fill="url(#ep-hachura)" opacity={Math.max(0, (t.tension - 30) / 70) * 0.42} clipPath="url(#ep-recorte-area)" pointerEvents="none" />
            ))}
            {lineaN && <path d={lineaN} fill="none" stroke={INK} strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" />}
            {lineaN && <path d={lineaN} fill="none" stroke="url(#ep-animo)" strokeWidth="3.6" strokeLinecap="round" />}
            {!enDetalle && limites.map((lim) => {
              const t = techoIntensidad(proy.piezas[lim.pieza].niveles);
              return (
                <g key={lim.pieza} pointerEvents="none">
                  <line x1={xDe(lim.x0) + 3} x2={xDe(lim.x1) - 3} y1={yN(t)} y2={yN(t)} stroke={INK} strokeWidth="1.3" strokeDasharray="5 4" strokeOpacity="0.75" />
                  <text x={xDe(lim.x1) - 6} y={yN(t) - 4} fontSize="9.5" fontWeight="700" textAnchor="end" fill={INK} style={{ fontFamily: MONO }}>techo {t}</text>
                </g>
              );
            })}

            {/* CUERPO · Peso (capas apiladas: Sub abajo, Altos arriba) */}
            <text x={L - 8} y={T2 - 14} fontSize="10" fontWeight="700" textAnchor="end" fill={INK} style={{ fontFamily: MONO }}>CUERPO</text>
            <text x={L + 4} y={T2 - 14} fontSize="10" fill={MUTED} style={{ fontFamily: MONO }}>Peso · altura total = peso · cada capa = lo que aporta esa banda (sub abajo, altos arriba)</text>
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={yC(v)} y2={yC(v)} stroke="oklch(0.78 0.02 262)" strokeOpacity={v === 0 ? 0.7 : 0.35} strokeDasharray={v === 0 ? undefined : "3 5"} />
                <text x={L - 8} y={yC(v) + 3} fontSize="9" textAnchor="end" fill={MUTED} style={{ fontFamily: MONO }}>{v}</text>
              </g>
            ))}
            {capas.map((c) => (
              <g key={c.campo}>
                <path d={c.d} fill={COLOR_CAPA[c.campo]} />
                {c.campo === "sub" && <path d={c.d} fill="url(#ep-puntos)" opacity="0.28" />}
                <path d={curvaSuave(c.techo)} fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1" />
              </g>
            ))}
            {capas.length > 0 && <path d={curvaSuave(capas[capas.length - 1].techo)} fill="none" stroke={INK} strokeOpacity="0.6" strokeWidth="1.6" />}
            {!enDetalle && limites.map((lim) => {
              const t = techoPeso(proy.piezas[lim.pieza].niveles);
              return (
                <g key={lim.pieza} pointerEvents="none">
                  <line x1={xDe(lim.x0) + 3} x2={xDe(lim.x1) - 3} y1={yC(t)} y2={yC(t)} stroke="white" strokeWidth="2.2" strokeDasharray="5 4" />
                  <line x1={xDe(lim.x0) + 3} x2={xDe(lim.x1) - 3} y1={yC(t)} y2={yC(t)} stroke={INK} strokeWidth="1.3" strokeDasharray="5 4" strokeOpacity="0.75" />
                  <text x={xDe(lim.x1) - 6} y={yC(t) - 4} fontSize="9.5" fontWeight="700" textAnchor="end" fill={INK} style={{ fontFamily: MONO }}>techo {t}</text>
                </g>
              );
            })}

            {/* Selección, zonas clicables y tira de escenas (el tamaño es proporcional a los compases) */}
            {tramos.map((t, k) => {
              const sc = proy.piezas[t.pieza].secciones[t.seccion];
              const esSel = enDetalle && seleccionada?.p === t.pieza && seleccionada?.s === t.seccion;
              const x0 = xDe(t.x0);
              const ancho = (t.x1 - t.x0) * PW;
              const caben = Math.floor((ancho - 6) / 6.4);
              return (
                <g key={sc.id}>
                  {esSel && <rect x={x0} y={T1 - 8} width={ancho} height={TIRA_Y + TIRA_H - T1 + 12} fill={INK} fillOpacity="0.08" pointerEvents="none" />}
                  <rect x={x0} y={T1} width={ancho} height={T2 + PH2 - T1} fill="transparent" style={{ cursor: "pointer" }} onClick={() => elegir(t.pieza, t.seccion)} />
                  {t.seccion > 0 && (
                    <>
                      <line x1={x0} x2={x0} y1={T1} y2={T1 + PH1} stroke={INK} strokeOpacity="0.1" pointerEvents="none" />
                      <line x1={x0} x2={x0} y1={T2} y2={T2 + PH2} stroke={INK} strokeOpacity="0.1" pointerEvents="none" />
                    </>
                  )}
                  {esSel && (
                    <>
                      <text x={xDe(t.xc)} y={yN(t.intensidad) - 14} fontSize="11" fontWeight="700" textAnchor="middle" fill={INK} style={{ fontFamily: MONO }} pointerEvents="none">{t.intensidad}</text>
                      <text x={xDe(t.xc)} y={yC(t.peso) - 6} fontSize="11" fontWeight="700" textAnchor="middle" fill={INK} style={{ fontFamily: MONO }} pointerEvents="none">{t.peso}</text>
                    </>
                  )}
                  {/* tira */}
                  <rect x={x0 + 1} y={TIRA_Y} width={Math.max(1, ancho - 2)} height={TIRA_H} rx="7" fill={colorAnimo(t.animo, esSel ? 0.9 : 0.34)} stroke={esSel ? INK : "none"} strokeWidth="2" style={{ cursor: "pointer" }} onClick={() => elegir(t.pieza, t.seccion)}>
                    <title>{`${k + 1}. ${sc.nombre}${sc.parte ? ` (${sc.parte})` : ""} · ${sc.compases} compases${sc.transmite ? ` · ${sc.transmite}` : ""}`}</title>
                  </rect>
                  <text x={xDe(t.xc)} y={TIRA_Y + 17} fontSize="11" fontWeight={esSel ? 700 : 500} textAnchor="middle" fill={esSel && t.animo > 55 ? INK : esSel ? "white" : INK} pointerEvents="none" style={{ fontFamily: MONO }}>
                    {recorta(sc.nombre, caben)}
                  </text>
                  <text x={xDe(t.xc)} y={TIRA_Y + 31} fontSize="9.5" textAnchor="middle" fill={esSel && t.animo <= 55 ? "white" : MUTED} pointerEvents="none" style={{ fontFamily: MONO }}>
                    {caben >= 14 && sc.parte ? `${recorta(sc.parte, caben - 8)} · ${sc.compases} c` : caben >= 5 ? `${sc.compases} c` : ancho >= 22 ? String(sc.compases) : ""}
                  </text>
                </g>
              );
            })}
            {tramos.length > 0 && (
              <text x={L - 8} y={TIRA_Y + 24} fontSize="10" fontWeight="700" textAnchor="end" fill={INK} style={{ fontFamily: MONO }}>ESCENAS</text>
            )}
            {tramos.length === 0 && (
              <text x={W / 2} y={T1 + PH1 / 2} textAnchor="middle" fontSize="13" fill={MUTED}>Agrega una canción para empezar el mapa.</text>
            )}
          </svg>
        </div>

        {/* Leyenda: qué significa cada color y cada textura */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-[10px]" style={{ fontFamily: MONO, color: MUTED, borderTop: `1px solid ${LINE}` }}>
          <span className="flex items-center gap-2">
            Ánimo
            <span>oscuro</span>
            <span aria-hidden style={{ width: 90, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${[0, 20, 40, 50, 60, 80, 100].map((v) => colorAnimo(v)).join(", ")})` }} />
            <span>luminoso</span>
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden style={{ width: 22, height: 10, borderRadius: 3, background: "oklch(0.88 0.03 262)", backgroundImage: HACHURA_CSS }} />
            rayas = tensión (más rayas, más suspenso)
          </span>
          <span className="flex flex-wrap items-center gap-2">
            Cuerpo:
            {CUERPO.map((c) => (
              <span key={c.campo} className="flex items-center gap-1" title={c.ayuda}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: COLOR_CAPA[c.campo] }} />
                {c.nombre} {Math.round(PESO_CUERPO[c.campo] * 100)} %
              </span>
            ))}
          </span>
          <span>El ancho de cada escena es proporcional a sus compases.</span>
        </div>

        {/* Barra de la escena elegida (solo en el detalle de una canción) */}
        {enDetalle && secSel && pzSel && seleccionada && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2" style={{ borderTop: `1px solid ${LINE}`, background: "oklch(0.975 0.006 85)" }}>
            <span className="text-[11px] font-bold" style={{ fontFamily: MONO, color: INK }}>
              Escena {numeroSel}: {secSel.nombre}{secSel.parte ? ` (${secSel.parte})` : ""} · {pzSel.titulo}
            </span>
            {puedeEscribir && (
              <span className="ml-auto flex flex-wrap gap-1.5">
                <button type="button" onClick={() => moverSeccion(seleccionada.p, seleccionada.s, -1)} className="px-2.5 py-1 text-xs font-bold" style={miniBoton}>← Antes</button>
                <button type="button" onClick={() => moverSeccion(seleccionada.p, seleccionada.s, 1)} className="px-2.5 py-1 text-xs font-bold" style={miniBoton}>Después →</button>
                <button type="button" onClick={() => insertarSeccion(seleccionada.p, seleccionada.s)} className="px-2.5 py-1 text-xs font-bold" style={miniBoton}>+ Escena después</button>
                <button type="button" onClick={() => duplicarSeccion(seleccionada.p, seleccionada.s)} className="px-2.5 py-1 text-xs font-bold" style={miniBoton}>Duplicar</button>
                <button type="button" onClick={() => eliminarSeccion(seleccionada.p, seleccionada.s)} disabled={pzSel.secciones.length <= 1} className="px-2.5 py-1 text-xs font-bold" style={{ ...miniBoton, color: "oklch(0.5 0.18 25)" }}>Eliminar</button>
              </span>
            )}
          </div>
        )}

        {/* Mesa */}
        {!enDetalle ? (
          <div className="p-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>Nivel de cada canción</div>
            <p className="mt-1 max-w-[60rem] text-[11px] leading-snug" style={{ color: MUTED }}>
              Aquí fijas, para cada canción, hasta dónde llega cada indicador: su 100 %. Parte de mi propuesta. Al entrar a una canción (toca su título o una escena de la gráfica), cada barra se vuelve un zoom de este nivel: ahí asignas cuánto de él usa cada escena.
            </p>
            <div className="mt-3 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
              {proy.piezas.map((pz, p) => (
                <div key={pz.id} className="rounded-xl p-3" style={{ background: "oklch(0.975 0.006 85)", border: `1px solid ${LINE}` }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <button type="button" onClick={() => { setVista(p); setSel({ p, s: 0 }); }} className="text-left text-[15px] font-bold" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>
                      {p + 1}. {pz.titulo} ›
                    </button>
                    <span className="text-[10px]" style={{ fontFamily: MONO, color: MUTED }}>
                      techo de intensidad {techoIntensidad(pz.niveles)} · de peso {techoPeso(pz.niveles)}
                    </span>
                  </div>
                  <div className="mt-2.5">{gruposPieza(p)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-x-6 gap-y-1 text-[10px]" style={{ fontFamily: MONO, color: MUTED, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {[...NUCLEO, ...CUERPO].map((m) => (
                <span key={m.campo}>
                  <b style={{ color: INK }}>{m.nombre}:</b> 0 = {m.escala.cero} · 100 = {m.escala.cien}
                </span>
              ))}
            </div>
          </div>
        ) : secSel && pzSel && seleccionada ? (
          <div className="grid gap-6 p-4 xl:grid-cols-[auto_minmax(0,1fr)]" style={{ borderTop: `1px solid ${LINE}` }}>
            <div>
              {gruposSeccion()}
              <p className="mt-2 max-w-[48rem] text-[10px] leading-snug" style={{ color: MUTED }}>
                Cada barra es un zoom: su 100 % es el nivel que fijaste para esta canción en la vista del EP completo, y la caja es el porcentaje de ese nivel que usa esta escena.
              </p>
            </div>

            <div className="min-w-0 border-t pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0" style={{ borderColor: LINE }}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={secSel.nombre}
                  onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { nombre: e.target.value })}
                  disabled={!puedeEscribir}
                  maxLength={120}
                  aria-label="Escena"
                  placeholder="Escena: cómo la imaginas (Niebla, Se abre el eco…)"
                  className="min-w-0 flex-1 px-3 py-1.5 text-base font-bold"
                  style={{ ...inputStyle, fontFamily: "var(--font-fraunces), sans-serif" }}
                />
                <label className="flex items-center gap-1 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                  parte
                  <input
                    list="ep-formas"
                    value={secSel.parte}
                    onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { parte: e.target.value })}
                    disabled={!puedeEscribir}
                    maxLength={60}
                    aria-label="Parte de la canción"
                    placeholder="Intro, Verso…"
                    className="w-28 px-2 py-1.5"
                    style={inputStyle}
                  />
                </label>
                <datalist id="ep-formas">
                  {FORMAS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
                <label className="flex items-center gap-1 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                  compases
                  <input type="number" min={1} max={512} value={secSel.compases} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { compases: clamp(Math.round(Number(e.target.value) || 1), 1, 512) })} disabled={!puedeEscribir} className="w-16 px-2 py-1" style={inputStyle} />
                </label>
              </div>
              <div className="mt-1.5 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                {durSec !== null ? `≈ ${formatoMSS(durSec)} a ${pzSel.bpm} BPM · ` : "Sin BPM: no se calcula el tiempo · "}
                {Math.round((secSel.compases / Math.max(1, compasesPieza)) * 100)} % de la canción ({secSel.compases} de {compasesPieza} compases)
                {totalEP > compasesPieza ? ` · ${Math.round((secSel.compases / totalEP) * 100)} % del EP` : ""}
              </div>
              <div className="mt-2.5 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>
                  Intención (qué debe pasar y hacer sentir)
                  <textarea value={secSel.transmite} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { transmite: e.target.value })} disabled={!puedeEscribir} rows={3} maxLength={1000} placeholder="Ej. algo grande está lejos" className="mt-1 w-full p-2.5 text-sm font-normal normal-case tracking-normal" style={{ ...inputStyle, fontFamily: "inherit" }} />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.12em]" style={{ fontFamily: MONO, color: MUTED }}>
                  Notas y armonía
                  <textarea value={secSel.armonia} onChange={(e) => cambiarSeccion(seleccionada.p, seleccionada.s, { armonia: e.target.value })} disabled={!puedeEscribir} rows={3} maxLength={1000} placeholder="Ej. Am | Am | Dm | Em" className="mt-1 w-full p-2.5 text-sm font-normal normal-case tracking-normal" style={{ ...inputStyle, fontFamily: "inherit" }} />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm" style={{ color: MUTED, borderTop: `1px solid ${LINE}` }}>
            Toca una escena de la gráfica o de la tira para mover sus medidores.
          </p>
        )}
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>
        Vista del EP completo: el nivel de cada canción. Vista de una canción: cuánto de ese nivel usa cada escena. Las gráficas se dibujan solas. Cuando estés listo, dile a Cosmo «arma [canción]»: lee estos valores, los compases y la intención, y propone estructura, tempo, tono y los MIDI de cada escena.
      </p>

      {/* Canciones */}
      <div className="mt-6 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: MONO, color: INK }}>
          Canciones · {proy.piezas.length}
        </h3>
        {puedeEscribir && (
          <button type="button" onClick={agregarPieza} className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: ACCENT, color: "oklch(0.99 0.006 85)" }}>
            + Canción
          </button>
        )}
      </div>
      <div className="mt-2 grid gap-2.5 md:grid-cols-2 2xl:grid-cols-4">
        {proy.piezas.map((pz, p) => {
          const comp = totalCompases(pz);
          const dur = duracionSeg(comp, pz.bpm);
          return (
            <div key={pz.id} className="rounded-2xl p-3.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ fontFamily: MONO, color: MUTED }}>{p + 1}</span>
                <input
                  value={pz.titulo}
                  onChange={(e) => cambiarPieza(p, { titulo: e.target.value })}
                  disabled={!puedeEscribir}
                  maxLength={120}
                  aria-label="Nombre de la canción"
                  placeholder="Nombre de la canción"
                  className="min-w-0 flex-1 px-2.5 py-1 text-[17px] font-bold"
                  style={{ ...inputStyle, fontFamily: "var(--font-fraunces), sans-serif", borderStyle: puedeEscribir ? "dashed" : "solid" }}
                />
                {puedeEscribir && (
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => moverPieza(p, -1)} disabled={p === 0} aria-label="Subir canción" className="px-2 py-1 text-xs" style={miniBoton}>↑</button>
                    <button type="button" onClick={() => moverPieza(p, 1)} disabled={p === proy.piezas.length - 1} aria-label="Bajar canción" className="px-2 py-1 text-xs" style={miniBoton}>↓</button>
                    <button type="button" onClick={() => eliminarPieza(p)} aria-label="Eliminar canción" className="px-2 py-1 text-xs" style={{ ...miniBoton, color: "oklch(0.5 0.18 25)" }}>✕</button>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" style={{ fontFamily: MONO, color: MUTED }}>
                <label className="flex items-center gap-1.5">
                  Tono
                  <input value={pz.tonalidad} onChange={(e) => cambiarPieza(p, { tonalidad: e.target.value })} disabled={!puedeEscribir} maxLength={40} placeholder="lo propone Cosmo" className="w-28 px-2 py-1" style={inputStyle} />
                </label>
                <label className="flex items-center gap-1.5">
                  BPM
                  <input type="number" min={20} max={300} value={pz.bpm ?? ""} onChange={(e) => cambiarPieza(p, { bpm: e.target.value === "" ? null : Number(e.target.value) })} disabled={!puedeEscribir} placeholder="—" className="w-16 px-2 py-1" style={inputStyle} />
                </label>
                <span>
                  {comp} compases · {pz.secciones.length} escenas{dur !== null ? ` · ≈ ${formatoMSS(dur)}` : ""}
                </span>
              </div>
              <textarea value={pz.idea} onChange={(e) => cambiarPieza(p, { idea: e.target.value })} disabled={!puedeEscribir} rows={3} maxLength={1000} placeholder="Qué cuenta esta canción en el viaje." className="mt-2 w-full p-2.5 text-sm" style={inputStyle} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
