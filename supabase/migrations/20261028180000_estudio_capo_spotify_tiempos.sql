-- Modo Estudio: capo, canción de Spotify y tiempos marcados por acorde.
-- capo: traste del capo (0 = sin capo).
-- spotify_uri: p. ej. 'spotify:track:ID', para saber qué canción sigue la app.
-- tiempos_ms: arreglo con el milisegundo de cada acorde en el orden en que suenan (null = sin marcar).
ALTER TABLE malgesto_app.canciones
  ADD COLUMN capo smallint NOT NULL DEFAULT 0 CHECK (capo BETWEEN 0 AND 12),
  ADD COLUMN spotify_uri text,
  ADD COLUMN tiempos_ms jsonb;
