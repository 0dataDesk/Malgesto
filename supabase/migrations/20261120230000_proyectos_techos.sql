-- Mapa del EP: techo de cada indicador a nivel de todo el EP (vista general). Ningún valor de sección pasa de su techo:
-- el 100 de una sección equivale al techo (valor efectivo = valor × techo / 100). {} = todos en 100.
ALTER TABLE malgesto_app.proyectos_musicales ADD COLUMN IF NOT EXISTS techos jsonb NOT NULL DEFAULT '{}'::jsonb;
