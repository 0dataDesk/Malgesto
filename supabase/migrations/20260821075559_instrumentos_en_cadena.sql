-- Brief "Instrumento como bloque agregable (reemplaza el selector de
-- instrumento activo)": reemplaza el mecanismo de "instrumento activo único"
-- (seteos.instrumento_propio_id, ver commit 6767de9) por una relación de
-- presencia: qué instrumento(s) propios de un integrante están agregados al
-- General y/o a canciones puntuales de una banda. A diferencia de
-- amplis/pedales (un dispositivo fijo cuyos VALORES varían por contexto),
-- acá lo que varía por contexto es la presencia misma -- por eso es una
-- tabla de relación simple, no un seteo con valores (el instrumento no tiene
-- controles/perillas).
--
-- cancion_id null = agregado al General; con valor = agregado a esa canción
-- puntual. Sin UNIQUE sobre (banda_id, usuario_id, instrumento_propio_id,
-- cancion_id): NULL no se compara como igual a sí mismo en un índice único
-- de Postgres, así que no bloquearía duplicados en General de todas formas
-- -- la dedupe de "no agregar el mismo instrumento dos veces al mismo
-- contexto" se resuelve en la capa de aplicación (lib/dispositivosData.ts),
-- más simple que un índice parcial para este caso.
--
-- seteos.instrumento_propio_id queda tal cual, sin usarse -- ya no hay
-- código que la escriba de acá en adelante, pero no se toca la columna ni
-- los datos existentes (en la práctica, siempre null: nunca hubo más de un
-- instrumento propio cargado en la app mientras ese mecanismo estuvo activo).
CREATE TABLE malgesto_app.instrumentos_en_cadena (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES malgesto_app.bandas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  instrumento_propio_id uuid NOT NULL REFERENCES malgesto_app.instrumentos_propios(id) ON DELETE CASCADE,
  cancion_id uuid REFERENCES malgesto_app.canciones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX instrumentos_en_cadena_banda_usuario_idx ON malgesto_app.instrumentos_en_cadena (banda_id, usuario_id);
