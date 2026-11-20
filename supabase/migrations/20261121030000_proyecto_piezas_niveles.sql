-- Mapa del EP: cada canción fija el nivel de cada indicador (el 100 % de sus escenas). {} = todo en 100.
-- Las escenas guardan su porcentaje (0-100) de ese nivel; el valor efectivo es nivel × porcentaje / 100.
ALTER TABLE malgesto_app.proyecto_piezas ADD COLUMN IF NOT EXISTS niveles jsonb NOT NULL DEFAULT '{}'::jsonb;
