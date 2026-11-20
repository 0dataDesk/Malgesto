-- Mapa del EP: la escena (cómo se imagina: «Niebla», «Se abre el eco») es el nombre principal de cada sección;
-- la parte de la canción (Intro, Verso, Dub, Coro…) pasa a su propio campo, secundario.
ALTER TABLE malgesto_app.proyecto_secciones ADD COLUMN IF NOT EXISTS parte text NOT NULL DEFAULT '';
update malgesto_app.proyecto_secciones set parte = nombre where parte = '';
