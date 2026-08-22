-- Brief "Presskit: dos apartados de fotos (banda/conceptual y flyers)": la
-- columna `categoria` se había quitado en el brief original porque no hacía
-- falta separar por categoría -- ahora sí, para distinguir fotos de
-- banda/conceptuales (semblanza) de flyers (material promocional). Default
-- 'banda' porque las fotos ya subidas se cargaron bajo ese criterio original.
ALTER TABLE malgesto_app.presskit_fotos
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'banda'
  CHECK (categoria IN ('banda', 'flyer'));
