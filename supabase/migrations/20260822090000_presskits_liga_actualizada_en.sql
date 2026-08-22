-- Brief "Presskit: flujo de envío en Gestión/Bandas, estatus de 4 estados":
-- registra cuándo se guardó por última vez `liga_publicada`, para poder
-- comparar contra `actualizado_en` y distinguir "Actualizado" de "Publicado,
-- con cambios pendientes" en el estatus de 4 estados.
ALTER TABLE malgesto_app.presskits
  ADD COLUMN IF NOT EXISTS liga_actualizada_en timestamptz;
