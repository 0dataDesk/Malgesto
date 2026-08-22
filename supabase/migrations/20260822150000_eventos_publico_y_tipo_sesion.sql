-- Brief "Calendario: público/privado, nuevo tipo de evento, filtro de
-- Presskit" §1: shows nacen públicos por default -- privado es la excepción
-- que alguien tiene que marcar a propósito.
ALTER TABLE malgesto_app.eventos
  ADD COLUMN IF NOT EXISTS es_publico boolean NOT NULL DEFAULT true;

-- §2: "sesion" cubre actividades de banda que no son show ni ensayo (sesión
-- de fotos, grabación de video, etc.) -- mismo criterio de nomenclatura que
-- el resto del check constraint (minúsculas, sin acentos: ver "cumpleanos").
ALTER TABLE malgesto_app.eventos
  DROP CONSTRAINT eventos_tipo_check;
ALTER TABLE malgesto_app.eventos
  ADD CONSTRAINT eventos_tipo_check CHECK (tipo = ANY (ARRAY['ensayo'::text, 'show'::text, 'cumpleanos'::text, 'gira'::text, 'sesion'::text]));
