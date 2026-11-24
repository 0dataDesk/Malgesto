-- Matriz de instrumentos del Mapa del EP: qué canales (instrumentos y buses) lleva cada canción.
-- Forma: [{ "id": uuid, "nombre": "KICK", "bus": "BATERIA" | "METALES" | "TECLADOS" | "", "estados": { "<id de canción>": "si" | "op" } }]
-- Una canción ausente de `estados` significa que ese canal no entra en ella.
ALTER TABLE malgesto_app.proyectos_musicales ADD COLUMN IF NOT EXISTS matriz jsonb NOT NULL DEFAULT '[]'::jsonb;
