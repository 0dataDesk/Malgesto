-- Compases totales de la canción, editables a mano (null = se calcula de la estructura).
ALTER TABLE malgesto_app.canciones
  ADD COLUMN IF NOT EXISTS numero_compases integer CHECK (numero_compases IS NULL OR numero_compases BETWEEN 1 AND 2000);
