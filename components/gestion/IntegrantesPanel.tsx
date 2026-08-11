"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { BandaSimple, PersonaPendiente, Integrante, Plaza, BandaDeIntegrante, RolInvitable, InvitacionPorBanda } from "@/lib/gestionData";
import type { NombreBloque } from "@/lib/bloques";
import type { DisenoDispositivo, CategoriaCatalogo, DispositivoAsignado } from "@/lib/dispositivosData";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { colorConAlpha } from "@/lib/eventoUI";
import { ToggleChip } from "@/components/ui/ToggleChip";
import {
  invitarPersonaAction,
  ignorarPersonaPendienteAction,
  actualizarDatosPersonaAction,
  removerDeBandaAction,
  asignarABandaAction,
  actualizarRolAction,
  asignarPersonaAPlazaAction,
  quitarPersonaDePlazaAction,
  actualizarBloquesVisiblesAction,
  inactivarPersonaAction,
  eliminarPersonaAction,
  asignarDisenoDispositivoAction,
  marcarConsolaAction,
  quitarDispositivoAction,
} from "@/app/gestion/actions";

// Catálogo de bloques opcionales restringibles por persona (Brief 21 §1) —
// Calendario nunca entra acá porque nunca se restringe.
const BLOQUES: { key: NombreBloque; label: string; activo: (b: BandaSimple) => boolean }[] = [
  { key: "canciones", label: "Canciones", activo: (b) => b.cancionesHabilitado },
  { key: "set_list", label: "Set List", activo: (b) => b.setlistHabilitado },
  { key: "seteos", label: "Seteos", activo: (b) => b.seteosHabilitado },
  { key: "finanzas", label: "Finanzas", activo: (b) => b.finanzasHabilitado },
];

function bloquesActivosDeBanda(banda: BandaSimple): NombreBloque[] {
  return BLOQUES.filter((bl) => bl.activo(banda)).map((bl) => bl.key);
}

function bloqueVisible(banda: BandaDeIntegrante, bloque: NombreBloque): boolean {
  if (!banda.bloquesVisibles) return true;
  return banda.bloquesVisibles.includes(bloque);
}

const inputCls = "rounded-xl border px-3.5 py-2.5 text-sm outline-none";
const inputStyle = { background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" };

// Mismo patrón de par de botones ya usado en otros lados de la app (ej.
// mayor/menor en CancionForm) para una elección excluyente entre 2 opciones.
const ROL_ACTIVO = { background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" };
const ROL_INACTIVO = { background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" };

// Brief "Rediseño visual de Gestión" §2: jerarquía de tonos reusando lo que
// ya existe en la app — BG_SUNKEN es el mismo gris de fondo de página
// (oklch(0.965 0.012 82)) que ya se usa en todos lados, acá sirve para que
// el acordeón y sus sub-secciones se vean "hundidos" respecto a la tarjeta
// blanca de cada integrante, que a su vez lleva una sombra sutil para
// despegarse de ambos.
const BG_SUNKEN = "oklch(0.965 0.012 82)";
const BORDE_SUNKEN = "oklch(0.9 0.012 78)";
const BG_CARD = "oklch(0.99 0.008 82)";
const SOMBRA_CARD = "0 2px 8px -4px rgba(0,0,0,0.18)";

// Sub-acordeón genérico cerrado por defecto (Brief "Rediseño visual de
// Gestión" §4) — mismo patrón visual/interactivo que GrupoIntegrantes pero
// a menor escala, para "Bandas asignadas" dentro de cada integrante
// expandido.
function SubAcordeon({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-lg" style={{ background: BG_SUNKEN, border: `1px solid ${BORDE_SUNKEN}` }}>
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between px-2.5 py-2 text-left">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.5 0.02 55)" }}>
          {titulo}
        </span>
        <span
          className="text-[10px]"
          style={{ color: "oklch(0.5 0.02 55)", transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        >
          ▾
        </span>
      </button>
      {abierto && <div className="flex flex-col gap-2.5 px-2.5 pb-2.5">{children}</div>}
    </div>
  );
}

// Brief "Rediseño de Gestión > Integrantes" §1/§3: mismo acordeón (header
// clickeable en toda la franja, cerrado por defecto, chevron que rota) para
// las 4 secciones de Integrantes (Pendientes/Activos/Invitados/Inactivos) y
// para "Invitar / asignar persona" — un solo patrón reusado, ninguno nuevo.
function AcordeonGrupo({
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
      {abierto && <div className="flex flex-col gap-2 px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ETIQUETA_CATEGORIA: Record<CategoriaCatalogo, string> = { amplificador: "Amplificador(es)", pedal: "Pedal(es)" };

// Amplificador(es)/Pedal(es) (brief "Seteos — catálogo de diseños" §1): lista
// de diseños ya asignados de esa categoría + un dropdown para asignar uno más
// del catálogo (sin alta de diseño nuevo acá, solo elegir de los que ya
// existen). Sin límite de plazas -- a diferencia de instrumento, puede haber
// varios pedales.
function SeccionDispositivos({
  categoria,
  asignados,
  disponibles,
  onAsignar,
  onQuitar,
  pendingAsignar,
  pendingQuitarId,
}: {
  categoria: CategoriaCatalogo;
  asignados: DispositivoAsignado[];
  disponibles: DisenoDispositivo[];
  onAsignar: (disenoId: string) => void;
  onQuitar: (dispositivoId: string) => void;
  pendingAsignar: boolean;
  pendingQuitarId: string | null;
}) {
  return (
    <div className="mt-2">
      <span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
        {ETIQUETA_CATEGORIA[categoria]}
      </span>

      {asignados.length > 0 && (
        <div className="mb-1.5 flex flex-col gap-1.5">
          {asignados.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg py-1.5 pl-2.5 pr-1.5"
              style={{ background: "oklch(0.93 0.016 78)" }}
            >
              <span className="text-xs font-semibold" style={{ color: "oklch(0.4 0.02 55)" }}>
                {d.disenoMarca} {d.disenoModelo}
                {d.apodo && <span style={{ color: "oklch(0.55 0.02 55)" }}> · {d.apodo}</span>}
              </span>
              <button
                type="button"
                onClick={() => onQuitar(d.id)}
                disabled={pendingQuitarId === d.id}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] disabled:opacity-50"
                style={{ background: "oklch(0.85 0.016 78)" }}
                aria-label={`Quitar ${ETIQUETA_CATEGORIA[categoria].toLowerCase()}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {disponibles.length === 0 ? (
        <p className="text-xs italic" style={{ color: "oklch(0.55 0.02 55)" }}>
          Todavía no hay {categoria === "amplificador" ? "amplis" : "pedales"} en el catálogo — pídele a Jorge que lo cargue.
        </p>
      ) : (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAsignar(e.target.value);
          }}
          disabled={pendingAsignar}
          className="w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none disabled:opacity-60"
          style={{ background: "oklch(0.99 0.008 82)", borderColor: "oklch(0.88 0.013 78)", color: "oklch(0.24 0.02 55)" }}
        >
          <option value="">+ Asignar {categoria === "amplificador" ? "amplificador" : "pedal"} del catálogo…</option>
          {disponibles.map((d) => (
            <option key={d.id} value={d.id}>
              {d.marca} {d.modelo}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

const ETIQUETA_ESTADO: Record<Integrante["estado"], string> = { invitado: "Invitado", activo: "Activo", inactivo: "Inactivo" };
const COLOR_ESTADO: Record<Integrante["estado"], string> = {
  invitado: "oklch(0.6 0.1 70)",
  activo: "oklch(0.5 0.13 148)",
  inactivo: "oklch(0.55 0.02 55)",
};

// Íconos circulares de Brief "Rediseño de Gestión > Integrantes" §6 — mismo
// patrón de botón circular + svg inline a mano que ya usa MovimientoFila
// para "eliminar movimiento" (h-6 w-6 rounded-full, stroke currentColor).
function IconoEliminar() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconoOjoTachado() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.24A9.8 9.8 0 0 1 12 4c5 0 9 4 10 8a10.6 10.6 0 0 1-2.16 3.53M6.6 6.6A10.6 10.6 0 0 0 2 12c1 4 5 8 10 8a9.8 9.8 0 0 0 3.4-.6" />
    </svg>
  );
}

function FilaIntegrante({
  integrante,
  bandas,
  plazas,
  ocupacionPlazas,
  disenosAmplificador,
  disenosPedal,
  onEliminado,
}: {
  integrante: Integrante;
  bandas: BandaSimple[];
  plazas: Plaza[];
  ocupacionPlazas: Map<string, { usuarioId: string; nombre: string }>;
  disenosAmplificador: DisenoDispositivo[];
  disenosPedal: DisenoDispositivo[];
  onEliminado: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [nombreMostrar, setNombreMostrar] = useState(integrante.nombreMostrar ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(integrante.fechaNacimiento ?? "");
  const [datosGuardados, setDatosGuardados] = useState({ nombreMostrar: integrante.nombreMostrar ?? "", fechaNacimiento: integrante.fechaNacimiento ?? "" });
  const [pendingDatos, startDatos] = useTransition();
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  const [bandasLocal, setBandasLocal] = useState(integrante.bandas);
  const [pendingBanda, setPendingBanda] = useState<string | null>(null);
  const [pendingRol, setPendingRol] = useState<string | null>(null);
  const [pendingPlaza, setPendingPlaza] = useState<string | null>(null);
  const [errorPlaza, setErrorPlaza] = useState<string | null>(null);
  const [plazaPickerBandaId, setPlazaPickerBandaId] = useState<string | null>(null);
  const [pendingDispositivoBandaId, setPendingDispositivoBandaId] = useState<string | null>(null);
  const [pendingQuitarDispositivoId, setPendingQuitarDispositivoId] = useState<string | null>(null);
  const [pendingConsolaBandaId, setPendingConsolaBandaId] = useState<string | null>(null);
  const [errorDispositivo, setErrorDispositivo] = useState<string | null>(null);
  const [pendingInactivar, setPendingInactivar] = useState(false);
  const [pendingEliminar, setPendingEliminar] = useState(false);
  const [errorPeligro, setErrorPeligro] = useState<string | null>(null);

  const bandaAsignada = (bandaId: string) => bandasLocal.find((b) => b.bandaId === bandaId && b.activo);
  const bandasActivas = bandasLocal.filter((b) => b.activo);
  // Brief "Integrantes — orden de bandas en 'Bandas asignadas'" §9: las
  // bandas donde SÍ está asignado (tarjeta expandida) van arriba, las que no
  // (pill gris) abajo -- sort estable, así dentro de cada grupo se conserva
  // el orden alfabético que ya trae `bandas`.
  const bandasOrdenParaAsignacion = [...bandas].sort((a, b) => Number(!bandaAsignada(a.id)) - Number(!bandaAsignada(b.id)));
  // Brief "Rediseño visual de Gestión" §6: BandaDeIntegrante no trae color
  // propio (solo bandaId/bandaNombre) — se resuelve contra `bandas`, la
  // misma lista completa que ya recibe este componente.
  const colorDeBanda = (bandaId: string) => bandas.find((b) => b.id === bandaId)?.color ?? "oklch(0.6 0.1 250)";

  const hayCambiosDatos = nombreMostrar !== datosGuardados.nombreMostrar || fechaNacimiento !== datosGuardados.fechaNacimiento;

  // Brief 10 §5: nombre para mostrar y fecha de nacimiento comparten un solo
  // botón "Guardar" en vez de dos sueltos sin relación visual entre sí.
  const guardarDatos = () => {
    if (!integrante.usuarioId) return;
    setErrorDatos(null);
    startDatos(async () => {
      try {
        await actualizarDatosPersonaAction(integrante.usuarioId!, nombreMostrar, fechaNacimiento || null);
        setDatosGuardados({ nombreMostrar, fechaNacimiento });
      } catch (e) {
        setErrorDatos(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  };

  const toggleBanda = (bandaId: string) => {
    if (!integrante.usuarioId) return;
    const asignada = !!bandaAsignada(bandaId);
    setPendingBanda(bandaId);
    const accion = asignada ? removerDeBandaAction(integrante.usuarioId, bandaId) : asignarABandaAction(integrante.usuarioId, bandaId);
    accion
      .then(() => {
        setBandasLocal((prev) => {
          if (prev.some((b) => b.bandaId === bandaId)) {
            return prev.map((b) => (b.bandaId === bandaId ? { ...b, activo: !asignada } : b));
          }
          const info = bandas.find((b) => b.id === bandaId);
          return [
            ...prev,
            { bandaId, bandaNombre: info?.nombre ?? "Banda", activo: true, rol: "miembro", plazas: [], bloquesVisibles: null, dispositivos: [] },
          ];
        });
      })
      .finally(() => setPendingBanda(null));
  };

  // Brief "3 pendientes" §2: cambiar el rol de una banda ya asignada. Nunca
  // se llama para una fila en superadmin (el botón ni se muestra ahí, ver
  // más abajo) — actualizarRolAction además lo rechaza en el servidor si de
  // alguna forma se intentara.
  const cambiarRol = (bandaId: string, rol: RolInvitable) => {
    if (!integrante.usuarioId) return;
    setPendingRol(bandaId);
    actualizarRolAction(integrante.usuarioId, bandaId, rol)
      .then(() => {
        setBandasLocal((prev) => prev.map((b) => (b.bandaId === bandaId ? { ...b, rol } : b)));
      })
      .finally(() => setPendingRol(null));
  };

  // Brief 21 §1: al tildar/destildar un bloque, si el resultado cubre TODOS
  // los bloques activos de esa banda se persiste null (sin restricción) en
  // vez del array completo — así, si la banda activa un bloque nuevo más
  // adelante, esta persona lo ve automáticamente en vez de quedar excluida
  // por un array que quedó desactualizado.
  const togglePermisoBloque = (bandaId: string, bloque: NombreBloque, bloquesActivos: NombreBloque[]) => {
    if (!integrante.usuarioId) return;
    const banda = bandasLocal.find((b) => b.bandaId === bandaId);
    if (!banda) return;
    const tildados = new Set(bloquesActivos.filter((bl) => bloqueVisible(banda, bl)));
    if (tildados.has(bloque)) tildados.delete(bloque);
    else tildados.add(bloque);
    const nuevoValor = tildados.size === bloquesActivos.length ? null : bloquesActivos.filter((bl) => tildados.has(bl));

    actualizarBloquesVisiblesAction(integrante.usuarioId, bandaId, nuevoValor).then(() => {
      setBandasLocal((prev) => prev.map((b) => (b.bandaId === bandaId ? { ...b, bloquesVisibles: nuevoValor } : b)));
    });
  };

  // Brief "Rediseño de Gestión > Integrantes" §4: a diferencia del resto de
  // los toggles de este componente, éste sí necesita feedback de error
  // visible — es el único camino donde el usuario puede chocar con una plaza
  // recién tomada por otra persona (mismo 23505 que ya traducía
  // asignarPersonaAPlaza server-side, acá solo se muestra).
  const togglePlaza = (bandaId: string, plazaId: string) => {
    if (!integrante.usuarioId) return;
    const banda = bandasLocal.find((b) => b.bandaId === bandaId);
    const tiene = banda?.plazas.some((p) => p.plazaId === plazaId);
    setErrorPlaza(null);
    setPendingPlaza(plazaId);
    const accion = tiene
      ? quitarPersonaDePlazaAction(integrante.usuarioId, plazaId)
      : asignarPersonaAPlazaAction(integrante.usuarioId, plazaId);
    accion
      .then(() => {
        setBandasLocal((prev) =>
          prev.map((b) => {
            if (b.bandaId !== bandaId) return b;
            if (tiene) return { ...b, plazas: b.plazas.filter((p) => p.plazaId !== plazaId) };
            const info = plazas.find((p) => p.id === plazaId);
            return { ...b, plazas: [...b.plazas, { plazaId, instrumento: info?.instrumento ?? "otro", etiqueta: info?.etiqueta ?? null }] };
          })
        );
        setPlazaPickerBandaId(null);
      })
      .catch((e) => setErrorPlaza(e instanceof Error ? e.message : "No se pudo actualizar el instrumento."))
      .finally(() => setPendingPlaza(null));
  };

  // Brief "Seteos — catálogo de diseños" §1: asignar un diseño existente del
  // catálogo (amplificador/pedal) a esta persona en esta banda.
  const asignarDiseno = (bandaId: string, categoria: CategoriaCatalogo, disenoId: string) => {
    if (!integrante.usuarioId) return;
    setErrorDispositivo(null);
    setPendingDispositivoBandaId(bandaId);
    asignarDisenoDispositivoAction(integrante.usuarioId, bandaId, categoria, disenoId)
      .then((dispositivo) => {
        setBandasLocal((prev) => prev.map((b) => (b.bandaId === bandaId ? { ...b, dispositivos: [...b.dispositivos, dispositivo] } : b)));
      })
      .catch((e) => setErrorDispositivo(e instanceof Error ? e.message : "No se pudo asignar."))
      .finally(() => setPendingDispositivoBandaId(null));
  };

  const quitarDispositivo = (bandaId: string, dispositivoId: string) => {
    setErrorDispositivo(null);
    setPendingQuitarDispositivoId(dispositivoId);
    quitarDispositivoAction(dispositivoId)
      .then(() => {
        setBandasLocal((prev) =>
          prev.map((b) => (b.bandaId === bandaId ? { ...b, dispositivos: b.dispositivos.filter((d) => d.id !== dispositivoId) } : b))
        );
      })
      .catch((e) => setErrorDispositivo(e instanceof Error ? e.message : "No se pudo quitar."))
      .finally(() => setPendingQuitarDispositivoId(null));
  };

  // Consola es un marcador único por banda (brief §1 punto "Consola") — tildar
  // crea la fila categoria=consola, destildar la borra (mismo camino que
  // quitarDispositivo, vía el id de esa fila).
  const toggleConsola = (bandaId: string, consolaActual: DispositivoAsignado | undefined) => {
    if (!integrante.usuarioId) return;
    setErrorDispositivo(null);
    if (consolaActual) {
      quitarDispositivo(bandaId, consolaActual.id);
      return;
    }
    setPendingConsolaBandaId(bandaId);
    marcarConsolaAction(integrante.usuarioId, bandaId)
      .then((dispositivo) => {
        setBandasLocal((prev) => prev.map((b) => (b.bandaId === bandaId ? { ...b, dispositivos: [...b.dispositivos, dispositivo] } : b)));
      })
      .catch((e) => setErrorDispositivo(e instanceof Error ? e.message : "No se pudo marcar."))
      .finally(() => setPendingConsolaBandaId(null));
  };

  // Brief "Eliminar integrante" / "Inactivar": Inactivar reusa el mismo
  // mecanismo que ya existía por banda (removerDeBanda), solo que para
  // TODAS las bandas activas de una vez, en un solo botón explícito (antes
  // había que destildar cada banda una por una en "Bandas asignadas").
  // Eliminar es distinto: borrado real e irreversible, con el mismo patrón
  // de confirm() nativo que ya usan LugaresPanel/MovimientoFila/EventoDetalle
  // para acciones destructivas en esta app.
  const inactivar = () => {
    if (!integrante.usuarioId) return;
    setErrorPeligro(null);
    setPendingInactivar(true);
    inactivarPersonaAction(integrante.usuarioId)
      .then(() => setBandasLocal((prev) => prev.map((b) => ({ ...b, activo: false }))))
      .catch((e) => setErrorPeligro(e instanceof Error ? e.message : "No se pudo inactivar."))
      .finally(() => setPendingInactivar(false));
  };

  const eliminar = () => {
    if (!integrante.usuarioId) return;
    const nombre = integrante.nombreMostrar || integrante.email;
    if (!confirm(`¿Eliminar por completo la cuenta de ${nombre}? Se borra su cuenta, datos personales y membresías. Esta acción no se puede deshacer.`))
      return;
    setErrorPeligro(null);
    setPendingEliminar(true);
    eliminarPersonaAction(integrante.usuarioId)
      .then(() => onEliminado())
      .catch((e) => setErrorPeligro(e instanceof Error ? e.message : "No se pudo eliminar."))
      .finally(() => setPendingEliminar(false));
  };

  return (
    <div className="rounded-2xl p-3.5" style={{ background: BG_CARD, border: "1px solid oklch(0.89 0.013 78)", boxShadow: SOMBRA_CARD }}>
      <div className="flex w-full items-center justify-between gap-3">
        <button type="button" onClick={() => setExpandido((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
              {integrante.nombreMostrar || integrante.email}
            </div>
            {integrante.esSuperadmin && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase" style={{ background: "oklch(0.64 0.15 34 / 0.15)", color: "oklch(0.64 0.15 34)" }}>
                Superadmin
              </span>
            )}
          </div>
          <div className="truncate font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
            {integrante.email}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {bandasActivas.length > 0 ? (
              bandasActivas.map((b) => {
                const color = colorDeBanda(b.bandaId);
                return (
                  <span
                    key={b.bandaId}
                    className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                    style={{ background: colorConAlpha(color, 0.15), color }}
                  >
                    {b.bandaNombre}
                  </span>
                );
              })
            ) : (
              <span className="font-mono text-[9px] font-bold uppercase" style={{ color: "oklch(0.6 0.02 55)" }}>
                Sin banda asignada
              </span>
            )}
          </div>
        </button>

        {/* Brief "Rediseño de Gestión > Integrantes" §6: Inactivar/Eliminar
            pasan de botones de texto al fondo de la tarjeta expandida a
            íconos circulares acá arriba, a la altura del badge de estado —
            visibles con la tarjeta colapsada o no. Misma lógica de negocio
            de siempre (mismos handlers, mismo gate de bandasActivas.length
            para Inactivar, mismo confirm() para Eliminar), solo cambia
            dónde y cómo se disparan. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
            style={{ background: BG_SUNKEN, color: COLOR_ESTADO[integrante.estado] }}
          >
            {ETIQUETA_ESTADO[integrante.estado]}
          </span>
          {integrante.usuarioId && bandasActivas.length > 0 && (
            <button
              type="button"
              onClick={inactivar}
              disabled={pendingInactivar}
              aria-label="Inactivar"
              title="Oculta al integrante sin borrar su historial"
              className="flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
            >
              <IconoOjoTachado />
            </button>
          )}
          {integrante.usuarioId && (
            <button
              type="button"
              onClick={eliminar}
              disabled={pendingEliminar}
              aria-label="Eliminar cuenta"
              title="Eliminar cuenta (borrado permanente)"
              className="flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: "oklch(0.6 0.15 25 / 0.12)", color: "oklch(0.5 0.18 25)" }}
            >
              <IconoEliminar />
            </button>
          )}
        </div>
      </div>
      {errorPeligro && (
        <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
          {errorPeligro}
        </p>
      )}

      {expandido && integrante.usuarioId && (
        <div className="mt-3 flex flex-col gap-2.5 border-t pt-3" style={{ borderColor: "oklch(0.9 0.012 78)" }}>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Nombre para mostrar
            </label>
            <input
              value={nombreMostrar}
              onChange={(e) => setNombreMostrar(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={inputStyle}
            />

            <label className="mb-1 mt-2.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              style={inputStyle}
            />

            {hayCambiosDatos && (
              <button
                type="button"
                onClick={guardarDatos}
                disabled={pendingDatos}
                className="mt-2.5 w-full rounded-lg py-2 text-sm font-bold disabled:opacity-60"
                style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
              >
                {pendingDatos ? "Guardando…" : "Guardar"}
              </button>
            )}
            {errorDatos && (
              <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
                {errorDatos}
              </p>
            )}
          </div>

          {/* Brief "Rediseño de Gestión > Integrantes" §5: tarjeta unificada
              por banda -- nombre, rol, plazas y bloques visibles juntos, en
              vez de dos acordeones separados (Bandas asignadas / Bloques
              visibles) que no se leían como relacionados. */}
          <SubAcordeon titulo="Bandas asignadas">
            {bandasOrdenParaAsignacion.map((b) => {
              const asignada = bandaAsignada(b.id);
              const plazasDeLaBanda = plazas.filter((p) => p.bandaId === b.id);
              const bloquesActivosBanda = bloquesActivosDeBanda(b);
              const plazasParaAgregar = plazasDeLaBanda.filter((p) => !asignada?.plazas.some((ap) => ap.plazaId === p.id));

              if (!asignada) {
                return (
                  <ToggleChip
                    key={b.id}
                    label={b.nombre}
                    active={false}
                    onClick={() => toggleBanda(b.id)}
                    color={b.color}
                    disabled={pendingBanda === b.id}
                  />
                );
              }

              return (
                <div key={b.id} className="rounded-xl p-3" style={{ background: BG_CARD, border: `1px solid ${colorConAlpha(b.color, 0.4)}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={{ color: b.color }}>
                      {b.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBanda(b.id)}
                      disabled={pendingBanda === b.id}
                      className="shrink-0 font-mono text-[10px] font-bold uppercase disabled:opacity-50"
                      style={{ color: "oklch(0.55 0.02 55)" }}
                    >
                      Quitar
                    </button>
                  </div>

                  {/* 2. Rol */}
                  {asignada.rol === "superadmin" ? (
                    <span className="mt-1.5 block text-xs italic" style={{ color: "oklch(0.55 0.02 55)" }}>
                      Superadmin en esta banda — no editable acá
                    </span>
                  ) : (
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => cambiarRol(b.id, "miembro")}
                        disabled={pendingRol === b.id}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-50"
                        style={asignada.rol === "miembro" ? ROL_ACTIVO : ROL_INACTIVO}
                      >
                        Miembro
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarRol(b.id, "administrador")}
                        disabled={pendingRol === b.id}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-50"
                        style={asignada.rol === "administrador" ? ROL_ACTIVO : ROL_INACTIVO}
                      >
                        Administrador
                      </button>
                    </div>
                  )}

                  {/* 3. Plaza(s)/instrumento(s) -- Brief §4: ocupadas por otra
                      persona quedan deshabilitadas mostrando quién la tiene,
                      "+ Agregar otra plaza" habilita asignar más de una (ej.
                      batería + coro). */}
                  {plazasDeLaBanda.length === 0 ? (
                    <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                      Esta banda todavía no tiene instrumentos definidos.
                    </p>
                  ) : (
                    <div className="mt-2">
                      <span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                        Instrumentos
                      </span>
                      {asignada.plazas.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1.5">
                          {asignada.plazas.map((p) => (
                            <span
                              key={p.plazaId}
                              className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold"
                              style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
                            >
                              {etiquetaPlaza(p.instrumento, p.etiqueta)}
                              <button
                                type="button"
                                onClick={() => togglePlaza(b.id, p.plazaId)}
                                disabled={pendingPlaza === p.plazaId}
                                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] disabled:opacity-50"
                                style={{ background: "oklch(0.85 0.016 78)" }}
                                aria-label="Quitar instrumento"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {plazaPickerBandaId === b.id ? (
                        <div className="rounded-lg p-2" style={{ background: BG_SUNKEN, border: `1px solid ${BORDE_SUNKEN}` }}>
                          {plazasParaAgregar.length === 0 ? (
                            <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                              No hay más instrumentos disponibles en esta banda.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {plazasParaAgregar.map((p) => {
                                const ocupante = ocupacionPlazas.get(p.id);
                                const ocupadaPorOtro = ocupante && ocupante.usuarioId !== integrante.usuarioId;
                                return ocupadaPorOtro ? (
                                  <span
                                    key={p.id}
                                    className="rounded-[20px] px-2.5 py-[5px] text-xs font-semibold"
                                    style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.6 0.02 55)" }}
                                  >
                                    {etiquetaPlaza(p.instrumento, p.etiqueta)} — ocupada por {ocupante.nombre}
                                  </span>
                                ) : (
                                  <ToggleChip
                                    key={p.id}
                                    label={etiquetaPlaza(p.instrumento, p.etiqueta)}
                                    active={false}
                                    disabled={pendingPlaza === p.id}
                                    onClick={() => togglePlaza(b.id, p.id)}
                                  />
                                );
                              })}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setPlazaPickerBandaId(null)}
                            className="mt-1.5 text-xs font-semibold"
                            style={{ color: "oklch(0.55 0.02 55)" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPlazaPickerBandaId(b.id)}
                          className="rounded-lg border border-dashed px-2.5 py-1 text-xs font-semibold"
                          style={{ borderColor: "oklch(0.8 0.02 60)", color: "oklch(0.5 0.02 55)" }}
                        >
                          + Agregar otra plaza
                        </button>
                      )}
                      {errorPlaza && (
                        <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
                          {errorPlaza}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Brief "Seteos — catálogo de diseños" §1: Amplificador(es)/
                      Pedal(es) asignados a esta persona en esta banda, más el
                      marcador de Consola. Reemplaza el rol que tenía "Mis
                      dispositivos" en Seteos como lugar de alta. */}
                  <SeccionDispositivos
                    categoria="amplificador"
                    asignados={asignada.dispositivos.filter((d) => d.categoria === "amplificador")}
                    disponibles={disenosAmplificador}
                    onAsignar={(disenoId) => asignarDiseno(b.id, "amplificador", disenoId)}
                    onQuitar={(dispositivoId) => quitarDispositivo(b.id, dispositivoId)}
                    pendingAsignar={pendingDispositivoBandaId === b.id}
                    pendingQuitarId={pendingQuitarDispositivoId}
                  />
                  <SeccionDispositivos
                    categoria="pedal"
                    asignados={asignada.dispositivos.filter((d) => d.categoria === "pedal")}
                    disponibles={disenosPedal}
                    onAsignar={(disenoId) => asignarDiseno(b.id, "pedal", disenoId)}
                    onQuitar={(dispositivoId) => quitarDispositivo(b.id, dispositivoId)}
                    pendingAsignar={pendingDispositivoBandaId === b.id}
                    pendingQuitarId={pendingQuitarDispositivoId}
                  />
                  {(() => {
                    const consola = asignada.dispositivos.find((d) => d.categoria === "consola");
                    return (
                      <div className="mt-2">
                        <span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                          Consola
                        </span>
                        <ToggleChip
                          label="Va directo a consola"
                          active={!!consola}
                          disabled={pendingConsolaBandaId === b.id || pendingQuitarDispositivoId === consola?.id}
                          onClick={() => toggleConsola(b.id, consola)}
                        />
                      </div>
                    );
                  })()}
                  {errorDispositivo && (
                    <p className="mt-1.5 text-xs" style={{ color: "oklch(0.55 0.15 25)" }}>
                      {errorDispositivo}
                    </p>
                  )}

                  {/* 4. Bloques visibles */}
                  {bloquesActivosBanda.length > 0 && (
                    <div className="mt-2">
                      <span className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                        Bloques visibles
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {bloquesActivosBanda.map((bl) => {
                          const label = BLOQUES.find((x) => x.key === bl)!.label;
                          return (
                            <ToggleChip
                              key={bl}
                              label={label}
                              active={bloqueVisible(asignada, bl)}
                              onClick={() => togglePermisoBloque(b.id, bl, bloquesActivosBanda)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </SubAcordeon>
        </div>
      )}
    </div>
  );
}

function FilaPendiente({
  persona,
  onAsignar,
  onIgnorar,
  pendingIgnorar,
}: {
  persona: PersonaPendiente;
  onAsignar: (p: PersonaPendiente) => void;
  onIgnorar: (usuarioId: string) => void;
  pendingIgnorar: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl p-3"
      style={{ background: BG_CARD, border: "1px solid oklch(0.89 0.013 78)" }}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          {persona.email}
        </div>
        <div className="mt-0.5 font-mono text-xs" style={{ color: "oklch(0.5 0.02 55)" }}>
          Primer acceso: {formatearFecha(persona.primerAcceso)}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => onAsignar(persona)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-bold"
          style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
        >
          Asignar
        </button>
        <button
          type="button"
          onClick={() => onIgnorar(persona.usuarioId)}
          disabled={pendingIgnorar}
          className="rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60"
          style={{ background: "oklch(0.93 0.016 78)", color: "oklch(0.4 0.02 55)" }}
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

// Configuración por banda del formulario de invitar -- Brief "Rediseño de
// Gestión > Integrantes" §2: rol/plaza/bloques se eligen por banda desde el
// arranque, ya no después de aceptar. `bloques` guarda los tildados; si al
// enviar cubre TODOS los activos de esa banda se traduce a null (mismo
// criterio que togglePermisoBloque, sin restricción).
type ConfigBandaInvitar = { rol: RolInvitable; plazaId: string | null; bloques: Set<NombreBloque> };

export function IntegrantesPanel({
  bandas,
  personasPendientes: personasPendientesIniciales,
  integrantes: integrantesIniciales,
  plazas,
  plazasReservadas,
  disenosAmplificador,
  disenosPedal,
}: {
  bandas: BandaSimple[];
  personasPendientes: PersonaPendiente[];
  integrantes: Integrante[];
  plazas: Plaza[];
  plazasReservadas: string[];
  disenosAmplificador: DisenoDispositivo[];
  disenosPedal: DisenoDispositivo[];
}) {
  const [personasPendientes, setPersonasPendientes] = useState(personasPendientesIniciales);
  // Brief "Eliminar integrante": mismo patrón que LugaresPanel — el borrado
  // pasa por un server action + revalidatePath, pero la fila desaparece de
  // esta lista al toque via callback, sin depender del próximo refresh.
  const [integrantes, setIntegrantes] = useState(integrantesIniciales);

  const [invitarAbierto, setInvitarAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [nombreMostrarInvitar, setNombreMostrarInvitar] = useState("");
  const [bandaIdsInvitar, setBandaIdsInvitar] = useState<Set<string>>(new Set());
  const [configPorBanda, setConfigPorBanda] = useState<Map<string, ConfigBandaInvitar>>(new Map());
  const [avisoInvitar, setAvisoInvitar] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendingInvitar, startInvitarTransition] = useTransition();
  const [pendingIgnorar, setPendingIgnorar] = useState<string | null>(null);

  const formInvitarRef = useRef<HTMLDivElement>(null);

  // Brief §4/§2: quién ocupa cada plaza HOY (persona_plazas, vía las plazas
  // que ya trae cada integrante) -- una sola fuente para "deshabilitar plaza
  // ocupada" en la ficha de un integrante y para "plazas disponibles" en el
  // formulario de invitar. Recalculado desde `integrantes`, que sí vive en
  // estado de este componente (a diferencia de las mutaciones de plaza
  // dentro de cada FilaIntegrante, que quedan en su estado local -- ver nota
  // de la reserva no transaccional en malgestoAccess.ts: el índice único de
  // la base es la garantía real, esto es solo la ayuda visual).
  const ocupacionPlazas = useMemo(() => {
    const mapa = new Map<string, { usuarioId: string; nombre: string }>();
    for (const i of integrantes) {
      if (!i.usuarioId) continue;
      for (const b of i.bandas) {
        for (const p of b.plazas) {
          mapa.set(p.plazaId, { usuarioId: i.usuarioId, nombre: i.nombreMostrar || i.email });
        }
      }
    }
    return mapa;
  }, [integrantes]);

  const plazasReservadasSet = useMemo(() => new Set(plazasReservadas), [plazasReservadas]);

  const plazasDisponibles = (bandaId: string): Plaza[] =>
    plazas.filter((p) => p.bandaId === bandaId && !ocupacionPlazas.has(p.id) && !plazasReservadasSet.has(p.id));

  const toggleBandaInvitar = (bandaId: string) => {
    setBandaIdsInvitar((prev) => {
      const next = new Set(prev);
      if (next.has(bandaId)) {
        next.delete(bandaId);
        setConfigPorBanda((prevConfig) => {
          const siguiente = new Map(prevConfig);
          siguiente.delete(bandaId);
          return siguiente;
        });
      } else {
        next.add(bandaId);
        const banda = bandas.find((b) => b.id === bandaId);
        setConfigPorBanda((prevConfig) => {
          const siguiente = new Map(prevConfig);
          siguiente.set(bandaId, { rol: "miembro", plazaId: null, bloques: new Set(banda ? bloquesActivosDeBanda(banda) : []) });
          return siguiente;
        });
      }
      return next;
    });
  };

  const actualizarConfigBanda = (bandaId: string, cambios: Partial<ConfigBandaInvitar>) => {
    setConfigPorBanda((prev) => {
      const actual = prev.get(bandaId);
      if (!actual) return prev;
      const siguiente = new Map(prev);
      siguiente.set(bandaId, { ...actual, ...cambios });
      return siguiente;
    });
  };

  const toggleBloqueInvitar = (bandaId: string, bloque: NombreBloque) => {
    const actual = configPorBanda.get(bandaId);
    if (!actual) return;
    const bloquesNuevos = new Set(actual.bloques);
    if (bloquesNuevos.has(bloque)) bloquesNuevos.delete(bloque);
    else bloquesNuevos.add(bloque);
    actualizarConfigBanda(bandaId, { bloques: bloquesNuevos });
  };

  const asignarDesdePendiente = (persona: PersonaPendiente) => {
    setEmail(persona.email);
    setAvisoInvitar(null);
    setInvitarAbierto(true);
    formInvitarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const ignorarPendiente = (usuarioId: string) => {
    setPendingIgnorar(usuarioId);
    ignorarPersonaPendienteAction(usuarioId)
      .then(() => setPersonasPendientes((prev) => prev.filter((p) => p.usuarioId !== usuarioId)))
      .catch(() => setAvisoInvitar({ tipo: "error", texto: "No se pudo ignorar a esa persona." }))
      .finally(() => setPendingIgnorar(null));
  };

  const invitar = () => {
    setAvisoInvitar(null);
    if (!email.trim() || bandaIdsInvitar.size === 0) {
      setAvisoInvitar({ tipo: "error", texto: "Completá correo y al menos una banda." });
      return;
    }
    const invitaciones: InvitacionPorBanda[] = Array.from(bandaIdsInvitar).map((bandaId) => {
      const cfg = configPorBanda.get(bandaId)!;
      const banda = bandas.find((b) => b.id === bandaId)!;
      const activos = bloquesActivosDeBanda(banda);
      const bloquesVisibles = activos.every((bl) => cfg.bloques.has(bl)) ? null : activos.filter((bl) => cfg.bloques.has(bl));
      return { bandaId, rol: cfg.rol, plazaId: cfg.plazaId, bloquesVisibles };
    });

    startInvitarTransition(async () => {
      try {
        const resultado = await invitarPersonaAction(email.trim(), nombreMostrarInvitar.trim() || null, invitaciones);
        if (!resultado.ok) {
          setAvisoInvitar({ tipo: "error", texto: resultado.motivo });
          return;
        }
        setAvisoInvitar({ tipo: "ok", texto: `Invitación enviada a ${email.trim()}.` });
        const emailInvitado = email.trim().toLowerCase();
        setPersonasPendientes((prev) => prev.filter((p) => p.email.toLowerCase() !== emailInvitado));
        setEmail("");
        setNombreMostrarInvitar("");
        setBandaIdsInvitar(new Set());
        setConfigPorBanda(new Map());
      } catch (e) {
        setAvisoInvitar({ tipo: "error", texto: e instanceof Error ? e.message : "No se pudo invitar." });
      }
    });
  };

  // Brief §3: Pendientes se muda adentro de "Integrantes", al mismo nivel
  // que Activos/Invitados/Inactivos -- los 4 comparten el mismo acordeón
  // (AcordeonGrupo) y la misma regla de "conteo 0 no se muestra".
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const toggleGrupo = (titulo: string) => setGruposAbiertos((prev) => ({ ...prev, [titulo]: !prev[titulo] }));

  const grupos = [
    {
      titulo: "Pendientes",
      count: personasPendientes.length,
      contenido: (
        <>
          {personasPendientes.map((p) => (
            <FilaPendiente
              key={p.usuarioId}
              persona={p}
              onAsignar={asignarDesdePendiente}
              onIgnorar={ignorarPendiente}
              pendingIgnorar={pendingIgnorar === p.usuarioId}
            />
          ))}
        </>
      ),
    },
    {
      titulo: "Activos",
      count: integrantes.filter((i) => i.estado === "activo").length,
      contenido: integrantes
        .filter((i) => i.estado === "activo")
        .map((i) => (
          <FilaIntegrante
            key={i.usuarioId ?? i.email}
            integrante={i}
            bandas={bandas}
            plazas={plazas}
            ocupacionPlazas={ocupacionPlazas}
            disenosAmplificador={disenosAmplificador}
            disenosPedal={disenosPedal}
            onEliminado={() => i.usuarioId && setIntegrantes((prev) => prev.filter((x) => x.usuarioId !== i.usuarioId))}
          />
        )),
    },
    {
      titulo: "Invitados",
      count: integrantes.filter((i) => i.estado === "invitado").length,
      contenido: integrantes
        .filter((i) => i.estado === "invitado")
        .map((i) => (
          <FilaIntegrante
            key={i.usuarioId ?? i.email}
            integrante={i}
            bandas={bandas}
            plazas={plazas}
            ocupacionPlazas={ocupacionPlazas}
            disenosAmplificador={disenosAmplificador}
            disenosPedal={disenosPedal}
            onEliminado={() => i.usuarioId && setIntegrantes((prev) => prev.filter((x) => x.usuarioId !== i.usuarioId))}
          />
        )),
    },
    {
      titulo: "Inactivos",
      count: integrantes.filter((i) => i.estado === "inactivo").length,
      contenido: integrantes
        .filter((i) => i.estado === "inactivo")
        .map((i) => (
          <FilaIntegrante
            key={i.usuarioId ?? i.email}
            integrante={i}
            bandas={bandas}
            plazas={plazas}
            ocupacionPlazas={ocupacionPlazas}
            disenosAmplificador={disenosAmplificador}
            disenosPedal={disenosPedal}
            onEliminado={() => i.usuarioId && setIntegrantes((prev) => prev.filter((x) => x.usuarioId !== i.usuarioId))}
          />
        )),
    },
  ].filter((g) => g.count > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Brief "Rediseño de Gestión > Integrantes" §1: acordeón colapsado por
          defecto, mismo patrón que el resto de la pantalla. */}
      <section ref={formInvitarRef} className="rounded-2xl" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <button
          type="button"
          onClick={() => setInvitarAbierto((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <h3 className="text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
            Invitar / asignar persona
          </h3>
          <span
            className="text-xs"
            style={{ color: "oklch(0.5 0.02 55)", transform: invitarAbierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          >
            ▾
          </span>
        </button>

        {invitarAbierto && (
          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                  Correo
                </label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@gmail.com" className={`${inputCls} w-full`} style={inputStyle} />
              </div>

              <div>
                {/* Brief §2: opcional, se propone como nombre_mostrar recién
                    si la persona todavía no tiene uno guardado al aceptar. */}
                <label className="mb-1.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                  Nombre a mostrar (opcional)
                </label>
                <input
                  value={nombreMostrarInvitar}
                  onChange={(e) => setNombreMostrarInvitar(e.target.value)}
                  placeholder="Ej. Alf"
                  className={`${inputCls} w-full`}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                  Bandas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {bandas.map((b) => (
                    <ToggleChip key={b.id} label={b.nombre} active={bandaIdsInvitar.has(b.id)} onClick={() => toggleBandaInvitar(b.id)} color={b.color} />
                  ))}
                </div>
              </div>

              {/* Brief §2: una sub-tarjeta por banda seleccionada, con rol +
                  plaza + bloques propios de esa banda. */}
              {Array.from(bandaIdsInvitar).map((bandaId) => {
                const banda = bandas.find((b) => b.id === bandaId);
                const cfg = configPorBanda.get(bandaId);
                if (!banda || !cfg) return null;
                const disponibles = plazasDisponibles(bandaId);
                const activos = bloquesActivosDeBanda(banda);

                return (
                  <div key={bandaId} className="rounded-xl p-3" style={{ background: BG_SUNKEN, border: `1px solid ${BORDE_SUNKEN}` }}>
                    <span className="text-xs font-bold" style={{ color: banda.color }}>
                      {banda.nombre}
                    </span>

                    <div className="mt-2">
                      <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                        Rol en esta banda
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => actualizarConfigBanda(bandaId, { rol: "miembro" })}
                          className="rounded-lg px-3 py-1.5 text-sm font-bold"
                          style={cfg.rol === "miembro" ? ROL_ACTIVO : ROL_INACTIVO}
                        >
                          Miembro
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarConfigBanda(bandaId, { rol: "administrador" })}
                          className="rounded-lg px-3 py-1.5 text-sm font-bold"
                          style={cfg.rol === "administrador" ? ROL_ACTIVO : ROL_INACTIVO}
                        >
                          Administrador
                        </button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                        Plaza / instrumento
                      </label>
                      {disponibles.length === 0 ? (
                        <p className="text-xs" style={{ color: "oklch(0.55 0.02 55)" }}>
                          No hay plazas disponibles en esta banda.
                        </p>
                      ) : (
                        <select
                          className={`${inputCls} w-full`}
                          style={inputStyle}
                          value={cfg.plazaId ?? ""}
                          onChange={(e) => actualizarConfigBanda(bandaId, { plazaId: e.target.value || null })}
                        >
                          <option value="">Sin instrumento asignado por ahora</option>
                          {disponibles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {etiquetaPlaza(p.instrumento, p.etiqueta)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {activos.length > 0 && (
                      <div className="mt-2">
                        <label className="mb-1 block font-mono text-[10px] uppercase" style={{ color: "oklch(0.55 0.02 55)" }}>
                          Bloques visibles
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {activos.map((bl) => {
                            const label = BLOQUES.find((x) => x.key === bl)!.label;
                            return (
                              <ToggleChip key={bl} label={label} active={cfg.bloques.has(bl)} onClick={() => toggleBloqueInvitar(bandaId, bl)} />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={invitar}
                disabled={pendingInvitar}
                className="rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
                style={{ background: "oklch(0.64 0.15 34)", color: "oklch(0.99 0.01 82)" }}
              >
                {pendingInvitar ? "Invitando..." : "Invitar"}
              </button>
            </div>
            {avisoInvitar && (
              <p className="mt-2 text-xs" style={{ color: avisoInvitar.tipo === "ok" ? "oklch(0.5 0.13 148)" : "oklch(0.55 0.15 25)" }}>
                {avisoInvitar.texto}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl p-4" style={{ background: "oklch(0.99 0.008 82)", border: "1px solid oklch(0.89 0.013 78)" }}>
        <h3 className="mb-3 text-sm font-bold" style={{ color: "oklch(0.24 0.02 55)" }}>
          Integrantes
        </h3>
        {grupos.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(0.55 0.02 55)" }}>
            Todavía no hay nadie: ni integrantes, invitados, ni personas esperando acceso.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {grupos.map((g) => (
              <AcordeonGrupo key={g.titulo} titulo={g.titulo} count={g.count} abierto={!!gruposAbiertos[g.titulo]} onToggle={() => toggleGrupo(g.titulo)}>
                {g.contenido}
              </AcordeonGrupo>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
