import { NextResponse } from "next/server";
import { enZonaApp, ahoraEnZonaApp, ZONA_HORARIA_APP } from "@/lib/zonaHoraria";
import { esMismoDia } from "@/lib/fechas";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";

// DIAGNÓSTICO TEMPORAL — corre las funciones REALES de zona horaria (no una
// reimplementación) contra el evento real de producción, para probar qué
// código está efectivamente desplegado. Protegido por clave: sin ella, 404
// (no revela ni siquiera que la ruta existe). Se borra apenas se confirme.
const CLAVE = "8a8f72bbd5a9612ff286ff54da494b2f8da8edfe43ead87e";
const EVENTO_ID_PRUEBA = "a1624e14-766f-4d7c-9fbf-556251d5d07a";

function partesDe(d: Date) {
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate(), hora: d.getHours(), minuto: d.getMinutes() };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("clave") !== CLAVE) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = supabaseMalgesto();
  const { data: evento, error } = await admin
    .from("eventos")
    .select("id, titulo, fecha_inicio, fecha_fin")
    .eq("id", EVENTO_ID_PRUEBA)
    .maybeSingle();

  const diaConsulta31Julio = new Date(2026, 6, 31);
  const diaConsulta1Agosto = new Date(2026, 7, 1);

  const resultado = evento
    ? {
        eventoEncontrado: true,
        titulo: evento.titulo,
        fechaInicioUtcEnDB: evento.fecha_inicio,
        fechaFinUtcEnDB: evento.fecha_fin,
        enZonaAppFechaInicio: partesDe(enZonaApp(evento.fecha_inicio)),
        seAgrupaBajo31DeJulio: esMismoDia(enZonaApp(evento.fecha_inicio), diaConsulta31Julio),
        seAgrupaBajo1DeAgosto: esMismoDia(enZonaApp(evento.fecha_inicio), diaConsulta1Agosto),
      }
    : { eventoEncontrado: false, error: error?.message ?? "sin fila" };

  return NextResponse.json({
    commitDesplegado: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    entornoVercel: process.env.VERCEL_ENV ?? null,
    zonaHorariaApp: ZONA_HORARIA_APP,
    ahoraEnZonaApp: partesDe(ahoraEnZonaApp()),
    resultado,
  });
}
