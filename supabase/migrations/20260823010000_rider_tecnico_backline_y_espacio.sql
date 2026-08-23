-- Brief "Rider Técnico: renombrar módulo + rediseñar contenido de Rider"
-- §3: hasta hoy el Rider era 100% calculado (canales/amplificadores/
-- pedales/escenario, ver lib/riderData.ts) -- no existía ningún dato
-- capturado a mano para el Rider en sí (backline requerido, requerimientos
-- de espacio, contra rider, contacto). `stage_plots.notas` existe pero
-- nunca se usó (columna muerta); se deja intacta y se agregan columnas
-- nuevas con nombre explícito en vez de reusarla, para no mezclar un campo
-- de texto libre sin uso claro con datos estructurados.
ALTER TABLE malgesto_app.stage_plots
  ADD COLUMN IF NOT EXISTS corriente_electrica text,
  ADD COLUMN IF NOT EXISTS resguardo_instrumentos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resguardo_nota text,
  ADD COLUMN IF NOT EXISTS proyeccion_video_nota text,
  ADD COLUMN IF NOT EXISTS tiempo_montaje text,
  ADD COLUMN IF NOT EXISTS contra_rider_nota text,
  ADD COLUMN IF NOT EXISTS contacto_nombre text,
  ADD COLUMN IF NOT EXISTS contacto_telefono text,
  ADD COLUMN IF NOT EXISTS contacto_email text;

-- Backline: lista de equipo requerido, énfasis en especificación/
-- rendimiento (categoría cerrada + descripción técnica libre), marca(s)
-- sugerida(s) aparte y opcional -- nunca el dato principal (brief §3).
CREATE TABLE malgesto_app.rider_backline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_plot_id uuid NOT NULL REFERENCES malgesto_app.stage_plots(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['bateria'::text, 'amp_bajo'::text, 'amp_guitarra'::text, 'teclado_bases'::text, 'mobiliario'::text, 'otro'::text])),
  especificacion text NOT NULL,
  marca_sugerida text,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rider_backline_items_stage_plot_idx ON malgesto_app.rider_backline_items (stage_plot_id);
