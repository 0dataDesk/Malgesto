-- Lírico: aula de composición lírica (semillero de letras + memoria de aprendizaje).
-- Independiente de Musical (Mapa del EP). Orden de los datos:
--   técnicas (catálogo único) · ideas (semillas) · letras (nacen de una idea, con objetivo propio)
--   · versiones (solo se agregan, nunca se pisan) · lecciones (una técnica enseñada, con objetivo)
--   · ejercicios (cuelgan de una lección) · conexiones (idea con idea, con motivo).
-- Todo con llaves foráneas y CHECK; sin políticas RLS (solo el servidor con la llave de servicio).

CREATE TABLE IF NOT EXISTS malgesto_app.lirico_tecnicas (
  clave text PRIMARY KEY CHECK (clave ~ '^[a-z_]+$'),
  orden integer NOT NULL UNIQUE,
  nombre text NOT NULL,
  resumen text NOT NULL,
  cuerpo text NOT NULL
);

CREATE TABLE IF NOT EXISTS malgesto_app.lirico_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banda_id uuid NOT NULL REFERENCES malgesto_app.bandas(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(btrim(titulo)) > 0),
  texto text NOT NULL DEFAULT '',
  origen text NOT NULL DEFAULT 'nueva' CHECK (origen IN ('paginas','ideas','notion','chat','nueva')),
  origen_ref text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'semilla' CHECK (estado IN ('semilla','en_trabajo','letra','archivada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lirico_ideas_banda_idx ON malgesto_app.lirico_ideas (banda_id);

CREATE TABLE IF NOT EXISTS malgesto_app.lirico_letras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES malgesto_app.lirico_ideas(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(btrim(titulo)) > 0),
  objetivo text NOT NULL CHECK (length(btrim(objetivo)) > 0),
  premisa text NOT NULL DEFAULT '',
  angulo text NOT NULL DEFAULT '',
  plano_literal text NOT NULL DEFAULT '',
  plano_figurado text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','en_revision','terminada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lirico_letras_idea_idx ON malgesto_app.lirico_letras (idea_id);

-- Versiones: solo se agregan. El texto de una versión no se modifica nunca.
CREATE TABLE IF NOT EXISTS malgesto_app.lirico_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letra_id uuid NOT NULL REFERENCES malgesto_app.lirico_letras(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero >= 1),
  texto text NOT NULL,
  nota text NOT NULL DEFAULT '',
  autor text NOT NULL CHECK (autor IN ('jorge','cosmo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (letra_id, numero)
);

CREATE OR REPLACE FUNCTION malgesto_app.lirico_versiones_inmutables() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.texto IS DISTINCT FROM OLD.texto OR NEW.numero IS DISTINCT FROM OLD.numero OR NEW.letra_id IS DISTINCT FROM OLD.letra_id THEN
    RAISE EXCEPTION 'Una versión de letra no se modifica: agrega una nueva.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lirico_versiones_inmutables ON malgesto_app.lirico_versiones;
CREATE TRIGGER lirico_versiones_inmutables BEFORE UPDATE ON malgesto_app.lirico_versiones
  FOR EACH ROW EXECUTE FUNCTION malgesto_app.lirico_versiones_inmutables();

-- Lecciones: una técnica enseñada sobre una idea (y opcionalmente sobre una de sus letras), con objetivo propio.
CREATE TABLE IF NOT EXISTS malgesto_app.lirico_lecciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES malgesto_app.lirico_ideas(id) ON DELETE CASCADE,
  letra_id uuid REFERENCES malgesto_app.lirico_letras(id) ON DELETE SET NULL,
  tecnica text NOT NULL REFERENCES malgesto_app.lirico_tecnicas(clave),
  objetivo text NOT NULL CHECK (length(btrim(objetivo)) > 0),
  contenido text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('propuesta','en_curso','dominada','por_reforzar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lirico_lecciones_idea_idx ON malgesto_app.lirico_lecciones (idea_id);
CREATE INDEX IF NOT EXISTS lirico_lecciones_tecnica_idx ON malgesto_app.lirico_lecciones (tecnica);

CREATE TABLE IF NOT EXISTS malgesto_app.lirico_ejercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leccion_id uuid NOT NULL REFERENCES malgesto_app.lirico_lecciones(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 1,
  consigna text NOT NULL CHECK (length(btrim(consigna)) > 0),
  respuesta text NOT NULL DEFAULT '',
  correccion text NOT NULL DEFAULT '',
  resultado text NOT NULL DEFAULT 'pendiente' CHECK (resultado IN ('pendiente','hecho','funciono','no_funciono','reforzar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (leccion_id, orden)
);

-- Conexiones entre ideas (con motivo). Una sola fila por par, sin conexión consigo misma.
CREATE TABLE IF NOT EXISTS malgesto_app.lirico_conexiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_a uuid NOT NULL REFERENCES malgesto_app.lirico_ideas(id) ON DELETE CASCADE,
  idea_b uuid NOT NULL REFERENCES malgesto_app.lirico_ideas(id) ON DELETE CASCADE,
  motivo text NOT NULL CHECK (length(btrim(motivo)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (idea_a < idea_b),
  UNIQUE (idea_a, idea_b)
);

ALTER TABLE malgesto_app.lirico_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_letras ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_lecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE malgesto_app.lirico_conexiones ENABLE ROW LEVEL SECURITY;

-- Catálogo de técnicas (fuente única; las lecciones y la pantalla lo leen de aquí).
INSERT INTO malgesto_app.lirico_tecnicas (clave, orden, nombre, resumen, cuerpo) VALUES
('premisa', 1, 'Premisa, tema y ángulo',
 'Una canción se sostiene en una frase que puedas decir en voz alta.',
 $c$Tema: de qué habla en grande. Ángulo: desde dónde lo cuenta quien canta. Premisa: el ángulo convertido en una frase con tensión.
Fórmula: sujeto + quiere algo + algo se lo impide + qué cambia al final.
Si no cabe en una oración, todavía no es una canción: es material.
Truco: describir algo externo toda la letra y soltar en la última línea que hablaba del narrador (premisa que se revela al final).$c$),
('doble_lectura', 2, 'Doble lectura',
 'La canción parece hablar de una cosa y se puede escuchar como otra.',
 $c$Herramientas: metáfora sostenida (no la expliques), ambigüedad deliberada (palabras que funcionan en los dos planos) y pronombre sin nombre (habla con "tú" y nunca digas el objeto, o dilo solo en la línea del giro).
Dos formas: pista oculta (nunca dices qué es) o giro final (todo suena a una cosa y la última línea revela otra).
Prueba de dos lecturas: cada línea debe seguir teniendo sentido si el oyente cree que hablas de otra cosa.$c$),
('estructura', 3, 'Estructura de canción',
 'Verso cuenta, coro resume, puente sacude.',
 $c$Forma común: verso–coro–verso–coro–puente–coro. El verso avanza la historia con detalles concretos y cambia de letra; el coro dice la premisa y casi siempre repite; el puente rompe el patrón (otra música, otro punto de vista o el giro).
Si los versos repiten lo que ya dijo el coro, la canción se estanca. Una canción cruda puede ser más corta y sin puente.$c$),
('prosodia', 4, 'Prosodia',
 'Que el sonido y el ritmo de la letra refuercen su significado.',
 $c$Líneas cortas = tensión; largas = reflexión o cansancio. Rima que no cierra = inquietud; rima perfecta = caída. Vocales abiertas (a, o) se gritan; consonantes duras golpean. Repetición con variación: repite tres veces y cambia una palabra en la cuarta.
Acento sobre el tiempo fuerte: la sílaba tónica de cada palabra debe caer en un tiempo fuerte del compás. Prueba: da palmadas al ritmo y di la línea; si tropiezas, ajusta palabras, no música.$c$),
('concreto', 5, 'Lo concreto',
 'Muéstrame, no me expliques.',
 $c$"Siento culpa" es una etiqueta; "vacié el cajón de los cables por tercera vez" es una escena donde el oyente siente la culpa solo. Usa los cinco sentidos y objetos que se puedan ver. Cambia cada palabra abstracta por un objeto o una acción.$c$),
('escritura_objeto', 6, 'Escritura de objeto',
 'Diez minutos escribiendo sobre un objeto con los sentidos.',
 $c$Elige un objeto de la idea. Escribe sin parar siguiendo un sentido por minuto: vista, oído, tacto, olfato, gusto y luego peso o lugar en el cuerpo. Sin rima ni sentido. Al final subraya las tres líneas con más imagen: de ahí salen versos.$c$),
('reescritura', 7, 'Reescritura',
 'Cortar, concretar, cantar en voz alta.',
 $c$Tres filtros en este orden: cortar toda línea que explique lo que ya mostró otra; concretar (cada palabra abstracta, un objeto o una acción); cantar en voz alta (lo que no sale natural se reescribe, aunque se vea bien en papel). Reescribe otro día, no el mismo.$c$),
('rima', 8, 'Rima',
 'Perfecta, asonante o ninguna: elegir según lo que la idea pide.',
 $c$Perfecta (casa / pasa), asonante (casa / playa: coinciden solo las vocales, muy común en español) o ninguna. No fuerces rima si la idea no la pide. Mezclar es normal: asonante en versos, perfecta en el coro.$c$),
('proceso', 9, 'Proceso creativo',
 'Cosechar, subrayar, premisa, mapa, borrador feo, reescribir, probar en voz alta.',
 $c$Cosechar (páginas), subrayar lo fuerte cada semana, escribir la premisa en una frase, dibujar el mapa de estructura, hacer un borrador feo completo con tiempo límite, reescribir otro día y probar en voz alta grabando. Regla: termina una versión completa aunque sea mala. Cantidad antes que calidad al inicio.$c$)
ON CONFLICT (clave) DO NOTHING;
