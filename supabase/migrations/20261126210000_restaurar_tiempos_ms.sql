-- 27/11/26: se revierte el retiro del Estudio (PR 94); se vuelve a crear la columna.
ALTER TABLE malgesto_app.canciones ADD COLUMN IF NOT EXISTS tiempos_ms jsonb;
