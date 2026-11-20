-- Mapa del EP, segundo rediseño: el núcleo son Energía, Ánimo y Tensión; el cuerpo, Altos/Medios/Graves/Sub.
-- Las dos líneas de la gráfica (Intensidad y Peso) se calculan de estos siete valores (lib/epModelo.ts).
-- nivel, espacio, densidad, ritmo, etapa e instrumentos ya no se usan en pantalla; se conservan las columnas.
ALTER TABLE malgesto_app.proyecto_secciones
  ADD COLUMN IF NOT EXISTS energia integer NOT NULL DEFAULT 50 CHECK (energia BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS animo integer NOT NULL DEFAULT 50 CHECK (animo BETWEEN 0 AND 100);
