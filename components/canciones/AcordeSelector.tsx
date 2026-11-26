"use client";

import { useState } from "react";
import {
  TOKENS_CALIDAD,
  simboloAcorde,
  colorRaizAcorde,
  acordesDeTonalidad,
  calidadDeTokens,
  tokenPermitido,
  tokensDeCalidad,
  type Nota,
  type Calidad,
  type Tonalidad,
  type TokenCalidad,
} from "@/lib/cancionTeoria";

const panelStyle = { background: "oklch(0.99 0.005 85)", border: "1px solid oklch(0.89 0.008 85)", boxShadow: "0 16px 32px -16px rgba(0,0,0,0.25)" };
const etiquetaStyle = { color: "oklch(0.55 0.044 262)" };
const inactivoStyle = { background: "oklch(0.93 0.010 85)", color: "oklch(0.4 0.044 262)" };
const activoStyle = { background: "oklch(0.64 0.170 28)", color: "oklch(0.99 0.006 85)" };

export type AcordeRef = { notaRaiz: Nota; calidad: Calidad; notaBajo: Nota | null };

const NATURALES: Nota[] = ["C", "D", "E", "F", "G", "A", "B"];
// E y B no tienen sostenido propio en la escala (E♯ = F, B♯ = C).
const SIN_SOSTENIDO = new Set<string>(["E", "B"]);

function partirNota(n: Nota | null): { letra: string | null; sost: boolean } {
  if (!n) return { letra: null, sost: false };
  return { letra: n[0], sost: n.endsWith("#") };
}
function juntarNota(letra: string | null, sost: boolean): Nota | null {
  if (!letra) return null;
  return (sost && !SIN_SOSTENIDO.has(letra) ? `${letra}#` : letra) as Nota;
}

// Botones de una nota: la letra y, aparte, el ♯. Se usa para la raíz y para el bajo.
function SelectorNota({ letra, sost, onLetra, onSost }: { letra: string | null; sost: boolean; onLetra: (l: string) => void; onSost: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {NATURALES.map((n) => (
        <button key={n} type="button" onClick={() => onLetra(n)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={letra === n ? activoStyle : inactivoStyle}>
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={!letra || SIN_SOSTENIDO.has(letra)}
        onClick={onSost}
        title="Sostenido"
        className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-30"
        style={sost && letra && !SIN_SOSTENIDO.has(letra) ? activoStyle : inactivoStyle}
      >
        ♯
      </button>
    </div>
  );
}

function Acordeon({ titulo, nota, abierto, onToggle, children }: { titulo: string; nota?: string; abierto: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded-lg" style={{ border: "1px solid oklch(0.89 0.008 85)" }}>
      <button type="button" onClick={onToggle} aria-expanded={abierto} className="flex w-full items-center gap-2 px-2.5 py-2 text-left">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>{titulo}</span>
        {nota && <span className="text-[10px]" style={etiquetaStyle}>{nota}</span>}
        <span className="ml-auto text-xs" style={etiquetaStyle} aria-hidden>{abierto ? "▾" : "▸"}</span>
      </button>
      {abierto && <div className="px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

// Selector de acordes por botones, en acordeones:
//  1) Acordes de la canción: solo los que ya trae (lo normal en un cover).
//  2) Acordes de la tonalidad: propuesta básica en covers, amplia en canción propia.
//  3) Manual: nota + ♯ + calidad (se pueden pulsar varias en orden: m, add9) y, si hace falta, un bajo distinto.
export function AcordeSelector({
  tonalidad,
  notaRaiz,
  calidad,
  notaBajo = null,
  onSeleccionar,
  compacto = false,
  etiqueta,
  acordesCancion = [],
  esCover = true,
}: {
  tonalidad: Tonalidad;
  notaRaiz: Nota;
  calidad: Calidad;
  notaBajo?: Nota | null;
  onSeleccionar: (notaRaiz: Nota, calidad: Calidad, notaBajo: Nota | null) => void;
  // Botón chico (para filas apretadas); `etiqueta` reemplaza el nombre del acorde, p. ej. "+ acorde".
  compacto?: boolean;
  etiqueta?: string;
  // Acordes que ya tiene la canción (sin repetir), en orden de aparición.
  acordesCancion?: AcordeRef[];
  esCover?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [secAbierta, setSecAbierta] = useState<"cancion" | "tono" | "manual">("cancion");
  const [letra, setLetra] = useState<string | null>(null);
  const [sost, setSost] = useState(false);
  const [tokens, setTokens] = useState<TokenCalidad[]>([]);
  const [conBajo, setConBajo] = useState(false);
  const [bajoLetra, setBajoLetra] = useState<string | null>(null);
  const [bajoSost, setBajoSost] = useState(false);

  const abrir = () => {
    // Al editar un acorde, el manual parte de ese acorde; con "+ acorde" parte vacío.
    const r = partirNota(etiqueta ? null : notaRaiz);
    const b = partirNota(notaBajo);
    setLetra(r.letra);
    setSost(r.sost);
    setTokens(etiqueta ? [] : tokensDeCalidad(calidad));
    setConBajo(!!notaBajo);
    setBajoLetra(b.letra);
    setBajoSost(b.sost);
    setSecAbierta(acordesCancion.length > 0 ? "cancion" : "tono");
    setAbierto(true);
  };
  const cerrar = () => setAbierto(false);

  const poner = (n: Nota, c: Calidad, b: Nota | null) => {
    onSeleccionar(n, c, b && b !== n ? b : null);
    cerrar();
  };

  const raizManual = juntarNota(letra, sost);
  const calidadManual = calidadDeTokens(tokens);
  const bajoManual = conBajo ? juntarNota(bajoLetra, bajoSost) : null;
  const listoManual = raizManual !== null && calidadManual !== null && (!conBajo || bajoManual !== null);

  const grupos = acordesDeTonalidad(tonalidad, !esCover);
  const claseBoton = "rounded-lg px-2.5 py-1.5 text-xs font-bold";
  const actual = (n: Nota, c: Calidad, b: Nota | null) => !etiqueta && n === notaRaiz && c === calidad && (b ?? null) === (notaBajo ?? null);
  const boton = (n: Nota, c: Calidad, b: Nota | null, key: string, titulo?: string) => (
    <button
      key={key}
      type="button"
      title={titulo}
      onClick={() => poner(n, c, b)}
      className={claseBoton}
      style={{ background: colorRaizAcorde(n, c), color: "oklch(0.99 0.006 85)", outline: actual(n, c, b) ? "2px solid oklch(0.25 0.04 262)" : "none", outlineOffset: 1 }}
    >
      {simboloAcorde(n, c, b)}
    </button>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        className={compacto ? "rounded-md px-2 py-0.5 text-[11px] font-bold" : "rounded-lg px-3 py-2 text-sm font-bold"}
        style={etiqueta ? { background: "oklch(0.93 0.010 85)", color: "oklch(0.4 0.044 262)", border: "1px dashed oklch(0.8 0.01 85)" } : { background: colorRaizAcorde(notaRaiz, calidad), color: "oklch(0.99 0.006 85)", minWidth: compacto ? 0 : 76 }}
      >
        {etiqueta ?? simboloAcorde(notaRaiz, calidad, notaBajo)}
      </button>

      {abierto && (
        <div className="absolute z-20 mt-2 w-80 max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl p-2.5" style={{ ...panelStyle, maxHeight: "70vh" }}>
          <Acordeon
            titulo="Acordes de la canción"
            nota={acordesCancion.length ? `${acordesCancion.length}` : undefined}
            abierto={secAbierta === "cancion"}
            onToggle={() => setSecAbierta((v) => (v === "cancion" ? "tono" : "cancion"))}
          >
            {acordesCancion.length === 0 ? (
              <p className="text-xs" style={etiquetaStyle}>Aún no hay acordes en esta canción: usa los de la tonalidad o el manual.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">{acordesCancion.map((a, i) => boton(a.notaRaiz, a.calidad, a.notaBajo, `c${i}`))}</div>
            )}
          </Acordeon>

          <Acordeon
            titulo="Acordes de la tonalidad"
            nota={esCover ? "básicos" : "amplios"}
            abierto={secAbierta === "tono"}
            onToggle={() => setSecAbierta((v) => (v === "tono" ? "cancion" : "tono"))}
          >
            {grupos.map((g) => (
              <div key={g.titulo} className="mb-2 last:mb-0">
                {grupos.length > 1 && <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>{g.titulo}</div>}
                <div className="flex flex-wrap gap-1.5">{g.acordes.map((a, i) => boton(a.raiz, a.calidad, null, `${g.titulo}${i}`, a.romano))}</div>
              </div>
            ))}
          </Acordeon>

          <Acordeon
            titulo="Manual"
            nota="nota + calidad"
            abierto={secAbierta === "manual"}
            onToggle={() => setSecAbierta((v) => (v === "manual" ? "cancion" : "manual"))}
          >
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>Nota</div>
            <SelectorNota letra={letra} sost={sost} onLetra={setLetra} onSost={() => setSost((v) => !v)} />

            <div className="mb-1 mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={etiquetaStyle}>
              Calidad
              <span className="font-normal normal-case">(pulsa en orden: m, luego add9)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS_CALIDAD.map((t) => {
                const puesto = tokens.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!puesto && !tokenPermitido(tokens, t)}
                    onClick={() => setTokens((prev) => (prev.includes(t) ? prev.slice(0, prev.indexOf(t)) : [...prev, t]))}
                    className={`${claseBoton} disabled:opacity-30`}
                    style={puesto ? activoStyle : inactivoStyle}
                  >
                    {t}
                  </button>
                );
              })}
              {tokens.length > 0 && (
                <button type="button" onClick={() => setTokens([])} className={claseBoton} style={{ ...inactivoStyle, border: "1px dashed oklch(0.8 0.01 85)" }}>
                  mayor
                </button>
              )}
            </div>

            <div className="mt-3">
              <button type="button" onClick={() => setConBajo((v) => !v)} className={claseBoton} style={conBajo ? activoStyle : inactivoStyle}>
                Bajo distinto de la raíz
              </button>
              {conBajo && (
                <div className="mt-2">
                  <SelectorNota letra={bajoLetra} sost={bajoSost} onLetra={setBajoLetra} onSost={() => setBajoSost((v) => !v)} />
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!listoManual}
              onClick={() => listoManual && poner(raizManual!, calidadManual!, bajoManual)}
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-30"
              style={raizManual && calidadManual ? { background: colorRaizAcorde(raizManual, calidadManual), color: "oklch(0.99 0.006 85)" } : inactivoStyle}
            >
              {raizManual && calidadManual ? `Poner ${simboloAcorde(raizManual, calidadManual, bajoManual)}` : "Elige una nota"}
            </button>
          </Acordeon>
        </div>
      )}
    </div>
  );
}
