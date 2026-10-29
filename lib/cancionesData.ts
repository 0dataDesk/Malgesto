import "server-only";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import type { Nota, Modo, Calidad } from "@/lib/cancionTeoria";
import type { NombreSeccion } from "@/lib/seccionCatalogo";
import { compasesDeSeccion } from "@/lib/cancionTiempo";
import { anclasValidas } from "@/lib/estudioSync";

export { compasesDeSeccion };

// Brief "Fase 3: nueva vista de Canción". El modelo de Fase 1:
//  - es_borrador controla modo de vista (vertical editable / horizontal no
//    editable) y visibilidad (borrador = solo admins + permiso Ver borradores).
//  - Cada sección puede tener tonalidad y BPM propios (null = hereda de la
//    canción), un número de compases explícito (null = suma de acordes) y
//    repite_veces vueltas seguidas.
//  - Una vuelta puntual se puede "desprender" de la plantilla: es otra fila
//    de secciones con plantilla_id + repeticion_indice, con su propia
//    progresión y letra.
//  - La letra vive en letra_lineas (ligada a una sección) con acordes
//    anclados a un punto del texto (letra_acordes).

const BUCKET_AUDIO = "canciones-audio";

export type Cancion = {
  id: string;
  bandaId: string;
  titulo: string;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionSegundos: number | null;
  totalCompases: number;
  // Compases escritos a mano (null = se calculan de la estructura).
  numeroCompases: number | null;
  totalSecciones: number;
  esCover: boolean;
  esBorrador: boolean;
  // Solo para covers: autor/intérprete original, chip junto al título en la
  // lista (diseño Fase 2). null en canciones propias.
  autor: string | null;
  // Modo Estudio: traste del capo (0 = sin capo), canción de Spotify
  // ('spotify:track:ID') y milisegundo de cada acorde en el orden en que suenan.
  capo: number;
  spotifyUri: string | null;
  tiemposMs: [number, number][] | null;
};

export type AcordeGuardado = {
  id: string;
  orden: number;
  notaRaiz: Nota;
  calidad: Calidad;
  duracionCompases: number;
};

export type LetraAcordeGuardado = {
  id: string;
  posicion: number;
  orden: number;
  notaRaiz: Nota;
  calidad: Calidad;
};

export type LetraLineaGuardada = {
  id: string;
  orden: number;
  texto: string;
  acordes: LetraAcordeGuardado[];
};

export type SeccionBase = {
  id: string;
  orden: number;
  nombre: NombreSeccion;
  tonalidadNota: Nota | null;
  tonalidadModo: Modo | null;
  numeroCompases: number | null;
  repiteVeces: number;
  bpm: number | null;
  acordes: AcordeGuardado[];
  letra: LetraLineaGuardada[];
};

export type RepeticionDesprendida = SeccionBase & { repeticionIndice: number };

export type SeccionConAcordes = SeccionBase & {
  repeticiones: RepeticionDesprendida[];
};

export type CancionCompleta = Cancion & {
  secciones: SeccionConAcordes[];
  audioReferenciaPath: string | null;
  audioSecuenciaPath: string | null;
  audioReferenciaUrl: string | null;
  audioSecuenciaUrl: string | null;
};

function urlPublicaAudio(admin: ReturnType<typeof supabaseMalgesto>, path: string | null): string | null {
  if (!path) return null;
  return admin.storage.from(BUCKET_AUDIO).getPublicUrl(path).data.publicUrl;
}

// ---- Perfil del músico (Fase 1 §5) --------------------------------------
// La vista horizontal prioriza distinto según el perfil de quien mira, en
// esa banda, para esa canción:
//  - "ambos": armonía + canta -> letra y acorde con el mismo protagonismo.
//  - "ritmo": solo percusión -> estructura/ritmo al centro, letra y armonía
//    de apoyo chico.
//  - "voz": solo voz -> letra grande y protagonista, armonía de apoyo chico.
//  - "armonia": armonía sin cantar -> acordes protagonistas, letra de apoyo.
// El dato ya existe en Integrantes: la plaza de instrumento (batería =
// percusión; el resto = armonía) y miembros_banda.voz.
export type PrioridadMusico = "ambos" | "ritmo" | "voz" | "armonia";

export async function obtenerPrioridadMusico(usuarioId: string, bandaId: string): Promise<PrioridadMusico> {
  const admin = supabaseMalgesto();
  const [{ data: miembro }, { data: plazas }] = await Promise.all([
    admin.from("miembros_banda").select("voz").eq("usuario_id", usuarioId).eq("banda_id", bandaId).maybeSingle(),
    admin.from("persona_plazas").select("plazas(instrumento, banda_id)").eq("persona_id", usuarioId),
  ]);

  const canta = miembro?.voz === "principal" || miembro?.voz === "coro";
  const instrumentos = (plazas ?? [])
    .map((p) => p.plazas as unknown as { instrumento: string; banda_id: string } | null)
    .filter((p): p is { instrumento: string; banda_id: string } => !!p && p.banda_id === bandaId)
    .map((p) => p.instrumento);

  const tocaPercusion = instrumentos.includes("bateria");
  const tocaArmonia = instrumentos.some((i) => i !== "bateria");

  if (tocaPercusion && !tocaArmonia && !canta) return "ritmo";
  if (canta && !tocaArmonia) return "voz";
  if (tocaArmonia && canta) return "ambos";
  if (tocaArmonia) return "armonia";
  // Sin instrumento ni voz asignados: se muestra todo parejo.
  return "ambos";
}

// ---- Lectura ---------------------------------------------------------------

type SeccionListaRow = {
  plantilla_id: string | null;
  repite_veces: number;
  numero_compases: number | null;
  acordes: { duracion_compases: number }[];
};

export async function obtenerCanciones(bandaIds: string[]): Promise<Cancion[]> {
  if (bandaIds.length === 0) return [];
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("canciones")
    .select(
      "id, banda_id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_segundos, es_cover, es_borrador, autor, capo, spotify_uri, tiempos_ms, numero_compases, secciones(plantilla_id, repite_veces, numero_compases, acordes(duracion_compases))"
    )
    .in("banda_id", bandaIds)
    .order("titulo", { ascending: true });

  return (data ?? []).map((c) => {
    // Solo las secciones de plantilla cuentan para el total de la lista; las
    // repeticiones desprendidas ajustan el detalle, no este resumen.
    const secciones = ((c.secciones ?? []) as SeccionListaRow[]).filter((s) => s.plantilla_id === null);
    const totalCompases = secciones.reduce((total, s) => {
      const compases = compasesDeSeccion({
        numeroCompases: s.numero_compases,
        acordes: (s.acordes ?? []).map((a) => ({ duracionCompases: Number(a.duracion_compases) })),
      });
      return total + compases * Math.max(1, Number(s.repite_veces) || 1);
    }, 0);

    return {
      id: c.id,
      bandaId: c.banda_id,
      titulo: c.titulo,
      tonalidadNota: c.tonalidad_nota as Nota,
      tonalidadModo: c.tonalidad_modo as Modo,
      bpm: c.bpm,
      duracionSegundos: c.duracion_segundos,
      totalCompases: c.numero_compases ?? totalCompases,
      numeroCompases: c.numero_compases ?? null,
      totalSecciones: secciones.length,
      esCover: c.es_cover,
      esBorrador: c.es_borrador,
      autor: c.autor ?? null,
      capo: Number(c.capo) || 0,
      spotifyUri: c.spotify_uri ?? null,
      tiemposMs: Array.isArray(c.tiempos_ms) ? anclasValidas(c.tiempos_ms) : null,
    };
  });
}

type SeccionRow = {
  id: string;
  orden: number;
  nombre: string;
  tonalidad_nota: string | null;
  tonalidad_modo: string | null;
  numero_compases: number | null;
  repite_veces: number;
  bpm: number | null;
  plantilla_id: string | null;
  repeticion_indice: number | null;
  acordes: {
    id: string;
    orden: number;
    nota_raiz: string;
    calidad: string;
    duracion_compases: number;
  }[];
};

type LetraLineaRow = {
  id: string;
  seccion_id: string;
  orden: number;
  texto: string;
  letra_acordes: { id: string; posicion: number; orden: number; nota_raiz: string; calidad: string }[];
};

function armarSeccionBase(row: SeccionRow, lineasPorSeccion: Map<string, LetraLineaRow[]>): SeccionBase {
  const acordes = (row.acordes ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((a) => ({
      id: a.id,
      orden: a.orden,
      notaRaiz: a.nota_raiz as Nota,
      calidad: a.calidad as Calidad,
      duracionCompases: Number(a.duracion_compases),
    }));

  const letra = (lineasPorSeccion.get(row.id) ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((l) => ({
      id: l.id,
      orden: l.orden,
      texto: l.texto,
      acordes: (l.letra_acordes ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden || a.posicion - b.posicion)
        .map((la) => ({
          id: la.id,
          posicion: la.posicion,
          orden: la.orden,
          notaRaiz: la.nota_raiz as Nota,
          calidad: la.calidad as Calidad,
        })),
    }));

  return {
    id: row.id,
    orden: row.orden,
    nombre: row.nombre as NombreSeccion,
    tonalidadNota: (row.tonalidad_nota as Nota | null) ?? null,
    tonalidadModo: (row.tonalidad_modo as Modo | null) ?? null,
    numeroCompases: row.numero_compases,
    repiteVeces: Math.max(1, Number(row.repite_veces) || 1),
    bpm: row.bpm,
    acordes,
    letra,
  };
}

export async function obtenerCancionCompleta(cancionId: string): Promise<CancionCompleta | null> {
  const admin = supabaseMalgesto();
  const { data: cancion } = await admin
    .from("canciones")
    .select(
      "id, banda_id, titulo, tonalidad_nota, tonalidad_modo, bpm, duracion_segundos, es_cover, es_borrador, autor, capo, spotify_uri, tiempos_ms, numero_compases, audio_referencia_path, audio_secuencia_path"
    )
    .eq("id", cancionId)
    .single();

  if (!cancion) return null;

  const { data: seccionesRaw } = await admin
    .from("secciones")
    .select(
      "id, orden, nombre, tonalidad_nota, tonalidad_modo, numero_compases, repite_veces, bpm, plantilla_id, repeticion_indice, acordes(id, orden, nota_raiz, calidad, duracion_compases)"
    )
    .eq("cancion_id", cancionId)
    .order("orden", { ascending: true });

  const secciones = (seccionesRaw ?? []) as SeccionRow[];
  const idsSeccion = secciones.map((s) => s.id);

  const { data: lineasRaw } = idsSeccion.length
    ? await admin
        .from("letra_lineas")
        .select("id, seccion_id, orden, texto, letra_acordes(id, posicion, orden, nota_raiz, calidad)")
        .in("seccion_id", idsSeccion)
        .order("orden", { ascending: true })
    : { data: [] as LetraLineaRow[] };

  const lineasPorSeccion = new Map<string, LetraLineaRow[]>();
  for (const l of (lineasRaw ?? []) as LetraLineaRow[]) {
    const lista = lineasPorSeccion.get(l.seccion_id) ?? [];
    lista.push(l);
    lineasPorSeccion.set(l.seccion_id, lista);
  }

  const plantillas = secciones.filter((s) => s.plantilla_id === null);
  const repeticionesPorPlantilla = new Map<string, SeccionRow[]>();
  for (const s of secciones.filter((s) => s.plantilla_id !== null)) {
    const lista = repeticionesPorPlantilla.get(s.plantilla_id!) ?? [];
    lista.push(s);
    repeticionesPorPlantilla.set(s.plantilla_id!, lista);
  }

  const seccionesArmadas: SeccionConAcordes[] = plantillas.map((row) => {
    const base = armarSeccionBase(row, lineasPorSeccion);
    const repeticiones = (repeticionesPorPlantilla.get(row.id) ?? [])
      .map((r) => ({ ...armarSeccionBase(r, lineasPorSeccion), repeticionIndice: r.repeticion_indice ?? 1 }))
      .sort((a, b) => a.repeticionIndice - b.repeticionIndice);
    return { ...base, repeticiones };
  });

  const totalCompases = seccionesArmadas.reduce((total, s) => {
    let compasesSeccion = 0;
    for (let vuelta = 1; vuelta <= s.repiteVeces; vuelta++) {
      const override = s.repeticiones.find((r) => r.repeticionIndice === vuelta);
      compasesSeccion += override ? compasesDeSeccion(override) : compasesDeSeccion(s);
    }
    return total + compasesSeccion;
  }, 0);

  return {
    id: cancion.id,
    bandaId: cancion.banda_id,
    titulo: cancion.titulo,
    tonalidadNota: cancion.tonalidad_nota as Nota,
    tonalidadModo: cancion.tonalidad_modo as Modo,
    bpm: cancion.bpm,
    duracionSegundos: cancion.duracion_segundos,
    totalCompases: cancion.numero_compases ?? totalCompases,
    numeroCompases: cancion.numero_compases ?? null,
    totalSecciones: seccionesArmadas.length,
    esCover: cancion.es_cover,
    esBorrador: cancion.es_borrador,
    autor: cancion.autor ?? null,
    capo: Number(cancion.capo) || 0,
    spotifyUri: cancion.spotify_uri ?? null,
    tiemposMs: Array.isArray(cancion.tiempos_ms) ? anclasValidas(cancion.tiempos_ms) : null,
    audioReferenciaPath: cancion.audio_referencia_path,
    audioSecuenciaPath: cancion.audio_secuencia_path,
    audioReferenciaUrl: urlPublicaAudio(admin, cancion.audio_referencia_path),
    audioSecuenciaUrl: urlPublicaAudio(admin, cancion.audio_secuencia_path),
    secciones: seccionesArmadas,
  };
}

// ---- Escritura ------------------------------------------------------------

export type AcordeInput = {
  notaRaiz: Nota;
  calidad: Calidad;
  duracionCompases: number;
};

export type LetraAcordeInput = {
  posicion: number;
  notaRaiz: Nota;
  calidad: Calidad;
};

export type LetraLineaInput = {
  texto: string;
  acordes: LetraAcordeInput[];
};

export type SeccionBaseInput = {
  nombre: NombreSeccion;
  tonalidadNota: Nota | null;
  tonalidadModo: Modo | null;
  numeroCompases: number | null;
  repiteVeces: number;
  bpm: number | null;
  acordes: AcordeInput[];
  letra: LetraLineaInput[];
};

export type RepeticionInput = SeccionBaseInput & { repeticionIndice: number };

export type SeccionInput = SeccionBaseInput & {
  repeticiones: RepeticionInput[];
};

export type CancionInput = {
  bandaId: string;
  titulo: string;
  tonalidadNota: Nota;
  tonalidadModo: Modo;
  bpm: number | null;
  duracionSegundos: number | null;
  esCover: boolean;
  esBorrador: boolean;
  autor: string | null;
  capo: number;
  spotifyUri: string | null;
  numeroCompases: number | null;
  secciones: SeccionInput[];
};

async function insertarLetra(
  admin: ReturnType<typeof supabaseMalgesto>,
  seccionId: string,
  letra: LetraLineaInput[]
) {
  for (let i = 0; i < letra.length; i++) {
    const linea = letra[i];
    const { data: lineaRow, error: errLinea } = await admin
      .from("letra_lineas")
      .insert({ seccion_id: seccionId, orden: i, texto: linea.texto })
      .select("id")
      .single();
    if (errLinea || !lineaRow) throw new Error(errLinea?.message ?? "No se pudo guardar una línea de letra.");

    if (linea.acordes.length > 0) {
      const { error: errAc } = await admin.from("letra_acordes").insert(
        linea.acordes.map((a, j) => ({
          linea_id: lineaRow.id,
          posicion: Math.max(0, Math.round(a.posicion)),
          orden: j,
          nota_raiz: a.notaRaiz,
          calidad: a.calidad,
        }))
      );
      if (errAc) throw new Error(errAc.message);
    }
  }
}

async function insertarUnaSeccion(
  admin: ReturnType<typeof supabaseMalgesto>,
  cancionId: string,
  orden: number,
  s: SeccionBaseInput,
  ligada: { plantillaId: string; repeticionIndice: number } | null
): Promise<string> {
  const { data: seccion, error: errSeccion } = await admin
    .from("secciones")
    .insert({
      cancion_id: cancionId,
      orden,
      nombre: s.nombre,
      tonalidad_nota: s.tonalidadNota,
      tonalidad_modo: s.tonalidadModo,
      numero_compases: s.numeroCompases,
      repite_veces: ligada ? 1 : Math.max(1, s.repiteVeces),
      bpm: s.bpm,
      plantilla_id: ligada?.plantillaId ?? null,
      repeticion_indice: ligada?.repeticionIndice ?? null,
    })
    .select("id")
    .single();

  if (errSeccion || !seccion) throw new Error(errSeccion?.message ?? "No se pudo crear una sección.");

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

  await insertarLetra(admin, seccion.id, s.letra);
  return seccion.id;
}

async function insertarSecciones(
  admin: ReturnType<typeof supabaseMalgesto>,
  cancionId: string,
  secciones: SeccionInput[]
) {
  for (let i = 0; i < secciones.length; i++) {
    const s = secciones[i];
    const plantillaId = await insertarUnaSeccion(admin, cancionId, i, s, null);

    // Repeticiones desprendidas: cada una es otra fila de secciones ligada a
    // esta plantilla y a una vuelta puntual. Se ignoran índices fuera de
    // rango (1..repiteVeces) y duplicados.
    const vistas = new Set<number>();
    for (const rep of s.repeticiones ?? []) {
      const idx = Math.round(rep.repeticionIndice);
      if (idx < 1 || idx > Math.max(1, s.repiteVeces) || vistas.has(idx)) continue;
      vistas.add(idx);
      await insertarUnaSeccion(admin, cancionId, i, rep, { plantillaId, repeticionIndice: idx });
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
      duracion_segundos: input.duracionSegundos,
      es_cover: input.esCover,
      es_borrador: input.esBorrador,
      autor: input.autor,
      capo: input.capo,
      spotify_uri: input.spotifyUri,
      numero_compases: input.numeroCompases,
    })
    .select("id")
    .single();

  if (error || !cancion) throw new Error(error?.message ?? "No se pudo crear la canción");

  await insertarSecciones(admin, cancion.id, input.secciones);
  return cancion.id;
}

// Reemplazo completo de secciones/acordes/letra: el cascade limpia acordes
// (acordes.seccion_id), letra (letra_lineas.seccion_id -> letra_acordes) y
// las repeticiones desprendidas (plantilla_id ON DELETE CASCADE, y además
// comparten cancion_id). El audio NO pasa por acá — se sube/reemplaza por su
// propia acción.
export async function actualizarCancion(cancionId: string, input: CancionInput) {
  const admin = supabaseMalgesto();
  const { error: errUpdate } = await admin
    .from("canciones")
    .update({
      titulo: input.titulo,
      tonalidad_nota: input.tonalidadNota,
      tonalidad_modo: input.tonalidadModo,
      bpm: input.bpm,
      duracion_segundos: input.duracionSegundos,
      es_cover: input.esCover,
      es_borrador: input.esBorrador,
      autor: input.autor,
      capo: input.capo,
      spotify_uri: input.spotifyUri,
      numero_compases: input.numeroCompases,
    })
    .eq("id", cancionId);
  if (errUpdate) throw new Error(errUpdate.message);

  const { error: errDelete } = await admin.from("secciones").delete().eq("cancion_id", cancionId);
  if (errDelete) throw new Error(errDelete.message);

  await insertarSecciones(admin, cancionId, input.secciones);
}

// Ficha de la canción sin tocar su estructura (ventana "Editar" del modo Estudio).
export type FichaInput = Omit<CancionInput, "bandaId" | "secciones">;
export async function actualizarFicha(cancionId: string, f: FichaInput) {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("canciones")
    .update({
      titulo: f.titulo,
      tonalidad_nota: f.tonalidadNota,
      tonalidad_modo: f.tonalidadModo,
      bpm: f.bpm,
      duracion_segundos: f.duracionSegundos,
      es_cover: f.esCover,
      es_borrador: f.esBorrador,
      autor: f.autor,
      capo: f.capo,
      spotify_uri: f.spotifyUri,
      numero_compases: f.numeroCompases,
    })
    .eq("id", cancionId);
  if (error) throw new Error(error.message);
}

// Tiempos marcados en el modo Estudio (null = borrar las marcas).
export async function guardarTiempos(cancionId: string, tiemposMs: [number, number][] | null) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("canciones").update({ tiempos_ms: tiemposMs }).eq("id", cancionId);
  if (error) throw new Error(error.message);
}

export async function actualizarEstadoBorrador(cancionId: string, esBorrador: boolean) {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("canciones").update({ es_borrador: esBorrador }).eq("id", cancionId);
  if (error) throw new Error(error.message);
}

export async function eliminarCancion(cancionId: string) {
  const admin = supabaseMalgesto();
  // Limpia los audios del bucket antes de borrar la fila (el cascade no
  // alcanza a Storage).
  const { data: cancion } = await admin
    .from("canciones")
    .select("audio_referencia_path, audio_secuencia_path")
    .eq("id", cancionId)
    .maybeSingle();
  const paths = [cancion?.audio_referencia_path, cancion?.audio_secuencia_path].filter(Boolean) as string[];
  if (paths.length) await admin.storage.from(BUCKET_AUDIO).remove(paths);

  const { error } = await admin.from("canciones").delete().eq("id", cancionId);
  if (error) throw new Error(error.message);
}

// ---- Audio (Fase 1 §4) --------------------------------------------------
// audio_referencia: ensayo/referencia, se reemplaza sin histórico.
// audio_secuencia: versión final para uso en vivo. Subida por service role
// al bucket público 'canciones-audio', igual criterio que presskit_fotos.

export type TipoAudio = "referencia" | "secuencia";

const COLUMNA_AUDIO: Record<TipoAudio, "audio_referencia_path" | "audio_secuencia_path"> = {
  referencia: "audio_referencia_path",
  secuencia: "audio_secuencia_path",
};

const MIME_AUDIO: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/flac": "flac",
};
const TAMANO_MAXIMO_AUDIO = 50 * 1024 * 1024;

export async function reemplazarAudio(cancionId: string, bandaId: string, tipo: TipoAudio, archivo: File): Promise<string> {
  const extension = MIME_AUDIO[archivo.type];
  if (!extension) throw new Error("Formato no soportado — usá MP3, M4A, WAV, OGG o FLAC.");
  if (archivo.size > TAMANO_MAXIMO_AUDIO) throw new Error("El audio no puede superar los 50 MB.");

  const admin = supabaseMalgesto();
  const columna = COLUMNA_AUDIO[tipo];

  const { data: previa } = await admin.from("canciones").select(columna).eq("id", cancionId).maybeSingle();
  const pathPrevio = (previa as Record<string, string | null> | null)?.[columna] ?? null;

  const path = `${bandaId}/${cancionId}/${tipo}-${crypto.randomUUID()}.${extension}`;
  const { error: errSubida } = await admin.storage.from(BUCKET_AUDIO).upload(path, archivo, { contentType: archivo.type, upsert: false });
  if (errSubida) throw new Error(errSubida.message);

  const { error: errUpdate } = await admin.from("canciones").update({ [columna]: path }).eq("id", cancionId);
  if (errUpdate) {
    await admin.storage.from(BUCKET_AUDIO).remove([path]);
    throw new Error(errUpdate.message);
  }

  // Sin histórico: la versión anterior se borra una vez guardada la nueva.
  if (pathPrevio) await admin.storage.from(BUCKET_AUDIO).remove([pathPrevio]);

  return admin.storage.from(BUCKET_AUDIO).getPublicUrl(path).data.publicUrl;
}

export async function quitarAudio(cancionId: string, tipo: TipoAudio): Promise<void> {
  const admin = supabaseMalgesto();
  const columna = COLUMNA_AUDIO[tipo];
  const { data: previa } = await admin.from("canciones").select(columna).eq("id", cancionId).maybeSingle();
  const pathPrevio = (previa as Record<string, string | null> | null)?.[columna] ?? null;
  if (pathPrevio) await admin.storage.from(BUCKET_AUDIO).remove([pathPrevio]);
  const { error } = await admin.from("canciones").update({ [columna]: null }).eq("id", cancionId);
  if (error) throw new Error(error.message);
}
