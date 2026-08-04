import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { TipoEvento } from "@/lib/malgestoEventos";

export type TipoMovimiento = "entrada" | "salida";

export type Movimiento = {
  id: string;
  bandaId: string;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  fecha: string;
  eventoId: string | null;
  eventoTitulo: string | null;
  // Brief "Finanzas: ingresos automáticos...": hace falta la fecha real del
  // evento vinculado (no solo `fecha`, que es la fecha del movimiento) para
  // poder evaluar eventoYaPaso() en vivo al leer — ver movimientoDisponible
  // en app/finanzas/page.tsx.
  eventoFechaInicio: string | null;
  eventoFechaFin: string | null;
  automatico: boolean;
  createdAt: string;
};

type EventoEmbebido = { titulo: string; fecha_inicio: string; fecha_fin: string | null } | null;

function mapearMovimiento(m: {
  id: string;
  banda_id: string;
  tipo: string;
  concepto: string;
  monto: number | string;
  fecha: string;
  evento_id: string | null;
  automatico: boolean;
  created_at: string;
  eventos: unknown;
}): Movimiento {
  const evento = m.eventos as unknown as EventoEmbebido;
  return {
    id: m.id,
    bandaId: m.banda_id,
    tipo: m.tipo as TipoMovimiento,
    concepto: m.concepto,
    monto: Number(m.monto),
    fecha: m.fecha,
    eventoId: m.evento_id,
    eventoTitulo: evento?.titulo ?? null,
    eventoFechaInicio: evento?.fecha_inicio ?? null,
    eventoFechaFin: evento?.fecha_fin ?? null,
    automatico: m.automatico,
    createdAt: m.created_at,
  };
}

const COLUMNAS_MOVIMIENTO = "id, banda_id, tipo, concepto, monto, fecha, evento_id, automatico, created_at, eventos(titulo, fecha_inicio, fecha_fin)";

// Más recientes primero (Brief 21 §3): por fecha del movimiento, y a
// igualdad de fecha por orden de creación.
export async function obtenerMovimientos(bandaIds: string[]): Promise<Movimiento[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("movimientos_financieros")
    .select(COLUMNAS_MOVIMIENTO)
    .in("banda_id", bandaIds)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapearMovimiento);
}

export type NuevoMovimientoInput = {
  tipo: TipoMovimiento;
  concepto: string;
  monto: number;
  fecha: string;
  eventoId: string | null;
};

export async function crearMovimiento(bandaId: string, usuarioId: string, input: NuevoMovimientoInput): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("movimientos_financieros").insert({
    banda_id: bandaId,
    tipo: input.tipo,
    concepto: input.concepto,
    monto: input.monto,
    fecha: input.fecha,
    evento_id: input.eventoId,
    automatico: false,
    creado_por: usuarioId,
  });
  if (error) throw new Error(error.message);
}

// Brief de corrección §2: los movimientos automáticos (ingreso esperado de
// un show) sólo se resincronizan cuando se guarda el evento asociado — no
// hay recálculo diario — así que borrarlos acá los perdería para siempre
// hasta la próxima edición del show. Se bloquean acá (no sólo ocultando el
// botón) para no depender de que el cliente no mande el id igual.
export async function eliminarMovimiento(movimientoId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { data: movimiento, error: errorSelect } = await admin
    .from("movimientos_financieros")
    .select("automatico")
    .eq("id", movimientoId)
    .maybeSingle();
  if (errorSelect) throw new Error(errorSelect.message);
  if (!movimiento) throw new Error("El movimiento ya no existe.");
  if (movimiento.automatico) {
    throw new Error("Este movimiento se generó automáticamente desde un show — para quitarlo, editá o eliminá ese show.");
  }

  const { error } = await admin.from("movimientos_financieros").delete().eq("id", movimientoId);
  if (error) throw new Error(error.message);
}

// Brief 21 §3: conecta automáticamente el "Ingreso esperado" de un show con
// un movimiento de tipo 'entrada'. Se llama después de crear/editar
// cualquier evento no-gira — si no es un show con ingreso cargado, borra el
// movimiento automático existente (ej. si se le quitó el monto o cambió de
// tipo); si lo es, actualiza el existente en vez de duplicarlo (select
// primero: una unique index parcial en evento_id no sirve como target de
// ON CONFLICT vía supabase-js, así que se resuelve acá).
export async function sincronizarMovimientoAutomatico(
  eventoId: string,
  bandaId: string,
  tipo: TipoEvento,
  titulo: string,
  fechaInicioIso: string,
  ingresoEsperado: number | null
): Promise<void> {
  const admin = supabaseMalgesto();

  if (tipo !== "show" || ingresoEsperado === null) {
    const { error } = await admin.from("movimientos_financieros").delete().eq("evento_id", eventoId).eq("automatico", true);
    if (error) throw new Error(error.message);
    return;
  }

  const fecha = fechaInicioIso.slice(0, 10);
  const { data: existente, error: errorSelect } = await admin
    .from("movimientos_financieros")
    .select("id")
    .eq("evento_id", eventoId)
    .eq("automatico", true)
    .maybeSingle();
  if (errorSelect) throw new Error(errorSelect.message);

  if (existente) {
    const { error } = await admin
      .from("movimientos_financieros")
      .update({ concepto: titulo, monto: ingresoEsperado, fecha })
      .eq("id", existente.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("movimientos_financieros").insert({
    banda_id: bandaId,
    tipo: "entrada",
    concepto: titulo,
    monto: ingresoEsperado,
    fecha,
    evento_id: eventoId,
    automatico: true,
  });
  if (error) throw new Error(error.message);
}
