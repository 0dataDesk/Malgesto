import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { Nota, Modo, Calidad } from "@/lib/cancionTeoria";
import type { NombreSeccion } from "@/lib/seccionCatalogo";

export type Cancion = {
  id: string;
  bandaId: string;
  titulo: string;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionAprox: string | null;
  totalCompases: number;
  esCover: boolean;
};

export type AcordeGuardado = {
  id: string;
  orden: number;
  notaRaiz: Nota;
  calidad: Calidad;
  duracionCompases: number;
};

export type SeccionConAcordes = {
  id: string;
  orden: number;
  nombre: NombreSeccion;
  acordes: AcordeGuardado[];
};

export type CancionCompleta = Cancion & { secciones: SeccionConAcordes[] };

export async function obtenerCanciones(bandaIds: string[]): Promise<Cancion[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("canciones")
    .select("id, banda_id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_aprox, es_cover, secciones(acordes(duracion_compases))")
    .in("banda_id", bandaIds)
    .order("titulo", { ascending: true });

  return (data ?? []).map((c) => {
    // Brief de refinamiento §2: mismo cálculo que CancionForm (suma de
    // duracionCompases de todos los acordes, en todas las secciones).
    const secciones = (c.secciones ?? []) as { acordes: { duracion_compases: number }[] }[];
    const totalCompases = secciones.reduce(
      (total, s) => total + (s.acordes ?? []).reduce((t, a) => t + Number(a.duracion_compases), 0),
      0
    );

    return {
      id: c.id,
      bandaId: c.banda_id,
      titulo: c.titulo,
      tonalidadNota: c.tonalidad_nota as Nota,
      tonalidadModo: c.tonalidad_modo as Modo,
      bpm: c.bpm,
      duracionAprox: c.duracion_aprox,
      totalCompases,
      esCover: c.es_cover,
    };
  });
}

export async function obtenerCancionCompleta(cancionId: string): Promise<CancionCompleta | null> {
  const admin = supabaseMalgesto();
  const { data: cancion } = await admin
    .from("canciones")
    .select("id, banda_id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_aprox, es_cover")
    .eq("id", cancionId)
    .single();

  if (!cancion) return null;

  const { data: secciones } = await admin
    .from("secciones")
    .select("id, orden, nombre, acordes(id, orden, nota_raiz, calidad, duracion_compases)")
    .eq("cancion_id", cancionId)
    .order("orden", { ascending: true })
    .order("orden", { ascending: true, foreignTable: "acordes" });

  const totalCompases = (secciones ?? []).reduce(
    (total, s) => total + (s.acordes ?? []).reduce((t, a) => t + Number(a.duracion_compases), 0),
    0
  );

  return {
    id: cancion.id,
    bandaId: cancion.banda_id,
    titulo: cancion.titulo,
    tonalidadNota: cancion.tonalidad_nota as Nota,
    tonalidadModo: cancion.tonalidad_modo as Modo,
    bpm: cancion.bpm,
    duracionAprox: cancion.duracion_aprox,
    totalCompases,
    esCover: cancion.es_cover,
    secciones: (secciones ?? []).map((s) => ({
      id: s.id,
      orden: s.orden,
      nombre: s.nombre as NombreSeccion,
      acordes: (s.acordes ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((a) => ({
          id: a.id,
          orden: a.orden,
          notaRaiz: a.nota_raiz as Nota,
          calidad: a.calidad as Calidad,
          duracionCompases: Number(a.duracion_compases),
        })),
    })),
  };
}

export type AcordeInput = {
  notaRaiz: Nota;
  calidad: Calidad;
  duracionCompases: number;
};

export type SeccionInput = {
  nombre: NombreSeccion;
  acordes: AcordeInput[];
};

export type CancionInput = {
  bandaId: string;
  titulo: string;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionAprox: string | null;
  esCover: boolean;
  secciones: SeccionInput[];
};

async function insertarSecciones(
  admin: ReturnType<typeof supabaseMalgesto>,
  cancionId: string,
  secciones: SeccionInput[]
) {
  for (let i = 0; i < secciones.length; i++) {
    const s = secciones[i];
    const { data: seccion, error: errSeccion } = await admin
      .from("secciones")
      .insert({ cancion_id: cancionId, orden: i, nombre: s.nombre })
      .select("id")
      .single();

    if (errSeccion || !seccion) throw new Error(errSeccion?.message ?? "No se pudo crear una sección");

    if (s.acordes.length > 0) {
      const { error: errAcordes } = await admin.from("acordes").insert(
        s.acordes.map((a, j) => ({
          seccion_id: seccion.id,
          orden: j,
          nota_raiz: a.notaRaiz,
          calidad: a.calidad,
          duracion_compases: a.duracionCompases,
        }))
      );
      if (errAcordes) throw new Error(errAcordes.message);
    }
  }
}

export async function crearCancion(input: CancionInput): Promise<string> {
  const admin = supabaseMalgesto();
  const { data: cancion, error } = await admin
    .from("canciones")
    .insert({
      banda_id: input.bandaId,
      titulo: input.titulo,
      tonalidad_nota: input.tonalidadNota,
      tonalidad_modo: input.tonalidadModo,
      bpm: input.bpm,
      duracion_aprox: input.duracionAprox,
      es_cover: input.esCover,
    })
    .select("id")
    .single();

  if (error || !cancion) throw new Error(error?.message ?? "No se pudo crear la canción");

  await insertarSecciones(admin, cancion.id, input.secciones);
  return cancion.id;
}

// Reemplazo completo de secciones/acordes en vez de diffear: el cascade en
// acordes.seccion_id / secciones.cancion_id limpia lo anterior solo.
export async function actualizarCancion(cancionId: string, input: CancionInput) {
  const admin = supabaseMalgesto();
  const { error: errUpdate } = await admin
    .from("canciones")
    .update({
      titulo: input.titulo,
      tonalidad_nota: input.tonalidadNota,
      tonalidad_modo: input.tonalidadModo,
      bpm: input.bpm,
      duracion_aprox: input.duracionAprox,
      es_cover: input.esCover,
    })
    .eq("id", cancionId);
  if (errUpdate) throw new Error(errUpdate.message);

  const { error: errDelete } = await admin.from("secciones").delete().eq("cancion_id", cancionId);
  if (errDelete) throw new Error(errDelete.message);

  await insertarSecciones(admin, cancionId, input.secciones);
}

export async function eliminarCancion(cancionId: string) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("canciones").delete().eq("id", cancionId);
  if (error) throw new Error(error.message);
}
