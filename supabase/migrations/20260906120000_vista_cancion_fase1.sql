-- Brief "Fase 3: construir la nueva vista de Canción" — capa de datos de
-- Fase 1 (arquitectura cerrada con Claude). El diseño (Fase 2) construye la
-- presentación de dos modos sobre este modelo; esta migración es solo el
-- esquema que esa vista tiene que terminar soportando.

-- 1. Estado de la canción (Fase 1 §1) ----------------------------------
-- es_borrador: default true para canciones nuevas (nacen en edición
-- vertical, visibles solo para admins de la banda + integrantes con el
-- permiso "Ver borradores"). No-borrador = lista horizontal, no editable.
-- Las canciones que ya existen son repertorio en uso: se marcan
-- explícitamente como NO borrador para que no desaparezcan de la vista de
-- ningún integrante al desplegar.
ALTER TABLE malgesto_app.canciones
  ADD COLUMN es_borrador boolean NOT NULL DEFAULT true;
UPDATE malgesto_app.canciones SET es_borrador = false;

-- 2. Audio (Fase 1 §4) ------------------------------------------------
-- audio_referencia: ensayo/referencia, se reemplaza sin histórico (solo
-- última versión). audio_secuencia: versión final para uso en vivo.
-- Ambos son paths dentro del bucket 'canciones-audio'; la URL se resuelve
-- en la data layer igual que presskit_fotos (lib/presskitData.ts).
ALTER TABLE malgesto_app.canciones
  ADD COLUMN audio_referencia_path text,
  ADD COLUMN audio_secuencia_path text;

-- 3. Permiso "Ver borradores" (Fase 1 §1) ----------------------------
-- Booleano por persona y por banda, editable en Gestión / Integrantes /
-- [persona] / [banda] / Permisos. Independiente de bloques_visibles (que
-- decide qué bloques ve la persona, no el detalle borrador/no-borrador).
-- administrador/superadmin ven borradores siempre, sin depender del flag.
ALTER TABLE malgesto_app.miembros_banda
  ADD COLUMN ver_borradores boolean NOT NULL DEFAULT false;

-- 4. Secciones: tonalidad/tempo propios + plantilla (Fase 1 §2 y §3) --
-- tonalidad_nota / tonalidad_modo: null = hereda la tonalidad de la canción.
-- numero_compases: null = se calcula desde la suma de duracion_compases de
--   los acordes (comportamiento actual); un entero lo fija explícitamente.
-- repite_veces: cuántas vueltas seguidas de la sección (>= 1).
-- bpm: null = hereda el BPM de la canción. Campo disponible, no se usa
--   activamente hoy (Fase 1 §3).
ALTER TABLE malgesto_app.secciones
  ADD COLUMN tonalidad_nota text
    CHECK (tonalidad_nota IN ('C','C#','D','D#','E','F','F#','G','G#','A','A#','B')),
  ADD COLUMN tonalidad_modo text
    CHECK (tonalidad_modo IN ('mayor','menor')),
  ADD COLUMN numero_compases integer
    CHECK (numero_compases IS NULL OR numero_compases > 0),
  ADD COLUMN repite_veces integer NOT NULL DEFAULT 1
    CHECK (repite_veces >= 1),
  ADD COLUMN bpm integer
    CHECK (bpm IS NULL OR bpm > 0),
  ADD COLUMN plantilla_id uuid REFERENCES malgesto_app.secciones(id) ON DELETE CASCADE,
  ADD COLUMN repeticion_indice integer;

-- Una fila de sección es una de dos cosas:
--  * Sección de plantilla: plantilla_id y repeticion_indice ambos null.
--    Aparece en la lista de secciones de la canción.
--  * Repetición desprendida: ambos no-null. Es una copia ligada a la vuelta
--    número `repeticion_indice` de su sección plantilla, con su propia
--    progresión de acordes y su propia letra, sin afectar la plantilla ni
--    las otras vueltas (Fase 1 §2).
ALTER TABLE malgesto_app.secciones
  ADD CONSTRAINT secciones_repeticion_coherente
    CHECK ((plantilla_id IS NULL) = (repeticion_indice IS NULL)),
  ADD CONSTRAINT secciones_repeticion_unica
    UNIQUE (plantilla_id, repeticion_indice);
CREATE INDEX secciones_plantilla_idx ON malgesto_app.secciones (plantilla_id);

-- 5. Letra alineada a acordes (Fase 1 §5, tablas nuevas) -------------
-- Líneas de letra ligadas a una sección (de plantilla o repetición
-- desprendida). Cada línea puede llevar acordes anclados a un punto exacto
-- del texto — `posicion` es el offset de caracteres dentro de `texto`
-- donde cae el acorde, estilo tab de guitarra.
CREATE TABLE malgesto_app.letra_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion_id uuid NOT NULL REFERENCES malgesto_app.secciones(id) ON DELETE CASCADE,
  orden integer NOT NULL,
  texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX letra_lineas_seccion_idx ON malgesto_app.letra_lineas (seccion_id);

CREATE TABLE malgesto_app.letra_acordes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_id uuid NOT NULL REFERENCES malgesto_app.letra_lineas(id) ON DELETE CASCADE,
  posicion integer NOT NULL DEFAULT 0,
  nota_raiz text NOT NULL
    CHECK (nota_raiz IN ('C','C#','D','D#','E','F','F#','G','G#','A','A#','B')),
  calidad text NOT NULL
    CHECK (calidad IN ('mayor','menor','disminuido','aumentado','7','maj7','m7','dim7','m7b5','sus2','sus4')),
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX letra_acordes_linea_idx ON malgesto_app.letra_acordes (linea_id);

-- Mismo criterio de RLS que canciones/secciones/acordes en este esquema:
-- RLS activada, sin policies -- todo el acceso pasa por la service role
-- (lib/supabase/malgesto.ts). El esquema malgesto_app no se expone a la
-- API pública anónima.
ALTER TABLE malgesto_app.letra_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.letra_acordes ENABLE ROW LEVEL SECURITY;

-- 6. Bucket de audio -------------------------------------------------
-- Público con paths por UUID (misma postura que el bucket 'presskit' y sus
-- fotos): la subida va por service role, la lectura es por URL directa para
-- que el reproductor embebido no necesite firmar URLs. 50 MB por archivo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canciones-audio', 'canciones-audio', true, 52428800,
  ARRAY['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm','audio/flac']
)
ON CONFLICT (id) DO NOTHING;
