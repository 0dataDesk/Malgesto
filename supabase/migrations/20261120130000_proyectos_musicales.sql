-- Mapa del EP: planeación de un proyecto musical (EP o álbum) como curva de emoción.
-- Vive aparte de canciones/armonía: un proyecto tiene piezas (canciones planeadas) y cada pieza secciones.
-- nivel (0-100) = emoción de la sección; ajuste (-50..50) sube o baja toda la pieza; graves (0-100) = peso de las frecuencias bajas.
CREATE TABLE IF NOT EXISTS malgesto_app.proyectos_musicales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES malgesto_app.bandas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'ep' CHECK (tipo IN ('ep','album')),
  historia text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proyectos_musicales_banda_idx ON malgesto_app.proyectos_musicales (banda_id);

CREATE TABLE IF NOT EXISTS malgesto_app.proyecto_piezas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES malgesto_app.proyectos_musicales(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  ajuste integer NOT NULL DEFAULT 0 CHECK (ajuste BETWEEN -50 AND 50),
  tonalidad text NOT NULL DEFAULT '',
  bpm integer CHECK (bpm IS NULL OR bpm BETWEEN 20 AND 300),
  idea text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS proyecto_piezas_proyecto_idx ON malgesto_app.proyecto_piezas (proyecto_id);

CREATE TABLE IF NOT EXISTS malgesto_app.proyecto_secciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id uuid NOT NULL REFERENCES malgesto_app.proyecto_piezas(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  nombre text NOT NULL,
  compases integer NOT NULL DEFAULT 8 CHECK (compases BETWEEN 1 AND 512),
  nivel integer NOT NULL DEFAULT 50 CHECK (nivel BETWEEN 0 AND 100),
  graves integer NOT NULL DEFAULT 50 CHECK (graves BETWEEN 0 AND 100),
  etapa text NOT NULL DEFAULT 'descubrimiento' CHECK (etapa IN ('desconocido','descubrimiento','tension','jubilo','suspenso')),
  instrumentos text[] NOT NULL DEFAULT '{}',
  armonia text NOT NULL DEFAULT '',
  transmite text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS proyecto_secciones_pieza_idx ON malgesto_app.proyecto_secciones (pieza_id);

ALTER TABLE malgesto_app.proyectos_musicales ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.proyecto_piezas ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.proyecto_secciones ENABLE ROW LEVEL SECURITY;
