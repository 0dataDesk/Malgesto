import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseMalgesto } from "@/lib/supabase/malgesto";
import { etiquetaPlaza } from "@/lib/instrumentoCatalogo";
import { obtenerPlazasConPersonaDeBanda } from "@/lib/stagePlotData";
import { partesEnZonaApp } from "@/lib/zonaHoraria";
import { MESES } from "@/lib/eventoUI";

const BUCKET = "presskit";
const TIPOS_PERMITIDOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const TAMANO_MAXIMO = 10 * 1024 * 1024;

export type Presskit = {
  id: string;
  bandaId: string;
  bioLarga: string | null;
  pais: string | null;
  ciudad: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  enviadoEn: string | null;
  // Brief "Presskit — vista propia, estatus, liga publicada": se actualiza
  // en cada mutación de contenido (ver tocarActualizado más abajo) para
  // poder comparar contra enviadoEn y mostrar Actualizado/En revisión.
  actualizadoEn: string | null;
  // URL real de la página pública, pegada a mano por Jorge una vez que
  // Design la construye -- null mientras no hay nada publicado.
  ligaPublicada: string | null;
  // Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4
  // estados" §3: se actualiza cada vez que se guarda `ligaPublicada` (ver
  // actualizarLigaPublicada más abajo) -- comparado contra actualizadoEn
  // en estadoPresskit (PresskitEstado.tsx) para distinguir "Actualizado" de
  // "Publicado, con cambios pendientes".
  ligaActualizadaEn: string | null;
};

type PresskitRow = {
  id: string;
  banda_id: string;
  bio_larga: string | null;
  pais: string | null;
  ciudad: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  enviado_en: string | null;
  actualizado_en: string | null;
  liga_publicada: string | null;
  liga_actualizada_en: string | null;
};

function mapPresskit(p: PresskitRow): Presskit {
  return {
    id: p.id,
    bandaId: p.banda_id,
    bioLarga: p.bio_larga,
    pais: p.pais,
    ciudad: p.ciudad,
    contactoNombre: p.contacto_nombre,
    contactoTelefono: p.contacto_telefono,
    contactoEmail: p.contacto_email,
    enviadoEn: p.enviado_en,
    actualizadoEn: p.actualizado_en,
    ligaPublicada: p.liga_publicada,
    ligaActualizadaEn: p.liga_actualizada_en,
  };
}

const COLUMNAS_PRESSKIT =
  "id, banda_id, bio_larga, pais, ciudad, contacto_nombre, contacto_telefono, contacto_email, enviado_en, actualizado_en, liga_publicada, liga_actualizada_en";

// Toca actualizado_en de un presskit -- llamado desde cada mutación de
// contenido (datos, fotos, links) para que la leyenda de estatus de la
// vista pueda comparar contra enviado_en. La liga publicada NO pasa por
// acá (ver actualizarLigaPublicada): pegar la URL de Design no es un
// cambio de contenido que Design necesite volver a revisar.
async function tocarActualizado(admin: ReturnType<typeof supabaseMalgesto>, presskitId: string): Promise<void> {
  await admin.from("presskits").update({ actualizado_en: new Date().toISOString() }).eq("id", presskitId);
}

// Bug reportado: "Enviar a Presskit" quedaba deshabilitado para bandas con
// semblanza/género/fotos ya cargados pero nunca enviados, porque
// hayEnvioPendiente (PresskitEstado.tsx) inferís "hay contenido" de
// actualizado_en no nulo -- y ese presskit se había capturado antes de que
// `tocarActualizado` tocara esa columna en cada mutación (o por cualquier
// otra vía que no la haya tocado), así que quedaba en null pese a tener
// datos reales. Esta función revisa el contenido de verdad (texto propio +
// fotos) en vez de una marca de tiempo derivada, para que "enviado_en null +
// ya hay datos capturados" sea siempre "activo", sin depender de que
// actualizado_en se haya seteado alguna vez.
export async function hayContenidoCapturado(presskit: Presskit): Promise<boolean> {
  const textoPropio = [presskit.bioLarga, presskit.pais, presskit.ciudad, presskit.contactoNombre, presskit.contactoTelefono, presskit.contactoEmail].some(
    (v) => (v ?? "").trim() !== ""
  );
  if (textoPropio) return true;

  const admin = supabaseMalgesto();
  const { count } = await admin.from("presskit_fotos").select("id", { count: "exact", head: true }).eq("presskit_id", presskit.id);
  return (count ?? 0) > 0;
}

// Un presskit por banda (UNIQUE(banda_id) en DB) -- se crea vacío la primera
// vez que alguien entra a la pantalla de captura, mismo criterio que
// obtenerOCrearStagePlot.
export async function obtenerOCrearPresskit(bandaId: string): Promise<Presskit> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("presskits").select(COLUMNAS_PRESSKIT).eq("banda_id", bandaId).maybeSingle();
  if (data) return mapPresskit(data);

  const { data: creado, error } = await admin.from("presskits").insert({ banda_id: bandaId }).select(COLUMNAS_PRESSKIT).single();
  if (error || !creado) throw new Error(error?.message ?? "No se pudo crear el presskit.");
  return mapPresskit(creado);
}

export type ActualizacionPresskit = {
  bioLarga: string | null;
  pais: string | null;
  ciudad: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
};

export async function actualizarPresskit(presskitId: string, cambios: ActualizacionPresskit): Promise<void> {
  const admin = supabaseMalgesto();
  const ahora = new Date().toISOString();
  const { error } = await admin
    .from("presskits")
    .update({
      bio_larga: cambios.bioLarga,
      pais: cambios.pais,
      ciudad: cambios.ciudad,
      contacto_nombre: cambios.contactoNombre,
      contacto_telefono: cambios.contactoTelefono,
      contacto_email: cambios.contactoEmail,
      updated_at: ahora,
      actualizado_en: ahora,
    })
    .eq("id", presskitId);
  if (error) throw new Error(error.message);
}

// Brief "Presskit: dos apartados de fotos (banda/conceptual y flyers)":
// `categoria` distingue fotos de banda/conceptuales (semblanza) de flyers
// (material promocional) -- dos galerías separadas en la pantalla de
// captura y dos secciones separadas en el documento para Design.
export type CategoriaFotoPresskit = "banda" | "flyer";
export type PresskitFoto = { id: string; storagePath: string; orden: number; url: string; categoria: CategoriaFotoPresskit };

function urlPublicaFoto(admin: ReturnType<typeof supabaseMalgesto>, storagePath: string): string {
  return admin.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function obtenerFotos(presskitId: string): Promise<PresskitFoto[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("presskit_fotos")
    .select("id, storage_path, orden, categoria")
    .eq("presskit_id", presskitId)
    .order("orden", { ascending: true });
  return (data ?? []).map((f) => ({
    id: f.id,
    storagePath: f.storage_path,
    orden: f.orden,
    categoria: f.categoria as CategoriaFotoPresskit,
    url: urlPublicaFoto(admin, f.storage_path),
  }));
}

// Sube el archivo al bucket `presskit` (público, 10MB, solo imágenes -- ya
// configurado en Storage) vía service role, igual que el resto de las
// escrituras de este módulo: el bucket no tiene policies propias para
// authenticated, así que la subida directa desde el cliente no funcionaría
// sin RLS de Storage, que este brief no pide agregar.
export async function subirFoto(
  presskitId: string,
  bandaId: string,
  archivo: File,
  ordenSiguiente: number,
  categoria: CategoriaFotoPresskit
): Promise<PresskitFoto> {
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) throw new Error("Solo se aceptan imágenes JPG, PNG o WebP.");
  if (archivo.size > TAMANO_MAXIMO) throw new Error("La imagen no puede superar los 10MB.");

  const admin = supabaseMalgesto();
  const path = `${bandaId}/${randomUUID()}.${extension}`;

  const { error: errorSubida } = await admin.storage.from(BUCKET).upload(path, archivo, { contentType: archivo.type });
  if (errorSubida) throw new Error(errorSubida.message);

  const { data, error } = await admin
    .from("presskit_fotos")
    .insert({ presskit_id: presskitId, storage_path: path, orden: ordenSiguiente, categoria })
    .select("id, storage_path, orden, categoria")
    .single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error(error?.message ?? "No se pudo guardar la foto.");
  }
  await tocarActualizado(admin, presskitId);
  return {
    id: data.id,
    storagePath: data.storage_path,
    orden: data.orden,
    categoria: data.categoria as CategoriaFotoPresskit,
    url: urlPublicaFoto(admin, data.storage_path),
  };
}

export async function eliminarFoto(presskitId: string, fotoId: string, storagePath: string): Promise<void> {
  const admin = supabaseMalgesto();
  await admin.storage.from(BUCKET).remove([storagePath]);
  const { error } = await admin.from("presskit_fotos").delete().eq("id", fotoId);
  if (error) throw new Error(error.message);
  await tocarActualizado(admin, presskitId);
}

export type PresskitRed = { id: string; plataforma: string; url: string; orden: number };

export async function obtenerRedes(presskitId: string): Promise<PresskitRed[]> {
  const admin = supabaseMalgesto();
  const { data } = await admin.from("presskit_redes").select("id, plataforma, url, orden").eq("presskit_id", presskitId).order("orden", { ascending: true });
  return data ?? [];
}

export async function agregarRed(presskitId: string, plataforma: string, url: string, ordenSiguiente: number): Promise<PresskitRed> {
  const admin = supabaseMalgesto();
  const { data, error } = await admin
    .from("presskit_redes")
    .insert({ presskit_id: presskitId, plataforma, url, orden: ordenSiguiente })
    .select("id, plataforma, url, orden")
    .single();
  if (error || !data) throw new Error(error?.message ?? "No se pudo agregar el link.");
  await tocarActualizado(admin, presskitId);
  return data;
}

export async function eliminarRed(presskitId: string, redId: string): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin.from("presskit_redes").delete().eq("id", redId);
  if (error) throw new Error(error.message);
  await tocarActualizado(admin, presskitId);
}

// Solo Jorge pega/edita esto (server action gateada a superadmin) -- no
// toca actualizado_en porque no es contenido que Design deba revisar de
// nuevo, es el resultado de que Design ya entregó la página. Brief
// "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados" §3:
// cada guardado (con valor o vacío) también toca liga_actualizada_en, la
// marca de tiempo que estadoPresskit compara contra actualizado_en.
export async function actualizarLigaPublicada(presskitId: string, liga: string | null): Promise<void> {
  const admin = supabaseMalgesto();
  const { error } = await admin
    .from("presskits")
    .update({ liga_publicada: liga, liga_actualizada_en: new Date().toISOString() })
    .eq("id", presskitId);
  if (error) throw new Error(error.message);
}

// Marca el presskit como enviado a Design -- no genera nada visual, solo
// registra cuándo Jorge lo mandó (Brief §4). Brief "Presskit: flujo de
// envío en Gestión/Bandas, estatus de 4 estados": a diferencia de antes, ya
// no iguala actualizado_en a este instante -- el estatus de 4 estados
// compara actualizado_en contra liga_actualizada_en, no contra enviado_en,
// así que forzar ese valor acá pisaría la fecha real de la última edición
// de contenido sin necesidad. Devuelve el ISO guardado para que el cliente
// lo refleje sin esperar un revalidatePath.
export async function marcarPresskitEnviado(presskitId: string): Promise<string> {
  const admin = supabaseMalgesto();
  const ahora = new Date().toISOString();
  const { error } = await admin.from("presskits").update({ enviado_en: ahora, updated_at: ahora }).eq("id", presskitId);
  if (error) throw new Error(error.message);
  return ahora;
}

// Brief "Presskit: documento completo para Design (reemplaza el resumen
// recortado)" §1: texto fijo que Jorge ya no escribe a mano cada vez -- va
// siempre al inicio del documento (ver construirDocumentoPresskit).
export const PROMPT_DESIGN_PRESSKIT =
  "Vas a diseñar una página pública de presskit para esta banda, usando exactamente la información de abajo. No inventes ni completes datos que no estén incluidos.\n\n" +
  "Además del diseño completo de la página, crea una versión reducida de una sola página, tamaño carta, que sirva como resumen imprimible/descargable del presskit (mismo estilo visual, contenido condensado a lo esencial: nombre, género, semblanza breve, foto principal, integrantes, contacto y links).\n\n" +
  "En la página principal, agrega un botón para descargar esa versión en PDF. El botón debe ser discreto — ubicado arriba a la izquierda, de bajo perfil, que no compita visualmente con el resto del diseño (no debe ser un botón llamativo ni protagonista).\n\n" +
  "La versión de una página (PDF) debe mantener la misma calidad y cuidado de diseño que la página principal — no es un respaldo plano ni de segunda categoría, es una pieza con el mismo nivel visual.\n\n" +
  "Las fotos de banda/conceptuales son material visual para el diseño (fondo, imagen principal, ambientación) — no crees un apartado o galería separada mostrándolas como lista. Úsalas para dar identidad visual a la página, no como contenido enumerado.\n\n" +
  "Los flyers representan algunos de los eventos importantes que la banda ha tenido — deja esto claro en cómo se presentan (ej. un encabezado o texto breve tipo \"Algunos de nuestros shows\" en vez de solo mostrarlos sin contexto).";

export type PresskitProximaFecha = { fechaInicio: string; titulo: string; lugarNombre: string | null };

// Próximas fechas (Brief §2, nuevo -- no estaba en el resumen anterior):
// consulta directa a `eventos` por banda_id, sin pasar por la resolución de
// giras multi-banda de obtenerEventos (malgestoEventos.ts) -- acá solo
// importan las fechas propias de ESTA banda hacia adelante. Brief "Presskit:
// filtrar próximas fechas por confirmadas": excluye tentativas (`estado`,
// el mismo campo texto "confirmado"|"tentativo" que ya usa Calendario --
// ver EstadoEvento en malgestoEventos.ts) -- una gira tentativa (ej.
// Colombia) no debería aparecer acá hasta confirmarse.
export async function obtenerProximasFechas(bandaId: string): Promise<PresskitProximaFecha[]> {
  const admin = supabaseMalgesto();
  const ahora = new Date().toISOString();
  const { data } = await admin
    .from("eventos")
    .select("titulo, fecha_inicio, lugares(nombre)")
    .eq("banda_id", bandaId)
    .eq("estado", "confirmado")
    .gt("fecha_inicio", ahora)
    .order("fecha_inicio", { ascending: true });
  return (data ?? []).map((e) => ({
    fechaInicio: e.fecha_inicio,
    titulo: e.titulo,
    lugarNombre: (e.lugares as unknown as { nombre: string } | null)?.nombre ?? null,
  }));
}

export function formatearFechaDocumento(iso: string): string {
  const p = partesEnZonaApp(iso);
  return `${p.dia} de ${MESES[p.mes].toLowerCase()} de ${p.anio}`;
}

// Documento completo para Design (Brief "...reemplaza el resumen
// recortado"): a diferencia del resumen anterior, ningún campo se recorta
// -- cada dato va tal cual está guardado, con "(sin completar)" donde falte
// en vez de omitir la línea. Deliberadamente reusable (no lógica pegada al
// botón "Enviar a Presskit", que vive en Gestión > Bandas -- ver
// enviarPresskitAction en app/gestion/actions.ts): sirve tanto para ese
// botón como para cuando Jorge le pide este mismo documento a Code en otra
// conversación, consultando la base directo sin pasar por la app -- misma
// función, mismo resultado en los dos casos.
export async function construirDocumentoPresskit(bandaId: string): Promise<string> {
  const admin = supabaseMalgesto();
  const [{ data: bandaRow }, presskit] = await Promise.all([
    admin.from("bandas").select("nombre, genero").eq("id", bandaId).single(),
    obtenerOCrearPresskit(bandaId),
  ]);
  const bandaNombre = bandaRow?.nombre ?? "Banda";
  const bandaGenero = bandaRow?.genero as string | null;

  const [fotos, redes, integrantes, proximasFechas] = await Promise.all([
    obtenerFotos(presskit.id),
    obtenerRedes(presskit.id),
    obtenerPlazasConPersonaDeBanda(bandaId),
    obtenerProximasFechas(bandaId),
  ]);

  const lineas: string[] = [PROMPT_DESIGN_PRESSKIT, ""];

  lineas.push(`PRESSKIT — ${bandaNombre}`);
  lineas.push(`Género: ${bandaGenero?.trim() || "(sin completar)"}`);

  lineas.push("", "SEMBLANZA", presskit.bioLarga?.trim() || "(sin completar)");

  lineas.push("", "ORIGEN");
  lineas.push(`País: ${presskit.pais?.trim() || "(sin completar)"}`);
  lineas.push(`Ciudad: ${presskit.ciudad?.trim() || "(sin completar)"}`);

  lineas.push("", "INTEGRANTES");
  if (integrantes.length === 0) lineas.push("(sin completar)");
  else for (const i of integrantes) lineas.push(`- ${i.nombrePersona} — ${etiquetaPlaza(i.instrumento, i.etiqueta)}`);

  // Brief "Presskit: dos apartados de fotos (banda/conceptual y flyers)"
  // §2: agrupadas por categoría con encabezado propio, no una sola lista
  // mezclada -- mismo orden que la pantalla de captura (banda primero).
  lineas.push("", "FOTOS");
  const fotosBanda = fotos.filter((f) => f.categoria === "banda");
  const fotosFlyer = fotos.filter((f) => f.categoria === "flyer");
  if (fotos.length === 0) {
    lineas.push("(sin fotos)");
  } else {
    lineas.push("Fotos de banda:");
    if (fotosBanda.length === 0) lineas.push("(sin fotos)");
    else fotosBanda.forEach((f, i) => lineas.push(`- Foto ${i + 1}: ${f.url}`));

    lineas.push("", "Flyers:");
    if (fotosFlyer.length === 0) lineas.push("(sin flyers)");
    else fotosFlyer.forEach((f, i) => lineas.push(`- Flyer ${i + 1}: ${f.url}`));
  }

  lineas.push("", "LINKS DE PLATAFORMAS");
  if (redes.length === 0) lineas.push("(sin completar)");
  else for (const r of redes) lineas.push(`- ${r.plataforma}: ${r.url}`);

  lineas.push("", "CONTACTO");
  lineas.push(`Nombre: ${presskit.contactoNombre?.trim() || "(sin completar)"}`);
  lineas.push(`Teléfono: ${presskit.contactoTelefono?.trim() || "(sin completar)"}`);
  lineas.push(`Email: ${presskit.contactoEmail?.trim() || "(sin completar)"}`);

  lineas.push("", "PRÓXIMAS FECHAS");
  if (proximasFechas.length === 0) {
    lineas.push("Sin fechas próximas registradas.");
  } else {
    for (const f of proximasFechas) {
      const lugar = f.lugarNombre ? ` — ${f.lugarNombre}` : "";
      lineas.push(`- ${formatearFechaDocumento(f.fechaInicio)}: ${f.titulo}${lugar}`);
    }
  }

  return lineas.join("\n");
}

// Brief "Presskit — vista pública real dentro de Malgesto App": /presskit-
// publico/[slug] identifica la banda por el nombre "slugificado" (ej.
// "Juana LR" -> "juana-lr") en vez de agregar una columna de slug/token
// nueva -- mismo criterio de slug que ya usa RiderVista.tsx para el nombre
// del archivo del PDF, solo que acá decide qué banda mostrar. Reservado a
// bandas con `presskit_habilitado` (mismo gate que el resto de los bloques)
// y no archivadas -- si dos bandas futuras slugifican igual, gana la
// primera por orden de creación (caso borde aceptado: nombres que colisionan
// al normalizar ya son un problema de nomenclatura de banda, no de esta
// función).
export function slugificarNombreBanda(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function obtenerBandaPorSlugPresskit(
  slug: string
): Promise<{ bandaId: string; bandaNombre: string; bandaGenero: string | null; bandaColor: string } | null> {
  const admin = supabaseMalgesto();
  const { data } = await admin
    .from("bandas")
    .select("id, nombre, genero, color")
    .eq("presskit_habilitado", true)
    .eq("archivada", false)
    .order("created_at", { ascending: true });

  const banda = (data ?? []).find((b) => slugificarNombreBanda(b.nombre) === slug);
  if (!banda) return null;
  return { bandaId: banda.id, bandaNombre: banda.nombre, bandaGenero: banda.genero, bandaColor: banda.color ?? "#8b1e2b" };
}

export type IntegrantePublico = { nombre: string; instrumento: string };

export type PresskitPublico = {
  bandaId: string;
  bandaNombre: string;
  bandaGenero: string | null;
  bandaColor: string;
  presskit: Presskit;
  fotosBanda: PresskitFoto[];
  fotosFlyer: PresskitFoto[];
  redes: PresskitRed[];
  integrantes: IntegrantePublico[];
  proximasFechas: PresskitProximaFecha[];
};

// Mismas fuentes de datos que construirDocumentoPresskit (fotos, redes,
// integrantes, próximas fechas) -- esto arma el equivalente para la vista
// pública en vez de un documento de texto para Design.
export async function obtenerPresskitPublico(
  bandaId: string,
  bandaNombre: string,
  bandaGenero: string | null,
  bandaColor: string
): Promise<PresskitPublico> {
  const presskit = await obtenerOCrearPresskit(bandaId);
  const [fotos, redes, integrantesRaw, proximasFechas] = await Promise.all([
    obtenerFotos(presskit.id),
    obtenerRedes(presskit.id),
    obtenerPlazasConPersonaDeBanda(bandaId),
    obtenerProximasFechas(bandaId),
  ]);

  return {
    bandaId,
    bandaNombre,
    bandaGenero,
    bandaColor,
    presskit,
    fotosBanda: fotos.filter((f) => f.categoria === "banda"),
    fotosFlyer: fotos.filter((f) => f.categoria === "flyer"),
    redes,
    integrantes: integrantesRaw.map((i) => ({ nombre: i.nombrePersona, instrumento: etiquetaPlaza(i.instrumento, i.etiqueta) })),
    proximasFechas,
  };
}
