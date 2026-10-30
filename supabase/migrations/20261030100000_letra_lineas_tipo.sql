-- Arreglos y solos dentro de la letra: una línea puede ser 'tab' (bloque de texto en monoespaciado, sin acordes anclados).
ALTER TABLE malgesto_app.letra_lineas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'letra' CHECK (tipo IN ('letra','tab'));
