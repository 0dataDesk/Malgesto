-- Mapa del EP, rediseño: cada sección guarda valores que Jorge mueve (0-100) para que Cosmo los lea y arme estructura, tempo, tono y MIDI.
-- Frecuencias: sub, graves (ya existía), medios, altos. Carácter: tension, espacio, densidad, ritmo. La emoción sigue siendo `nivel`.
-- `transmite` pasa a ser la intención de la sección; `etapa` ya no se muestra (se conserva la columna).
ALTER TABLE malgesto_app.proyecto_secciones
  ADD COLUMN IF NOT EXISTS sub integer NOT NULL DEFAULT 50 CHECK (sub BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS medios integer NOT NULL DEFAULT 50 CHECK (medios BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS altos integer NOT NULL DEFAULT 50 CHECK (altos BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS tension integer NOT NULL DEFAULT 50 CHECK (tension BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS espacio integer NOT NULL DEFAULT 50 CHECK (espacio BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS densidad integer NOT NULL DEFAULT 50 CHECK (densidad BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ritmo integer NOT NULL DEFAULT 50 CHECK (ritmo BETWEEN 0 AND 100);
