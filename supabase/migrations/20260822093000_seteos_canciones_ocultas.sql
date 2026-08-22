-- Brief "Seteos: eliminar canción de la vista + contadores discretos" §1:
-- "eliminar" una canción de la vista de Seteos no borra sus seteos (podría
-- volver a agregarse más adelante y esos valores tienen que seguir ahí) --
-- es puramente una preferencia de visibilidad por usuario+banda, de ahí una
-- tabla de relación simple en vez de una columna en `seteos` (que además
-- viviría repetida por dispositivo, cuando la pestaña es una sola por
-- canción para todos los dispositivos del usuario).
CREATE TABLE malgesto_app.seteos_canciones_ocultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES malgesto_app.bandas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  cancion_id uuid NOT NULL REFERENCES malgesto_app.canciones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (banda_id, usuario_id, cancion_id)
);

CREATE INDEX seteos_canciones_ocultas_banda_usuario_idx ON malgesto_app.seteos_canciones_ocultas (banda_id, usuario_id);
