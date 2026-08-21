-- Expone el esquema jorge_hub a PostgREST (agrega a la lista existente, no la reemplaza).
-- Resuelve PGRST106 al consultar jorge_hub desde la API REST de Supabase.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, malgesto_app, estudio_jorge, graphql_public, jorge_hub';
NOTIFY pgrst, 'reload schema';
