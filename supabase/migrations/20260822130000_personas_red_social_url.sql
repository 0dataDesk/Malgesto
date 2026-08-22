-- Brief "Liga personal de integrante + botón Enviar a Presskit siempre
-- activo" §1: un solo link por integrante (no una lista) -- para que Design
-- lo use como redirección sobre el nombre del integrante en el presskit,
-- no una plataforma específica (Instagram/TikTok/etc.), de ahí el nombre
-- genérico en vez de una columna por red.
ALTER TABLE malgesto_app.personas
  ADD COLUMN IF NOT EXISTS red_social_url text;
