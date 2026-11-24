"use client";

import { useState } from "react";
import { agregarVersionAction, crearConexionAction, crearLetraAction, guardarIdeaAction, guardarLetraAction, guardarRespuestaAction } from "@/app/lirico/actions";
import {
  ESTADOS_IDEA, ESTADOS_LETRA, ETIQUETA_ESTADO_IDEA, ETIQUETA_ESTADO_LECCION, ETIQUETA_ESTADO_LETRA, ETIQUETA_ORIGEN, ETIQUETA_RESULTADO, RESULTADOS,
  type Ejercicio, type Idea, type Leccion, type Letra, type Tecnica,
} from "@/lib/liricoModelo";
import { Boton, CAMPO, Estado, Etiqueta, INK, LINEA, MUTED, useAccion } from "./ui";

const TARJETA = { background: "oklch(0.99 0.005 85)", border: LINEA } as const;

function ColumnaTitulo({ children }: { children: React.ReactNode }) {
  return <div className="border-b pb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED, borderColor: "oklch(0.89 0.008 85)" }}>{children}</div>;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[18px] font-extrabold" style={{ fontFamily: "var(--font-fraunces), sans-serif", color: INK }}>{titulo}</h3>
      {children}
    </section>
  );
}

function Opciones({ valor, onChange, opciones, etiquetas, deshabilitado }: { valor: string; onChange: (v: string) => void; opciones: readonly string[]; etiquetas: Record<string, string>; deshabilitado: boolean }) {
  return (
    <select value={valor} disabled={deshabilitado} onChange={(e) => onChange(e.target.value)} className="rounded-xl px-2 py-1 text-xs" style={CAMPO}>
      {opciones.map((o) => <option key={o} value={o}>{etiquetas[o]}</option>)}
    </select>
  );
}

function IdeaBloque({ bandaId, idea, puedeEscribir }: { bandaId: string; idea: Idea; puedeEscribir: boolean }) {
  const [texto, setTexto] = useState(idea.texto);
  const [estado, setEstado] = useState<string>(idea.estado);
  const { pending, error, guardado, correr } = useAccion();
  return (
    <div className="rounded-2xl p-4" style={TARJETA}>
      <div className="flex flex-wrap items-center gap-3">
        <Etiqueta>Origen: {ETIQUETA_ORIGEN[idea.origen]}{idea.origenRef ? ` · ${idea.origenRef}` : ""}</Etiqueta>
        <Opciones valor={estado} deshabilitado={!puedeEscribir} opciones={ESTADOS_IDEA} etiquetas={ETIQUETA_ESTADO_IDEA} onChange={(v) => { setEstado(v); correr(() => guardarIdeaAction(bandaId, idea.id, { estado: v })); }} />
      </div>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={!puedeEscribir} rows={7} className="mt-2 w-full rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      {puedeEscribir && (
        <div className="mt-2 flex items-center gap-3">
          <Boton pending={pending} onClick={() => correr(() => guardarIdeaAction(bandaId, idea.id, { texto }))}>Guardar idea</Boton>
          <Estado error={error} guardado={guardado} />
        </div>
      )}
    </div>
  );
}

function CampoLetra({ etiqueta, valor, onChange, deshabilitado }: { etiqueta: string; valor: string; onChange: (v: string) => void; deshabilitado: boolean }) {
  return (
    <label className="block">
      <Etiqueta>{etiqueta}</Etiqueta>
      <textarea value={valor} readOnly={deshabilitado} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={CAMPO} />
    </label>
  );
}

function LetraCard({ bandaId, letra, puedeEscribir }: { bandaId: string; letra: Letra; puedeEscribir: boolean }) {
  const [c, setC] = useState({ objetivo: letra.objetivo, premisa: letra.premisa, angulo: letra.angulo, planoLiteral: letra.planoLiteral, planoFigurado: letra.planoFigurado });
  const [estado, setEstado] = useState<string>(letra.estado);
  const [nueva, setNueva] = useState(letra.versiones.length ? letra.versiones[letra.versiones.length - 1].texto : "");
  const [nota, setNota] = useState("");
  const a1 = useAccion();
  const a2 = useAccion();
  const ultima = letra.versiones[letra.versiones.length - 1];
  return (
    <div className="mb-4 rounded-2xl p-4" style={TARJETA}>
      <div className="flex flex-wrap items-center gap-3">
        <b className="text-base" style={{ color: INK }}>{letra.titulo}</b>
        <Opciones valor={estado} deshabilitado={!puedeEscribir} opciones={ESTADOS_LETRA} etiquetas={ETIQUETA_ESTADO_LETRA} onChange={(v) => { setEstado(v); a1.correr(() => guardarLetraAction(bandaId, letra.id, { estado: v })); }} />
      </div>
      <div className="mt-3 grid gap-3">
        <CampoLetra etiqueta="Objetivo de esta letra" valor={c.objetivo} deshabilitado={!puedeEscribir} onChange={(v) => setC({ ...c, objetivo: v })} />
        <div className="grid gap-3 md:grid-cols-2">
          <CampoLetra etiqueta="Premisa (una frase)" valor={c.premisa} deshabilitado={!puedeEscribir} onChange={(v) => setC({ ...c, premisa: v })} />
          <CampoLetra etiqueta="Ángulo (desde dónde se canta)" valor={c.angulo} deshabilitado={!puedeEscribir} onChange={(v) => setC({ ...c, angulo: v })} />
          <CampoLetra etiqueta="Plano literal (de qué habla)" valor={c.planoLiteral} deshabilitado={!puedeEscribir} onChange={(v) => setC({ ...c, planoLiteral: v })} />
          <CampoLetra etiqueta="Plano figurado (qué más puede ser)" valor={c.planoFigurado} deshabilitado={!puedeEscribir} onChange={(v) => setC({ ...c, planoFigurado: v })} />
        </div>
      </div>
      {puedeEscribir && (
        <div className="mt-2 flex items-center gap-3">
          <Boton pending={a1.pending} onClick={() => a1.correr(() => guardarLetraAction(bandaId, letra.id, c))}>Guardar ficha</Boton>
          <Estado error={a1.error} guardado={a1.guardado} />
        </div>
      )}

      <div className="mt-4">
        <Etiqueta>{ultima ? `Versión ${ultima.numero} (${ultima.autor === "cosmo" ? "Cosmo" : "tuya"})` : "Sin versiones todavía"}</Etiqueta>
        {puedeEscribir && (
          <>
            <textarea value={nueva} onChange={(e) => setNueva(e.target.value)} rows={16} placeholder="Escribe la letra aquí; cada guardado crea una versión nueva y las anteriores se conservan" className="mt-1 w-full rounded-xl px-3 py-2 text-sm" style={CAMPO} />
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué cambió o qué probaste (opcional)" maxLength={600} className="mt-2 w-full rounded-xl px-3 py-2 text-sm" style={CAMPO} />
            <div className="mt-2 flex items-center gap-3">
              <Boton pending={a2.pending} onClick={() => a2.correr(() => agregarVersionAction(bandaId, letra.id, nueva, nota), () => setNota(""))}>Guardar como versión nueva</Boton>
              <Estado error={a2.error} guardado={a2.guardado} />
            </div>
          </>
        )}
        {!puedeEscribir && ultima && <pre className="mt-1 whitespace-pre-wrap text-sm" style={{ color: INK }}>{ultima.texto}</pre>}
        {letra.versiones.length > 1 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold" style={{ color: MUTED }}>Historial ({letra.versiones.length} versiones)</summary>
            {[...letra.versiones].reverse().map((v) => (
              <div key={v.id} className="mt-2 rounded-xl p-3" style={{ border: LINEA }}>
                <Etiqueta>Versión {v.numero} · {v.autor === "cosmo" ? "Cosmo" : "tuya"} · {new Date(v.creada).toLocaleDateString("es-MX")}{v.nota ? ` · ${v.nota}` : ""}</Etiqueta>
                <pre className="mt-1 whitespace-pre-wrap text-sm" style={{ color: INK }}>{v.texto}</pre>
              </div>
            ))}
          </details>
        )}
      </div>
    </div>
  );
}

function NuevaLetra({ bandaId, ideaId }: { bandaId: string; ideaId: string }) {
  const [t, setT] = useState("");
  const [o, setO] = useState("");
  const { pending, error, guardado, correr } = useAccion();
  return (
    <form className="mt-2 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); correr(() => crearLetraAction(bandaId, ideaId, t, o), () => { setT(""); setO(""); }); }}>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Título de la letra" maxLength={160} className="rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      <input value={o} onChange={(e) => setO(e.target.value)} placeholder="Su objetivo: qué quieres lograr o aprender con esta letra" maxLength={600} className="rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      <div className="flex items-center gap-3"><Boton type="submit" pending={pending}>+ Nueva letra de esta idea</Boton><Estado error={error} guardado={guardado} /></div>
    </form>
  );
}

function EjercicioFila({ bandaId, e, puedeEscribir }: { bandaId: string; e: Ejercicio; puedeEscribir: boolean }) {
  const [respuesta, setRespuesta] = useState(e.respuesta);
  const [resultado, setResultado] = useState<string>(e.resultado === "pendiente" ? "hecho" : e.resultado);
  const { pending, error, guardado, correr } = useAccion();
  return (
    <div className="mt-3 rounded-xl p-3" style={{ border: LINEA }}>
      <div className="text-sm" style={{ color: INK }}><b>{e.orden}.</b> {e.consigna}</div>
      <textarea value={respuesta} readOnly={!puedeEscribir} onChange={(ev) => setRespuesta(ev.target.value)} rows={5} placeholder="Tu respuesta" className="mt-2 w-full rounded-xl px-3 py-2 text-sm" style={CAMPO} />
      {puedeEscribir && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Opciones valor={resultado} deshabilitado={false} opciones={RESULTADOS.filter((r) => r !== "pendiente")} etiquetas={ETIQUETA_RESULTADO} onChange={setResultado} />
          <Boton pending={pending} onClick={() => correr(() => guardarRespuestaAction(bandaId, e.id, respuesta, resultado))}>Guardar respuesta</Boton>
          <Estado error={error} guardado={guardado} />
          <span className="font-mono text-[10px]" style={{ color: MUTED }}>{ETIQUETA_RESULTADO[e.resultado]}</span>
        </div>
      )}
      {e.correccion && (
        <div className="mt-2 rounded-xl px-3 py-2 text-sm" style={{ background: "oklch(0.95 0.02 85)", color: INK }}>
          <Etiqueta>Corrección de Cosmo</Etiqueta>
          <div className="mt-1 whitespace-pre-line">{e.correccion}</div>
        </div>
      )}
    </div>
  );
}

function LeccionCard({ bandaId, l, tecnica, letraTitulo, puedeEscribir }: { bandaId: string; l: Leccion; tecnica?: Tecnica; letraTitulo?: string; puedeEscribir: boolean }) {
  return (
    <details open={l.estado === "en_curso"} className="mb-3 rounded-2xl p-4" style={TARJETA}>
      <summary className="cursor-pointer">
        <b className="text-base" style={{ color: INK }}>{tecnica?.nombre ?? l.tecnica}</b>
        <span className="ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: l.estado === "dominada" ? "oklch(0.9 0.06 150)" : l.estado === "por_reforzar" ? "oklch(0.92 0.06 60)" : "oklch(0.93 0.010 85)", color: INK }}>{ETIQUETA_ESTADO_LECCION[l.estado]}</span>
        {letraTitulo && <span className="ml-2 font-mono text-[10px]" style={{ color: MUTED }}>sobre «{letraTitulo}»</span>}
      </summary>
      <div className="mt-2 text-sm" style={{ color: INK }}><b>Objetivo:</b> {l.objetivo}</div>
      {l.contenido && <div className="mt-2 whitespace-pre-line text-sm" style={{ color: INK }}>{l.contenido}</div>}
      {l.ejercicios.map((e) => <EjercicioFila key={e.id} bandaId={bandaId} e={e} puedeEscribir={puedeEscribir} />)}
    </details>
  );
}

function Conexiones({ bandaId, idea, otras, puedeEscribir }: { bandaId: string; idea: Idea; otras: { id: string; titulo: string }[]; puedeEscribir: boolean }) {
  const [otra, setOtra] = useState(otras[0]?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const { pending, error, guardado, correr } = useAccion();
  return (
    <div className="rounded-2xl p-4" style={TARJETA}>
      {idea.conexiones.length === 0 && <p className="text-sm" style={{ color: MUTED }}>Sin conexiones todavía.</p>}
      {idea.conexiones.map((c) => (
        <div key={c.id} className="mb-2 text-sm" style={{ color: INK }}><b>{c.otraTitulo}</b>: {c.motivo}</div>
      ))}
      {puedeEscribir && otras.length > 0 && (
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); correr(() => crearConexionAction(bandaId, idea.id, otra, motivo), () => setMotivo("")); }}>
          <select value={otra} onChange={(e) => setOtra(e.target.value)} className="rounded-xl px-2 py-1.5 text-xs" style={CAMPO}>
            {otras.map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
          </select>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por qué se conectan" maxLength={600} className="min-w-[200px] flex-1 rounded-xl px-3 py-1.5 text-sm" style={CAMPO} />
          <Boton type="submit" pending={pending}>Conectar</Boton>
          <Estado error={error} guardado={guardado} />
        </form>
      )}
    </div>
  );
}

export function AulaIdea({ bandaId, idea, otras, tecnicas, puedeEscribir }: { bandaId: string; idea: Idea; otras: { id: string; titulo: string }[]; tecnicas: Tecnica[]; puedeEscribir: boolean }) {
  const tecnicaDe = new Map(tecnicas.map((t) => [t.clave, t]));
  const letraDe = new Map(idea.letras.map((l) => [l.id, l.titulo]));
  const hechos = idea.lecciones.filter((l) => l.estado === "dominada").length;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div>
        <ColumnaTitulo>Trabajo · {idea.titulo}</ColumnaTitulo>
        <Seccion titulo="La idea"><IdeaBloque bandaId={bandaId} idea={idea} puedeEscribir={puedeEscribir} /></Seccion>
        <Seccion titulo={`Letras de esta idea (${idea.letras.length})`}>
          {idea.letras.length === 0 && <p className="text-sm" style={{ color: MUTED }}>Esta idea todavía no tiene letras.</p>}
          {idea.letras.map((l) => <LetraCard key={l.id} bandaId={bandaId} letra={l} puedeEscribir={puedeEscribir} />)}
          {puedeEscribir && <NuevaLetra bandaId={bandaId} ideaId={idea.id} />}
        </Seccion>
      </div>
      <div>
        <ColumnaTitulo>Aula · {idea.lecciones.length} lección{idea.lecciones.length === 1 ? "" : "es"} · {hechos} dominada{hechos === 1 ? "" : "s"}</ColumnaTitulo>
        <Seccion titulo="Lo que Cosmo te enseña sobre esta idea">
          {idea.lecciones.length === 0 && <p className="text-sm" style={{ color: MUTED }}>Todavía no hay lecciones sobre esta idea. Cosmo las abre aquí, con su objetivo y sus ejercicios.</p>}
          {idea.lecciones.map((l) => <LeccionCard key={l.id} bandaId={bandaId} l={l} tecnica={tecnicaDe.get(l.tecnica)} letraTitulo={l.letraId ? letraDe.get(l.letraId) : undefined} puedeEscribir={puedeEscribir} />)}
        </Seccion>
        <Seccion titulo="Conexiones"><Conexiones bandaId={bandaId} idea={idea} otras={otras} puedeEscribir={puedeEscribir} /></Seccion>
      </div>
    </div>
  );
}
