-- Brief "Presskit como bloque, Liga publicada en Bandas, acordeón de bloques" §1:
-- suma Presskit al mismo mecanismo de bloque toggleable por banda que ya usan
-- Calendario (fijo)/Canciones/Set List/Seteos/Finanzas/Stage Plot. Default true
-- para no desactivar Presskit de golpe en ninguna banda existente.
ALTER TABLE malgesto_app.bandas
  ADD COLUMN IF NOT EXISTS presskit_habilitado boolean NOT NULL DEFAULT true;
