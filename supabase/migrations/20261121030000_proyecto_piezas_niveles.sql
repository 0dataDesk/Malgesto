-- Columna `niveles` de las canciones del Mapa del EP. SIN USO: el modelo de «zoom» (nivel por canción × porcentaje por escena)
-- se probó el 20/11/26 y se descartó (Jorge a veces excede su techo a propósito). Se conserva para que el historial de migraciones
-- coincida con la base; el promedio por canción sale de las escenas (lib/epModelo.ts).
ALTER TABLE malgesto_app.proyecto_piezas ADD COLUMN IF NOT EXISTS niveles jsonb NOT NULL DEFAULT '{}'::jsonb;
