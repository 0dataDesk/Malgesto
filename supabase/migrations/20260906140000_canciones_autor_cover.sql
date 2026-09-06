-- Brief "Fase 3: nueva vista de Canción" — ajuste tras recibir el diseño
-- real (proyecto "Respuestas sobre repo y dispositivos", Vista de
-- Cancion.dc.html). La lista de Canciones muestra, en la sección Covers, el
-- autor original de cada cover como chip junto al título. Campo libre,
-- opcional, solo tiene sentido cuando es_cover = true (no se fuerza a nivel
-- DB: una canción propia simplemente lo deja en null).
ALTER TABLE malgesto_app.canciones ADD COLUMN autor text;
