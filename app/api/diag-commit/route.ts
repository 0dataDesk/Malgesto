import { NextResponse } from "next/server";

// DIAGNÓSTICO TEMPORAL — confirma qué commit tiene Vercel efectivamente
// desplegado en producción. Se borra apenas se confirme.
const CLAVE = "f3a1c9e7b2d84610a5f7c3e9b1d64872a0e5f1c3";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("clave") !== CLAVE) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json({
    commitDesplegado: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    entornoVercel: process.env.VERCEL_ENV ?? null,
  });
}
